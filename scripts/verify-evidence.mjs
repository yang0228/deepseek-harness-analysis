/** Offline evidence checks and optional comparison with a pinned upstream checkout. */
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  formatJson,
  inspectUpstream,
  isCanonicalUpstreamPath,
  parseSingleLineScalar,
  readUpstreamBlob,
  UpstreamInspectionError,
} from './inspect-upstream.mjs'

/** @typedef {import('./inspect-upstream.mjs').Baseline} Baseline */
/** @typedef {import('./inspect-upstream.mjs').UpstreamFacts} UpstreamFacts */
/** @typedef {import('./inspect-upstream.mjs').CommandIO} CommandIO */
/** @typedef {{ type: 'upstream', repository: string, commit: string, path: string, startLine: number, endLine: number, url: string }} UpstreamSource */
/** @typedef {{ type: 'external', url: string, publisher: string, accessDate: string } & ({ version: string, commit?: never } | { version?: never, commit: string } | { version?: never, commit?: never })} ExternalSource */
/** @typedef {'verified' | 'qualified'} EvidenceConfidence */
/** @typedef {'released' | 'experimental' | 'not-applicable'} ClaimMaturity */
/** @typedef {'enabled' | 'optional' | 'disabled' | 'experimental'} CapabilityAvailability */
/** @typedef {{ id: string, statement: string, kind: 'upstream-fact' | 'analysis-inference' | 'external-comparison', confidence: EvidenceConfidence, maturity: ClaimMaturity, documents: string[], sources: Array<UpstreamSource | ExternalSource>, qualification?: string, probe?: string }} Claim */
/** @typedef {{ path: string, line: number, anchor: string, id: string, statement: string }} ClaimMarker */
/** @typedef {{ markers: ClaimMarker[], anchors: Array<{ path: string, line: number, anchor: string }>, references: Array<{ path: string, line: number, anchor: string }> }} DocumentClaimIndex */
/** @typedef {{ code: string, path?: string, field?: string, line?: number, claimId?: string, sourceIndex?: number, message: string }} EvidenceProblem */

const MARKER_PATTERN = /^<a id="(claim-(?:dsh|cmp)-(?:[a-z0-9]+-)+\d{3})"><\/a> \*\*Claim `((?:DSH|CMP)-(?:[A-Z0-9]+-)+\d{3})`:\*\* (.+)$/u
const CLAIM_ANCHOR_PATTERN = /^claim-(?:dsh|cmp)-(?:[a-z0-9]+-)+\d{3}$/u
const ACTION_REF_PATTERN = /^[^/\s]+\/[^@\s]+@[0-9a-f]{40}$/u
const SHA_PATTERN = /^[0-9a-f]{40}$/u
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u
const CLAIM_ID_PATTERN = /^(?:DSH|CMP)-(?:[A-Z0-9]+-)+\d{3}$/u
const BASELINE_FIELDS = [
  'repository',
  'commit',
  'commitDate',
  'gitDescribe',
  'rootPackageVersion',
  'verificationDate',
]
const CLAIM_FIELDS = [
  'id',
  'statement',
  'kind',
  'confidence',
  'maturity',
  'documents',
  'sources',
  'qualification',
  'probe',
]
const UPSTREAM_SOURCE_FIELDS = ['type', 'repository', 'commit', 'path', 'startLine', 'endLine', 'url']
const EXTERNAL_SOURCE_FIELDS = ['type', 'url', 'publisher', 'accessDate', 'version', 'commit']
const COMPATIBILITY = {
  'upstream-fact': { confidence: new Set(['verified', 'qualified']), maturity: new Set(['released', 'experimental']) },
  'analysis-inference': { confidence: new Set(['qualified']), maturity: new Set(['released', 'experimental', 'not-applicable']) },
  'external-comparison': { confidence: new Set(['verified', 'qualified']), maturity: new Set(['not-applicable']) },
}

function problem(code, fields = {}) {
  return { code, ...fields, message: code }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonemptyLine(value) {
  return typeof value === 'string' && value.trim() !== '' && !/[\r\n]/u.test(value)
}

function isCanonicalDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.username === '' && parsed.password === ''
  } catch {
    return false
  }
}

function unexpectedKeys(value, allowed) {
  const allowedSet = new Set(allowed)
  return Object.keys(value).filter(key => !allowedSet.has(key)).sort()
}

/**
 * Validate the exact baseline fields without mutation or I/O.
 * @param {unknown} value - Parsed JSON to validate.
 * @returns {EvidenceProblem[]} Problems in baseline field order, or an empty array.
 */
export function validateBaseline(value) {
  if (!isRecord(value)) {
    return [problem('BASELINE_SCHEMA_ERROR', { path: '/' })]
  }
  const errors = []
  const checks = {
    repository: candidate => isHttpsUrl(candidate),
    commit: candidate => typeof candidate === 'string' && SHA_PATTERN.test(candidate),
    commitDate: isCanonicalDate,
    gitDescribe: isNonemptyLine,
    rootPackageVersion: isNonemptyLine,
    verificationDate: isCanonicalDate,
  }
  for (const field of BASELINE_FIELDS) {
    if (!Object.hasOwn(value, field) || !checks[field](value[field])) {
      errors.push(problem('BASELINE_SCHEMA_ERROR', { field: `/${field}` }))
    }
  }
  for (const field of unexpectedKeys(value, BASELINE_FIELDS)) {
    errors.push(problem('BASELINE_SCHEMA_ERROR', { field: `/${field}` }))
  }
  return errors
}

function fieldProblem(claimId, sourceIndex, field) {
  return problem('LEDGER_SCHEMA_ERROR', {
    field,
    ...(claimId === undefined ? {} : { claimId }),
    ...(sourceIndex === undefined ? {} : { sourceIndex }),
  })
}

function externalRevision(urlText) {
  let parsed
  try {
    parsed = new URL(urlText)
  } catch {
    return null
  }
  if (parsed.hostname !== 'github.com') return null
  const match = /^\/[^/]+\/[^/]+\/(?:blob|tree)\/([^/]+)(?:\/.*)?$/u.exec(parsed.pathname)
  if (match === null) return null
  try {
    const revision = decodeURIComponent(match[1])
    return revision.includes('/') ? '' : revision
  } catch {
    return ''
  }
}

function validateUpstreamSource(source, claimId, sourceIndex, baseField) {
  const errors = []
  for (const field of UPSTREAM_SOURCE_FIELDS) {
    if (!Object.hasOwn(source, field)) errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
  }
  for (const field of unexpectedKeys(source, UPSTREAM_SOURCE_FIELDS)) {
    errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
  }
  const checks = {
    type: value => value === 'upstream',
    repository: isHttpsUrl,
    commit: value => typeof value === 'string' && SHA_PATTERN.test(value),
    path: isNonemptyLine,
    startLine: Number.isInteger,
    endLine: Number.isInteger,
    url: isHttpsUrl,
  }
  for (const field of UPSTREAM_SOURCE_FIELDS) {
    if (Object.hasOwn(source, field) && !checks[field](source[field])) {
      errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
    }
  }
  return errors
}

