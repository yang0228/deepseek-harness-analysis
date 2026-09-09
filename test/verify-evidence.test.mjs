import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { UpstreamInspectionError } from '../scripts/inspect-upstream.mjs'
import {
  EvidenceVerificationError,
  collectEvidenceErrors,
  collectDocumentClaimMarkers,
  main,
  validateBaseline,
  validateClaimsLedger,
  validateClaimTargets,
  validateWorkflowPins,
  verifyEvidence,
} from '../scripts/verify-evidence.mjs'
import { createFixtureRepository } from './helpers/fixture-repo.mjs'

const runFile = promisify(execFile)
const template = new URL('./fixtures/upstream-template/', import.meta.url)
const commitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-02T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z',
}

const repositoryFixtureCff = `cff-version: 1.2.0
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

const repositoryFixtureIssueForm = `name: Fixture form
description: Fixture description
title: "[Fixture]: "
labels: []
body:
  - type: textarea
    id: evidence
    attributes:
      label: Evidence
`

const repositoryFixturePaths = [
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

async function writeRepositoryFixture(root) {
  for (const path of repositoryFixturePaths) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), path === 'CITATION.cff'
      ? repositoryFixtureCff
      : path.startsWith('.github/ISSUE_TEMPLATE/')
        ? repositoryFixtureIssueForm
        : '# Fixture policy\n')
  }
}

async function readFixture(name) {
  return JSON.parse(await readFile(new URL(`fixtures/handbook/valid/evidence/${name}`, import.meta.url), 'utf8'))
}

function baselineFor(fixture, overrides = {}) {
  return {
    repository: 'https://github.com/example/upstream',
    commit: fixture.sha,
    commitDate: '2026-01-02',
    gitDescribe: fixture.gitDescribe,
    rootPackageVersion: '0.0.0',
    verificationDate: '2026-01-03',
    ...overrides,
  }
}

function expectedFacts(fixture) {
  const profiles = [
    { id: 'alpha', bundles: ['bundle-c'], patchReload: 'live' },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'], patchReload: 'startup' },
  ]
  const presets = [
    { id: 'cordis', name: '创作样例', description: '提供扩展的合成测试能力', order: 40 },
    { id: 'minimal', name: '精简样例', description: '提供最少的合成测试能力', order: 20 },
    { id: 'ptc', name: '编排样例', description: '提供程序化的合成测试能力', order: 30 },
    { id: 'standard', name: '标准样例', description: '提供完整的合成测试能力', order: 10 },
  ]
  return {
    schemaVersion: 1,
    repository: 'https://github.com/example/upstream',
    commit: fixture.sha,
    commitDate: '2026-01-02',
    gitDescribe: fixture.gitDescribe,
    rootPackageVersion: '0.0.0',
    profiles,
    presets,
    probes: {
      'upstream.commit': fixture.sha,
      'upstream.commit-date': '2026-01-02',
      'upstream.git-describe': fixture.gitDescribe,
      'upstream.root-package-version': '0.0.0',
      'profile:alpha': profiles[0],
      'profile:beta-minimal': profiles[1],
      'preset:cordis': presets[0],
      'preset:minimal': presets[1],
      'preset:ptc': presets[2],
      'preset:standard': presets[3],
    },
  }
}

async function evidenceRoot(t, { baseline, ledger = { schemaVersion: 1, claims: [] }, committed = {} }) {
  const root = await mkdtemp(join(tmpdir(), 'verify-evidence-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'evidence/observations'), { recursive: true })
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  await writeFile(
    join(root, '.github/workflows/verify.yml'),
    await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8'),
  )
  await writeFile(join(root, 'evidence/baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`)
  await writeFile(join(root, 'evidence/claims.json'), `${JSON.stringify(ledger, null, 2)}\n`)
  await writeFile(join(root, 'evidence/observations/upstream-facts.json'), `${JSON.stringify(committed, null, 2)}\n`)
  await writeRepositoryFixture(root)
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

async function git(root, args) {
  return (await runFile('git', args, { cwd: root, env: commitEnv, shell: false })).stdout
}

