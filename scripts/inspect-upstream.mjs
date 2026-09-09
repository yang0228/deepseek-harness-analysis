/** Read-only Git inspection and parsers for the pinned upstream declarations. */
import { execFile } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const runFile = promisify(execFile)

/** @typedef {{ stdout: { write(chunk: string): unknown }, stderr: { write(chunk: string): unknown } }} CommandIO */
/** @typedef {{ repository: string, commit: string, commitDate: string, gitDescribe: string, rootPackageVersion: string, verificationDate: string }} Baseline */
/** @typedef {{ id: string, bundles: string[], patchReload: 'live' | 'startup' }} ProfileObservation */
/** @typedef {{ id: string, name: string, description: string, order: number }} PresetObservation */
/** @typedef {{ schemaVersion: 1, repository: string, commit: string, commitDate: string, gitDescribe: string, rootPackageVersion: string, profiles: ProfileObservation[], presets: PresetObservation[], probes: Record<string, unknown> }} UpstreamFacts */
/** @typedef {{ path?: string, line?: number, offset?: number, operation?: string, expected?: unknown, actual?: unknown, dirtyPaths?: string[] }} UpstreamInspectionDetails */

/** A stable inspection failure with a detached copy of its diagnostic fields. */
export class UpstreamInspectionError extends Error {
  /**
   * @param {string} code - Inspection failure code.
   * @param {UpstreamInspectionDetails} [details] - Structured source locations and compared values.
   */
  constructor(code, details = {}) {
    super(code)
    this.name = 'UpstreamInspectionError'
    /** @readonly */
    this.code = code
    /** @readonly */
    this.details = structuredClone(details)
  }
}

/**
 * Serialize JSON with caller-owned field/array order, two-space indentation, and one final LF.
 * @param {unknown} value - JSON-compatible value.
 * @returns {string} Deterministically formatted JSON text.
 */
export function formatJson(value) {
  return `${JSON.stringify(value, null, 2).replace(/\n+$/u, '')}\n`
}

const PROFILE_HEADER = 'export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {'

function profileError(offset) {
  throw new UpstreamInspectionError('PROFILE_TEMPLATES_PARSE_ERROR', { offset })
}

function profileDeclarations(source) {
  const declarations = []
  const expressionKeywords = new Set(['return', 'throw', 'case', 'delete', 'void', 'typeof', 'new', 'yield', 'await', 'in', 'instanceof'])

  function quotedEnd(start, quote) {
    for (let index = start + 1; index < source.length; index += 1) {
      if (source[index] === '\\') index += 1
      else if (source[index] === quote) return index + 1
      else if (quote === '`' && source.startsWith('${', index)) index = codeEnd(index + 2, true) - 1
    }
    profileError(start)
  }

  function regexEnd(start) {
    let inClass = false
    for (let index = start + 1; index < source.length; index += 1) {
      const character = source[index]
      if (character === '\\') index += 1
      else if (character === '[') inClass = true
      else if (character === ']') inClass = false
      else if (character === '/' && !inClass) {
        while (/[A-Za-z]/u.test(source[index + 1] ?? '')) index += 1
        return index + 1
      } else if (character === '\n' || character === '\r') profileError(start)
    }
    profileError(start)
  }

  function codeEnd(start, interpolation = false) {
    let depth = 0
    let expressionExpected = true
    for (let index = start; index < source.length;) {
      const character = source[index]
      if (/\s/u.test(character)) {
        index += 1
        continue
      }
      if (source.startsWith('//', index)) {
        const end = source.indexOf('\n', index + 2)
        index = end < 0 ? source.length : end + 1
        continue
      }
      if (source.startsWith('/*', index)) {
        const end = source.indexOf('*/', index + 2)
        if (end < 0) profileError(index)
        index = end + 2
        continue
      }
      if (character === "'" || character === '"' || character === '`') {
        index = quotedEnd(index, character)
        expressionExpected = false
        continue
      }
      if (character === '/' && expressionExpected) {
        index = regexEnd(index)
        expressionExpected = false
        continue
      }
      const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*/u.exec(source.slice(index))
      if (identifier !== null) {
        if (source.startsWith(PROFILE_HEADER, index)) declarations.push(index)
        expressionExpected = expressionKeywords.has(identifier[0])
        index += identifier[0].length
        continue
      }
      if (character === '{') depth += 1
      if (character === '}') {
        if (interpolation && depth === 0) return index + 1
        depth -= 1
      }
      expressionExpected = '=(:,;!?&|+-*%<>[{/'.includes(character)
      index += 1
    }
    if (interpolation) profileError(start)
    return source.length
  }

  codeEnd(0)
  return declarations
}