function validateExternalSource(source, claimId, sourceIndex, baseField) {
  const errors = []
  for (const field of ['type', 'url', 'publisher', 'accessDate']) {
    if (!Object.hasOwn(source, field)) errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
  }
  for (const field of unexpectedKeys(source, EXTERNAL_SOURCE_FIELDS)) {
    errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
  }
  const checks = {
    type: value => value === 'external',
    url: isHttpsUrl,
    publisher: isNonemptyLine,
    accessDate: isCanonicalDate,
    version: isNonemptyLine,
    commit: value => typeof value === 'string' && SHA_PATTERN.test(value),
  }
  for (const field of EXTERNAL_SOURCE_FIELDS) {
    if (Object.hasOwn(source, field) && !checks[field](source[field])) {
      errors.push(fieldProblem(claimId, sourceIndex, `${baseField}/${field}`))
    }
  }
  if (errors.length > 0) return errors
  if (source.version !== undefined && source.commit !== undefined) {
    return [problem('EXTERNAL_SOURCE_VERSION_COMMIT_CONFLICT', { claimId, sourceIndex })]
  }
  const revision = externalRevision(source.url)
  if ((source.commit !== undefined && (revision === null || revision !== source.commit))
    || (revision !== null && SHA_PATTERN.test(revision) && source.commit !== revision)
    || revision === '') {
    return [problem('EXTERNAL_SOURCE_REVISION_MISMATCH', { claimId, sourceIndex })]
  }
  return []
}

/**
 * Validate schema-v1 claims, kind compatibility, source-kind requirements, and source metadata without coercion.
 * @param {unknown} value - Parsed ledger JSON.
 * @param {Baseline} baseline - Pinned upstream metadata used by the evidence validators.
 * @returns {EvidenceProblem[]} Deterministic problems in claim/source order; inputs remain unchanged.
 */
export function validateClaimsLedger(value, baseline) {
  if (!isRecord(value)) {
    return [problem('LEDGER_SCHEMA_ERROR', { path: '/' })]
  }
  const errors = []
  if (value.schemaVersion !== 1) errors.push(fieldProblem(undefined, undefined, '/schemaVersion'))
  if (!Array.isArray(value.claims)) errors.push(fieldProblem(undefined, undefined, '/claims'))
  for (const field of unexpectedKeys(value, ['schemaVersion', 'claims'])) {
    errors.push(fieldProblem(undefined, undefined, `/${field}`))
  }
  if (!Array.isArray(value.claims)) return errors
  const ids = new Set()
  for (const [claimIndex, claim] of value.claims.entries()) {
    if (!isRecord(claim)) {
      errors.push(fieldProblem(undefined, undefined, `/claims/${claimIndex}`))
      continue
    }
    const claimId = typeof claim.id === 'string' ? claim.id : undefined
    const baseField = `/claims/${claimIndex}`
    for (const field of ['id', 'statement', 'kind', 'confidence', 'maturity', 'documents', 'sources']) {
      if (!Object.hasOwn(claim, field)) errors.push(fieldProblem(claimId, undefined, `${baseField}/${field}`))
    }
    for (const field of unexpectedKeys(claim, CLAIM_FIELDS)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/${field}`))
    }
    if (Object.hasOwn(claim, 'id') && (typeof claim.id !== 'string' || !CLAIM_ID_PATTERN.test(claim.id))) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/id`))
    } else if (claimId !== undefined) {
      if (ids.has(claimId)) errors.push(problem('CLAIM_ID_DUPLICATE', { claimId }))
      ids.add(claimId)
    }
    if (Object.hasOwn(claim, 'statement') && !isNonemptyLine(claim.statement)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/statement`))
    }
    const validKind = typeof claim.kind === 'string' && Object.hasOwn(COMPATIBILITY, claim.kind)
    if (Object.hasOwn(claim, 'kind') && !validKind) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/kind`))
    }
    if (Object.hasOwn(claim, 'confidence') && !['verified', 'qualified'].includes(claim.confidence)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/confidence`))
    }
    if (Object.hasOwn(claim, 'maturity') && !['released', 'experimental', 'not-applicable'].includes(claim.maturity)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/maturity`))
    }
    if (Object.hasOwn(claim, 'documents')) {
      if (!Array.isArray(claim.documents) || claim.documents.length === 0) {
        errors.push(fieldProblem(claimId, undefined, `${baseField}/documents`))
      } else {
        const documents = new Set()
        for (const [documentIndex, document] of claim.documents.entries()) {
          if (!isNonemptyLine(document) || documents.has(document)) {
            errors.push(fieldProblem(claimId, undefined, `${baseField}/documents/${documentIndex}`))
          }
          documents.add(document)
        }
      }
    }
    if (claim.qualification !== undefined && !isNonemptyLine(claim.qualification)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/qualification`))
    }
    if (claim.probe !== undefined && !isNonemptyLine(claim.probe)) {
      errors.push(fieldProblem(claimId, undefined, `${baseField}/probe`))
    }
    const rule = validKind ? COMPATIBILITY[claim.kind] : undefined
    if (rule !== undefined && ['verified', 'qualified'].includes(claim.confidence) && !rule.confidence.has(claim.confidence)) {
      errors.push(problem('CLAIM_KIND_CONFIDENCE_INCOMPATIBLE', { claimId: claim.id }))
    }
    if (rule !== undefined && ['released', 'experimental', 'not-applicable'].includes(claim.maturity) && !rule.maturity.has(claim.maturity)) {
      errors.push(problem('CLAIM_KIND_MATURITY_INCOMPATIBLE', { claimId: claim.id }))
    }
    if (claim.confidence === 'qualified' && !isNonemptyLine(claim.qualification)) {
      errors.push(problem('QUALIFICATION_REQUIRED', { claimId: claim.id }))
    }
    if (claim.confidence === 'verified' && claim.qualification !== undefined) {
      errors.push(problem('QUALIFICATION_UNEXPECTED', { claimId: claim.id }))
    }
    if (Object.hasOwn(claim, 'sources')) {
      if (!Array.isArray(claim.sources) || claim.sources.length === 0) {
        errors.push(fieldProblem(claimId, undefined, `${baseField}/sources`))
      } else {
        const sourceErrorStart = errors.length
        for (const [sourceIndex, source] of claim.sources.entries()) {
          const sourceField = `${baseField}/sources/${sourceIndex}`
          if (!isRecord(source)) {
            errors.push(fieldProblem(claimId, sourceIndex, sourceField))
          } else if (source.type === 'upstream') {
            errors.push(...validateUpstreamSource(source, claimId, sourceIndex, sourceField))
          } else if (source.type === 'external') {
            errors.push(...validateExternalSource(source, claimId, sourceIndex, sourceField))
          } else {
            errors.push(fieldProblem(claimId, sourceIndex, `${sourceField}/type`))
          }
        }
        const sourcesAreStructurallyValid = errors.length === sourceErrorStart
        const compatibleKindFields = rule !== undefined
          && rule.confidence.has(claim.confidence) && rule.maturity.has(claim.maturity)
        if (claim.kind === 'upstream-fact' && compatibleKindFields && sourcesAreStructurallyValid
          && !claim.sources.some(source => source.type === 'upstream')) {
          errors.push(problem('UPSTREAM_SOURCE_REQUIRED', { claimId: claim.id }))
        }
      }
    }
  }
  return errors
}

/**
 * Recognize the canonical highlighted-claim marker without trimming its statement.
 * @param {string} line - One physical Markdown line.
 * @param {string} path - Repository-relative document path.
 * @param {number} lineNumber - One-based source line.
 * @returns {ClaimMarker | null} Parsed marker, or null when the line is not canonical.
 */
export function parseClaimMarker(line, path, lineNumber) {
  const match = MARKER_PATTERN.exec(line)
  if (match === null) return null
  return { path, line: lineNumber, anchor: match[1], id: match[2], statement: match[3] }
}

function logicalLines(text) {
  if (text === '') return []
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
}

function stripInlineCode(line) {
  return line.replace(/(`+)[^`]*\1/gu, '')
}

async function markdownPaths(root, current = root, output = []) {
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const absolute = join(current, entry.name)
    const path = relative(root, absolute).split(sep).join('/')
    if (entry.isDirectory() && (path === '.superpowers' || path === 'test/fixtures')) continue
    if (entry.isDirectory()) await markdownPaths(root, absolute, output)
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(absolute)
  }
  return output
}

function visibleLines(text) {
  const result = []
  let fence = null
  for (const [index, line] of logicalLines(text).entries()) {
    const delimiter = /^\s*(```+|~~~+)/u.exec(line)?.[1]
    if (delimiter !== undefined) {
      fence = fence === null
        ? delimiter
        : delimiter[0] === fence[0] && delimiter.length >= fence.length
          ? null
          : fence
      continue
    }
    if (fence === null) result.push({ line, searchable: stripInlineCode(line), lineNumber: index + 1 })
  }
  return result
}