test('canonical baseline and ledger fixtures validate without mutation', async () => {
  const baseline = await readFixture('baseline.json')
  const ledger = await readFixture('claims.json')
  const originalBaseline = structuredClone(baseline)
  const originalLedger = structuredClone(ledger)

  assert.deepEqual(validateBaseline(baseline), [])
  assert.deepEqual(validateClaimsLedger(ledger, baseline), [])
  assert.deepEqual(baseline, originalBaseline)
  assert.deepEqual(ledger, originalLedger)
})

test('canonical handbook fixture passes complete baseline-aware target validation', async () => {
  const root = fileURLToPath(new URL('fixtures/handbook/valid/', import.meta.url))
  const baseline = await readFixture('baseline.json')
  const ledger = await readFixture('claims.json')

  assert.deepEqual(await validateClaimTargets({ root, baseline, ledger }), [])
})

test('accepts one verified fact, qualified fact, and inference marker', async () => {
  const root = fileURLToPath(new URL('fixtures/handbook/valid/', import.meta.url))
  const ledger = await readFixture('claims.json')
  const originalLedger = structuredClone(ledger)

  const missing = (await validateClaimTargets({ root, ledger }))
    .filter(({ code }) => code === 'CLAIM_TARGET_MISSING')
    .map(({ code, path, claimId }) => ({ code, path, claimId }))
    .sort((left, right) => `${left.path}:${left.claimId}`.localeCompare(`${right.path}:${right.claimId}`, 'en'))

  assert.deepEqual(missing, [])
  assert.deepEqual(ledger, originalLedger)
})

test('repository Markdown walk excludes only fixture and local SDD workspace trees', async t => {
  const root = await mkdtemp(join(tmpdir(), 'repository-markdown-walk-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const paths = [
    'test/fixtures/handbook/valid/docs/sample.md',
    '.superpowers/sdd/task-report.md',
    '.github/pull_request_template.md',
    'docs/sample.md',
    'docs/superpowers/plan.md',
    'README.md',
    'test/normal.md',
  ]
  for (const path of paths) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成结论。\n')
  }

  const index = await collectDocumentClaimMarkers(root)
  assert.deepEqual(index.markers.map(({ path, id }) => ({ path, id })), [
    { path: '.github/pull_request_template.md', id: 'DSH-TEST-001' },
    { path: 'docs/sample.md', id: 'DSH-TEST-001' },
    { path: 'docs/superpowers/plan.md', id: 'DSH-TEST-001' },
    { path: 'README.md', id: 'DSH-TEST-001' },
    { path: 'test/normal.md', id: 'DSH-TEST-001' },
  ])
  assert.deepEqual(index.anchors.map(({ path, anchor }) => ({ path, anchor })), [
    { path: '.github/pull_request_template.md', anchor: 'claim-dsh-test-001' },
    { path: 'docs/sample.md', anchor: 'claim-dsh-test-001' },
    { path: 'docs/superpowers/plan.md', anchor: 'claim-dsh-test-001' },
    { path: 'README.md', anchor: 'claim-dsh-test-001' },
    { path: 'test/normal.md', anchor: 'claim-dsh-test-001' },
  ])
})

test('live verification matches committed observations', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const committed = expectedFacts(fixture)
  const root = await evidenceRoot(t, { baseline: baselineFor(fixture), committed })
  const beforeSource = await fixture.readWorktreeSnapshot()
  const evidencePaths = [
    'evidence/baseline.json',
    'evidence/claims.json',
    'evidence/observations/upstream-facts.json',
  ]
  const beforeEvidence = await Promise.all(evidencePaths.map(path => readFile(join(root, path), 'utf8')))

  assert.deepEqual(await verifyEvidence({ root, source: fixture.root }), {
    inspectedUpstream: true,
    claimCount: 0,
  })
  assert.deepEqual(await fixture.readWorktreeSnapshot(), beforeSource)
  assert.deepEqual(
    await Promise.all(evidencePaths.map(path => readFile(join(root, path), 'utf8'))),
    beforeEvidence,
  )
  assert.equal((await fixture.readGitState()).status, '')
})

