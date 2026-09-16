import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { collectEvidenceErrors, main, verifyEvidence } from '../scripts/verify-evidence.mjs'

const runFile = promisify(execFile)

const cliCff = `cff-version: 1.2.0
message: Fixture citation.
title: DeepSeek Harness Analysis
type: software
authors:
  - name: yang0228
repository-code: https://github.com/yang0228/deepseek-harness-analysis
version: snapshot-01234567
preferred-citation:
  type: report
  authors:
    - name: yang0228
  title: DeepSeek Harness Analysis
  version: snapshot-01234567
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
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  await writeFile(
    join(root, '.github/workflows/verify.yml'),
    (await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8'))
      .replace(/^          ref: .+$/mu, '          ref: 0123456789abcdef0123456789abcdef01234567'),
  )
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

test('verify CLI defaults root to cwd', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  const script = fileURLToPath(new URL('../scripts/verify-evidence.mjs', import.meta.url))
  const result = await runFile(process.execPath, [script], { cwd: root })
  assert.equal(result.stderr, '')
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    inspectedUpstream: false,
    claimCount: 0,
  })
})

test('verify CLI prints one success summary', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 0)
  assert.equal(capture.stderr(), '')
  assert.equal(capture.stdout().endsWith('\n'), true)
  assert.equal(capture.stdout().endsWith('\n\n'), false)
  assert.deepEqual(JSON.parse(capture.stdout()), {
    ok: true,
    inspectedUpstream: false,
    claimCount: 0,
  })
})

test('verify CLI rejects an upstream fact with only external sources', async t => {
  const claims = {
    schemaVersion: 1,
    claims: [{
      id: 'DSH-TEST-001',
      statement: '合成上游事实。',
      kind: 'upstream-fact',
      confidence: 'verified',
      maturity: 'released',
      documents: ['docs/sample.md#claim-dsh-test-001'],
      sources: [{
        type: 'external',
        url: 'https://example.com/reference',
        publisher: 'Example',
        accessDate: '2026-01-03',
      }],
    }],
  }
  const root = await rootFixture(t, claims)
  await writeFile(join(root, 'docs/sample.md'), '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成上游事实。\n')
  const capture = output()

  assert.equal(await main(['--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), {
    ok: false,
    errors: [{ code: 'UPSTREAM_SOURCE_REQUIRED', claimId: 'DSH-TEST-001' }],
  })
})

test('verify CLI accepts an upstream fact with an upstream source', async t => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const repository = 'https://github.com/example/upstream'
  const claims = {
    schemaVersion: 1,
    claims: [{
      id: 'DSH-TEST-001',
      statement: '合成上游事实。',
      kind: 'upstream-fact',
      confidence: 'verified',
      maturity: 'released',
      documents: ['docs/sample.md#claim-dsh-test-001'],
      sources: [{
        type: 'upstream',
        repository,
        commit,
        path: 'README.md',
        startLine: 1,
        endLine: 1,
        url: `${repository}/blob/${commit}/README.md#L1`,
      }],
    }],
  }
  const root = await rootFixture(t, claims)
  await writeFile(join(root, 'docs/sample.md'), '<a id="claim-dsh-test-001"></a> **Claim `DSH-TEST-001`:** 合成上游事实。\n')
  const capture = output()

  assert.equal(await main(['--root', root], capture.io), 0)
  assert.equal(capture.stderr(), '')
  assert.deepEqual(JSON.parse(capture.stdout()), {
    ok: true,
    inspectedUpstream: false,
    claimCount: 1,
  })
})

test('verify CLI rejects duplicate options', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  const capture = output()
  assert.equal(await main(['--root', root, '--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), {
    ok: false,
    errors: [{ code: 'VERIFIER_USAGE', path: '/' }],
  })
})

test('verify CLI rejects missing and option-token values', async () => {
  for (const argv of [
    ['--root'],
    ['--source'],
    ['--root', '--source'],
    ['--source', '--root'],
  ]) {
    const capture = output()
    assert.equal(await main(argv, capture.io), 1, argv.join(' '))
    assert.equal(capture.stdout(), '', argv.join(' '))
    assert.deepEqual(JSON.parse(capture.stderr()), {
      ok: false,
      errors: [{ code: 'VERIFIER_USAGE', path: '/' }],
    }, argv.join(' '))
  }
})