function markdownLinks(lines) {
  const definitions = new Map()
  for (const { searchable } of lines) {
    const match = /^\s*\[([^\]]+)\]:\s*<?([^>\s]+)>?(?:\s+.*)?$/u.exec(searchable)
    if (match !== null) {
      const label = match[1].trim().replace(/\s+/gu, ' ').toLowerCase()
      if (!definitions.has(label)) definitions.set(label, match[2])
    }
  }
  const links = []
  for (const { searchable, lineNumber } of lines) {
    const occupied = []
    const record = match => occupied.push([match.index, match.index + match[0].length])
    const overlaps = match => occupied.some(([start, end]) => match.index < end && match.index + match[0].length > start)
    for (const match of searchable.matchAll(/!?\[[^\]]*\]\(\s*<?([^>\s)]+)>?(?:\s+[^)]*)?\)/gu)) {
      links.push({ href: match[1], line: lineNumber })
      record(match)
    }
    for (const match of searchable.matchAll(/!?\[([^\]]+)\]\[([^\]]*)\]/gu)) {
      const sourceLabel = match[2] === '' ? match[1] : match[2]
      const label = sourceLabel.trim().replace(/\s+/gu, ' ').toLowerCase()
      const href = definitions.get(label)
      if (href !== undefined) links.push({ href, line: lineNumber })
      record(match)
    }
    if (/^\s*\[[^\]]+\]:/u.test(searchable)) continue
    for (const match of searchable.matchAll(/!?\[([^\]]+)\]/gu)) {
      if (overlaps(match)) continue
      const label = match[1].trim().replace(/\s+/gu, ' ').toLowerCase()
      const href = definitions.get(label)
      if (href !== undefined) links.push({ href, line: lineNumber })
    }
  }
  return links
}

/**
 * Index visible claim markers, anchors, and references across repository Markdown.
 * The fixture and local SDD trees are excluded; maintainer documents remain included.
 * @param {string} root - Absolute handbook root.
 * @returns {Promise<DocumentClaimIndex>} Deterministic source locations in document/line order.
 */