function extractProfileBody(sourceText) {
  const declarations = profileDeclarations(sourceText)
  if (declarations.length !== 1) profileError(declarations[0] ?? 0)
  const declaration = declarations[0]
  const opening = declaration + PROFILE_HEADER.length - 1
  let depth = 0
  let state = 'code'
  for (let index = opening; index < sourceText.length; index += 1) {
    const character = sourceText[index]
    const next = sourceText[index + 1]
    if (state === 'single-quote' || state === 'double-quote') {
      if (character === '\\') {
        index += 1
      } else if ((state === 'single-quote' && character === "'")
        || (state === 'double-quote' && character === '"')) {
        state = 'code'
      }
      continue
    }
    if (state === 'line-comment') {
      if (character === '\n') state = 'code'
      continue
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code'
        index += 1
      }
      continue
    }
    if (character === '`') profileError(index)
    if (character === "'") {
      state = 'single-quote'
      continue
    }
    if (character === '"') {
      state = 'double-quote'
      continue
    }
    if (character === '/' && next === '/') {
      state = 'line-comment'
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      state = 'block-comment'
      index += 1
      continue
    }
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) {
        return { body: sourceText.slice(opening + 1, index), offset: opening + 1 }
      }
    }
  }
  profileError(opening)
}

class ProfileCursor {
  constructor(text, baseOffset) {
    this.text = text
    this.baseOffset = baseOffset
    this.index = 0
  }

  fail() {
    profileError(this.baseOffset + this.index)
  }

  skipTrivia() {
    for (;;) {
      while (/\s/u.test(this.text[this.index] ?? '')) this.index += 1
      if (this.text.startsWith('//', this.index)) {
        const newline = this.text.indexOf('\n', this.index + 2)
        this.index = newline < 0 ? this.text.length : newline + 1
        continue
      }
      if (this.text.startsWith('/*', this.index)) {
        const closing = this.text.indexOf('*/', this.index + 2)
        if (closing < 0) this.fail()
        this.index = closing + 2
        continue
      }
      return
    }
  }

  atEnd() {
    this.skipTrivia()
    return this.index === this.text.length
  }

  peek(character) {
    this.skipTrivia()
    return this.text[this.index] === character
  }

  expect(character) {
    this.skipTrivia()
    if (this.text[this.index] !== character) this.fail()
    this.index += 1
  }

  readIdentifier() {
    this.skipTrivia()
    const match = /^[A-Za-z_$][A-Za-z0-9_$]*/u.exec(this.text.slice(this.index))
    if (match === null) this.fail()
    this.index += match[0].length
    return match[0]
  }

  expectIdentifier(expected) {
    if (this.readIdentifier() !== expected) this.fail()
  }

  readString() {
    this.skipTrivia()
    const quote = this.text[this.index]
    if (quote !== "'" && quote !== '"') this.fail()
    const start = this.index
    this.index += 1
    let value = ''
    while (this.index < this.text.length) {
      const character = this.text[this.index]
      if (character === quote) {
        this.index += 1
        if (value.length === 0) this.fail()
        return value
      }
      if (character === '\\' || character === '\n' || character === '\r') this.fail()
      value += character
      this.index += 1
    }
    this.index = start
    this.fail()
  }
}