test('live verification rejects baseline HEAD', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const expected = '0123456789abcdef0123456789abcdef01234567'
  const root = await evidenceRoot(t, {
    baseline: baselineFor(fixture, {
      commit: expected,
      commitDate: '2026-01-01',
      gitDescribe: 'stale-description',
      rootPackageVersion: '9.9.9',
    }),
    committed: expectedFacts(fixture),
  })

  await assert.rejects(
    verifyEvidence({ root, source: fixture.root }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_HEAD_MISMATCH'
      && assert.deepEqual(error.details, { expected, actual: fixture.sha }) === undefined,
  )
  const capture = output()
  assert.equal(await main(['--root', root, '--source', fixture.root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), {
    ok: false,
    errors: [{ code: 'UPSTREAM_HEAD_MISMATCH', expected, actual: fixture.sha }],
  })
})

test('live verification reports observation drift', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const committed = expectedFacts(fixture)
  committed.profiles[0].bundles[1] = 'drifted-bundle'
  const root = await evidenceRoot(t, { baseline: baselineFor(fixture), committed })

  await assert.rejects(
    verifyEvidence({ root, source: fixture.root }),
    error => error instanceof EvidenceVerificationError
      && assert.deepEqual(error.errors.map(({ code, path }) => ({ code, path })), [
        { code: 'OBSERVATION_DRIFT', path: '/profiles/0/bundles/1' },
      ]) === undefined,
  )

  const escaped = expectedFacts(fixture)
  escaped['added~/key'] = true
  await writeFile(join(root, 'evidence/observations/upstream-facts.json'), `${JSON.stringify(escaped, null, 2)}\n`)
  await assert.rejects(
    verifyEvidence({ root, source: fixture.root }),
    error => error instanceof EvidenceVerificationError
      && assert.deepEqual(error.errors.map(({ code, path }) => ({ code, path })), [
        { code: 'OBSERVATION_DRIFT', path: '/added~0~1key' },
      ]) === undefined,
  )
})

for (const [field, value] of [
  ['commitDate', '2026-01-01'],
  ['gitDescribe', 'stale-description'],
  ['rootPackageVersion', '9.9.9'],
]) {
  test(`live verification rejects baseline metadata drift at /${field}`, async t => {
    const fixture = await createFixtureRepository(template)
    t.after(fixture.cleanup)
    const root = await evidenceRoot(t, {
      baseline: baselineFor(fixture, { [field]: value }),
      committed: expectedFacts(fixture),
    })
    const expected = [{ code: 'OBSERVATION_DRIFT', path: `/${field}` }]
    assert.deepEqual(
      (await collectEvidenceErrors({ root, source: fixture.root })).map(({ code, path }) => ({ code, path })),
      expected,
    )
    const capture = output()
    assert.equal(await main(['--root', root, '--source', fixture.root], capture.io), 1)
    assert.equal(capture.stdout(), '')
    assert.deepEqual(JSON.parse(capture.stderr()), { ok: false, errors: expected })
  })
}

test('live verification reports the first baseline metadata mismatch before observation drift', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const committed = expectedFacts(fixture)
  committed.profiles[0].bundles[0] = 'stale-bundle'
  const root = await evidenceRoot(t, {
    baseline: baselineFor(fixture, {
      commitDate: '2026-01-01',
      gitDescribe: 'stale-description',
      rootPackageVersion: '9.9.9',
    }),
    committed,
  })
  assert.deepEqual(
    (await collectEvidenceErrors({ root, source: fixture.root })).map(({ code, path }) => ({ code, path })),
    [{ code: 'OBSERVATION_DRIFT', path: '/commitDate' }],
  )
})

for (const [name, mutate, path] of [
  ['profiles array replaced by numeric record', value => { value.profiles = { ...value.profiles } }, '/profiles'],
  ['bundles array replaced by numeric record', value => { value.profiles[0].bundles = { ...value.profiles[0].bundles } }, '/profiles/0/bundles'],
  ['profile record replaced by array', value => { value.profiles[0] = [] }, '/profiles/0'],
]) {
  test(`live verification rejects ${name} at the container pointer`, async t => {
    const fixture = await createFixtureRepository(template)
    t.after(fixture.cleanup)
    const committed = expectedFacts(fixture)
    mutate(committed)
    const root = await evidenceRoot(t, { baseline: baselineFor(fixture), committed })
    await assert.rejects(
      verifyEvidence({ root, source: fixture.root }),
      error => error instanceof EvidenceVerificationError
        && assert.deepEqual(error.errors.map(({ code, path }) => ({ code, path })), [
          { code: 'OBSERVATION_DRIFT', path },
        ]) === undefined,
    )
  })
}

