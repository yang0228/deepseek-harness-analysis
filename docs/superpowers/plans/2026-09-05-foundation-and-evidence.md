# Foundation and Evidence Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the independent, zero-dependency repository foundation, pinned evidence data, read-only upstream inspector, offline verifier, CI workflow, and community-governance files.

**Architecture:** Two importable Node.js ESM command modules form the evidence engine. The inspector validates a clean checkout at the configured SHA before extracting normalized observations; the verifier validates repository-owned data and documents, and optionally compares them with a fresh inspection. Tests create disposable Git repositories and handbook trees, while GitHub Actions repeats the same checks against the exact upstream commit.

**Tech Stack:** Node.js `^22.19.0 || >=24.0.0`, Node built-ins, `node:test`, Git, JSON, YAML, Markdown, GitHub Actions.

**Spec:** [`docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`](../specs/2026-09-04-evidence-handbook-design.md)

## Global Constraints

- Work only in the independent `deepseek-harness-analysis` repository. Treat `/Users/qingyang/github_repo/deepseek-harness` as read-only upstream input.
- Pin all upstream facts to `76fda729799fe9b3848dbe2c211d4b231032b81e`; reject a dirty or different checkout before emitting formal observation JSON.
- Use ESM and Node built-ins only. Do not add `dependencies`, `devDependencies`, a lockfile, JSON Schema tooling, a YAML parser, a Markdown parser, a browser renderer, or network access to either script.
- Serialize committed JSON in the schema-defined field order shown below, with two-space indentation and exactly one trailing newline. Sort discovered arrays and map keys before constructing their objects; do not alphabetize semantic record fields.
- Reject unknown Profile or Preset syntax with named errors. Never use `eval`, `Function`, `vm`, shell interpolation, or a best-effort fallback.
- Keep command output machine-readable. Inspector success writes one `UpstreamFacts` JSON object to stdout; any failure leaves stdout empty and writes one `{ "ok": false, "error": { "code": string, "details": object } }` JSON object to stderr. Verifier success/failure uses the structures defined in Task 6. Tests assert parsed codes and fields, never diagnostic sentences.
- Treat external-source primary-authority judgments as human review. The verifier checks metadata presence but makes no HTTP requests.
- Pin every non-local GitHub Action to a full 40-character lowercase SHA and grant only `contents: read`.
- Do not create the GitHub remote, change account settings, or create `snapshot-76fda729` in this plan. Those operations are gated by the final publication plan.
- Treat `yang0228` and `https://github.com/yang0228/deepseek-harness-analysis` as user-approved design constants for citation/community files. The publication preflight verifies that authenticated ownership and exact destination before any remote mutation; Task 8 does not discover or substitute another identity.
- Complete each task with its focused checks and commit before starting the next task.

## File Map

- `package.json` — private ESM package and zero-install commands.
- `.editorconfig`, `.gitignore`, `LICENSE` — deterministic repository conventions and MIT grant.
- `evidence/baseline.json` — authoritative upstream baseline.
- `evidence/claims.json` — schema-v1 canonical claim ledger, initially empty.
- `evidence/observations/upstream-facts.json` — reviewed inspector output.
- `scripts/inspect-upstream.mjs` — Git preflight, strict Profile/Preset extraction, normalized observations, CLI.
- `scripts/verify-evidence.mjs` — schema, target, source, probe, workflow-pin, and optional live-check validation.
- `test/helpers/fixture-repo.mjs` — disposable deterministic Git repository builder.
- `test/fixtures/upstream-template/` — independently authored, shape-only synthetic files without copied upstream prose/code or a committed `.git` directory.
- `test/fixtures/handbook/` — valid and invalid document/ledger inputs.
- `test/fixtures/workflows/` — local, full-SHA, tag, and malformed `uses:` cases.
- `test/inspect-upstream.test.mjs`, `test/parser-contract.test.mjs`, `test/read-only-inspector.test.mjs`, `test/verify-evidence.test.mjs`, `test/evidence-schema-contract.test.mjs`, `test/evidence-target-contract.test.mjs`, `test/verify-cli-contract.test.mjs`, `test/repository-workflow-contract.test.mjs`, `test/repository-community-contract.test.mjs` — unit, CLI, and end-to-end coverage.
- `.github/workflows/verify.yml`, `.github/dependabot.yml` — exact-baseline CI and Action update proposals.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `NOTICE.md`, `CITATION.cff` — public-project policy.
- `.github/ISSUE_TEMPLATE/factual-error.yml`, `.github/ISSUE_TEMPLATE/upstream-drift.yml`, `.github/ISSUE_TEMPLATE/analysis-proposal.yml`, `.github/pull_request_template.md` — evidence-oriented contribution intake.
- `docs/maintainer/repository-settings.md` — settings that Git cannot enforce.

## Public Module Contracts

Implement these signatures and keep CLI invocation behind an `import.meta.url === pathToFileURL(process.argv[1]).href` guard:

```ts
// scripts/inspect-upstream.mjs
interface CommandIO {
  stdout: { write(chunk: string): unknown }
  stderr: { write(chunk: string): unknown }
}

export declare class UpstreamInspectionError extends Error {
  readonly code: string
  readonly details: UpstreamInspectionDetails
  constructor(code: string, details?: UpstreamInspectionDetails)
}

export declare function formatJson(value: unknown): string
export declare function parseProfileTemplates(sourceText: string): ProfileObservation[]
export declare function parsePresetMetadata(sourceText: string, sourcePath: string): Omit<PresetObservation, 'id'>
export declare function readPresetRoster(source: string): Promise<PresetObservation[]>
export declare function inspectUpstream(options: { source: string, baseline: Baseline }): Promise<UpstreamFacts>
export declare function main(argv?: string[], io?: CommandIO): Promise<0 | 1>
```

```ts
// scripts/verify-evidence.mjs
interface CommandIO {
  stdout: { write(chunk: string): unknown }
  stderr: { write(chunk: string): unknown }
}

export declare class EvidenceVerificationError extends Error {
  readonly errors: EvidenceProblem[]
  constructor(errors: EvidenceProblem[])
}

export declare function buildUpstreamSourceUrl(source: UpstreamSource): string
export declare function validateBaseline(value: unknown): EvidenceProblem[]
export declare function validateClaimsLedger(value: unknown, baseline: Baseline): EvidenceProblem[]
export declare function parseClaimMarker(line: string, path: string, lineNumber: number): ClaimMarker | null
export declare function collectDocumentClaimMarkers(root: string): Promise<DocumentClaimIndex>
export declare function validateClaimTargets(options: { root: string, source?: string, baseline?: Baseline, facts?: UpstreamFacts, ledger: { claims: Claim[] } }): Promise<EvidenceProblem[]>
export declare function validateMarkdownLinks(root: string): Promise<EvidenceProblem[]>
export declare function validateWorkflowPins(root: string): Promise<EvidenceProblem[]>
export declare function validateCffText(text: string): EvidenceProblem[]
export declare function validateIssueFormText(text: string, path: string): EvidenceProblem[]
export declare function validateRepositoryFiles(root: string): Promise<EvidenceProblem[]>
export declare function collectEvidenceErrors(options: { root: string, source?: string }): Promise<EvidenceProblem[]>
export declare function verifyEvidence(options: { root: string, source?: string }): Promise<{ inspectedUpstream: boolean, claimCount: number }>
export declare function main(argv?: string[], io?: CommandIO): Promise<0 | 1>
```

Use these JSDoc data contracts:

```js
/** @typedef {{ repository: string, commit: string, commitDate: string, gitDescribe: string, rootPackageVersion: string, verificationDate: string }} Baseline */
/** @typedef {{ id: string, bundles: string[], patchReload: 'live' | 'startup' }} ProfileObservation */
/** @typedef {{ id: string, name: string, description: string, order: number }} PresetObservation */
/** @typedef {{ schemaVersion: 1, repository: string, commit: string, commitDate: string, gitDescribe: string, rootPackageVersion: string, profiles: ProfileObservation[], presets: PresetObservation[], probes: Record<string, unknown> }} UpstreamFacts */
/** @typedef {{ type: 'upstream', repository: string, commit: string, path: string, startLine: number, endLine: number, url: string }} UpstreamSource */
/** @typedef {{ type: 'external', url: string, publisher: string, accessDate: string } & ({ version: string, commit?: never } | { version?: never, commit: string } | { version?: never, commit?: never })} ExternalSource */
/** @typedef {{ path?: string, line?: number, offset?: number, operation?: string, expected?: unknown, actual?: unknown, dirtyPaths?: string[] }} UpstreamInspectionDetails */
/** @typedef {'verified' | 'qualified'} EvidenceConfidence */
/** @typedef {'released' | 'experimental' | 'not-applicable'} ClaimMaturity */
/** @typedef {'enabled' | 'optional' | 'disabled' | 'experimental'} CapabilityAvailability */
/** @typedef {{ id: string, statement: string, kind: 'upstream-fact' | 'analysis-inference' | 'external-comparison', confidence: EvidenceConfidence, maturity: ClaimMaturity, documents: string[], sources: Array<UpstreamSource | ExternalSource>, qualification?: string, probe?: string }} Claim */
/** @typedef {{ path: string, line: number, anchor: string, id: string, statement: string }} ClaimMarker */
/** @typedef {{ markers: ClaimMarker[], anchors: Array<{ path: string, line: number, anchor: string }>, references: Array<{ path: string, line: number, anchor: string }> }} DocumentClaimIndex */
/** @typedef {{ code: string, path?: string, field?: string, line?: number, claimId?: string, sourceIndex?: number, message: string }} EvidenceProblem */
```

Stable probe keys are `upstream.commit`, `upstream.commit-date`, `upstream.git-describe`, `upstream.root-package-version`, `profile:<id>`, and `preset:<id>`. Each Profile/Preset probe value is its complete normalized observation object.

The claim fields encode independent questions. `confidence` states how strongly the conclusion is supported; `maturity` states only the DeepSeek Harness release status of its subject. Capability tables use the separate `CapabilityAvailability` vocabulary and must not derive availability from either claim field. The allowed claim combinations are exhaustive:

| `kind` | Allowed `confidence` | Allowed `maturity` |
| --- | --- | --- |
| `upstream-fact` | `verified`, `qualified` | `released`, `experimental` |
| `analysis-inference` | `qualified` only | `released`, `experimental`, `not-applicable` |
| `external-comparison` | `verified`, `qualified` | `not-applicable` only |

Every `qualified` claim has a non-empty `qualification`; `verified` claims omit that field. Every external source contains exactly `type`, `url`, `publisher`, and `accessDate`, plus zero or one of `version` and `commit`. If present, `version` is a non-empty string and `commit` is a 40-character lowercase hexadecimal SHA; supplying both fails with `EXTERNAL_SOURCE_VERSION_COMMIT_CONFLICT`. A source carrying `commit` must use a recognized GitHub `/blob/<revision>/...` or `/tree/<revision>/...` URL, and its decoded revision must equal that exact commit. A full-SHA revision requires matching `commit`; a different SHA, symbolic revision paired with `commit`, encoded separator, missing commit, or commit on another URL form fails with `EXTERNAL_SOURCE_REVISION_MISMATCH`.

Every document target has the form `docs/path.md#claim-<lower-case-claim-id>`. A highlighted conclusion occupies one physical line as `<a id="claim-dsh-arch-001"></a> **Claim \`DSH-ARCH-001\`:** ${claim.statement}`. The visible id must equal the ledger id, the anchor must be `claim-${id.toLowerCase()}`, and the complete text after that exact marker prefix must equal `claim.statement` byte-for-byte with no trimming or Markdown normalization. A claim repeated in multiple declared documents therefore uses the same conclusion sentence in each marker. This marker is the only construct that creates document-to-ledger coverage; ordinary links merely reference it.

Error assertions compare stable error codes and structured locations, never the full prose message. Inspector codes used by this plan are `INSPECTOR_USAGE`, `INSPECTOR_BASELINE_INVALID`, `INSPECTOR_INTERNAL_ERROR`, `SOURCE_NOT_ABSOLUTE`, `SOURCE_NOT_DIRECTORY`, `UPSTREAM_GIT_READ_ERROR`, `UPSTREAM_HEAD_MISMATCH`, `UPSTREAM_DIRTY`, `UPSTREAM_FILE_MISSING`, `UPSTREAM_FILE_READ_ERROR`, `UPSTREAM_PACKAGE_PARSE_ERROR`, `PROFILE_TEMPLATES_PARSE_ERROR`, and `PRESET_METADATA_PARSE_ERROR`. Verifier codes used by this plan are `VERIFIER_USAGE`, `VERIFIER_INTERNAL_ERROR`, `BASELINE_SCHEMA_ERROR`, `LEDGER_SCHEMA_ERROR`, `CLAIM_ID_DUPLICATE`, `CLAIM_KIND_CONFIDENCE_INCOMPATIBLE`, `CLAIM_KIND_MATURITY_INCOMPATIBLE`, `QUALIFICATION_REQUIRED`, `QUALIFICATION_UNEXPECTED`, `EXTERNAL_SOURCE_VERSION_COMMIT_CONFLICT`, `EXTERNAL_SOURCE_REVISION_MISMATCH`, `CLAIM_TARGET_INVALID`, `CLAIM_TARGET_MISSING`, `CLAIM_TARGET_DUPLICATE`, `CLAIM_MARKER_ORPHAN`, `CLAIM_MARKER_DOCUMENT_UNDECLARED`, `CLAIM_ANCHOR_ORPHAN`, `CLAIM_MARKER_MISMATCH`, `CLAIM_MARKER_STATEMENT_MISMATCH`, `CLAIM_REFERENCE_UNKNOWN`, `CLAIM_ANCHOR_INVALID`, `CLAIM_REFERENCE_INVALID`, `INTERNAL_LINK_TARGET_MISSING`, `INTERNAL_LINK_FRAGMENT_MISSING`, `UPSTREAM_SOURCE_INVALID`, `PROBE_MISSING`, `WORKFLOW_USES_UNPINNED`, `REPOSITORY_FILE_INVALID`, and `OBSERVATION_DRIFT`.