function parseBundleList(cursor) {
  const bundles = []
  cursor.expect('[')
  if (cursor.peek(']')) cursor.fail()
  for (;;) {
    bundles.push(cursor.readString())
    if (!cursor.peek(',')) break
    cursor.expect(',')
    if (cursor.peek(']')) break
  }
  cursor.expect(']')
  return bundles
}

function parseProfileEntry(cursor) {
  const id = cursor.peek("'") || cursor.peek('"') ? cursor.readString() : cursor.readIdentifier()
  if (!/^[a-z][a-z0-9-]*$/u.test(id)) cursor.fail()
  cursor.expect(':')
  cursor.expect('{')
  cursor.expectIdentifier('bundles')
  cursor.expect(':')
  const bundles = parseBundleList(cursor)
  cursor.expect(',')
  cursor.expectIdentifier('patchReload')
  cursor.expect(':')
  const patchReload = cursor.readString()
  if (patchReload !== 'live' && patchReload !== 'startup') cursor.fail()
  if (cursor.peek(',')) cursor.expect(',')
  cursor.expect('}')
  return { id, bundles, patchReload }
}

/**
 * Parse one executable PROFILE_TEMPLATES declaration with the pinned entry grammar.
 * Comments and literals cannot supply declarations; ids are sorted and bundle order is retained.
 * @param {string} sourceText - Complete TypeScript module text.
 * @returns {ProfileObservation[]} Newly allocated Profile records.
 * @throws {UpstreamInspectionError} PROFILE_TEMPLATES_PARSE_ERROR with the source offset on syntax drift.
 */
export function parseProfileTemplates(sourceText) {
  const extracted = extractProfileBody(sourceText)
  const cursor = new ProfileCursor(extracted.body, extracted.offset)
  const result = []
  const ids = new Set()
  let first = true
  while (!cursor.atEnd()) {
    if (!first) cursor.expect(',')
    if (cursor.atEnd()) break
    const profile = parseProfileEntry(cursor)
    if (ids.has(profile.id)) cursor.fail()
    ids.add(profile.id)
    result.push(profile)
    first = false
  }
  if (result.length === 0) cursor.fail()
  return result.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
}

/**
 * Decode a plain or matching single/double-quoted scalar without YAML features.
 * Quotes have no escapes; plain values cannot contain quotes, backslashes, a mapping separator,
 * or a whitespace-delimited comment. Tags, anchors, aliases, flow collections,
 * multiline indicators, and control characters are outside this subset.
 * @param {string} source - One scalar, excluding its key and indentation.
 * @returns {string | undefined} Decoded text, or undefined for unsupported syntax.
 */
export function parseSingleLineScalar(source) {
  if (/[\x00-\x1f\x7f]/u.test(source)) return undefined
  const value = source.trim()
  const quote = value[0]
  if (quote === "'" || quote === '"') {
    if (value.length < 2 || !value.endsWith(quote)) return undefined
    const body = value.slice(1, -1)
    return body.includes(quote) || body.includes('\\') ? undefined : body
  }
  if (/^[!&*[\]{}>|#?%@\x60]/u.test(value)
    || /['"\\]|\s#|:(?:\s|$)/u.test(value)) return undefined
  return value
}

/**
 * Parse ordered name, description, and integer order fields, ignoring comment-only lines.
 * Text values use parseSingleLineScalar; blank lines, extra keys, and multiline content are rejected.
 * @param {string} sourceText - Preset metadata text.
 * @param {string} sourcePath - Path retained in parse diagnostics.
 * @returns {Omit<PresetObservation, 'id'>} Newly allocated display metadata.
 * @throws {UpstreamInspectionError} PRESET_METADATA_PARSE_ERROR with the physical source line.
 */
export function parsePresetMetadata(sourceText, sourcePath) {
  const lines = sourceText.replace(/\n$/u, '').split('\n')
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) => !text.trimStart().startsWith('#'))
  const patterns = [/^name: (\S.*)$/u, /^description: (\S.*)$/u, /^order: (-?(?:0|[1-9]\d*))$/u]
  const values = lines.map(({ text, line }, index) => {
    const match = patterns[index]?.exec(text)
    if (match === null || match === undefined) {
      throw new UpstreamInspectionError('PRESET_METADATA_PARSE_ERROR', { path: sourcePath, line })
    }
    const value = index === 2 ? match[1] : parseSingleLineScalar(match[1])
    if (value === undefined || value === '') {
      throw new UpstreamInspectionError('PRESET_METADATA_PARSE_ERROR', { path: sourcePath, line })
    }
    return value
  })
  if (lines.length !== 3) {
    throw new UpstreamInspectionError('PRESET_METADATA_PARSE_ERROR', { path: sourcePath, line: 4 })
  }
  return { name: values[0], description: values[1], order: Number(values[2]) }
}

function requiredFileError(error, path) {
  return new UpstreamInspectionError(
    error?.code === 'ENOENT' ? 'UPSTREAM_FILE_MISSING' : 'UPSTREAM_FILE_READ_ERROR',
    { path },
  )
}

async function readRequiredText(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    throw requiredFileError(error, path)
  }
}

