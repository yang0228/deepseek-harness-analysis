import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import {
  buildUpstreamSourceUrl,
  validateClaimTargets,
  validateMarkdownLinks,
  validateWorkflowPins,
} from '../scripts/verify-evidence.mjs'
import { createFixtureRepository } from './helpers/fixture-repo.mjs'

const runFile = promisify(execFile)

async function sourceGit(root, args) {
  return (await runFile('git', args, {
    cwd: root,
    shell: false,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Fixture Author',
      GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture Author',
      GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      GIT_AUTHOR_DATE: '2026-01-02T00:00:00Z',
      GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z',
    },
  })).stdout
}

async function createSourceRepository(t) {
  const fixture = await createFixtureRepository(new URL('./fixtures/upstream-template/', import.meta.url))
  t.after(fixture.cleanup)
  await writeFile(join(fixture.root, 'README.md'), 'one\ntwo\n')
  await sourceGit(fixture.root, ['add', 'README.md'])
  await sourceGit(fixture.root, ['commit', '-m', 'source citation fixture'])
  const baseline = {
    repository: 'https://github.com/example/upstream',
    commit: (await sourceGit(fixture.root, ['rev-parse', 'HEAD'])).trim(),
  }
  return { source: fixture.root, baseline, fixture }
}

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
  const { source, baseline } = await createSourceRepository(t)
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
  const { source, baseline } = await createSourceRepository(t)
  const base = {
    type: 'upstream',
    repository: baseline.repository,
    commit: baseline.commit,
    path: 'README.md',
    startLine: 1,
    endLine: 2,
    url: '',
  }
  const valid = { ...base, url: buildUpstreamSourceUrl(base) }
  assert.deepEqual(await validateClaimTargets({
    root, source, baseline, ledger: { claims: [handbookClaim({ sources: [valid] })] },
  }), [])
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

test('upstream sources require canonical regular tracked blobs', async t => {
  const root = await createHandbook(t)
  const { source, baseline, fixture } = await createSourceRepository(t)
  await mkdir(join(source, 'docs'))
  await writeFile(join(source, 'AGENTS.md'), 'tracked line\n'.repeat(100))
  await symlink('AGENTS.md', join(source, 'CLAUDE.md'))
  await symlink(join(root, 'docs'), join(source, 'escape'))
  await writeFile(join(source, 'docs/source ü.md'), 'one\ntwo\n')
  await chmod(join(source, 'docs/source ü.md'), 0o755)
  await sourceGit(source, ['add', '.'])
  await sourceGit(source, ['commit', '-m', 'tracked blob modes'])
  baseline.commit = (await sourceGit(source, ['rev-parse', 'HEAD'])).trim()
  await writeFile(join(source, 'untracked.md'), 'not tracked\n')
  const beforeFiles = await fixture.readWorktreeSnapshot()
  const beforeGit = await fixture.readGitState()
  for (const [path, endLine, valid] of [
    ['README.md', 2, true],
    ['docs/source ü.md', 2, true],
    ['.git/HEAD', 1, false],
    ['CLAUDE.md', 100, false],
    ['escape/sample.md', 1, false],
    ['./README.md', 1, false],
    ['docs/../README.md', 1, false],
    ['docs//source ü.md', 1, false],
    ['untracked.md', 1, false],
    ['.ignored-sentinel', 1, false],
    ['docs', 1, false],
  ]) {
    await t.test(path, async () => {
      const record = {
        type: 'upstream', ...baseline, path, startLine: 1, endLine,
      }
      record.url = buildUpstreamSourceUrl(record)
      const errors = await validateClaimTargets({
        root, source, baseline, ledger: { claims: [handbookClaim({ sources: [record] })] },
      })
      assert.deepEqual(errors.map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex })), valid ? [] : [
        { code: 'UPSTREAM_SOURCE_INVALID', claimId: 'DSH-TEST-001', sourceIndex: 0 },
      ])
    })
  }
  assert.deepEqual(await fixture.readWorktreeSnapshot(), beforeFiles)
  assert.deepEqual(await fixture.readGitState(), beforeGit)
})

test('upstream source line bounds use the pinned blob rather than worktree bytes', async t => {
  const root = await createHandbook(t)
  const { source, baseline } = await createSourceRepository(t)
  const record = { type: 'upstream', ...baseline, path: 'README.md', startLine: 1, endLine: 3 }
  record.url = buildUpstreamSourceUrl(record)
  await writeFile(join(source, 'README.md'), 'worktree only\n'.repeat(100))
  assert.deepEqual(
    (await validateClaimTargets({ root, source, baseline, ledger: { claims: [handbookClaim({ sources: [record] })] } }))
      .map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex })),
    [{ code: 'UPSTREAM_SOURCE_INVALID', claimId: 'DSH-TEST-001', sourceIndex: 0 }],
  )
  await rm(join(source, 'README.md'))
  record.endLine = 2
  record.url = buildUpstreamSourceUrl(record)
  assert.deepEqual(await validateClaimTargets({
    root, source, baseline, ledger: { claims: [handbookClaim({ sources: [record] })] },
  }), [])
})

test('offline upstream sources reject noncanonical and Git metadata paths', async t => {
  const root = await createHandbook(t)
  const baseline = { repository: 'https://github.com/example/upstream', commit: '0123456789abcdef0123456789abcdef01234567' }
  for (const path of ['.git/HEAD', './README.md', 'docs/../README.md', 'docs//README.md']) {
    const record = { type: 'upstream', ...baseline, path, startLine: 1, endLine: 1 }
    record.url = buildUpstreamSourceUrl(record)
    assert.deepEqual(
      (await validateClaimTargets({ root, baseline, ledger: { claims: [handbookClaim({ sources: [record] })] } }))
        .map(({ code, claimId, sourceIndex }) => ({ code, claimId, sourceIndex })),
      [{ code: 'UPSTREAM_SOURCE_INVALID', claimId: 'DSH-TEST-001', sourceIndex: 0 }],
      path,
    )
  }
})

test('qualified inference stays human reviewed', async t => {
  const root = await createHandbook(t)
  const claim = handbookClaim({ confidence: 'qualified', maturity: 'released', qualification: 'Requires architectural interpretation.' })
  const before = structuredClone(claim)
  assert.deepEqual(await validateClaimTargets({ root, ledger: { claims: [claim] } }), [])
  assert.deepEqual(claim, before)
})

async function workflowFixture(name) {
  return readFile(new URL(`fixtures/workflows/${name}.yml`, import.meta.url), 'utf8')
}

test('workflow uses require local paths or full lowercase SHAs', async t => {
  const root = await createHandbook(t)
  await mkdir(join(root, '.github/workflows'), { recursive: true })
  await writeFile(
    join(root, '.github/workflows/verify.yml'),
    await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8'),
  )
  const local = await workflowFixture('local')
  const pinned = await workflowFixture('pinned')
  await writeFile(join(root, '.github/workflows/valid.yml'), `steps:\n${local}${pinned}`)
  assert.deepEqual(await validateWorkflowPins(root), [])
  const tagged = await workflowFixture('tagged')
  const malformed = await workflowFixture('malformed')
  await writeFile(join(root, '.github/workflows/invalid.yml'), `steps:\n${tagged}${malformed}`)
  assert.deepEqual((await validateWorkflowPins(root)).map(({ code, path, line }) => ({ code, path, line })), [
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 2 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 3 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 4 },
    { code: 'WORKFLOW_USES_UNPINNED', path: '.github/workflows/invalid.yml', line: 5 },
  ])
})