---

### Task 1: Bootstrap the deterministic repository

**Files:**

- Create: `package.json`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `evidence/baseline.json`
- Create: `evidence/claims.json`
- Create: `evidence/observations/upstream-facts.json`
- Create: `test/inspect-upstream.test.mjs`
- Create: `scripts/inspect-upstream.mjs`

**Interfaces:** Input is a new clean repository running a supported Node version. Preconditions are no package dependency fields and no generated lockfile. Output is the exact package/configuration files plus `formatJson(value): string`; its artifact invariant is caller-owned schema field order, preserved array order, two-space indentation, and exactly one final LF.

**Executable RED/GREEN slice:** Create `test/inspect-upstream.test.mjs` with this complete initial test file:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { formatJson } from '../scripts/inspect-upstream.mjs'

test('formatJson preserves schema field order and writes one newline', () => {
  const value = { b: 2, a: { z: 3, y: [2, 1] } }
  assert.equal(formatJson(value), '{\n  "b": 2,\n  "a": {\n    "z": 3,\n    "y": [\n      2,\n      1\n    ]\n  }\n}\n')
})

test('package manifest stays zero dependency', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.equal(Object.hasOwn(manifest, key), false, key)
  }
})
```

After observing RED, create `scripts/inspect-upstream.mjs` with this complete minimum implementation; later tasks extend this same module without weakening these exports:

```js
export class UpstreamInspectionError extends Error {
  constructor(code, details = {}) {
    super(code)
    this.name = 'UpstreamInspectionError'
    this.code = code
    this.details = structuredClone(details)
  }
}

export function formatJson(value) {
  return `${JSON.stringify(value, null, 2).replace(/\n+$/u, '')}\n`
}
```

- [ ] Add failing tests named `formatJson preserves schema field order and writes one newline` and `package manifest stays zero dependency`. The first compares `formatJson({ b: 2, a: 1 })` byte-for-byte with `"{\n  \"b\": 2,\n  \"a\": 1\n}\n"`; add a nested-object/array case proving insertion and array order are retained. The second rejects any of `dependencies`, `devDependencies`, `optionalDependencies`, or `peerDependencies`.
- [ ] Run `node --test test/inspect-upstream.test.mjs`; expect failure because `scripts/inspect-upstream.mjs` and project files do not exist.
- [ ] Add the minimal `formatJson` export with `JSON.stringify(value, null, 2)`, removing all trailing newlines and appending exactly one. Callers construct records in the documented field order and sort unordered discovery results before construction. Add this package contract:

```json
{
  "name": "deepseek-harness-analysis",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "scripts": {
    "inspect": "node scripts/inspect-upstream.mjs",
    "test": "node --test",
    "verify": "node scripts/verify-evidence.mjs"
  }
}
```

- [ ] Populate `baseline.json` exactly as follows:

```json
{
  "repository": "https://github.com/deepseek-ai/deepseek-harness",
  "commit": "76fda729799fe9b3848dbe2c211d4b231032b81e",
  "commitDate": "2026-09-03",
  "gitDescribe": "dsh-v0.1.2-rc.1-99-g76fda72979",
  "rootPackageVersion": "0.1.2-rc.1",
  "verificationDate": "2026-09-04"
}
```
- [ ] Initialize `evidence/claims.json` exactly as follows:

```json
{
  "schemaVersion": 1,
  "claims": []
}
```

- [ ] Initialize `evidence/observations/upstream-facts.json` exactly as follows so Task 6's reviewed generation produces a visible Profile/Preset diff:

```json
{
  "schemaVersion": 1,
  "repository": "https://github.com/deepseek-ai/deepseek-harness",
  "commit": "76fda729799fe9b3848dbe2c211d4b231032b81e",
  "commitDate": "2026-09-03",
  "gitDescribe": "dsh-v0.1.2-rc.1-99-g76fda72979",
  "rootPackageVersion": "0.1.2-rc.1",
  "profiles": [],
  "presets": [],
  "probes": {
    "upstream.commit": "76fda729799fe9b3848dbe2c211d4b231032b81e",
    "upstream.commit-date": "2026-09-03",
    "upstream.git-describe": "dsh-v0.1.2-rc.1-99-g76fda72979",
    "upstream.root-package-version": "0.1.2-rc.1"
  }
}
```
- [ ] Add UTF-8/LF/final-newline/two-space rules, ignore editor/OS/temp/coverage/`node_modules` residue, and add the full MIT text with `Copyright (c) 2026 yang0228`.
- [ ] Run `node --test test/inspect-upstream.test.mjs` and `git diff --check`; expect both to pass.
- [ ] Commit: `chore: establish zero-dependency evidence project`.

### Task 2: Parse the pinned Profile and Preset declarations strictly

**Files:**

- Modify: `scripts/inspect-upstream.mjs`
- Modify: `test/inspect-upstream.test.mjs`
- Create: `test/parser-contract.test.mjs`
- Create: `test/fixtures/upstream-template/packages/boot/app-boot/src/profile.ts`
- Create: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/standard/preset.yml`
- Create: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/minimal/preset.yml`
- Create: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/ptc/preset.yml`
- Create: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/cordis/preset.yml`

**Interfaces:** `parseProfileTemplates(sourceText)` accepts only the pinned TypeScript declaration grammar and returns sorted `ProfileObservation[]`; `parsePresetMetadata(sourceText, sourcePath)` accepts the exact three-key metadata grammar and returns one Preset record; `readPresetRoster(source)` accepts an absolute checkout path and returns sorted records. These functions return new values, perform no writes, and reject syntax with `UpstreamInspectionError` carrying stable `code`, `offset`, `line`, and `path` fields as applicable.

**Executable RED/GREEN slice:** Create this complete `test/parser-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePresetMetadata, parseProfileTemplates } from '../scripts/inspect-upstream.mjs'

const profileSource = `export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {
  'beta-minimal': { bundles: ['bundle-b', 'bundle-a'], patchReload: 'startup' },
  alpha: { bundles: ['bundle-c'], patchReload: 'live' },
}\n`

test('Profile parser returns sorted ids without reordering bundles', () => {
  assert.deepEqual(parseProfileTemplates(profileSource), [
    { id: 'alpha', bundles: ['bundle-c'], patchReload: 'live' },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'], patchReload: 'startup' },
  ])
})

test('Profile parser exposes a stable structured error', () => {
  assert.throws(
    () => parseProfileTemplates(profileSource.replace('PROFILE_TEMPLATES', 'RENAMED')),
    error => error.code === 'PROFILE_TEMPLATES_PARSE_ERROR'
      && Number.isInteger(error.details.offset),
  )
})

test('Profile parser rejects missing entry comma', () => {
  const missingComma = profileSource.replace(" },\n  alpha", " }\n  alpha")
  assert.throws(
    () => parseProfileTemplates(missingComma),
    error => error.code === 'PROFILE_TEMPLATES_PARSE_ERROR'
      && Number.isInteger(error.details.offset),
  )
})

test('Preset parser accepts the exact metadata triplet', () => {
  assert.deepEqual(
    parsePresetMetadata('name: 合成模式\ndescription: 只用于测试\norder: 7\n', 'preset.yml'),
    { name: '合成模式', description: '只用于测试', order: 7 },
  )
})
```

For the GREEN run, append this complete total-consuming cursor/scanner implementation to `scripts/inspect-upstream.mjs`; all later failure rows exercise this same implementation rather than replacing it:

```js
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const PROFILE_HEADER = 'export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {'

function profileError(offset) {
  throw new UpstreamInspectionError('PROFILE_TEMPLATES_PARSE_ERROR', { offset })
}