/**
 * Read each immediate Preset directory's required metadata, using its directory name as id.
 * @param {string} source - Absolute upstream checkout directory.
 * @returns {Promise<PresetObservation[]>} Preset records sorted by id.
 * @throws {UpstreamInspectionError} A structured file-read or metadata-parse failure.
 */
export async function readPresetRoster(source) {
  const root = join(source, 'packages/preset/agent-presets/presets')
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    throw requiredFileError(error, root)
  }
  const result = []
  for (const entry of entries.filter(value => value.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const sourcePath = join(root, entry.name, 'preset.yml')
    const metadata = parsePresetMetadata(await readRequiredText(sourcePath), sourcePath)
    result.push({ id: entry.name, ...metadata })
  }
  return result
}

async function gitRead(source, args) {
  try {
    return (await runFile('git', args, {
      cwd: source,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      shell: false,
    })).stdout
  } catch {
    throw new UpstreamInspectionError('UPSTREAM_GIT_READ_ERROR', { operation: `git ${args.join(' ')}` })
  }
}

async function checkedHead(source, expected) {
  const actual = (await gitRead(source, ['rev-parse', 'HEAD'])).trim()
  if (actual !== expected) {
    throw new UpstreamInspectionError('UPSTREAM_HEAD_MISMATCH', { expected, actual })
  }
  return actual
}

/**
 * Test a canonical POSIX repository path that cannot name Git metadata.
 * @param {string} path - Repository-relative path used in a source citation.
 * @returns {boolean} Whether every segment names its own location without aliases.
 */
export function isCanonicalUpstreamPath(path) {
  return typeof path === 'string' && !isAbsolute(path) && !/^[A-Za-z]:/u.test(path)
    && !/[\x00-\x1f\x7f\\%]/u.test(path)
    && path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..' && segment.toLowerCase() !== '.git')
}

/**
 * Read the cited regular Git blob without following a worktree path.
 * @param {{ source: string, commit: string, path: string }} options - Absolute checkout, pinned HEAD SHA, and canonical repository path.
 * @returns {Promise<string | null>} Blob text, or null for a noncanonical, missing, directory, or symlink entry.
 * @throws {UpstreamInspectionError} If HEAD differs or a read-only Git command fails.
 */
export async function readUpstreamBlob({ source, commit, path }) {
  if (!isCanonicalUpstreamPath(path)) return null
  const head = await checkedHead(source, commit)
  const entry = await gitRead(source, ['--literal-pathspecs', 'ls-tree', '-z', '--full-tree', head, '--', path])
  const match = /^(100644|100755) blob ([0-9a-f]{40})\t([^\0]+)\0$/u.exec(entry)
  if (match === null || match[3] !== path) return null
  return gitRead(source, ['cat-file', 'blob', match[2]])
}