test('live verification surfaces Profile parse drift', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const profilePath = join(fixture.root, 'packages/boot/app-boot/src/profile.ts')
  await writeFile(profilePath, "export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {\n  alpha: { bundles: ['bundle-c'], unexpected: 'live' },\n}\n")
  await git(fixture.root, ['add', 'packages/boot/app-boot/src/profile.ts'])
  await git(fixture.root, ['commit', '-m', 'profile syntax drift'])
  const commit = (await git(fixture.root, ['rev-parse', 'HEAD'])).trim()
  const gitDescribe = (await git(fixture.root, ['describe', '--tags', '--always', '--long'])).trim()
  const root = await evidenceRoot(t, {
    baseline: baselineFor(fixture, { commit, gitDescribe }),
    committed: {},
  })

  await assert.rejects(
    verifyEvidence({ root, source: fixture.root }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'PROFILE_TEMPLATES_PARSE_ERROR'
      && error.details.offset === 112,
  )
  const capture = output()
  assert.equal(await main(['--root', root, '--source', fixture.root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), {
    ok: false,
    errors: [{ code: 'PROFILE_TEMPLATES_PARSE_ERROR', offset: 112 }],
  })
})

test('offline verification reports inspectedUpstream false', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const ledger = {
    schemaVersion: 1,
    claims: [{
      id: 'CMP-TEST-001',
      statement: '离线合成结论。',
      kind: 'external-comparison',
      confidence: 'verified',
      maturity: 'not-applicable',
      documents: ['docs/sample.md#claim-cmp-test-001'],
      sources: [{
        type: 'external',
        url: 'https://example.com/reference',
        publisher: 'Example Publisher',
        accessDate: '2026-01-03',
      }],
    }],
  }
  const root = await evidenceRoot(t, { baseline: baselineFor(fixture), ledger })
  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'docs/sample.md'), '<a id="claim-cmp-test-001"></a> **Claim `CMP-TEST-001`:** 离线合成结论。\n')

  assert.deepEqual(await verifyEvidence({ root }), { inspectedUpstream: false, claimCount: 1 })
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 0)
  assert.deepEqual(JSON.parse(capture.stdout()), { ok: true, inspectedUpstream: false, claimCount: 1 })
  assert.equal(capture.stderr(), '')
})

test('repository workflow passes full-SHA pin validation', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  assert.deepEqual(await validateWorkflowPins(root), [])
})

test('repository workflow validation rejects missing required workflow', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  assert.deepEqual(await validateWorkflowPins(root), [{
    code: 'REPOSITORY_FILE_INVALID',
    path: '.github/workflows/verify.yml',
    field: '/presence',
    message: 'REPOSITORY_FILE_INVALID',
  }])
})

test('repository workflow validation rejects malformed required fields', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  const workflow = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  await writeFile(join(root, '.github/workflows/verify.yml'), workflow.replace('  contents: read', '  contents: write'))
  assert.deepEqual(await validateWorkflowPins(root), [{
    code: 'REPOSITORY_FILE_INVALID',
    path: '.github/workflows/verify.yml',
    field: '/permissions/contents',
    message: 'REPOSITORY_FILE_INVALID',
  }])
})

test('repository workflow validation accepts a structurally valid updated action pin', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  const workflow = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  await writeFile(
    join(root, '.github/workflows/verify.yml'),
    workflow
      .replaceAll('de0fac2e4500dabe0009e67214ff5f5447ce83dd', '1111111111111111111111111111111111111111')
      .replaceAll('820762786026740c76f36085b0efc47a31fe5020', '2222222222222222222222222222222222222222'),
  )
  assert.deepEqual(await validateWorkflowPins(root), [])
})