function extractProfileBody(sourceText) {
  const declaration = sourceText.indexOf(PROFILE_HEADER)
  if (declaration < 0) profileError(0)
  if (sourceText.indexOf(PROFILE_HEADER, declaration + PROFILE_HEADER.length) >= 0) profileError(declaration)
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

export function parsePresetMetadata(sourceText, sourcePath) {
  const lines = sourceText.replace(/\n$/u, '').split('\n')
  const patterns = [/^name: (\S.*)$/u, /^description: (\S.*)$/u, /^order: (-?(?:0|[1-9]\d*))$/u]
  const values = lines.map((line, index) => {
    const match = patterns[index]?.exec(line)
    if (match === null || match === undefined) {
      throw new UpstreamInspectionError('PRESET_METADATA_PARSE_ERROR', { path: sourcePath, line: index + 1 })
    }
    return match[1]
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
```

- [ ] Add a success test named `Profile parser returns sorted ids without reordering bundles`. Use independently authored ids `alpha` and `beta-minimal`; assert the complete returned objects, alphabetical id order, source bundle order, and literal `live|startup` values. The accepted header is exactly `export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {`.
- [ ] Add table-driven Profile failures whose exact suffixes are `renamed declaration`, `spread entry`, `computed bundle value`, `missing patchReload`, `missing entry comma`, `duplicate profile id`, `trailing property`, and `unconsumed token`, generated as `Profile parser rejects ${name}`. Every row asserts `error.code === 'PROFILE_TEMPLATES_PARSE_ERROR'` and `Number.isInteger(error.details.offset)`; do not assert `Error.message`.
- [ ] Add a success test named `Preset parser accepts the exact metadata triplet` with synthetic ids and independently authored Chinese `name`/`description` plus integer `order`. Add rows with exact suffixes `missing key`, `duplicate key`, `unknown key`, `reordered key`, `indented key`, `multiline value`, and `malformed order`, generated as `Preset parser rejects ${name}`; assert `PRESET_METADATA_PARSE_ERROR`, `error.details.path`, and `error.details.line`.
- [ ] Run `node --test --test-name-pattern='Profile|Preset' test/parser-contract.test.mjs test/inspect-upstream.test.mjs`; expect parser tests to fail.
- [ ] Use the provided single-pass scanner and cursor implementation unchanged as the starting GREEN implementation. Its formal entry grammar is `id ':' '{' 'bundles' ':' '[' string-literal (',' string-literal)* ','? ']' ',' 'patchReload' ':' ('live'|'startup') ','? '}'`; the outer loop consumes one mandatory comma before every entry after the first, permits one final trailing comma, and finishes at EOF after trivia. The `missing entry comma` test must fail at the second id's offset. No spread, computed value, shorthand, extra property, regex fallback, or second parser is permitted.
- [ ] Implement the exact three-line Preset grammar `name: <single-line scalar>`, `description: <single-line scalar>`, `order: <base-10 integer>` with no indentation, comments, aliases, tags, quoting escapes, duplicate/unknown keys, or extra content. `readPresetRoster(source)` enumerates immediate Preset directories, requires one `preset.yml` each, derives id from the directory name, and sorts returned objects by id; do not implement general YAML.
- [ ] Re-run the focused test; expect all Profile/Preset cases to pass.
- [ ] Commit: `feat: extract shipped profiles and presets`.

### Task 3: Inspect a clean, exact Git checkout without modifying it

**Files:**

- Create: `test/helpers/fixture-repo.mjs`
- Modify: `scripts/inspect-upstream.mjs`
- Modify: `test/inspect-upstream.test.mjs`
- Create: `test/read-only-inspector.test.mjs`
- Create: `test/fixtures/upstream-template/package.json`

**Interfaces:** `inspectUpstream({ source, baseline })` requires an absolute, existing, clean Git checkout whose HEAD equals `baseline.commit`; it returns normalized `UpstreamFacts` or throws one structured `UpstreamInspectionError`. `main(argv, io)` accepts `--source <absolute-path> --baseline <json-path>`, writes only the documented JSON channel, and returns `0|1`. The inspector may read Git metadata and authoritative files but must not change refs, the index, or any tracked, untracked, or ignored worktree path.

**Executable RED/GREEN slice:** Create `test/read-only-inspector.test.mjs` with this complete test:

```js
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  inspectUpstream,
  main,
  readPresetRoster,
  UpstreamInspectionError,
} from '../scripts/inspect-upstream.mjs'
import { createFixtureRepository } from './helpers/fixture-repo.mjs'

test('inspection preserves Git and every non-dot-git path', async t => {
  const fixture = await createFixtureRepository(new URL('./fixtures/upstream-template/', import.meta.url))
  t.after(fixture.cleanup)
  const baseline = {
    repository: 'https://github.com/example/upstream',
    commit: fixture.sha,
    commitDate: '2026-01-02',
    gitDescribe: fixture.gitDescribe,
    rootPackageVersion: '0.0.0',
    verificationDate: '2026-01-03',
  }
  const beforeGit = await fixture.readGitState()
  const beforeFiles = await fixture.readWorktreeSnapshot()
  const facts = await inspectUpstream({ source: fixture.root, baseline })
  const afterGit = await fixture.readGitState()
  const afterFiles = await fixture.readWorktreeSnapshot()
  assert.deepEqual(afterGit, beforeGit)
  assert.deepEqual(afterFiles, beforeFiles)
  const sentinel = beforeFiles.find(entry => entry.path === '.ignored-sentinel')
  assert.equal(sentinel?.kind, 'file')
  assert.equal(Number.isInteger(sentinel?.mode), true)
  assert.equal(sentinel?.byteLength, Buffer.byteLength('ignored-before-inspection\n'))
  assert.equal(sentinel?.digest, createHash('sha256').update('ignored-before-inspection\n').digest('hex'))
  const ignoredLink = beforeFiles.find(entry => entry.path === '.ignored-link')
  assert.equal(ignoredLink?.kind, 'symlink')
  assert.equal(ignoredLink?.target, '.ignored-sentinel')
  assert.equal(ignoredLink?.byteLength, Buffer.byteLength('.ignored-sentinel'))
  assert.equal(facts.commit, fixture.sha)
  assert.equal(facts.gitDescribe, fixture.gitDescribe)
})

test('inspection normalizes Git read failures', async t => {
  const source = await mkdtemp(join(tmpdir(), 'not-a-git-repository-'))
  t.after(() => rm(source, { recursive: true, force: true }))
  await assert.rejects(
    inspectUpstream({ source, baseline: { commit: '0123456789abcdef0123456789abcdef01234567' } }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_GIT_READ_ERROR'
      && error.details.operation === 'git rev-parse HEAD',
  )
})

test('Preset roster normalizes missing and unreadable paths', async t => {
  const source = await mkdtemp(join(tmpdir(), 'missing-preset-roster-'))
  t.after(() => rm(source, { recursive: true, force: true }))
  await assert.rejects(
    readPresetRoster(source),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_FILE_MISSING'
      && error.details.path === join(source, 'packages/preset/agent-presets/presets'),
  )
})

test('inspector CLI distinguishes invalid baseline input', async t => {
  const root = await mkdtemp(join(tmpdir(), 'invalid-inspector-baseline-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const baselinePath = join(root, 'baseline.json')
  await writeFile(baselinePath, '{not json}\n')
  let stdout = ''
  let stderr = ''
  const io = {
    stdout: { write: value => { stdout += value } },
    stderr: { write: value => { stderr += value } },
  }
  assert.equal(await main(['--source', root, '--baseline', baselinePath], io), 1)
  assert.equal(stdout, '')
  assert.deepEqual(JSON.parse(stderr), {
    ok: false,
    error: { code: 'INSPECTOR_BASELINE_INVALID', details: { path: baselinePath } },
  })
})
```

Create `test/helpers/fixture-repo.mjs` with this complete helper implementation:

```js
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { cp, lstat, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, sep } from 'node:path'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
const fixedEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-02T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z',
}

async function git(root, args) {
  return (await runFile('git', args, { cwd: root, env: fixedEnv })).stdout
}

async function snapshot(root, current = root, output = []) {
  const entries = await readdir(current, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (current === root && entry.name === '.git') continue
    const absolute = join(current, entry.name)
    const info = await lstat(absolute)
    const path = relative(root, absolute).split(sep).join('/')
    const kind = info.isDirectory() ? 'directory' : info.isSymbolicLink() ? 'symlink' : 'file'
    const target = kind === 'symlink' ? await readlink(absolute) : undefined
    const bytes = kind === 'directory'
      ? Buffer.from('directory')
      : kind === 'symlink'
        ? Buffer.from(target)
        : await readFile(absolute)
    output.push({
      path,
      kind,
      mode: info.mode,
      byteLength: bytes.byteLength,
      digest: createHash('sha256').update(bytes).digest('hex'),
      ...(target === undefined ? {} : { target }),
    })
    if (kind === 'directory') await snapshot(root, absolute, output)
  }
  return output
}

export async function createFixtureRepository(templateUrl) {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-analysis-fixture-'))
  const root = join(parent, basename(new URL(templateUrl).pathname) || 'upstream')
  await cp(templateUrl, root, { recursive: true })
  await writeFile(join(root, '.gitignore'), '.ignored-sentinel\n.ignored-link\n')
  await git(root, ['init', '--initial-branch=main'])
  await git(root, ['add', '.'])
  await git(root, ['commit', '-m', 'fixture'])
  await git(root, ['tag', 'v0.0.0'])
  await writeFile(join(root, '.ignored-sentinel'), 'ignored-before-inspection\n')
  await symlink('.ignored-sentinel', join(root, '.ignored-link'))
  const sha = (await git(root, ['rev-parse', 'HEAD'])).trim()
  const gitDescribe = (await git(root, ['describe', '--tags', '--always', '--long'])).trim()
  return {
    root,
    sha,
    gitDescribe,
    cleanup: () => rm(parent, { recursive: true, force: true }),
    readGitState: async () => ({
      head: (await git(root, ['rev-parse', 'HEAD'])).trim(),
      status: await git(root, ['status', '--porcelain=v1', '--untracked-files=all']),
      tree: await git(root, ['ls-tree', '-r', '--full-tree', 'HEAD']),
    }),
    readWorktreeSnapshot: () => snapshot(root),
  }
}
```

Then add these exact imports and minimum inspector body to `scripts/inspect-upstream.mjs` (merge the `node:fs/promises` and `node:path` names with Task 2's imports):

```js
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const runFile = promisify(execFile)

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

async function inspectUpstreamChecked({ source, baseline }) {
  if (!isAbsolute(source)) throw new UpstreamInspectionError('SOURCE_NOT_ABSOLUTE', { actual: source })
  try {
    if (!(await stat(source)).isDirectory()) throw new Error('not-directory')
  } catch {
    throw new UpstreamInspectionError('SOURCE_NOT_DIRECTORY', { path: source })
  }
  const commit = (await gitRead(source, ['rev-parse', 'HEAD'])).trim()
  if (commit !== baseline.commit) {
    throw new UpstreamInspectionError('UPSTREAM_HEAD_MISMATCH', { expected: baseline.commit, actual: commit })
  }
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
```

- [ ] Build the fixture helper exactly as shown around `mkdtemp`, `cp`, `readdir`, `lstat`, `readFile`, `readlink`, `symlink`, `createHash('sha256')`, and `execFile('git', args, options)`. Set fixed author/committer identity, dates, and a lightweight tag. Commit `.gitignore` with `.ignored-sentinel` and `.ignored-link`, then create the ignored file with bytes `ignored-before-inspection\n` and the ignored symlink targeting `.ignored-sentinel`. Return the generated SHA and actual `git describe` string, cleanup callback, `readGitState()` result `{ head, status, tree }`, and `readWorktreeSnapshot()` result sorted by repository-relative POSIX path. The latter recursively inventories every actual non-`.git` directory, regular file, and symlink as `{ path, kind, mode, byteLength, digest, target? }`, hashing file bytes or symlink target text with SHA-256 and recording a symlink's exact target separately; it includes untracked and ignored paths.
- [ ] Keep every committed fixture independently authored and minimal; use synthetic package/version/Profile/Preset values rather than copying an upstream file or prose block.
- [ ] Add the success test `inspection preserves Git and every non-dot-git path` exactly as shown: call `readGitState()` and `readWorktreeSnapshot()` immediately before and after `inspectUpstream`; deep-compare HEAD/status/tree plus every actual path/kind/mode/byteLength/digest/target, require both status strings to be empty, assert the ignored sentinel bytes and ignored symlink target, and compare the complete returned `UpstreamFacts`. This is the direct proof that the success path neither mutates nor silently creates a tracked, untracked, or ignored worktree artifact.
- [ ] Add failures named `inspection rejects relative source`, `inspection rejects missing source directory`, `inspection normalizes Git read failures`, `inspection rejects wrong HEAD`, `inspection rejects tracked dirtiness`, `inspection rejects staged dirtiness`, `inspection rejects untracked dirtiness`, `inspection rejects missing authoritative file`, `inspection rejects unreadable authoritative file`, and `inspection rejects malformed package manifest`. Assert respectively `error.code` values `SOURCE_NOT_ABSOLUTE`, `SOURCE_NOT_DIRECTORY`, `UPSTREAM_GIT_READ_ERROR`, `UPSTREAM_HEAD_MISMATCH`, `UPSTREAM_DIRTY`, `UPSTREAM_FILE_MISSING`, `UPSTREAM_FILE_READ_ERROR`, and `UPSTREAM_PACKAGE_PARSE_ERROR`; every rejection is an `UpstreamInspectionError`. Dirty failures deep-compare `error.details.dirtyPaths`, HEAD failure deep-compares `error.details.expected`/`actual`, and read failures compare their stable `path` or `operation`. Do not assert messages.
- [ ] Add CLI tests named `CLI emits only JSON on success`, `CLI keeps stdout empty on preflight failure`, and `inspector CLI distinguishes invalid baseline input`. The failure table covers each preflight code, parses stderr as JSON, and deep-compares `{ ok: false, error: { code, details } }` fields including expected/actual SHAs, `dirtyPaths`, `path`, or `operation`; malformed/missing baseline JSON is `INSPECTOR_BASELINE_INVALID`, and only an otherwise-unclassified programming failure is `INSPECTOR_INTERNAL_ERROR`. Do not assert diagnostic text.
- [ ] Run `node --test test/read-only-inspector.test.mjs test/inspect-upstream.test.mjs`; expect the Git/CLI cases to fail.
- [ ] Implement Git calls exactly as shown with `execFile`, explicit argument arrays, `cwd: source`, `shell: false`, and `GIT_OPTIONAL_LOCKS=0`: `rev-parse HEAD`, `status --porcelain=v1 --untracked-files=all`, `show -s --format=%cs HEAD`, and `describe --tags --always --long`. Normalize every Git spawn/exit failure to `UPSTREAM_GIT_READ_ERROR`, every required-file failure through `readRequiredText`, malformed package JSON to `UPSTREAM_PACKAGE_PARSE_ERROR`, malformed CLI baseline input to `INSPECTOR_BASELINE_INVALID`, and only unknown programming failures to `INSPECTOR_INTERNAL_ERROR`. Never invoke a Git command that writes refs, the index, config, or working-tree files.
- [ ] Validate an absolute existing source directory, exact full SHA, and byte-empty porcelain status before reading `package.json`, `profile.ts`, or Preset metadata. Perform no cleanup or recovery on failure; return one named `UpstreamInspectionError` and leave stdout empty.
- [ ] Emit an `UpstreamFacts` object containing schemaVersion, repository, Git facts, profiles, presets, and all stable probes. Return an exit code from `main`; set `process.exitCode` only in the CLI guard.
- [ ] Re-run `node --test test/read-only-inspector.test.mjs test/inspect-upstream.test.mjs`; expect all cases to pass.
- [ ] Commit: `feat: add read-only upstream inspector`.

### Task 4: Validate the baseline and claim-ledger schemas

**Files:**

- Create: `scripts/verify-evidence.mjs`
- Create: `test/verify-evidence.test.mjs`
- Create: `test/evidence-schema-contract.test.mjs`
- Create: `test/fixtures/handbook/valid/evidence/baseline.json`
- Create: `test/fixtures/handbook/valid/evidence/claims.json`

**Interfaces:** `validateBaseline(value)` and `validateClaimsLedger(value, baseline)` accept any parsed JSON-compatible value and return `EvidenceProblem[]` without mutation or I/O. Outputs use only the declared stable codes and structured locations, ordered by baseline field, claim index, source index, then code; an empty array means valid.

**Executable RED/GREEN slice:** Create this complete `test/evidence-schema-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { validateBaseline, validateClaimsLedger } from '../scripts/verify-evidence.mjs'

const sha = '0123456789abcdef0123456789abcdef01234567'
const otherSha = '1123456789abcdef0123456789abcdef01234567'
const baseline = { repository: 'https://github.com/deepseek-ai/deepseek-harness', commit: sha }

function ledger(source, overrides = {}) {
  return {
    schemaVersion: 1,
    claims: [{
      id: 'CMP-TEST-001',
      statement: 'External documented fact.',
      kind: 'external-comparison',
      confidence: 'verified',
      maturity: 'not-applicable',
      documents: ['docs/sample.md#claim-cmp-test-001'],
      sources: [source],
      ...overrides,
    }],
  }
}

function codes(value) {
  return validateClaimsLedger(value, baseline).map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex }))
}

test('external blob commit matches its URL revision', () => {
  assert.deepEqual(codes(ledger({
    type: 'external',
    url: `https://github.com/example/project/blob/${sha}/README.md`,
    publisher: 'Example',
    accessDate: '2026-09-04',
    commit: sha,
  })), [])
})

test('external tree commit matches its URL revision', () => {
  assert.deepEqual(codes(ledger({
    type: 'external',
    url: `https://github.com/example/project/tree/${sha}/docs`,
    publisher: 'Example',
    accessDate: '2026-09-04',
    commit: sha,
  })), [])
})

for (const [name, source] of [
  ['different SHA', { type: 'external', url: `https://github.com/example/project/blob/${otherSha}/README.md`, publisher: 'Example', accessDate: '2026-09-04', commit: sha }],
  ['symbolic revision with commit', { type: 'external', url: 'https://github.com/example/project/blob/main/README.md', publisher: 'Example', accessDate: '2026-09-04', commit: sha }],
  ['missing commit for immutable blob', { type: 'external', url: `https://github.com/example/project/blob/${sha}/README.md`, publisher: 'Example', accessDate: '2026-09-04' }],
  ['encoded revision separator', { type: 'external', url: `https://github.com/example/project/blob/${sha}%2Fextra/README.md`, publisher: 'Example', accessDate: '2026-09-04', commit: sha }],
  ['commit on non-immutable URL', { type: 'external', url: 'https://example.com/docs', publisher: 'Example', accessDate: '2026-09-04', commit: sha }],
]) {
  test(`external blob rejects ${name}`, () => {
    assert.deepEqual(codes(ledger(source)), [{
      code: 'EXTERNAL_SOURCE_REVISION_MISMATCH',
      claimId: 'CMP-TEST-001',
      sourceIndex: 0,
    }])
  })
}

test('external source rejects version and commit together', () => {
  assert.deepEqual(codes(ledger({
    type: 'external',
    url: `https://github.com/example/project/blob/${sha}/README.md`,
    publisher: 'Example',
    accessDate: '2026-09-04',
    version: '1.0.0',
    commit: sha,
  })), [{ code: 'EXTERNAL_SOURCE_VERSION_COMMIT_CONFLICT', claimId: 'CMP-TEST-001', sourceIndex: 0 }])
})

test('analysis inference cannot claim verified confidence', () => {
  const value = ledger({ type: 'external', url: 'https://example.com/docs', publisher: 'Example', accessDate: '2026-09-04' }, {
    kind: 'analysis-inference',
    confidence: 'verified',
    maturity: 'not-applicable',
  })
  assert.deepEqual(codes(value), [{ code: 'CLAIM_KIND_CONFIDENCE_INCOMPATIBLE', claimId: 'CMP-TEST-001', sourceIndex: undefined }])
})
```

Append this complete remainder to `test/evidence-schema-contract.test.mjs`; it is the exact mutation matrix referred to by the checklist:

```js
const validBaseline = {
  repository: 'https://github.com/example/upstream',
  commit: sha,
  commitDate: '2026-09-03',
  gitDescribe: 'v0.1.0-2-g0123456',
  rootPackageVersion: '0.1.0',
  verificationDate: '2026-09-04',
}

const currentExternalSource = {
  type: 'external',
  url: 'https://example.com/reference',
  publisher: 'Example',
  accessDate: '2026-09-04',
}

function validLedger(overrides = {}) {
  return ledger(structuredClone(currentExternalSource), overrides)
}

function selected(problems) {
  return problems.map(problem => Object.fromEntries(
    ['code', 'field', 'claimId', 'sourceIndex']
      .filter(key => problem[key] !== undefined)
      .map(key => [key, problem[key]]),
  ))
}

for (const [name, mutate, field] of [
  ['missing field', value => { delete value.repository }, '/repository'],
  ['extra field', value => { value.extra = true }, '/extra'],
  ['short SHA', value => { value.commit = '0123456' }, '/commit'],
  ['uppercase SHA', value => { value.commit = sha.toUpperCase() }, '/commit'],
  ['impossible date', value => { value.commitDate = '2026-02-30' }, '/commitDate'],
  ['noncanonical date', value => { value.verificationDate = '2026-9-4' }, '/verificationDate'],
  ['invalid repository URL', value => { value.repository = 'http://github.com/example/upstream' }, '/repository'],
]) {
  test(`baseline rejects ${name}`, () => {
    const value = structuredClone(validBaseline)
    mutate(value)
    assert.deepEqual(selected(validateBaseline(value)), [{ code: 'BASELINE_SCHEMA_ERROR', field }])
  })
}

for (const [name, mutate, expected] of [
  ['schema version', value => { value.schemaVersion = 2 }, { code: 'LEDGER_SCHEMA_ERROR', field: '/schemaVersion' }],
  ['extra top-level key', value => { value.extra = true }, { code: 'LEDGER_SCHEMA_ERROR', field: '/extra' }],
  ['extra claim key', value => { value.claims[0].extra = true }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/extra', claimId: 'CMP-TEST-001' }],
  ['invalid kind', value => { value.claims[0].kind = 'opinion' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/kind', claimId: 'CMP-TEST-001' }],
  ['invalid confidence', value => { value.claims[0].confidence = 'certain' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/confidence', claimId: 'CMP-TEST-001' }],
  ['invalid maturity', value => { value.claims[0].maturity = 'stable' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/maturity', claimId: 'CMP-TEST-001' }],
  ['empty statement', value => { value.claims[0].statement = ' ' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/statement', claimId: 'CMP-TEST-001' }],
  ['multiline statement', value => { value.claims[0].statement = 'one\ntwo' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/statement', claimId: 'CMP-TEST-001' }],
  ['empty documents', value => { value.claims[0].documents = [] }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/documents', claimId: 'CMP-TEST-001' }],
  ['empty sources', value => { value.claims[0].sources = [] }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/sources', claimId: 'CMP-TEST-001' }],
  ['source field mismatch', value => { value.claims[0].sources[0].path = 'README.md' }, { code: 'LEDGER_SCHEMA_ERROR', field: '/claims/0/sources/0/path', claimId: 'CMP-TEST-001', sourceIndex: 0 }],
]) {
  test(`ledger rejects ${name}`, () => {
    const value = validLedger()
    mutate(value)
    assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [expected])
  })
}

test('ledger rejects duplicate id', () => {
  const value = validLedger()
  value.claims.push(structuredClone(value.claims[0]))
  assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [
    { code: 'CLAIM_ID_DUPLICATE', claimId: 'CMP-TEST-001' },
  ])
})

for (const [name, overrides, expectedCode] of [
  ['analysis inference verified', { kind: 'analysis-inference', confidence: 'verified', maturity: 'not-applicable' }, 'CLAIM_KIND_CONFIDENCE_INCOMPATIBLE'],
  ['upstream fact not applicable', { kind: 'upstream-fact', confidence: 'verified', maturity: 'not-applicable' }, 'CLAIM_KIND_MATURITY_INCOMPATIBLE'],
  ['external comparison released', { kind: 'external-comparison', confidence: 'verified', maturity: 'released' }, 'CLAIM_KIND_MATURITY_INCOMPATIBLE'],
  ['external comparison experimental', { kind: 'external-comparison', confidence: 'verified', maturity: 'experimental' }, 'CLAIM_KIND_MATURITY_INCOMPATIBLE'],
]) {
  test(`claim compatibility rejects ${name}`, () => {
    assert.deepEqual(selected(validateClaimsLedger(validLedger(overrides), validBaseline)), [
      { code: expectedCode, claimId: 'CMP-TEST-001' },
    ])
  })
}

test('qualified claim requires qualification', () => {
  assert.deepEqual(selected(validateClaimsLedger(validLedger({ confidence: 'qualified' }), validBaseline)), [
    { code: 'QUALIFICATION_REQUIRED', claimId: 'CMP-TEST-001' },
  ])
})

test('verified claim rejects qualification', () => {
  assert.deepEqual(selected(validateClaimsLedger(validLedger({ qualification: 'Not needed.' }), validBaseline)), [
    { code: 'QUALIFICATION_UNEXPECTED', claimId: 'CMP-TEST-001' },
  ])
})

for (const [name, mutate, field] of [
  ['missing URL', source => { delete source.url }, '/claims/0/sources/0/url'],
  ['non-HTTPS URL', source => { source.url = 'http://example.com/reference' }, '/claims/0/sources/0/url'],
  ['empty publisher', source => { source.publisher = ' ' }, '/claims/0/sources/0/publisher'],
  ['invalid access date', source => { source.accessDate = '2026-02-30' }, '/claims/0/sources/0/accessDate'],
  ['empty version', source => { source.version = '' }, '/claims/0/sources/0/version'],
  ['short commit', source => { source.commit = '0123456' }, '/claims/0/sources/0/commit'],
]) {
  test(`external source rejects ${name}`, () => {
    const value = validLedger()
    mutate(value.claims[0].sources[0])
    assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [{
      code: 'LEDGER_SCHEMA_ERROR',
      field,
      claimId: 'CMP-TEST-001',
      sourceIndex: 0,
    }])
  })
}
```

Create `scripts/verify-evidence.mjs` with this complete implementation:

```js
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
    if (Object.hasOwn(claim, 'kind') && !Object.hasOwn(COMPATIBILITY, claim.kind)) {
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
    const rule = COMPATIBILITY[claim.kind]
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
      }
    }
  }
  return errors
}
```

- [ ] Paste the complete baseline, ledger, compatibility, qualification, and external-source mutation matrix shown above. Do not replace it with generated snapshots or prose-message assertions. The version/commit conflict produces only `EXTERNAL_SOURCE_VERSION_COMMIT_CONFLICT` for that otherwise-valid source; publisher authority remains a reviewer decision.
- [ ] Run `node --test --test-name-pattern='baseline|ledger|external|inference' test/evidence-schema-contract.test.mjs test/verify-evidence.test.mjs`; expect all new cases to fail.
- [ ] Paste the complete pure-validator implementation shown above. It uses exact-key allowlists, canonical dates, stable field pointers, the exhaustive compatibility matrix, and fixed-position GitHub blob/tree revision parsing. Do not introduce a second schema path or general-purpose parser.
- [ ] Re-run the focused tests; expect exact codes and structured locations such as `{ claimId: 'DSH-TEST-001', sourceIndex: 0 }`; human messages may name the field, but no test matches or snapshots them.
- [ ] Commit: `feat: validate evidence ledgers`.

### Task 5: Verify paths, anchors, immutable URLs, line spans, probes, and workflow pins

**Files:**

- Modify: `scripts/verify-evidence.mjs`
- Modify: `test/verify-evidence.test.mjs`
- Create: `test/evidence-target-contract.test.mjs`
- Create: `test/fixtures/handbook/valid/docs/sample.md`
- Create: `test/fixtures/workflows/local.yml`
- Create: `test/fixtures/workflows/pinned.yml`
- Create: `test/fixtures/workflows/tagged.yml`
- Create: `test/fixtures/workflows/malformed.yml`

**Interfaces:** `collectDocumentClaimMarkers(root)` maps repository Markdown to a `DocumentClaimIndex`; `validateClaimTargets({ root, source, baseline, facts, ledger })`, `validateMarkdownLinks(root)`, and `validateWorkflowPins(root)` return deterministic `EvidenceProblem[]`. Preconditions are a validated baseline/ledger and absolute handbook/upstream roots. Artifacts are read-only indexes and problems; no function rewrites Markdown, JSON, workflows, or upstream files.

**Executable RED/GREEN slice:** Create this complete `test/evidence-target-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  buildUpstreamSourceUrl,
  validateClaimTargets,
  validateMarkdownLinks,
  validateWorkflowPins,
} from '../scripts/verify-evidence.mjs'

test('claim marker coverage is bidirectional and statement exact', async t => {
  const root = await mkdtemp(join(tmpdir(), 'claim-target-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'docs'))
  const path = join(root, 'docs/sample.md')
  const claim = {
    id: 'DSH-TEST-001',
    statement: '合成结论。',
    documents: ['docs/sample.md#claim-dsh-test-001'],
  }
  await writeFile(path, '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n')
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [claim] } }), [])
  await writeFile(path, '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论!\n')
  assert.deepEqual(
    (await validateClaimTargets({ root, ledger: { claims: [claim] } })).map(({ code, claimId, path }) => ({ code, claimId, path })),
    [{ code: 'CLAIM_MARKER_STATEMENT_MISMATCH', claimId: 'DSH-TEST-001', path: 'docs/sample.md' }],
  )
  await writeFile(path, '<a id="claim-dsh-orphan-001"></a> **Claim `DSH-ORPHAN-001`:** 孤立结论。\n')
  assert.deepEqual(
    (await validateClaimTargets({ root, ledger: { claims: [claim] } })).map(({ code, claimId }) => ({ code, claimId })),
    [
      { code: 'CLAIM_TARGET_MISSING', claimId: 'DSH-TEST-001' },
      { code: 'CLAIM_MARKER_ORPHAN', claimId: 'DSH-ORPHAN-001' },
    ],
  )
})
```

Append this complete remainder to `test/evidence-target-contract.test.mjs`:

```js
async function createHandbook(t, text = '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n') {
  const root = await mkdtemp(join(tmpdir(), 'evidence-target-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'docs/sample.md'), text)
  return root
}

function handbookClaim(overrides = {}) {
  return {
    id: 'DSH-TEST-001',
    statement: '合成结论。',
    documents: ['docs/sample.md#claim-dsh-test-001'],
    sources: [],
    ...overrides,
  }
}

function targetCodes(problems) {
  return problems.map(({ code, claimId, path }) => ({ code, claimId, path }))
}

for (const [name, target, expectedCode] of [
  ['absolute path', '/docs/sample.md#claim-dsh-test-001', 'CLAIM_TARGET_INVALID'],
  ['parent escape', '../sample.md#claim-dsh-test-001', 'CLAIM_TARGET_INVALID'],
  ['non-Markdown file', 'docs/sample.txt#claim-dsh-test-001', 'CLAIM_TARGET_INVALID'],
  ['missing file', 'docs/missing.md#claim-dsh-test-001', 'CLAIM_TARGET_MISSING'],
  ['missing fragment', 'docs/sample.md', 'CLAIM_TARGET_INVALID'],
  ['wrong derived anchor', 'docs/sample.md#claim-dsh-other-001', 'CLAIM_TARGET_INVALID'],
]) {
  test(`ledger target rejects ${name}`, async t => {
    const root = await createHandbook(t)
    const claim = handbookClaim({ documents: [target] })
    assert.deepEqual(targetCodes(await validateClaimTargets({ root, ledger: { claims: [claim] } })), [{
      code: expectedCode,
      claimId: 'DSH-TEST-001',
      path: target.split('#')[0],
    }])
  })
}

test('ledger target rejects duplicate marker', async t => {
  const marker = '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n'
  const root = await createHandbook(t, marker + marker)
  assert.deepEqual(targetCodes(await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } })), [
    { code: 'CLAIM_TARGET_DUPLICATE', claimId: 'DSH-TEST-001', path: 'docs/sample.md' },
  ])
})

for (const [name, text, expected] of [
  ['orphan marker', '<a id="claim-dsh-orphan-001"></a> **Claim `DSH-ORPHAN-001`:** 孤立结论。\n', [
    { code: 'CLAIM_TARGET_MISSING', claimId: 'DSH-TEST-001', path: 'docs/sample.md' },
    { code: 'CLAIM_MARKER_ORPHAN', claimId: 'DSH-ORPHAN-001', path: 'docs/sample.md' },
  ]],
  ['standalone claim anchor', '<a id="claim-dsh-orphan-001"></a> 普通文本。\n', [
    { code: 'CLAIM_TARGET_MISSING', claimId: 'DSH-TEST-001', path: 'docs/sample.md' },
    { code: 'CLAIM_ANCHOR_ORPHAN', claimId: 'DSH-ORPHAN-001', path: 'docs/sample.md' },
  ]],
  ['marker id mismatch', '<a id="claim-dsh-test-001"></a> **Claim `DSH-OTHER-001`:** 合成结论。\n', [
    { code: 'CLAIM_MARKER_MISMATCH', claimId: 'DSH-TEST-001', path: 'docs/sample.md' },
    { code: 'CLAIM_MARKER_ORPHAN', claimId: 'DSH-OTHER-001', path: 'docs/sample.md' },
  ]],
  ['marker statement mismatch', '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论!\n', [
    { code: 'CLAIM_MARKER_STATEMENT_MISMATCH', claimId: 'DSH-TEST-001', path: 'docs/sample.md' },
  ]],
  ['unknown claim reference', '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n[未知](#claim-dsh-unknown-001)\n', [
    { code: 'CLAIM_REFERENCE_UNKNOWN', claimId: 'DSH-UNKNOWN-001', path: 'docs/sample.md' },
  ]],
]) {
  test(`document coverage rejects ${name}`, async t => {
    const root = await createHandbook(t, text)
    assert.deepEqual(targetCodes(await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } })), expected)
  })
}

test('document coverage rejects undeclared marker location', async t => {
  const root = await createHandbook(t)
  await writeFile(join(root, 'docs/other.md'), '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n')
  assert.deepEqual(targetCodes(await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } })), [
    { code: 'CLAIM_MARKER_DOCUMENT_UNDECLARED', claimId: 'DSH-TEST-001', path: 'docs/other.md' },
  ])
})

test('two declared markers use the same canonical statement', async t => {
  const root = await createHandbook(t)
  await writeFile(join(root, 'docs/other.md'), '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n')
  const claim = handbookClaim({ documents: [
    'docs/sample.md#claim-dsh-test-001',
    'docs/other.md#claim-dsh-test-001',
  ] })
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [claim] } }), [])
})