test('verify CLI aggregates deterministic failures', async t => {
  const claims = {
    schemaVersion: 1,
    claims: [{
      id: 'DSH-TEST-001',
      statement: '合成结论。',
      kind: 'upstream-fact',
      confidence: 'verified',
      maturity: 'released',
      documents: ['docs/missing.md#claim-dsh-test-001'],
      sources: [{
        type: 'upstream',
        repository: 'https://github.com/example/upstream',
        commit: '0123456789abcdef0123456789abcdef01234567',
        path: 'README.md',
        startLine: 1,
        endLine: 1,
        url: 'https://github.com/example/upstream/blob/0123456789abcdef0123456789abcdef01234567/README.md#wrong',
      }],
    }],
  }
  const root = await rootFixture(t, claims)
  await writeFile(join(root, '.github/workflows/invalid.yml'), 'uses: actions/checkout@v4\n')
  const capture = output()

  assert.equal(await main(['--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), {
    ok: false,
    errors: [
      { code: 'CLAIM_TARGET_MISSING', path: 'docs/missing.md', claimId: 'DSH-TEST-001' },
      { code: 'UPSTREAM_SOURCE_INVALID', claimId: 'DSH-TEST-001', sourceIndex: 0 },
      { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 1 },
    ],
  })
})

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

test('verify CLI reserves internal error for unknown programming failures', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  let stderr = ''
  const code = await main(['--root', root], {
    stdout: { write: () => { throw new TypeError('synthetic writer failure') } },
    stderr: { write: value => { stderr += value } },
  })
  assert.equal(code, 1)
  assert.deepEqual(JSON.parse(stderr), { ok: false, errors: [{ code: 'VERIFIER_INTERNAL_ERROR' }] })
})

for (const [path, code] of [
  ['evidence/baseline.json', 'BASELINE_SCHEMA_ERROR'],
  ['evidence/claims.json', 'LEDGER_SCHEMA_ERROR'],
  ['evidence/observations/upstream-facts.json', 'REPOSITORY_FILE_INVALID'],
]) {
  for (const [name, mutate, field] of [
    ['missing', target => rm(target), '/presence'],
    ['unreadable directory', async target => { await rm(target); await mkdir(target) }, '/presence'],
    ['malformed', target => writeFile(target, '{not JSON}\n'), '/content'],
    ['empty', target => writeFile(target, ''), '/content'],
  ]) {
    test(`evidence file failures normalize ${name} ${path} through aggregate and CLI`, async t => {
      const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
      await mutate(join(root, path))
      const expected = [{ code, path, field }]
      const capture = output()
      assert.equal(await main(['--root', root], capture.io), 1)
      assert.equal(capture.stdout(), '')
      assert.deepEqual(JSON.parse(capture.stderr()), { ok: false, errors: expected })
      assert.deepEqual(
        (await collectEvidenceErrors({ root })).map(({ code, path, field }) => ({ code, path, field })),
        expected,
      )
    })
  }
}

test('evidence file failures aggregate in baseline ledger observation order', async t => {
  const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
  await rm(join(root, 'evidence/baseline.json'))
  await writeFile(join(root, 'evidence/claims.json'), '{bad}\n')
  await rm(join(root, 'evidence/observations/upstream-facts.json'))
  const expected = [
    { code: 'BASELINE_SCHEMA_ERROR', path: 'evidence/baseline.json', field: '/presence' },
    { code: 'LEDGER_SCHEMA_ERROR', path: 'evidence/claims.json', field: '/content' },
    { code: 'REPOSITORY_FILE_INVALID', path: 'evidence/observations/upstream-facts.json', field: '/presence' },
  ]
  const capture = output()
  assert.equal(await main(['--root', root], capture.io), 1)
  assert.equal(capture.stdout(), '')
  assert.deepEqual(JSON.parse(capture.stderr()), { ok: false, errors: expected })
  assert.deepEqual(
    (await collectEvidenceErrors({ root })).map(({ code, path, field }) => ({ code, path, field })),
    expected,
  )
})

for (const [path, code, field] of [
  ['evidence/baseline.json', 'BASELINE_SCHEMA_ERROR', '/'],
  ['evidence/claims.json', 'LEDGER_SCHEMA_ERROR', '/'],
  ['evidence/observations/upstream-facts.json', 'REPOSITORY_FILE_INVALID', '/content'],
]) {
  for (const json of ['null', '[]', '"text"']) {
    test(`evidence JSON records reject ${json} in ${path} with the repository path`, async t => {
      const root = await rootFixture(t, { schemaVersion: 1, claims: [] })
      await writeFile(join(root, path), `${json}\n`)
      const expected = [{ code, path, field }]
      const capture = output()
      assert.equal(await main(['--root', root], capture.io), 1)
      assert.equal(capture.stdout(), '')
      assert.deepEqual(JSON.parse(capture.stderr()), { ok: false, errors: expected })
      assert.deepEqual(
        (await collectEvidenceErrors({ root })).map(({ code, path, field }) => ({ code, path, field })),
        expected,
      )
    })
  }
}