async function inspectUpstreamChecked({ source, baseline }) {
  if (!isAbsolute(source)) throw new UpstreamInspectionError('SOURCE_NOT_ABSOLUTE', { actual: source })
  try {
    if (!(await stat(source)).isDirectory()) throw new Error('not-directory')
  } catch {
    throw new UpstreamInspectionError('SOURCE_NOT_DIRECTORY', { path: source })
  }
  const commit = await checkedHead(source, baseline.commit)
  const status = await gitRead(source, ['status', '--porcelain=v1', '--untracked-files=all'])
  if (status !== '') {
    throw new UpstreamInspectionError('UPSTREAM_DIRTY', {
      dirtyPaths: status.trimEnd().split('\n').map(line => line.slice(3)),
    })
  }
  const packagePath = join(source, 'package.json')
  const profilePath = join(source, 'packages/boot/app-boot/src/profile.ts')
  const packageText = await readRequiredText(packagePath)
  let manifest
  try {
    manifest = JSON.parse(packageText)
  } catch {
    throw new UpstreamInspectionError('UPSTREAM_PACKAGE_PARSE_ERROR', { path: packagePath })
  }
  const profiles = parseProfileTemplates(await readRequiredText(profilePath))
  const presets = await readPresetRoster(source)
  const commitDate = (await gitRead(source, ['show', '-s', '--format=%cs', 'HEAD'])).trim()
  const gitDescribe = (await gitRead(source, ['describe', '--tags', '--always', '--long'])).trim()
  const probes = {
    'upstream.commit': commit,
    'upstream.commit-date': commitDate,
    'upstream.git-describe': gitDescribe,
    'upstream.root-package-version': manifest.version,
  }
  for (const profile of profiles) probes[`profile:${profile.id}`] = profile
  for (const preset of presets) probes[`preset:${preset.id}`] = preset
  return {
    schemaVersion: 1,
    repository: baseline.repository,
    commit,
    commitDate,
    gitDescribe,
    rootPackageVersion: manifest.version,
    profiles,
    presets,
    probes,
  }
}

/**
 * Inspect authoritative files only after confirming an exact, clean upstream checkout.
 * Git commands and filesystem reads never modify the checkout.
 * @param {{ source: string, baseline: Baseline }} options - Absolute checkout and pinned upstream metadata.
 * @returns {Promise<UpstreamFacts>} Normalized observations and stable probe values.
 * @throws {UpstreamInspectionError} A preflight, Git, file, or declaration failure.
 */
export async function inspectUpstream(options) {
  try {
    return await inspectUpstreamChecked(options)
  } catch (error) {
    if (error instanceof UpstreamInspectionError) throw error
    throw new UpstreamInspectionError('INSPECTOR_INTERNAL_ERROR')
  }
}

function parseInspectorOptions(argv) {
  if (argv.length !== 4) throw new UpstreamInspectionError('INSPECTOR_USAGE', { actual: argv })
  const values = new Map([[argv[0], argv[1]], [argv[2], argv[3]]])
  if (values.size !== 2 || !values.has('--source') || !values.has('--baseline')
    || [...values.values()].some(value => value.startsWith('--'))) {
    throw new UpstreamInspectionError('INSPECTOR_USAGE', { actual: argv })
  }
  return { source: values.get('--source'), baselinePath: values.get('--baseline') }
}

/**
 * Run the inspector with --source and --baseline, emitting one JSON result on its owning stream.
 * @param {string[]} [argv] - CLI option tokens; defaults to process arguments.
 * @param {CommandIO} [io] - Success stdout and failure stderr sinks.
 * @returns {Promise<0 | 1>} Zero on success; one on a structured failure with empty stdout.
 */
export async function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  try {
    const { source, baselinePath } = parseInspectorOptions(argv)
    let baseline
    try {
      baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
    } catch {
      throw new UpstreamInspectionError('INSPECTOR_BASELINE_INVALID', { path: baselinePath })
    }
    io.stdout.write(formatJson(await inspectUpstream({ source, baseline })))
    return 0
  } catch (error) {
    const failure = error instanceof UpstreamInspectionError
      ? error
      : new UpstreamInspectionError('INSPECTOR_INTERNAL_ERROR')
    io.stderr.write(formatJson({ ok: false, error: { code: failure.code, details: failure.details } }))
    return 1
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main()
}