test('fenced and inline-code lookalikes do not create claim records', async t => {
  const root = await createHandbook(t, '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n```md\n<a id="claim-dsh-orphan-001"></a> **Claim `DSH-ORPHAN-001`:** 孤立结论。\n```\n`[未知](#claim-dsh-unknown-001)`\n')
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }), [])
})

test('document coverage rejects malformed claim anchor and reference', async t => {
  const root = await createHandbook(t, '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n<a id="claim-typo"></a>\n[typo](#claim-also_typo)\n')
  assert.deepEqual((await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }))
    .map(({ code, path, line }) => ({ code, path, line })), [
    { code: 'CLAIM_ANCHOR_INVALID', path: 'docs/sample.md', line: 2 },
    { code: 'CLAIM_REFERENCE_INVALID', path: 'docs/sample.md', line: 3 },
  ])
})

test('document coverage collects every malformed claim anchor opening tag', async t => {
  const root = await createHandbook(t, '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n<a id=\'claim-single-typo\'></a>\n<a class="evidence"  id = "claim-spaced_typo" ></a>\n<a id="claim-typo">text</a>\n<a id="claim-typo">\n')
  assert.deepEqual((await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }))
    .map(({ code, path, line }) => ({ code, path, line })), [
    { code: 'CLAIM_ANCHOR_INVALID', path: 'docs/sample.md', line: 2 },
    { code: 'CLAIM_ANCHOR_INVALID', path: 'docs/sample.md', line: 3 },
    { code: 'CLAIM_ANCHOR_INVALID', path: 'docs/sample.md', line: 4 },
    { code: 'CLAIM_ANCHOR_INVALID', path: 'docs/sample.md', line: 5 },
  ])
})