test('repository workflow validation requires the intended action repositories and counts', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-contract-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  const workflow = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  await writeFile(join(root, '.github/workflows/verify.yml'), workflow.replaceAll('actions/checkout@', 'example/checkout@'))
  assert.deepEqual((await validateWorkflowPins(root)).map(({ code, path, field }) => ({ code, path, field })), [
    { code: 'REPOSITORY_FILE_INVALID', path: '.github/workflows/verify.yml', field: '/jobs/verify/steps/checkout/uses' },
  ])
})

for (const [name, mutate, field] of [
  ['swapped checkout paths', text => text.replace('path: handbook', 'path: temporary').replace('path: upstream', 'path: handbook').replace('path: temporary', 'path: upstream'), '/jobs/verify/steps/checkout/with/path'],
  ['missing trigger block', text => text.replace('on:\n  push:\n  pull_request:\n', ''), '/on'],
  ['missing push trigger', text => text.replace('  push:\n', ''), '/on/push'],
  ['missing pull request trigger', text => text.replace('  pull_request:\n', ''), '/on/pull_request'],
  ['missing runner', text => text.replace('    runs-on: ubuntu-latest\n', ''), '/jobs/verify/runs-on'],
  ['upstream credentials moved to handbook', text => text.replace('          persist-credentials: false', '          persist-credentials: false\n          persist-credentials: false').replace('          fetch-tags: true\n          persist-credentials: false', '          fetch-tags: true'), '/jobs/verify/steps/setup-node/name'],
  ['extra executable step', text => text + '      - run: echo extra\n', '/syntax'],
  ['conditional test', text => text.replace('        run: npm test', '        if: false\n        run: npm test'), '/jobs/verify/steps/test/run'],
  ['unexpected shell', text => text.replace('        run: npm test', '        shell: custom-shell\n        run: npm test'), '/jobs/verify/steps/test/run'],
]) {
  test(`repository workflow ownership rejects ${name}`, async t => {
    const root = await mkdtemp(join(tmpdir(), 'workflow-ownership-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    await mkdir(join(root, '.github/workflows'), { recursive: true })
    const workflow = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
    const path = '.github/workflows/verify.yml'
    await writeFile(join(root, path), mutate(workflow))
    assert.deepEqual(
      (await validateWorkflowPins(root)).map(({ code, path, field }) => ({ code, path, field })),
      [{ code: 'REPOSITORY_FILE_INVALID', path, field }],
    )
  })
}

test('repository workflow keeps unpinned action errors separate from structure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-unpinned-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  const workflow = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  const path = '.github/workflows/verify.yml'
  await writeFile(join(root, path), workflow.replace('actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd', 'actions/checkout@v6'))
  assert.deepEqual(
    (await validateWorkflowPins(root)).map(({ code, path, field, line }) => ({ code, path, field, line })),
    [{ code: 'WORKFLOW_USES_UNPINNED', path, field: undefined, line: 17 }],
  )
})

for (const [name, text] of [
  ['flow action', 'steps:\n  - { uses: owner/repo@v1 }\n'],
  ['flow steps', 'steps: [{uses: owner/repo@v1}]\n'],
  ['quoted uses key', 'steps:\n  - "uses": owner/repo@v1\n'],
  ['split uses key', 'steps:\n  - ? uses\n    : owner/repo@v1\n'],
  ['escaped uses key', 'steps:\n  - "u\\u0073es": owner/repo@v1\n'],
]) {
  test(`workflow pin scanner rejects unsupported executable ${name}`, async t => {
    const root = await mkdtemp(join(tmpdir(), 'workflow-syntax-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    await mkdir(join(root, '.github/workflows'), { recursive: true })
    await writeFile(join(root, '.github/workflows/verify.yml'), await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8'))
    const path = '.github/workflows/other.yml'
    await writeFile(join(root, path), text)
    assert.deepEqual(
      (await validateWorkflowPins(root)).map(({ code, path, field }) => ({ code, path, field })),
      [{ code: 'REPOSITORY_FILE_INVALID', path, field: '/syntax' }],
    )
  })
}