export async function collectDocumentClaimMarkers(root) {
  const markers = []
  const anchors = []
  const references = []
  for (const absolute of await markdownPaths(root)) {
    const path = relative(root, absolute).split(sep).join('/')
    const lines = visibleLines(await readFile(absolute, 'utf8'))
    for (const { line, searchable, lineNumber } of lines) {
      const marker = parseClaimMarker(line, path, lineNumber)
      if (marker !== null) markers.push(marker)
      for (const match of searchable.matchAll(/<a\b[^>]*\bid\s*=\s*(['"])(claim-[^'"]*)\1[^>]*>/gu)) {
        anchors.push({ path, line: lineNumber, anchor: match[2] })
      }
    }
    for (const link of markdownLinks(lines)) {
      const hash = link.href.indexOf('#')
      const anchor = hash < 0 ? '' : link.href.slice(hash + 1)
      if (anchor.startsWith('claim-')) references.push({ path, line: link.line, anchor })
    }
  }
  return { markers, anchors, references }
}

function claimIdFromAnchor(anchor) {
  return anchor.slice('claim-'.length).toUpperCase()
}

function resolvedWithin(root, base, candidate) {
  if (candidate === '' || isAbsolute(candidate) || candidate.includes('\\') || candidate.includes('%')) return null
  const rootPath = resolve(root)
  const absolute = resolve(base, candidate)
  return absolute === rootPath || absolute.startsWith(`${rootPath}${sep}`) ? absolute : null
}

async function isRegularFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function parseClaimTarget(root, claim, target) {
  const parts = typeof target === 'string' ? target.split('#') : []
  const path = parts[0] ?? ''
  const expectedAnchor = `claim-${claim.id.toLowerCase()}`
  if (parts.length !== 2 || path === '' || parts[1] !== expectedAnchor || !path.startsWith('docs/')
    || !path.endsWith('.md') || path.includes('?') || path.includes('%')
    || resolvedWithin(root, root, path) === null) {
    return { valid: false, path }
  }
  return { valid: true, path, anchor: parts[1] }
}

/**
 * Build a GitHub blob URL with encoded path segments and an inclusive line fragment.
 * @param {UpstreamSource} source - Repository, full commit, canonical path, and one-based span.
 * @returns {string} Immutable source URL.
 */
export function buildUpstreamSourceUrl(source) {
  const repository = source.repository.replace(/\/+$/u, '')
  const path = source.path.split('/').map(segment => encodeURIComponent(segment)).join('/')
  const fragment = source.startLine === source.endLine
    ? `#L${source.startLine}`
    : `#L${source.startLine}-L${source.endLine}`
  return `${repository}/blob/${source.commit}/${path}${fragment}`
}

async function upstreamSourceIsValid(sourceRecord, source, baseline) {
  if (sourceRecord.repository !== baseline.repository || sourceRecord.commit !== baseline.commit
    || !Number.isInteger(sourceRecord.startLine) || !Number.isInteger(sourceRecord.endLine)
    || sourceRecord.startLine < 1 || sourceRecord.endLine < sourceRecord.startLine
    || sourceRecord.url !== buildUpstreamSourceUrl(sourceRecord)) return false
  if (!isCanonicalUpstreamPath(sourceRecord.path)) return false
  if (source === undefined) return true
  const text = await readUpstreamBlob({ source, commit: baseline.commit, path: sourceRecord.path })
  if (text === null) return false
  const lineCount = logicalLines(text).length
  return sourceRecord.endLine <= lineCount
}

/**
 * Validate both directions of claim coverage, immutable sources, and named probes.
 * With a source checkout, cited paths must name regular tracked blobs in pinned HEAD;
 * line counts use blob contents, including when worktree bytes differ.
 * @param {{ root: string, source?: string, baseline?: Baseline, facts?: UpstreamFacts, ledger: { claims: Claim[] } }} options - Absolute roots and schema-validated evidence.
 * @returns {Promise<EvidenceProblem[]>} Deterministic problems without modifying any input.
 * @throws {UpstreamInspectionError} If a cited checkout has a different HEAD or Git reads fail.
 */
export async function validateClaimTargets({ root, source, baseline, facts, ledger }) {
  const index = await collectDocumentClaimMarkers(root)
  const claims = new Map(ledger.claims.map(claim => [claim.id, claim]))
  const markersByTarget = new Map()
  for (const marker of index.markers) {
    const target = `${marker.path}#${marker.anchor}`
    const list = markersByTarget.get(target) ?? []
    list.push(marker)
    markersByTarget.set(target, list)
  }
  const errors = []
  const claimsWithResolvedTarget = new Set()
  for (const claim of ledger.claims) {
    for (const target of claim.documents) {
      const parsed = parseClaimTarget(root, claim, target)
      if (!parsed.valid) {
        errors.push(problem('CLAIM_TARGET_INVALID', { claimId: claim.id, path: parsed.path }))
        continue
      }
      const absolute = resolvedWithin(root, root, parsed.path)
      const markerList = markersByTarget.get(target) ?? []
      if (absolute === null || !(await isRegularFile(absolute)) || markerList.length === 0) {
        errors.push(problem('CLAIM_TARGET_MISSING', { claimId: claim.id, path: parsed.path }))
        continue
      }
      claimsWithResolvedTarget.add(claim.id)
      if (markerList.length > 1) {
        errors.push(problem('CLAIM_TARGET_DUPLICATE', { claimId: claim.id, path: parsed.path }))
        continue
      }
      const marker = markerList[0]
      if (marker.id !== claim.id || marker.anchor !== `claim-${marker.id.toLowerCase()}`) {
        errors.push(problem('CLAIM_MARKER_MISMATCH', { claimId: claim.id, path: marker.path }))
      } else if (!Buffer.from(marker.statement, 'utf8').equals(Buffer.from(claim.statement, 'utf8'))) {
        errors.push(problem('CLAIM_MARKER_STATEMENT_MISMATCH', { claimId: claim.id, path: marker.path }))
      }
    }
    for (const [sourceIndex, sourceRecord] of (claim.sources ?? []).entries()) {
      if (sourceRecord.type === 'upstream' && baseline !== undefined
        && !(await upstreamSourceIsValid(sourceRecord, source, baseline))) {
        errors.push(problem('UPSTREAM_SOURCE_INVALID', { claimId: claim.id, sourceIndex }))
      }
    }
    if (claim.probe !== undefined && (facts?.probes === undefined || !Object.hasOwn(facts.probes, claim.probe))) {
      errors.push(problem('PROBE_MISSING', { claimId: claim.id }))
    }
  }
  for (const marker of index.markers) {
    const claim = claims.get(marker.id)
    if (claim === undefined) {
      errors.push(problem('CLAIM_MARKER_ORPHAN', { claimId: marker.id, path: marker.path }))
    } else if (marker.anchor !== `claim-${marker.id.toLowerCase()}`) {
      if (!errors.some(error => error.code === 'CLAIM_MARKER_MISMATCH' && error.path === marker.path)) {
        errors.push(problem('CLAIM_MARKER_MISMATCH', { claimId: marker.id, path: marker.path }))
      }
    } else if (claimsWithResolvedTarget.has(marker.id)
      && !claim.documents.includes(`${marker.path}#${marker.anchor}`)) {
      errors.push(problem('CLAIM_MARKER_DOCUMENT_UNDECLARED', { claimId: marker.id, path: marker.path }))
    }
  }
  const markerLocations = new Set(index.markers.map(marker => `${marker.path}:${marker.line}:${marker.anchor}`))
  for (const anchor of index.anchors) {
    if (!CLAIM_ANCHOR_PATTERN.test(anchor.anchor)) {
      errors.push(problem('CLAIM_ANCHOR_INVALID', { path: anchor.path, line: anchor.line }))
    } else if (!markerLocations.has(`${anchor.path}:${anchor.line}:${anchor.anchor}`)) {
      errors.push(problem('CLAIM_ANCHOR_ORPHAN', { claimId: claimIdFromAnchor(anchor.anchor), path: anchor.path }))
    }
  }
  const knownAnchors = new Set(ledger.claims.map(claim => `claim-${claim.id.toLowerCase()}`))
  for (const reference of index.references) {
    if (!CLAIM_ANCHOR_PATTERN.test(reference.anchor)) {
      errors.push(problem('CLAIM_REFERENCE_INVALID', { path: reference.path, line: reference.line }))
    } else if (!knownAnchors.has(reference.anchor)) {
      errors.push(problem('CLAIM_REFERENCE_UNKNOWN', {
        claimId: claimIdFromAnchor(reference.anchor),
        path: reference.path,
        line: reference.line,
      }))
    }
  }
  return errors
}

async function explicitAnchors(path) {
  const anchors = new Set()
  for (const { searchable } of visibleLines(await readFile(path, 'utf8'))) {
    for (const match of searchable.matchAll(/<a id="([A-Za-z0-9_-]+)"><\/a>/gu)) anchors.add(match[1])
  }
  return anchors
}

async function markdownUpstreamSourceIsValid(url, source, baseline) {
  const match = /^https:\/\/github\.com\/deepseek-ai\/deepseek-harness\/blob\/([0-9a-f]{40})\/([^?#]+)#L([1-9]\d*)(?:-L([1-9]\d*))?$/u.exec(url)
  if (match === null) return false
  let path
  try {
    path = decodeURIComponent(match[2])
  } catch {
    return false
  }
  const startLine = Number(match[3])
  const endLine = Number(match[4] ?? match[3])
  if (!Number.isSafeInteger(startLine) || !Number.isSafeInteger(endLine)) return false
  return upstreamSourceIsValid({
    type: 'upstream',
    repository: 'https://github.com/deepseek-ai/deepseek-harness',
    commit: match[1], path, startLine, endLine, url,
  }, source, baseline)
}

/**
 * Check internal targets and visible upstream blob citations without external requests.
 * With a baseline, citations require its full SHA, a canonical path, and positive line bounds;
 * with a checkout, paths and bounds use pinned Git blobs. Historical docs/superpowers plans
 * retain their original citations. Simple single-line backtick spans and top-level
 * backtick/tilde fences are excluded; indented blocks and blockquote-prefixed fences are not parsed.
 * @param {string} root - Absolute handbook root.
 * @param {{ baseline?: Baseline, source?: string }} options - Current revision and optional upstream checkout.
 * @returns {Promise<EvidenceProblem[]>} Broken links with document paths and source lines.
 */
export async function validateMarkdownLinks(root, { baseline, source } = {}) {
  const errors = []
  const anchorCache = new Map()
  for (const absolute of await markdownPaths(root)) {
    const path = relative(root, absolute).split(sep).join('/')
    const lines = visibleLines(await readFile(absolute, 'utf8'))
    if (baseline !== undefined && !path.startsWith('docs/superpowers/')) {
      for (const { searchable, lineNumber } of lines) {
        for (const match of searchable.matchAll(/(?:https?:)?\/\/github\.com\/deepseek-ai\/deepseek-harness\/blob\/[^\s<>"`)]*/giu)) {
          if (!(await markdownUpstreamSourceIsValid(match[0], source, baseline))) {
            errors.push(problem('UPSTREAM_MARKDOWN_SOURCE_INVALID', { path, line: lineNumber }))
          }
        }
      }
    }
    for (const link of markdownLinks(lines)) {
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(link.href) || link.href.startsWith('//')) continue
      const pieces = link.href.split('#')
      if (pieces.length > 2) {
        errors.push(problem('INTERNAL_LINK_TARGET_MISSING', { path, line: link.line }))
        continue
      }
      let candidate
      let fragment
      try {
        candidate = decodeURIComponent(pieces[0])
        fragment = pieces[1] === undefined ? undefined : decodeURIComponent(pieces[1])
      } catch {
        errors.push(problem('INTERNAL_LINK_TARGET_MISSING', { path, line: link.line }))
        continue
      }
      const target = candidate === '' ? absolute : resolvedWithin(root, dirname(absolute), candidate)
      if (target === null || !(await isRegularFile(target))) {
        errors.push(problem('INTERNAL_LINK_TARGET_MISSING', { path, line: link.line }))
        continue
      }
      if (fragment !== undefined) {
        let anchors = anchorCache.get(target)
        if (anchors === undefined) {
          anchors = await explicitAnchors(target)
          anchorCache.set(target, anchors)
        }
        if (fragment === '' || !anchors.has(fragment)) {
          errors.push(problem('INTERNAL_LINK_FRAGMENT_MISSING', { path, line: link.line }))
        }
      }
    }
  }
  return errors
}

async function workflowPaths(root) {
  const directory = join(root, '.github/workflows')
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter(entry => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map(entry => join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, 'en'))
}

function repositoryProblem(path, field) {
  return problem('REPOSITORY_FILE_INVALID', { path, field })
}

function requiredWorkflowFields(text, baseline) {
  const lines = significantYamlLines(text)
  const grammar = [
    ['name: verify', '/name'],
    ['on:', '/on'],
    ['  push:', '/on/push'],
    ['  pull_request:', '/on/pull_request'],
    ['permissions:', '/permissions'],
    ['  contents: read', '/permissions/contents'],
    ['jobs:', '/jobs'],
    ['  verify:', '/jobs/verify'],
    ['    name: verify', '/jobs/verify/name'],
    ['    runs-on: ubuntu-latest', '/jobs/verify/runs-on'],
    ['    steps:', '/jobs/verify/steps'],
    ['      - name: Check out handbook', '/jobs/verify/steps/checkout/name'],
    [/^        uses: actions\/checkout(?:@.*)?$/u, '/jobs/verify/steps/checkout/uses'],
    ['        with:', '/jobs/verify/steps/checkout/with'],
    ['          path: handbook', '/jobs/verify/steps/checkout/with/path'],
    ['          persist-credentials: false', '/jobs/verify/steps/checkout/with/persist-credentials'],
    ['      - name: Set up Node', '/jobs/verify/steps/setup-node/name'],
    [/^        uses: actions\/setup-node(?:@.*)?$/u, '/jobs/verify/steps/setup-node/uses'],
    ['        with:', '/jobs/verify/steps/setup-node/with'],
    ['          node-version: 22.19.0', '/jobs/verify/steps/setup-node/with/node-version'],
    ['      - name: Check out pinned upstream', '/jobs/verify/steps/upstream/name'],
    [/^        uses: actions\/checkout(?:@.*)?$/u, '/jobs/verify/steps/upstream/uses'],
    ['        with:', '/jobs/verify/steps/upstream/with'],
    ['          repository: deepseek-ai/deepseek-harness', '/jobs/verify/steps/upstream/with/repository'],
    [`          ref: ${baseline.commit}`, '/jobs/verify/steps/upstream/with/ref'],
    ['          path: upstream', '/jobs/verify/steps/upstream/with/path'],
    ['          fetch-depth: 0', '/jobs/verify/steps/upstream/with/fetch-depth'],
    ['          fetch-tags: true', '/jobs/verify/steps/upstream/with/fetch-tags'],
    ['          persist-credentials: false', '/jobs/verify/steps/upstream/with/persist-credentials'],
    ['      - name: Test', '/jobs/verify/steps/test/name'],
    ['        run: npm test', '/jobs/verify/steps/test/run'],
    ['        working-directory: handbook', '/jobs/verify/steps/test/working-directory'],
    ['      - name: Verify evidence', '/jobs/verify/steps/verify-evidence/name'],
    ['        run: npm run verify -- --root "$GITHUB_WORKSPACE/handbook" --source "$GITHUB_WORKSPACE/upstream"', '/jobs/verify/steps/verify-evidence/run'],
    ['        working-directory: handbook', '/jobs/verify/steps/verify-evidence/working-directory'],
  ]
  for (const [index, [expected, field]] of grammar.entries()) {
    const line = lines[index]?.text
    if (line === undefined || (typeof expected === 'string' ? line !== expected : !expected.test(line))) return [field]
  }
  return lines.length === grammar.length ? [] : ['/syntax']
}

function workflowActionProblems(text, path) {
  const errors = []
  for (const { text: line, line: lineNumber } of significantYamlLines(text)) {
    const entry = /^ *(?:- +)?([A-Za-z][A-Za-z0-9_-]*):(?: +(.*))?$/u.exec(line)
    if (entry === null) return [repositoryProblem(path, '/syntax')]
    const value = (entry[2] ?? '').replace(/\s+#.*$/u, '').trim()
    if (entry[1] === 'uses') {
      if (!/^\.[/][^\s'"[\]{}]+$/u.test(value) && !ACTION_REF_PATTERN.test(value)) {
        errors.push(problem('WORKFLOW_USES_UNPINNED', { path, line: lineNumber }))
      }
    } else if (/^[!&*[\]{}>|?]/u.test(value)) {
      return [repositoryProblem(path, '/syntax')]
    }
  }
  return errors
}

/**
 * Require the ordered verify workflow and local-or-full-SHA Action references.
 * The required grammar binds triggers, fields, and commands to their steps; other
 * workflows accept only bare block keys and single-line values. Comment-only lines
 * are ignored, and Action pin updates do not require changing the structural grammar.
 * @param {string} root - Absolute handbook root.
 * @param {Baseline} baseline - Current upstream revision required by the checkout step.
 * @returns {Promise<EvidenceProblem[]>} Workflow structure and pin problems in path order.
 */
export async function validateWorkflowPins(root, baseline) {
  const errors = []
  const workflows = await workflowPaths(root)
  const requiredPath = join(root, '.github/workflows/verify.yml')
  if (!workflows.includes(requiredPath)) {
    errors.push(repositoryProblem('.github/workflows/verify.yml', '/presence'))
  }
  for (const absolute of workflows) {
    const path = relative(root, absolute).split(sep).join('/')
    const text = await readFile(absolute, 'utf8')
    if (path === '.github/workflows/verify.yml') {
      for (const field of requiredWorkflowFields(text, baseline)) errors.push(repositoryProblem(path, field))
    }
    errors.push(...workflowActionProblems(text, path))
  }
  return errors
}

function significantYamlLines(text) {
  return logicalLines(text)
    .map((line, index) => ({ text: line, line: index + 1 }))
    .filter(entry => entry.text.trim() !== '' && !entry.text.trimStart().startsWith('#'))
}

function unsupportedYamlSyntax(text) {
  return significantYamlLines(text).some(({ text: line }) => {
    if (/[\t\r]/u.test(line)) return true
    // The form's required empty-label token is structural, not a scalar.
    if (line === 'labels: []') return false
    const field = /^\s*(?:-\s+)?[a-z][a-z0-9_-]*:(?: +(.*))?$/u.exec(line)
    const item = /^\s*-\s+(.*)$/u.exec(line)
    const scalar = field === null ? item?.[1] : field[1] ?? ''
    return scalar === undefined || parseSingleLineScalar(scalar) === undefined
  })
}

function duplicateTopLevelKey(lines) {
  const seen = new Set()
  for (const { text } of lines) {
    const match = /^([a-z][a-z-]*):/u.exec(text)
    if (match === null) continue
    if (seen.has(match[1])) return match[1]
    seen.add(match[1])
  }
  return undefined
}

/**
 * Validate the ordered CFF software/report records and restricted single-line scalars.
 * Comment-only lines are ignored; parseSingleLineScalar defines the supported text values.
 * @param {string} text - Complete CITATION.cff content.
 * @param {Baseline} baseline - Current upstream revision whose first eight characters identify the snapshot.
 * @returns {EvidenceProblem[]} The first CFF field or syntax problem, or an empty array.
 */
export function validateCffText(text, baseline) {
  if (unsupportedYamlSyntax(text)) return [repositoryProblem('CITATION.cff', '/syntax')]
  const lines = significantYamlLines(text)
  const duplicate = duplicateTopLevelKey(lines)
  if (duplicate !== undefined) return [repositoryProblem('CITATION.cff', `/${duplicate}`)]
  const required = [
    [/^cff-version: 1\.2\.0$/u, '/cff-version'],
    [/^message: \S.*$/u, '/message'],
    [/^title: DeepSeek Harness Analysis$/u, '/title'],
    [/^type: software$/u, '/type'],
    [/^authors:$/u, '/authors'],
    [/^  - name: yang0228$/u, '/authors'],
    [/^repository-code: https:\/\/github\.com\/yang0228\/deepseek-harness-analysis$/u, '/repository-code'],
    [new RegExp(`^version: snapshot-${baseline.commit.slice(0, 8)}$`, 'u'), '/version'],
    [/^preferred-citation:$/u, '/preferred-citation'],
    [/^  type: report$/u, '/preferred-citation/type'],
    [/^  authors:$/u, '/preferred-citation/authors'],
    [/^    - name: yang0228$/u, '/preferred-citation/authors'],
    [/^  title: DeepSeek Harness Analysis$/u, '/preferred-citation/title'],
    [new RegExp(`^  version: snapshot-${baseline.commit.slice(0, 8)}$`, 'u'), '/preferred-citation/version'],
    [/^  url: https:\/\/github\.com\/yang0228\/deepseek-harness-analysis$/u, '/preferred-citation/url'],
    [/^  year: 2026$/u, '/preferred-citation/year'],
  ]
  for (let index = 0; index < required.length; index += 1) {
    const [pattern, field] = required[index]
    if (lines[index] === undefined || !pattern.test(lines[index].text)) {
      return [repositoryProblem('CITATION.cff', field)]
    }
  }
  return lines.length === required.length ? [] : [repositoryProblem('CITATION.cff', '/syntax')]
}

function scalarValue(source) {
  return parseSingleLineScalar(source)
}

/**
 * Validate the supported Issue Form items using restricted single-line scalars.
 * The exact labels: [] token is required; other flow collections and multiline YAML
 * are unsupported. Comment-only lines are ignored and quoted values have no escapes.
 * @param {string} text - Complete Issue Form content.
 * @param {string} path - Repository-relative Issue Form path for diagnostics.
 * @returns {EvidenceProblem[]} The first form field or syntax problem, or an empty array.
 */
export function validateIssueFormText(text, path) {
  if (unsupportedYamlSyntax(text)) return [repositoryProblem(path, '/syntax')]
  const lines = significantYamlLines(text)
  const top = new Map()
  const items = []
  let inBody = false
  let current
  let section
  for (const { text: line } of lines) {
    if (!inBody) {
      if (line === 'body:') {
        if (top.has('body')) return [repositoryProblem(path, '/body')]
        top.set('body', '')
        inBody = true
        continue
      }
      const match = /^([a-z][a-z-]*):(?:\s+(.*))?$/u.exec(line)
      if (match === null || !['name', 'description', 'title', 'labels'].includes(match[1])) {
        return [repositoryProblem(path, '/syntax')]
      }
      if (top.has(match[1])) return [repositoryProblem(path, `/${match[1]}`)]
      top.set(match[1], match[2] ?? '')
      continue
    }
    const itemMatch = /^  - type:\s*(\S.*)$/u.exec(line)
    if (itemMatch !== null) {
      current = { type: scalarValue(itemMatch[1]), attributes: new Map(), options: [], required: undefined }
      items.push(current)
      section = undefined
      continue
    }
    if (current === undefined) return [repositoryProblem(path, '/body')]
    const itemIndex = items.length - 1
    const idMatch = /^    id:\s*(\S.*)$/u.exec(line)
    if (idMatch !== null) {
      if (current.id !== undefined) return [repositoryProblem(path, `/body/${itemIndex}/id`)]
      current.id = scalarValue(idMatch[1])
      section = undefined
      continue
    }
    if (line === '    attributes:') {
      if (current.hasAttributes) return [repositoryProblem(path, `/body/${itemIndex}/attributes`)]
      current.hasAttributes = true
      section = 'attributes'
      continue
    }
    if (line === '    validations:') {
      if (current.hasValidations) return [repositoryProblem(path, `/body/${itemIndex}/validations`)]
      current.hasValidations = true
      section = 'validations'
      continue
    }
    const attributeMatch = /^      (label|description|placeholder|value):\s*(\S.*)$/u.exec(line)
    if (section === 'attributes' && attributeMatch !== null) {
      if (current.attributes.has(attributeMatch[1])) {
        return [repositoryProblem(path, `/body/${itemIndex}/attributes/${attributeMatch[1]}`)]
      }
      current.attributes.set(attributeMatch[1], scalarValue(attributeMatch[2]))
      continue
    }
    if (section === 'attributes' && line === '      options:') {
      if (current.hasOptions) return [repositoryProblem(path, `/body/${itemIndex}/attributes/options`)]
      current.hasOptions = true
      section = 'options'
      continue
    }
    const checkboxOptionMatch = /^        - label:\s*(\S.*)$/u.exec(line)
    if (section === 'options' && current.type === 'checkboxes' && checkboxOptionMatch !== null) {
      current.options.push({ label: scalarValue(checkboxOptionMatch[1]), required: undefined })
      continue
    }
    const checkboxRequiredMatch = /^          required:\s*(\S+)$/u.exec(line)
    if (section === 'options' && current.type === 'checkboxes' && checkboxRequiredMatch !== null) {
      const option = current.options.at(-1)
      if (option === undefined || option.required !== undefined
        || !['true', 'false'].includes(checkboxRequiredMatch[1])) {
        return [repositoryProblem(path, `/body/${itemIndex}/attributes/options/${Math.max(0, current.options.length - 1)}/required`)]
      }
      option.required = checkboxRequiredMatch[1] === 'true'
      continue
    }
    const dropdownOptionMatch = /^        -\s+(\S.*)$/u.exec(line)
    if (section === 'options' && current.type === 'dropdown' && dropdownOptionMatch !== null
      && !dropdownOptionMatch[1].startsWith('label:')) {
      current.options.push(scalarValue(dropdownOptionMatch[1]))
      continue
    }
    const requiredMatch = /^      required:\s*(\S+)$/u.exec(line)
    if (section === 'validations' && requiredMatch !== null) {
      if (current.required !== undefined || !['true', 'false'].includes(requiredMatch[1])) {
        return [repositoryProblem(path, `/body/${itemIndex}/validations/required`)]
      }
      current.required = requiredMatch[1] === 'true'
      continue
    }
    return [repositoryProblem(path, `/body/${itemIndex}/syntax`)]
  }
  for (const key of ['name', 'description', 'title', 'labels', 'body']) {
    if (!top.has(key)) return [repositoryProblem(path, `/${key}`)]
  }
  for (const key of ['name', 'description', 'title']) {
    if (scalarValue(top.get(key)) === '') return [repositoryProblem(path, `/${key}`)]
  }
  if (top.get('labels') !== '[]') return [repositoryProblem(path, '/labels')]
  if (items.length === 0) return [repositoryProblem(path, '/body')]
  const ids = new Set()
  for (const [index, item] of items.entries()) {
    if (!['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'].includes(item.type)) {
      return [repositoryProblem(path, `/body/${index}/type`)]
    }
    if (!item.hasAttributes) return [repositoryProblem(path, `/body/${index}/attributes`)]
    if (item.type === 'markdown') {
      if ((item.attributes.get('value') ?? '') === '') {
        return [repositoryProblem(path, `/body/${index}/attributes/value`)]
      }
      continue
    }
    if (item.id === undefined || !/^[a-z][a-z0-9_-]*$/u.test(item.id)) {
      return [repositoryProblem(path, `/body/${index}/id`)]
    }
    if (ids.has(item.id)) return [repositoryProblem(path, '/body/id')]
    ids.add(item.id)
    if ((item.attributes.get('label') ?? '') === '') {
      return [repositoryProblem(path, `/body/${index}/attributes/label`)]
    }
    if (item.type === 'dropdown'
      && (item.options.length === 0 || item.options.some(option => option === ''))) {
      return [repositoryProblem(path, `/body/${index}/attributes/options`)]
    }
    if (item.type === 'checkboxes'
      && (item.options.length === 0 || item.options.some(option => option.label === ''))) {
      return [repositoryProblem(path, `/body/${index}/attributes/options`)]
    }
  }
  return []
}

const COMMUNITY_PATHS = [
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
  'NOTICE.md',
  'CITATION.cff',
  'docs/maintainer/repository-settings.md',
  '.github/ISSUE_TEMPLATE/factual-error.yml',
  '.github/ISSUE_TEMPLATE/upstream-drift.yml',
  '.github/ISSUE_TEMPLATE/analysis-proposal.yml',
  '.github/pull_request_template.md',
]

/**
 * Check required community files, placeholders, final newlines, and CFF/Form grammar.
 * @param {string} root - Absolute handbook root.
 * @param {Baseline} baseline - Current upstream revision used by CITATION.cff.
 * @returns {Promise<EvidenceProblem[]>} Problems in the required-file order.
 */
export async function validateRepositoryFiles(root, baseline) {
  const errors = []
  for (const path of COMMUNITY_PATHS) {
    let text
    try {
      text = await readFile(join(root, path), 'utf8')
    } catch {
      errors.push(repositoryProblem(path, '/presence'))
      continue
    }
    if (text.length === 0) {
      errors.push(repositoryProblem(path, '/content'))
      continue
    }
    if (/(?:TODO|TBD|CHANGE_ME|example@example)/u.test(text)) {
      errors.push(repositoryProblem(path, '/placeholder'))
      continue
    }
    if (!text.endsWith('\n') || text.endsWith('\n\n')) {
      errors.push(repositoryProblem(path, '/final-newline'))
      continue
    }
    if (path === 'CITATION.cff') errors.push(...validateCffText(text, baseline))
    if (path.startsWith('.github/ISSUE_TEMPLATE/')) errors.push(...validateIssueFormText(text, path))
  }
  return errors
}

/** Aggregate evidence failures with a detached copy of their structured locations. */
export class EvidenceVerificationError extends Error {
  /**
   * @param {EvidenceProblem[]} errors - Ordered verification problems.
   */
  constructor(errors) {
    super('EVIDENCE_VERIFICATION_FAILED')
    this.name = 'EvidenceVerificationError'
    /** @readonly */
    this.errors = structuredClone(errors)
  }
}

async function readJson(root, path, code) {
  let text
  try {
    text = await readFile(join(root, path), 'utf8')
  } catch {
    throw new EvidenceVerificationError([problem(code, { path, field: '/presence' })])
  }
  try {
    const value = JSON.parse(text)
    if (!isRecord(value)) {
      throw new EvidenceVerificationError([problem(code, {
        path, field: code === 'REPOSITORY_FILE_INVALID' ? '/content' : '/',
      })])
    }
    return value
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new EvidenceVerificationError([problem(code, { path, field: '/content' })])
  }
}

function jsonPointerSegment(value) {
  return String(value).replace(/~/gu, '~0').replace(/\//gu, '~1')
}

function firstJsonDifference(actual, expected, pointer = '') {
  if (Object.is(actual, expected)) return undefined
  if (Array.isArray(actual) !== Array.isArray(expected)) return pointer === '' ? '/' : pointer
  if (Array.isArray(actual) && Array.isArray(expected)) {
    const length = Math.max(actual.length, expected.length)
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(actual, index) || !Object.hasOwn(expected, index)) return `${pointer}/${index}`
      const difference = firstJsonDifference(actual[index], expected[index], `${pointer}/${index}`)
      if (difference !== undefined) return difference
    }
    return undefined
  } else if (actual !== null && expected !== null
    && typeof actual === 'object' && typeof expected === 'object') {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    for (const key of keys) {
      const child = `${pointer}/${jsonPointerSegment(key)}`
      if (!Object.hasOwn(actual, key) || !Object.hasOwn(expected, key)) return child
      const difference = firstJsonDifference(actual[key], expected[key], child)
      if (difference !== undefined) return difference
    }
    return undefined
  }
  return pointer === '' ? '/' : pointer
}

async function checkEvidence({ root, source }) {
  const inputs = await Promise.allSettled([
    readJson(root, 'evidence/baseline.json', 'BASELINE_SCHEMA_ERROR'),
    readJson(root, 'evidence/claims.json', 'LEDGER_SCHEMA_ERROR'),
    readJson(root, 'evidence/observations/upstream-facts.json', 'REPOSITORY_FILE_INVALID'),
  ])
  const [baseline, ledger, committed] = inputs.map(result => result.status === 'fulfilled' ? result.value : undefined)
  const validators = [
    () => validateBaseline(baseline),
    () => validateClaimsLedger(ledger, baseline),
    () => [],
  ]
  const errors = []
  for (const [index, result] of inputs.entries()) {
    if (result.status === 'fulfilled') errors.push(...validators[index]())
    else if (result.reason instanceof EvidenceVerificationError) errors.push(...result.reason.errors)
    else throw result.reason
  }
  if (errors.length === 0) {
    errors.push(...await validateClaimTargets({ root, source, baseline, facts: committed, ledger }))
    errors.push(...await validateMarkdownLinks(root, { baseline, source }))
    errors.push(...await validateWorkflowPins(root, baseline))
    errors.push(...await validateRepositoryFiles(root, baseline))
  }
  if (source !== undefined && errors.length === 0) {
    const observed = await inspectUpstream({ source, baseline })
    const baselineField = ['commitDate', 'gitDescribe', 'rootPackageVersion']
      .find(field => observed[field] !== baseline[field])
    const difference = baselineField === undefined ? firstJsonDifference(observed, committed) : `/${baselineField}`
    if (difference !== undefined) errors.push(problem('OBSERVATION_DRIFT', { path: difference }))
  }
  return { errors, claimCount: Array.isArray(ledger?.claims) ? ledger.claims.length : 0 }
}

/**
 * Aggregate evidence-file, schema, document, workflow, and optional live checks.
 * File-read and JSON-syntax failures retain repository paths and /presence or /content fields.
 * Successful live inspection checks baseline metadata before comparing committed observations.
 * @param {{ root: string, source?: string }} options - Handbook root and optional absolute upstream checkout.
 * @returns {Promise<EvidenceProblem[]>} Deterministically ordered evidence problems.
 * @throws {UpstreamInspectionError} A source preflight or inspection failure.
 */
export async function collectEvidenceErrors(options) {
  return (await checkEvidence(options)).errors
}

/**
 * Verify evidence without rewriting the handbook or upstream checkout.
 * @param {{ root: string, source?: string }} options - Handbook root and optional absolute upstream checkout.
 * @returns {Promise<{ inspectedUpstream: boolean, claimCount: number }>} Summary; offline mode explicitly skips inspection.
 * @throws {EvidenceVerificationError | UpstreamInspectionError} Structured evidence or inspection failures.
 */
export async function verifyEvidence({ root, source }) {
  const { errors, claimCount } = await checkEvidence({ root, source })
  if (errors.length > 0) throw new EvidenceVerificationError(errors)
  return { inspectedUpstream: source !== undefined, claimCount }
}

function parseOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if ((flag !== '--root' && flag !== '--source') || value === undefined || value.startsWith('--')
      || options[flag.slice(2)] !== undefined) {
      throw new EvidenceVerificationError([problem('VERIFIER_USAGE', { path: '/' })])
    }
    options[flag.slice(2)] = value
  }
  return { root: options.root ?? process.cwd(), source: options.source }
}

/**
 * Run [--root <path>] [--source <path>], defaulting the root to the current directory.
 * @param {string[]} [argv] - CLI option tokens.
 * @param {CommandIO} [io] - Success stdout and failure stderr sinks.
 * @returns {Promise<0 | 1>} Zero with one success JSON object, or one with one stderr error object.
 */
export async function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  try {
    const summary = await verifyEvidence(parseOptions(argv))
    io.stdout.write(formatJson({ ok: true, ...summary }))
    return 0
  } catch (error) {
    let errors
    if (error instanceof EvidenceVerificationError) {
      errors = error.errors.map(({ code, path, field, line, claimId, sourceIndex }) => ({
        code,
        path,
        field,
        line,
        claimId,
        sourceIndex,
      }))
    } else if (error instanceof UpstreamInspectionError) {
      errors = [{ code: error.code, ...error.details }]
    } else {
      errors = [{ code: 'VERIFIER_INTERNAL_ERROR' }]
    }
    io.stderr.write(formatJson({ ok: false, errors }))
    return 1
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main()
}