function referenceForms(fragment) {
  return `<a id="claim-dsh-test-001"></a> **Claim \`DSH-TEST-001\`:** 合成结论。
[inline](${fragment})
[full][full-target]
[collapsed][]
[shortcut]
[full-target]: ${fragment}
[collapsed]: ${fragment}
[shortcut]: ${fragment}
`
}

test('inline full collapsed and shortcut references resolve known claim fragments', async t => {
  const root = await createHandbook(t, referenceForms('#claim-dsh-test-001'))
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }), [])
})

test('inline full collapsed and shortcut references reject unknown claim fragments', async t => {
  const root = await createHandbook(t, referenceForms('#claim-dsh-unknown-001'))
  assert.deepEqual((await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }))
    .map(({ code, claimId, path, line }) => ({ code, claimId, path, line })), [
    { code: 'CLAIM_REFERENCE_UNKNOWN', claimId: 'DSH-UNKNOWN-001', path: 'docs/sample.md', line: 2 },
    { code: 'CLAIM_REFERENCE_UNKNOWN', claimId: 'DSH-UNKNOWN-001', path: 'docs/sample.md', line: 3 },
    { code: 'CLAIM_REFERENCE_UNKNOWN', claimId: 'DSH-UNKNOWN-001', path: 'docs/sample.md', line: 4 },
    { code: 'CLAIM_REFERENCE_UNKNOWN', claimId: 'DSH-UNKNOWN-001', path: 'docs/sample.md', line: 5 },
  ])
})

test('inline full collapsed and shortcut references reject malformed claim fragments', async t => {
  const root = await createHandbook(t, referenceForms('#claim-typo'))
  assert.deepEqual((await validateClaimTargets({ root, ledger: { claims: [handbookClaim()] } }))
    .map(({ code, path, line }) => ({ code, path, line })), [
    { code: 'CLAIM_REFERENCE_INVALID', path: 'docs/sample.md', line: 2 },
    { code: 'CLAIM_REFERENCE_INVALID', path: 'docs/sample.md', line: 3 },
    { code: 'CLAIM_REFERENCE_INVALID', path: 'docs/sample.md', line: 4 },
    { code: 'CLAIM_REFERENCE_INVALID', path: 'docs/sample.md', line: 5 },
  ])
})

test('Markdown links accept files, images, references, external URLs, and explicit anchors', async t => {
  const root = await createHandbook(t, '<a id="section"></a>\n[local](#section)\n[other](other.md#other)\n[reference][other]\n![image](image.png)\n[external](https://example.com)\n[other]: other.md#other\n')
  await writeFile(join(root, 'docs/other.md'), '<a id="other"></a>\n')
  await writeFile(join(root, 'docs/image.png'), 'synthetic image fixture\n')
  assert.deepEqual(await validateMarkdownLinks(root), [])
})

for (const [name, link, expectedCode] of [
  ['missing relative file', '[bad](missing.md)', 'INTERNAL_LINK_TARGET_MISSING'],
  ['path escape', '[bad](../../outside.md)', 'INTERNAL_LINK_TARGET_MISSING'],
  ['missing explicit fragment', '[bad](other.md#missing)', 'INTERNAL_LINK_FRAGMENT_MISSING'],
]) {
  test(`Markdown links reject ${name}`, async t => {
    const root = await createHandbook(t, `${link}\n`)
    await writeFile(join(root, 'docs/other.md'), '<a id="other"></a>\n')
    assert.deepEqual((await validateMarkdownLinks(root)).map(({ code, path, line }) => ({ code, path, line })), [
      { code: expectedCode, path: 'docs/sample.md', line: 1 },
    ])
  })
}

test('upstream sources require exact URL, path, span, and probe', async t => {
  const root = await createHandbook(t)
  const source = await mkdtemp(join(tmpdir(), 'evidence-upstream-'))
  t.after(() => rm(source, { recursive: true, force: true }))
  await writeFile(join(source, 'README.md'), 'one\ntwo\n')
  const baseline = { repository: 'https://github.com/example/upstream', commit: '0123456789abcdef0123456789abcdef01234567' }
  const upstreamSource = {
    type: 'upstream',
    repository: baseline.repository,
    commit: baseline.commit,
    path: 'README.md',
    startLine: 1,
    endLine: 2,
    url: '',
  }
  upstreamSource.url = buildUpstreamSourceUrl(upstreamSource)
  const claim = handbookClaim({ sources: [upstreamSource], probe: 'upstream.commit' })
  const facts = { probes: { 'upstream.commit': baseline.commit } }
  assert.deepEqual(await validateClaimTargets({ root, source, baseline, facts, ledger: { claims: [claim] } }), [])
  const invalid = structuredClone(claim)
  invalid.sources[0].endLine = 3
  invalid.sources[0].url = `${invalid.sources[0].url}#wrong`
  delete facts.probes['upstream.commit']
  assert.deepEqual((await validateClaimTargets({ root, source, baseline, facts, ledger: { claims: [invalid] } }))
    .map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex })), [
    { code: 'UPSTREAM_SOURCE_INVALID', claimId: 'DSH-TEST-001', sourceIndex: 0 },
    { code: 'PROBE_MISSING', claimId: 'DSH-TEST-001', sourceIndex: undefined },
  ])
})

test('upstream source validation rejects every invalid field class', async t => {
  const root = await createHandbook(t)
  const source = await mkdtemp(join(tmpdir(), 'evidence-upstream-matrix-'))
  t.after(() => rm(source, { recursive: true, force: true }))
  await writeFile(join(source, 'README.md'), 'one\ntwo\n')
  const baseline = { repository: 'https://github.com/example/upstream', commit: '0123456789abcdef0123456789abcdef01234567' }
  const base = {
    type: 'upstream',
    repository: baseline.repository,
    commit: baseline.commit,
    path: 'README.md',
    startLine: 1,
    endLine: 2,
    url: '',
  }
  for (const [name, mutate, keepUrl] of [
    ['repository mismatch', value => { value.repository = 'https://github.com/example/other' }],
    ['SHA mismatch', value => { value.commit = '1123456789abcdef0123456789abcdef01234567' }],
    ['path escape', value => { value.path = '../README.md' }],
    ['missing source', value => { value.path = 'MISSING.md' }],
    ['zero line', value => { value.startLine = 0 }],
    ['reversed lines', value => { value.startLine = 2; value.endLine = 1 }],
    ['non-integer line', value => { value.startLine = 1.5 }],
    ['out-of-range line', value => { value.endLine = 3 }],
    ['URL inequality', () => {}, true],
  ]) {
    const sourceRecord = structuredClone(base)
    mutate(sourceRecord)
    sourceRecord.url = keepUrl ? 'https://example.com/not-canonical' : buildUpstreamSourceUrl(sourceRecord)
    const claim = handbookClaim({ sources: [sourceRecord] })
    assert.deepEqual((await validateClaimTargets({ root, source, baseline, ledger: { claims: [claim] } }))
      .map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex })), [{
      code: 'UPSTREAM_SOURCE_INVALID',
      claimId: 'DSH-TEST-001',
      sourceIndex: 0,
    }], name)
  }
})

test('qualified inference stays human reviewed', async t => {
  const root = await createHandbook(t)
  const claim = handbookClaim({ confidence: 'qualified', maturity: 'released', qualification: 'Requires architectural interpretation.' })
  const before = structuredClone(claim)
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [claim] } }), [])
  assert.deepEqual(claim, before)
})

test('workflow uses require local paths or full lowercase SHAs', async t => {
  const root = await createHandbook(t)
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  const full = '0123456789abcdef0123456789abcdef01234567'
  await writeFile(join(root, '.github/workflows/valid.yml'), `steps:\n  - uses: ./.github/actions/local\n  - name: Pinned action\n    uses: owner/repo@${full}\n`)
  assert.deepEqual(await validateWorkflowPins(root), [])
  await writeFile(join(root, '.github/workflows/invalid.yml'), 'steps:\n  - uses: owner/repo@v1\n  - uses: owner/repo@ABCDEF0123456789abcdef0123456789abcdef01\n  - uses: owner/repo@${{ matrix.ref }}\n  - uses: owner/repo@0123456789abcdef0123456789abcdef0123456\n')
  assert.deepEqual((await validateWorkflowPins(root)).map(({ code, path, line }) => ({ code, path, line })), [
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 2 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 3 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 4 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 5 },
  ])
})
```

Append this complete implementation to `scripts/verify-evidence.mjs`:

```js
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const MARKER_PATTERN = /^<a id="(claim-(?:dsh|cmp)-(?:[a-z0-9]+-)+\d{3})"><\/a> \*\*Claim `((?:DSH|CMP)-(?:[A-Z0-9]+-)+\d{3})`:\*\* (.+)$/u
const CLAIM_ANCHOR_PATTERN = /^claim-(?:dsh|cmp)-(?:[a-z0-9]+-)+\d{3}$/u
const ACTION_REF_PATTERN = /^[^/\s]+\/[^@\s]+@[0-9a-f]{40}$/u

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
  const absolute = resolvedWithin(source ?? '.', source ?? '.', sourceRecord.path)
  if (absolute === null) return false
  if (source === undefined) return true
  if (!(await isRegularFile(absolute))) return false
  const lineCount = logicalLines(await readFile(absolute, 'utf8')).length
  return sourceRecord.endLine <= lineCount
}

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

export async function validateMarkdownLinks(root) {
  const errors = []
  const anchorCache = new Map()
  for (const absolute of await markdownPaths(root)) {
    const path = relative(root, absolute).split(sep).join('/')
    const lines = visibleLines(await readFile(absolute, 'utf8'))
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

export async function validateWorkflowPins(root) {
  const errors = []
  for (const absolute of await workflowPaths(root)) {
    const path = relative(root, absolute).split(sep).join('/')
    for (const [index, line] of logicalLines(await readFile(absolute, 'utf8')).entries()) {
      const match = /^\s*(?:-\s*)?uses:\s*(.*?)\s*$/u.exec(line)
      if (match === null) continue
      const actionRef = match[1].replace(/\s+#.*$/u, '').trim()
      if (actionRef.startsWith('./')) continue
      if (!ACTION_REF_PATTERN.test(actionRef)) {
        errors.push(problem('WORKFLOW_USES_UNPINNED', { path, line: index + 1 }))
      }
    }
  }
  return errors
}
```

- [ ] Put this exact valid marker in `sample.md`: `<a id="claim-dsh-test-001"></a> **Claim \`DSH-TEST-001\`:** 合成结论。`. Point the valid ledger at `docs/sample.md#claim-dsh-test-001`; assert one ledger target and one marker produce no coverage problem.
- [ ] Paste the complete target, reverse-coverage, malformed `claim-*`, Markdown-link, upstream-source, probe, inference, and workflow test remainder shown above. Keep its exact names, structured error projections, and independently authored fixtures. The link tests cover inline, full, collapsed, and shortcut references against known, unknown, and malformed claim fragments. Every `<a>` `id` or resolved Markdown fragment beginning `claim-` is collected first; the anchor collector matches the opening tag alone, accepts single or double quotes, normal tag/attribute whitespace, and other attributes, and does not depend on anchor content or a closing tag before applying the canonical check. A noncanonical value is `CLAIM_ANCHOR_INVALID` or `CLAIM_REFERENCE_INVALID`, never ignored; an unknown canonical reference retains its source line in `CLAIM_REFERENCE_UNKNOWN`.
- [ ] Run `node --test --test-name-pattern='path|anchor|URL|line|probe|workflow|coverage' test/evidence-target-contract.test.mjs test/verify-evidence.test.mjs`; expect failures.
- [ ] Paste the complete implementation shown above. It provides the separator-aware containment check, exact marker/index comparisons, byte-exact statements, explicit-anchor Markdown links, logical line counting, canonical upstream URLs, probe lookup, and the limited `uses:` scanner in one code path. `markdownLinks` resolves inline links directly, full references by their second label, collapsed references by their first label, and shortcut references by their only label; occupied ranges prevent inline/full constructs from being counted again as shortcuts, and the first normalized definition owns a label. The workflow scanner accepts both an unnamed list item (`- uses:`) and the indented `uses:` property of a named step, reads the complete scalar so expressions containing spaces cannot disappear, removes only a whitespace-delimited YAML line comment, and then applies the same local-or-full-SHA rule. Do not add a fallback parser or a second implementation.
- [ ] Re-run the focused tests and then `node --test`; expect all tests to pass.
- [ ] Commit: `feat: verify claim evidence targets`.

### Task 6: Integrate live verification and commit reviewed observations

**Files:**

- Modify: `scripts/verify-evidence.mjs`
- Modify: `test/verify-evidence.test.mjs`
- Create: `test/verify-cli-contract.test.mjs`
- Modify: `evidence/observations/upstream-facts.json`

**Interfaces:** `collectEvidenceErrors({ root, source? })` returns every deterministic problem; `verifyEvidence({ root, source? })` throws one aggregate error or returns `{ inspectedUpstream, claimCount }`; CLI input is `[--root <path>] [--source <path>]`, with `root` defaulting to `process.cwd()`. Offline output explicitly records skipped inspection and live output proves committed observation equality. The only write is the reviewed replacement of `evidence/observations/upstream-facts.json`, performed by the implementer outside the inspector/verifier process.

**Executable RED/GREEN slice:** Create this complete `test/verify-cli-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { main, verifyEvidence } from '../scripts/verify-evidence.mjs'

async function rootFixture(t, claims) {
  const root = await mkdtemp(join(tmpdir(), 'verify-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'evidence/observations'), { recursive: true })
  await writeFile(join(root, 'evidence/baseline.json'), JSON.stringify({
    repository: 'https://github.com/example/upstream',
    commit: '0123456789abcdef0123456789abcdef01234567',
    commitDate: '2026-01-02',
    gitDescribe: 'v0.0.0-0-g0123456',
    rootPackageVersion: '0.0.0',
    verificationDate: '2026-01-03',
  }))
  await writeFile(join(root, 'evidence/claims.json'), JSON.stringify(claims))
  await writeFile(join(root, 'evidence/observations/upstream-facts.json'), '{}')
  return root
}

function output() {
  let stdout = ''
  let stderr = ''
  return {
    io: { stdout: { write: value => { stdout += value } }, stderr: { write: value => { stderr += value } } },
    stdout: () => stdout,
    stderr: () => stderr,
  }
}

test('offline verification returns structured skipped state', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  assert.deepEqual(await verifyEvidence({ root }), { inspectedUpstream: false, claimCount: 0 })
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 0)
  assert.deepEqual(JSON.parse(capture.stdout()), { ok: true, inspectedUpstream: false, claimCount: 0 })
  assert.equal(capture.stderr(), '')
})

test('verify CLI returns structured errors without prose assertions', async t => {
  const root = await rootFixture(t, { schemaVersion: 2, claims: [] })
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()).errors.map(({ code, field }) => ({ code, field })), [
    { code: 'LEDGER_SCHEMA_ERROR', field: '/schemaVersion' },
  ])
})
```

Append this complete minimum integration to `scripts/verify-evidence.mjs`:

```js
import { pathToFileURL } from 'node:url'
import { formatJson, inspectUpstream, UpstreamInspectionError } from './inspect-upstream.mjs'

export class EvidenceVerificationError extends Error {
  constructor(errors) {
    super('EVIDENCE_VERIFICATION_FAILED')
    this.name = 'EvidenceVerificationError'
    this.errors = structuredClone(errors)
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function jsonPointerSegment(value) {
  return String(value).replace(/~/gu, '~0').replace(/\//gu, '~1')
}

function firstJsonDifference(actual, expected, pointer = '') {
  if (Object.is(actual, expected)) return undefined
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

export async function collectEvidenceErrors({ root, source }) {
  const baseline = await readJson(join(root, 'evidence/baseline.json'))
  const ledger = await readJson(join(root, 'evidence/claims.json'))
  const committed = await readJson(join(root, 'evidence/observations/upstream-facts.json'))
  const errors = [...validateBaseline(baseline), ...validateClaimsLedger(ledger, baseline)]
  if (errors.length === 0) {
    errors.push(...await validateClaimTargets({ root, source, baseline, facts: committed, ledger }))
    errors.push(...await validateMarkdownLinks(root))
    errors.push(...await validateWorkflowPins(root))
  }
  if (source !== undefined && errors.length === 0) {
    const observed = await inspectUpstream({ source, baseline })
    const difference = firstJsonDifference(observed, committed)
    if (difference !== undefined) errors.push(problem('OBSERVATION_DRIFT', { path: difference }))
  }
  return errors
}

export async function verifyEvidence({ root, source }) {
  const errors = await collectEvidenceErrors({ root, source })
  if (errors.length > 0) throw new EvidenceVerificationError(errors)
  const ledger = await readJson(join(root, 'evidence/claims.json'))
  return { inspectedUpstream: source !== undefined, claimCount: ledger.claims.length }
}

function parseOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if ((flag !== '--root' && flag !== '--source') || value === undefined || options[flag.slice(2)] !== undefined) {
      throw new EvidenceVerificationError([problem('VERIFIER_USAGE', { path: '/' })])
    }
    options[flag.slice(2)] = value
  }
  return { root: options.root ?? process.cwd(), source: options.source }
}

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
```

- [ ] Add an end-to-end fixture test named `live verification matches committed observations`, showing `verifyEvidence({ root, source })` calls the inspector once and deep-compares its normalized result with committed observations without rewriting either tree.
- [ ] Add distinct tests `live verification rejects baseline HEAD`, `live verification reports observation drift`, and `live verification surfaces Profile parse drift`. In the drift fixture, change only `committed.profiles[0].bundles[1]` and deep-compare `{ code: 'OBSERVATION_DRIFT', path: '/profiles/0/bundles/1' }`; also cover an added object key with `~` or `/` to prove RFC 6901 escaping. Assert `UPSTREAM_HEAD_MISMATCH` with expected/actual SHA and `PROFILE_TEMPLATES_PARSE_ERROR` with offset survive both `verifyEvidence` and CLI output rather than becoming `VERIFIER_USAGE`.
- [ ] Add `offline verification reports inspectedUpstream false`: omit `source`, require repository-owned JSON/document checks to run, deep-compare `summary.inspectedUpstream` with `false` and `summary.claimCount` with `ledger.claims.length`, then parse CLI stdout JSON and assert `ok === true` plus `inspectedUpstream === false`. Offline state is not an `EvidenceProblem`, produces no prose sentinel, and must never make the process fail.
- [ ] Add CLI tests `verify CLI defaults root to cwd`, `verify CLI prints one success summary`, `verify CLI rejects duplicate options`, and `verify CLI aggregates deterministic failures`. Success emits one JSON line `{ "ok": true, "inspectedUpstream": boolean, "claimCount": number }` and returns `0`; invalid CLI syntax emits `VERIFIER_USAGE`; evidence failures preserve `path`, `field`, `line`, `claimId`, and `sourceIndex`, while inspector failures preserve their `path`, `line`, `offset`, `operation`, `expected`, `actual`, or `dirtyPaths` details. They emit one JSON line `{ "ok": false, "errors": [...] }` to stderr, write nothing to stdout, and return `1`. Preserve every stable structured locator rather than relabeling a schema failure as a path or an inspector failure as usage. Parse and deep-compare structure; never assert messages.
- [ ] Run `node --test test/verify-cli-contract.test.mjs test/verify-evidence.test.mjs`; expect end-to-end cases to fail.
- [ ] Paste the complete `collectEvidenceErrors`, `firstJsonDifference`, `verifyEvidence`, option parsing, and CLI implementation shown above. `collectEvidenceErrors` invokes schema, claim-target, Markdown-link, workflow-pin, and optional live-observation checks and returns `EvidenceProblem[]`; Task 8 later adds repository/community-file validation to the same aggregator. `firstJsonDifference` walks arrays by index and objects in committed-schema key order, escapes `~`/`/` as `~0`/`~1`, and returns the first exact JSON pointer. `verifyEvidence` throws one `EvidenceVerificationError` only when that array is non-empty and otherwise returns `{ inspectedUpstream: boolean, claimCount: number }`. Reuse `inspectUpstream`; preserve `UpstreamInspectionError.code` and every structured detail in CLI output; only `parseOptions` emits `VERIFIER_USAGE`, while an unknown programming failure emits `VERIFIER_INTERNAL_ERROR`. CLI `root` defaults to `process.cwd()` so `npm run verify -- --source <checkout>` is valid.
- [ ] Run the inspector against `/Users/qingyang/github_repo/deepseek-harness`, capture stdout outside that checkout, and compare the output with baseline values before updating the committed observation file.
- [ ] Review the live output for the exact shipped Profile roster (`acp`, `headless`, `sdk`, `sdk-minimal`, `web`) and Preset roster (`cordis`, `minimal`, `ptc`, `standard`) plus their Bundle/reload/display metadata; this source-backed integration check owns the real roster expectation.
- [ ] Run `npm test` and `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`; expect a clean pass and no upstream changes.
- [ ] Commit: `feat: verify pinned upstream evidence`.

### Task 7: Add least-privilege, full-SHA GitHub Actions verification

**Files:**

- Create: `.github/workflows/verify.yml`
- Create: `.github/dependabot.yml`
- Modify: `test/verify-evidence.test.mjs`
- Create: `test/repository-workflow-contract.test.mjs`

**Interfaces:** Inputs are the repository-owned workflow/dependabot files and pinned baseline. Output is one GitHub Actions job named `verify` plus weekly Action-only proposals. Preconditions are manually re-resolved official Action tag-to-SHA mappings. The workflow reads repository contents and upstream checkout only; it receives no secrets, retained credentials, install step, or write permission.

**Executable RED/GREEN slice:** Create this complete `test/repository-workflow-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('repository workflow is least privilege and fully pinned', async () => {
  const text = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  assert.match(text, /^permissions:\n  contents: read$/mu)
  assert.match(text, /^  verify:\n    name: verify$/mu)
  assert.equal((text.match(/^\s+persist-credentials: false$/gmu) ?? []).length, 2)
  assert.equal(text.includes('${{ secrets.'), false)
  assert.equal(/^\s+permissions:/mu.test(text.replace(/^permissions:\n  contents: read$/mu, '')), false)
  const actionRefs = [...text.matchAll(/^\s*uses:\s*([^\s#]+)$/gmu)].map(match => match[1])
  assert.deepEqual(actionRefs, [
    'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd',
    'actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e',
    'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd',
  ])
  assert.equal((text.match(/^          path: (?:handbook|upstream)$/gmu) ?? []).length, 2)
  assert.match(text, /^        run: npm run verify -- --root "\$GITHUB_WORKSPACE\/handbook" --source "\$GITHUB_WORKSPACE\/upstream"$/mu)
  assert.equal((text.match(/^        working-directory: handbook$/gmu) ?? []).length, 2)
})
```

After the RED run, create `.github/workflows/verify.yml` exactly as follows, substituting an Action SHA only when the preceding provenance step verified a newer official release:

```yaml
name: verify

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    steps:
      - name: Check out handbook
        # actions/checkout v6.0.2, verified 2026-09-05
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
        with:
          path: handbook
          persist-credentials: false
      - name: Set up Node
        # actions/setup-node v6.4.0, verified 2026-09-05
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e
        with:
          node-version: 22.19.0
      - name: Check out pinned upstream
        # actions/checkout v6.0.2, verified 2026-09-05
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
        with:
          repository: deepseek-ai/deepseek-harness
          ref: 76fda729799fe9b3848dbe2c211d4b231032b81e
          path: upstream
          fetch-depth: 0
          fetch-tags: true
          persist-credentials: false
      - name: Test
        run: npm test
        working-directory: handbook
      - name: Verify evidence
        run: npm run verify -- --root "$GITHUB_WORKSPACE/handbook" --source "$GITHUB_WORKSPACE/upstream"
        working-directory: handbook
```

Create `.github/dependabot.yml` exactly as follows:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] Immediately before editing, re-resolve official release tags and confirm provenance. The planning-date pins are `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (`v6.0.2`) and `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (`v6.4.0`); replace them only with a newly verified official full SHA.
- [ ] Add the failing test `repository workflow is least privilege and fully pinned` exactly as shown above. It loads the real `.github/workflows/verify.yml`, requires job id and display name `verify`, exact root `permissions: contents: read`, `persist-credentials: false` on both checkout steps, no job-level permission expansion, no `${{ secrets.* }}`, no unpinned non-local `uses:`, and the exact sibling `handbook`/`upstream` checkout paths, verifier arguments, and run-step working directories. This proves the upstream tree is outside the verifier's handbook root. Failures use `REPOSITORY_FILE_INVALID` for required workflow fields and `WORKFLOW_USES_UNPINNED` for action refs.
- [ ] Run `node --test --test-name-pattern='workflow' test/repository-workflow-contract.test.mjs test/verify-evidence.test.mjs`; expect failure until the real workflow exists.
- [ ] Create the push/pull-request workflow exactly as shown above. It checks out the handbook into `handbook/` with `persist-credentials: false`, sets Node `22.19.0` with package-manager caching disabled, and checks out `deepseek-ai/deepseek-harness` at the exact baseline into sibling `upstream/` with `fetch-depth: 0`, tags, and `persist-credentials: false`. Put the human-readable official tag and its verification date in a comment immediately above each full-SHA `uses:` line; the SHA remains the executable authority.
- [ ] Run `npm test` from `$GITHUB_WORKSPACE/handbook` and `npm run verify -- --root "$GITHUB_WORKSPACE/handbook" --source "$GITHUB_WORKSPACE/upstream"` in CI; do not run `npm install` because the project has no dependencies.
- [ ] Configure Dependabot for weekly `github-actions` proposals only. The workflow comments record the current tag-to-SHA provenance; Task 8 copies that mapping into the maintainer checklist and states that every Dependabot proposal requires a fresh official-repository check.
- [ ] Run `npm test`, `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, and `git diff --check`; expect all to pass.
- [ ] Commit: `ci: verify the pinned upstream baseline`.

### Task 8: Add complete community policy and settings ownership

**Files:**

- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `SUPPORT.md`
- Create: `NOTICE.md`
- Create: `CITATION.cff`
- Create: `docs/maintainer/repository-settings.md`
- Create: `.github/ISSUE_TEMPLATE/factual-error.yml`
- Create: `.github/ISSUE_TEMPLATE/upstream-drift.yml`
- Create: `.github/ISSUE_TEMPLATE/analysis-proposal.yml`
- Create: `.github/pull_request_template.md`
- Modify: `scripts/verify-evidence.mjs`
- Modify: `test/verify-evidence.test.mjs`
- Modify: `test/verify-cli-contract.test.mjs`
- Create: `test/repository-community-contract.test.mjs`

**Interfaces:** `validateCffText(text)`, `validateIssueFormText(text, path)`, and `validateRepositoryFiles(root)` accept repository-owned UTF-8 content and return deterministic problems without network access. Inputs use only the documented YAML subset; outputs are community/CFF/Form files that pass local structural checks. GitHub rendering and repository settings remain post-push artifacts owned by the publication plan.

**Executable RED/GREEN slice:** Create this complete `test/repository-community-contract.test.mjs`:

```js
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { validateCffText, validateIssueFormText, validateRepositoryFiles } from '../scripts/verify-evidence.mjs'

const cff = `cff-version: 1.2.0
message: Cite this evidence handbook.
title: DeepSeek Harness Analysis
type: software
authors:
  - name: yang0228
repository-code: https://github.com/yang0228/deepseek-harness-analysis
version: snapshot-76fda729
preferred-citation:
  type: report
  authors:
    - name: yang0228
  title: DeepSeek Harness Analysis
  version: snapshot-76fda729
  url: https://github.com/yang0228/deepseek-harness-analysis
  year: 2026
`

const issueForm = `name: Factual error
description: Report an evidence error
title: "[Fact]: "
labels: []
body:
  - type: textarea
    id: evidence
    attributes:
      label: Official evidence
    validations:
      required: true
`

test('CITATION.cff has the canonical software and report records', () => {
  assert.deepEqual(validateCffText(cff), [])
  assert.deepEqual(validateCffText(cff.replace('cff-version: 1.2.0', 'cff-version: 1.1.0')).map(({ code, path, field }) => ({ code, path, field })), [
    { code: 'REPOSITORY_FILE_INVALID', path: 'CITATION.cff', field: '/cff-version' },
  ])
})

test('Issue Forms satisfy the supported subset', () => {
  assert.deepEqual(validateIssueFormText(issueForm, '.github/ISSUE_TEMPLATE/factual-error.yml'), [])
  assert.deepEqual(
    validateIssueFormText(issueForm.replace('id: evidence', 'id: Evidence'), '.github/ISSUE_TEMPLATE/factual-error.yml')
      .map(({ code, path, field }) => ({ code, path, field })),
    [{ code: 'REPOSITORY_FILE_INVALID', path: '.github/ISSUE_TEMPLATE/factual-error.yml', field: '/body/0/id' }],
  )
})
```

Append this complete remainder to `test/repository-community-contract.test.mjs`:

```js
const communityPaths = [
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

async function createCommunityRoot(t) {
  const root = await mkdtemp(join(tmpdir(), 'community-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of communityPaths) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    const text = path === 'CITATION.cff'
      ? cff
      : path.startsWith('.github/ISSUE_TEMPLATE/')
        ? issueForm
        : '# Synthetic policy\n'
    await writeFile(join(root, path), text)
  }
  return root
}

for (const path of communityPaths) {
  for (const [name, mutate, field] of [
    ['missing file', async target => rm(target), '/presence'],
    ['empty file', async target => writeFile(target, ''), '/content'],
    ['placeholder token', async (target, text) => writeFile(target, `${text.trimEnd()}\nTODO\n`), '/placeholder'],
    ['missing final newline', async (target, text) => writeFile(target, text.trimEnd()), '/final-newline'],
    ['multiple final newlines', async (target, text) => writeFile(target, `${text.trimEnd()}\n\n`), '/final-newline'],
  ]) {
    test(`community file contract rejects ${name}: ${path}`, async t => {
      const root = await createCommunityRoot(t)
      const target = join(root, path)
      const original = path === 'CITATION.cff'
        ? cff
        : path.startsWith('.github/ISSUE_TEMPLATE/')
          ? issueForm
          : '# Synthetic policy\n'
      await mutate(target, original)
      assert.deepEqual((await validateRepositoryFiles(root)).map(({ code, path: actualPath, field: actualField }) => ({
        code,
        path: actualPath,
        field: actualField,
      })), [{ code: 'REPOSITORY_FILE_INVALID', path, field }])
    })
  }
}

for (const [name, mutate, field] of [
  ['missing message', value => value.replace('message: Cite this evidence handbook.\n', ''), '/message'],
  ['wrong title', value => value.replace('title: DeepSeek Harness Analysis', 'title: Other'), '/title'],
  ['wrong software type', value => value.replace('type: software', 'type: report'), '/type'],
  ['wrong author', value => value.replace('  - name: yang0228', '  - name: someone'), '/authors'],
  ['wrong repository', value => value.replace('repository-code: https://github.com/yang0228/deepseek-harness-analysis', 'repository-code: https://example.com'), '/repository-code'],
  ['wrong version', value => value.replace('version: snapshot-76fda729', 'version: draft'), '/version'],
  ['wrong preferred citation', value => value.replace('  type: report', '  type: software'), '/preferred-citation/type'],
  ['duplicate key', value => value.replace('cff-version: 1.2.0\n', 'cff-version: 1.2.0\ncff-version: 1.2.0\n'), '/cff-version'],
  ['tab indentation', value => value.replace('  type: report', '\ttype: report'), '/syntax'],
  ['YAML alias', value => value.replace('message: Cite this evidence handbook.', 'message: *copy'), '/syntax'],
  ['YAML tag', value => value.replace('message: Cite this evidence handbook.', 'message: !text value'), '/syntax'],
  ['multiline scalar', value => value.replace('message: Cite this evidence handbook.', 'message: |'), '/syntax'],
]) {
  test(`CITATION.cff rejects ${name}`, () => {
    assert.deepEqual(validateCffText(mutate(cff)).map(({ code, path, field: actualField }) => ({ code, path, field: actualField })), [
      { code: 'REPOSITORY_FILE_INVALID', path: 'CITATION.cff', field },
    ])
  })
}

const supportedItems = `name: Complete form
description: Exercises every supported item
title: "[Test]: "
labels: []
body:
  - type: markdown
    attributes:
      value: Read this first
  - type: input
    id: input_value
    attributes:
      label: Input
  - type: textarea
    id: details
    attributes:
      label: Details
  - type: dropdown
    id: choice
    attributes:
      label: Choice
      options:
        - One
  - type: checkboxes
    id: checks
    attributes:
      label: Checks
      options:
        - label: Confirm
          required: true
    validations:
      required: false
`

test('Issue Forms accept every supported body item', () => {
  assert.deepEqual(validateIssueFormText(supportedItems, '.github/ISSUE_TEMPLATE/test.yml'), [])
})

test('Issue Form checkboxes reject scalar options', () => {
  const path = '.github/ISSUE_TEMPLATE/test.yml'
  const scalarOption = supportedItems.replace('        - label: Confirm\n          required: true', '        - Confirm')
  assert.deepEqual(validateIssueFormText(scalarOption, path).map(({ code, path: actualPath, field }) => ({
    code,
    path: actualPath,
    field,
  })), [{ code: 'REPOSITORY_FILE_INVALID', path, field: '/body/4/syntax' }])
})

for (const [name, mutate, field] of [
  ['missing key', value => value.replace('description: Report an evidence error\n', ''), '/description'],
  ['duplicate key', value => value.replace('name: Factual error\n', 'name: Factual error\nname: Duplicate\n'), '/name'],
  ['duplicate id', value => value.replace('    validations:\n', '  - type: input\n    id: evidence\n    attributes:\n      label: Duplicate\n    validations:\n'), '/body/id'],
  ['tab indentation', value => value.replace('    id: evidence', '\tid: evidence'), '/syntax'],
  ['YAML alias', value => value.replace('description: Report an evidence error', 'description: *copy'), '/syntax'],
  ['YAML tag', value => value.replace('description: Report an evidence error', 'description: !text value'), '/syntax'],
  ['unsupported multiline key', value => value.replace('description: Report an evidence error', 'description: |'), '/syntax'],
  ['unsupported type', value => value.replace('type: textarea', 'type: select'), '/body/0/type'],
  ['empty body', value => value.slice(0, value.indexOf('body:')) + 'body:\n', '/body'],
]) {
  test(`Issue Form rejects ${name}`, () => {
    const path = '.github/ISSUE_TEMPLATE/factual-error.yml'
    assert.deepEqual(validateIssueFormText(mutate(issueForm), path).map(({ code, path: actualPath, field: actualField }) => ({
      code,
      path: actualPath,
      field: actualField,
    })), [{ code: 'REPOSITORY_FILE_INVALID', path, field }])
  })
}
```

At Task 8, replace the existing `node:path` import with the following line:

```js
import { dirname, join } from 'node:path'
```

Then replace `rootFixture` with the complete version below, add its fixture constants/helpers, and append the aggregate regression:

```js
const cliCff = `cff-version: 1.2.0
message: Fixture citation.
title: DeepSeek Harness Analysis
type: software
authors:
  - name: yang0228
repository-code: https://github.com/yang0228/deepseek-harness-analysis
version: snapshot-76fda729
preferred-citation:
  type: report
  authors:
    - name: yang0228
  title: DeepSeek Harness Analysis
  version: snapshot-76fda729
  url: https://github.com/yang0228/deepseek-harness-analysis
  year: 2026
`

const cliIssueForm = `name: Fixture form
description: Fixture description
title: "[Fixture]: "
labels: []
body:
  - type: textarea
    id: evidence
    attributes:
      label: Evidence
`

const cliCommunityPaths = [
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

async function writeCliCommunityFixture(root) {
  for (const path of cliCommunityPaths) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), path === 'CITATION.cff'
      ? cliCff
      : path.startsWith('.github/ISSUE_TEMPLATE/')
        ? cliIssueForm
        : '# Fixture policy\n')
  }
}

async function rootFixture(t, claims) {
  const root = await mkdtemp(join(tmpdir(), 'verify-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'evidence/observations'), { recursive: true })
  await writeFile(join(root, 'evidence/baseline.json'), JSON.stringify({
    repository: 'https://github.com/example/upstream',
    commit: '0123456789abcdef0123456789abcdef01234567',
    commitDate: '2026-01-02',
    gitDescribe: 'v0.0.0-0-g0123456',
    rootPackageVersion: '0.0.0',
    verificationDate: '2026-01-03',
  }))
  await writeFile(join(root, 'evidence/claims.json'), JSON.stringify(claims))
  await writeFile(join(root, 'evidence/observations/upstream-facts.json'), '{}')
  await writeCliCommunityFixture(root)
  return root
}

test('verify CLI aggregates a missing community file', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  await rm(join(root, 'NOTICE.md'))
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()).errors, [{
    code: 'REPOSITORY_FILE_INVALID',
    path: 'NOTICE.md',
    field: '/presence',
  }])
})
```

In `collectEvidenceErrors`, replace the repository-owned validation block with this exact Task 8 integration so the existing offline-success CLI test exercises the community fixture too:

```js
if (errors.length === 0) {
  errors.push(...await validateClaimTargets({ root, source, baseline, facts: committed, ledger }))
  errors.push(...await validateMarkdownLinks(root))
  errors.push(...await validateWorkflowPins(root))
  errors.push(...await validateRepositoryFiles(root))
}
```

Append this complete implementation to `scripts/verify-evidence.mjs`:

```js
function repositoryProblem(path, field) {
  return problem('REPOSITORY_FILE_INVALID', { path, field })
}

function significantYamlLines(text) {
  return logicalLines(text)
    .map((line, index) => ({ text: line, line: index + 1 }))
    .filter(entry => entry.text.trim() !== '' && !entry.text.trimStart().startsWith('#'))
}

function unsupportedYamlSyntax(text) {
  return /\t/u.test(text)
    || /:\s*[>|][-+0-9]*\s*$/mu.test(text)
    || /:\s*[&*!][A-Za-z0-9_-]+(?:\s|$)/mu.test(text)
    || /^\s*-\s*[&*!][A-Za-z0-9_-]+(?:\s|$)/mu.test(text)
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

export function validateCffText(text) {
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
    [/^version: snapshot-76fda729$/u, '/version'],
    [/^preferred-citation:$/u, '/preferred-citation'],
    [/^  type: report$/u, '/preferred-citation/type'],
    [/^  authors:$/u, '/preferred-citation/authors'],
    [/^    - name: yang0228$/u, '/preferred-citation/authors'],
    [/^  title: DeepSeek Harness Analysis$/u, '/preferred-citation/title'],
    [/^  version: snapshot-76fda729$/u, '/preferred-citation/version'],
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
  const value = source.trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

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
      if (scalarValue(item.attributes.get('value') ?? '') === '') {
        return [repositoryProblem(path, `/body/${index}/attributes/value`)]
      }
      continue
    }
    if (item.id === undefined || !/^[a-z][a-z0-9_-]*$/u.test(item.id)) {
      return [repositoryProblem(path, `/body/${index}/id`)]
    }
    if (ids.has(item.id)) return [repositoryProblem(path, '/body/id')]
    ids.add(item.id)
    if (scalarValue(item.attributes.get('label') ?? '') === '') {
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

export async function validateRepositoryFiles(root) {
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
    if (path === 'CITATION.cff') errors.push(...validateCffText(text))
    if (path.startsWith('.github/ISSUE_TEMPLATE/')) errors.push(...validateIssueFormText(text, path))
  }
  return errors
}
```

- [ ] Paste the complete community-file, CFF, and Issue Form mutation matrix shown above. It covers every community path, every required CFF record, all supported Issue Form item types, duplicate keys/ids, indentation, unsupported YAML features, and exact structured fields.
- [ ] Run `node --test --test-name-pattern='community|CITATION|Issue Forms' test/repository-community-contract.test.mjs test/verify-evidence.test.mjs`; expect RED because `validateCffText`/`validateIssueFormText` and the real files do not yet satisfy the tested contracts. Record the failing test names; do not weaken expected codes.
- [ ] While the core handbook does not yet exist, link only files created by this plan or external official URLs. The core-handbook plan adds methodology/chapter links after their targets exist.
- [ ] Write `CONTRIBUTING.md` with claim classification, official-source expectations, baseline-update order, commands actually required, and PR fields.
- [ ] Write a concise conduct policy: abusive GitHub-hosted content goes to GitHub's “Report abuse or spam” flow or Support; non-sensitive repository moderation may use Issues; `@yang0228` is moderator; publish no invented private email.
- [ ] Scope `SECURITY.md` to this repository's scripts/workflows and its private vulnerability reporting. Tell readers to consult current upstream for an upstream disclosure route and never use a public handbook Issue for a vulnerability.
- [ ] Separate handbook support, upstream product usage, and security in `SUPPORT.md`; add independent-project/upstream-MIT/baseline/trademark notices without copying upstream code or notices.
- [ ] Make `CITATION.cff` satisfy the exact CFF 1.2.0 contract tested above, with repository metadata represented as `type: software` and the handbook citation represented as `preferred-citation.type: report`. Paste the complete line/indent scanners and repository validator shown above; they consume every non-comment line, reject unsupported YAML features, and are not general YAML parsers or substitutes for the published CFF schema.
- [ ] Give `factual-error.yml` fields for affected document/claim ids, current statement, proposed correction, official evidence, baseline impact, and a public-security-report warning; give `upstream-drift.yml` fields for new upstream commit/ref, changed paths, affected ids, observed behavior change, and qualifications; give `analysis-proposal.yml` fields for thesis, comparison scope, official sources, inference, and exclusions. Use `labels: []` until labels are deliberately created. When a form uses `checkboxes`, encode each option in GitHub's native object form, `- label: ...` with optional nested Boolean `required:`; scalar checkbox options are invalid. Run every file through `validateIssueFormText`, not only presence checks.
- [ ] Make the PR template require changed ids, classifications, qualifications, source authority, baseline impact, and commands actually run.
- [ ] In `repository-settings.md`, assign `@yang0228` dated checkboxes for public visibility, exact description `DeepSeek Harness 架构与实现的证据链手册`, `main`, required `verify`, private vulnerability reporting, exact topics, Issues on, Wiki and Discussions off, Pages with no publishing source and no published site, and the no-tag-before-completion gate. Record the Action tag-to-SHA provenance checked in Task 7. For GitHub-only rendering, state the publication-plan ownership explicitly: Task 6 observes that GitHub shows “Cite this repository” and opens all three Issue Forms without a configuration-error banner; Task 7 records those observations in the pushed checklist; Task 8 verifies the checklist is complete before tagging; Task 9 re-verifies the recorded state before handoff. Local structural validation does not claim to prove GitHub rendering, and an observation is not itself a completed checklist record.
- [ ] Apply the exact `test/verify-cli-contract.test.mjs` replacement and `collectEvidenceErrors` integration shown above. The replacement adds every valid community fixture before re-running Task 6's offline-success case, then removes `NOTICE.md` to prove the aggregate CLI preserves `REPOSITORY_FILE_INVALID` with `path` and `field`; do not leave the validator callable only from its focused unit test.
- [ ] Re-run `node --test --test-name-pattern='community|CITATION|Issue Forms' test/repository-community-contract.test.mjs test/verify-evidence.test.mjs`; expect every named RED case to turn GREEN, including each mutation producing the asserted `REPOSITORY_FILE_INVALID` code.
- [ ] Run `npm test`, `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, and `git diff --check`; expect all to pass.
- [ ] Commit: `docs: add community and governance policy`.

### Task 9: Foundation acceptance checkpoint

**Files:**

- Review only; modify the narrow owning file for any discovered defect.

**Interfaces:** Inputs are the committed foundation tree and exact read-only upstream checkout. Output is a clean acceptance record: supported Node, passing tests, matching live evidence, no upstream change, no unresolved release placeholder/secret, and no dependency/network/shell regression. Preconditions are Tasks 1–8 committed; artifacts are command outputs recorded in the implementation task, with no empty acceptance commit.

- [ ] Run `node --version`; expect a version satisfying `^22.19.0 || >=24.0.0`.
- [ ] Run `npm test`; expect all inspector and verifier tests to pass.
- [ ] Run `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`; expect the exact clean baseline and committed observations to match.
- [ ] Run `git -C /Users/qingyang/github_repo/deepseek-harness status --short`; expect no output.
- [ ] Run `git diff --check` and `git status --short`; expect no whitespace errors and no uncommitted plan implementation changes after the final commit.
- [ ] Run `rg -n 'TODO|TBD|CHANGE_ME|example@example|actions/[^ @]+@v[0-9]' .` across the complete tree, including `docs/superpowers`. Expect no release-artifact match; review and allow only occurrences inside planning instructions where the literal is itself a test fixture or search pattern, and record those reviewed paths in the acceptance notes.
- [ ] Confirm `package.json` has no dependency keys and the scripts make no HTTP request, write nothing under upstream, and do not spawn a shell.
- [ ] Commit any narrowly scoped acceptance correction with `fix: close foundation acceptance gap`; otherwise do not create an empty commit.
