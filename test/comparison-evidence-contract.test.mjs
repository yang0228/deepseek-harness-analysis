import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { validateClaimsLedger, validateClaimTargets } from '../scripts/verify-evidence.mjs'

const fixtureRoot = fileURLToPath(new URL('./fixtures/handbook/valid/', import.meta.url))
const blobUrl = 'https://github.com/acme/example/blob/0123456789abcdef0123456789abcdef01234567/README.md'

function stableProblems(problems) {
  return problems.map(problem => Object.fromEntries(
    ['code', 'path', 'field', 'claimId', 'sourceIndex']
      .filter(key => problem[key] !== undefined)
      .map(key => [key, problem[key]]),
  ))
}

async function comparisonFixture() {
  const baseline = JSON.parse(await readFile(join(fixtureRoot, 'evidence/baseline.json'), 'utf8'))
  const fixtureLedger = JSON.parse(await readFile(join(fixtureRoot, 'evidence/claims.json'), 'utf8'))
  const claim = fixtureLedger.claims.find(candidate => candidate.id === 'CMP-FW-TEST-001')
  assert.ok(claim, 'CMP-FW-TEST-001 fixture claim must exist')
  return { baseline, fixtureLedger, claim }
}

test('external comparison metadata policy is offline', async t => {
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = async () => {
    fetchCalls += 1
    throw new Error('offline verifier attempted HTTP')
  }
  try {
    const { baseline, fixtureLedger, claim } = await comparisonFixture()
    assert.deepEqual(validateClaimsLedger({ schemaVersion: 1, claims: [claim] }, baseline), [])
    assert.deepEqual(await validateClaimTargets({ root: fixtureRoot, ledger: fixtureLedger }), [])
    for (const [field, mutate] of [
      ['publisher', source => { delete source.publisher }],
      ['accessDate', source => { delete source.accessDate }],
      ['url', source => { source.url = 'http://docs.example.invalid/comparison' }],
    ]) {
      const candidate = structuredClone(claim)
      mutate(candidate.sources[0])
      assert.deepEqual(stableProblems(validateClaimsLedger({ schemaVersion: 1, claims: [candidate] }, baseline)), [{
        code: 'LEDGER_SCHEMA_ERROR',
        field: `/claims/0/sources/0/${field}`,
        claimId: 'CMP-FW-TEST-001',
        sourceIndex: 0,
      }])
    }
    const emptyRoot = await mkdtemp(join(tmpdir(), 'dsh-comparison-target-'))
    t.after(() => rm(emptyRoot, { recursive: true, force: true }))
    await mkdir(join(emptyRoot, 'docs/comparisons'), { recursive: true })
    assert.deepEqual(stableProblems(await validateClaimTargets({
      root: emptyRoot,
      ledger: { claims: [claim] },
    })), [{
      code: 'CLAIM_TARGET_MISSING',
      path: 'docs/comparisons/sample.md',
      claimId: 'CMP-FW-TEST-001',
    }])
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(fetchCalls, 0)
})

test('external GitHub blob commit matches URL', async () => {
  const { baseline, claim } = await comparisonFixture()
  const matching = structuredClone(claim)
  matching.sources = [{
    type: 'external',
    url: blobUrl,
    publisher: 'Example Project',
    accessDate: '2026-09-05',
    commit: '0123456789abcdef0123456789abcdef01234567',
  }]
  assert.deepEqual(validateClaimsLedger({ schemaVersion: 1, claims: [matching] }, baseline), [])
  for (const commit of ['1123456789abcdef0123456789abcdef01234567', undefined]) {
    const candidate = structuredClone(matching)
    if (commit === undefined) delete candidate.sources[0].commit
    else candidate.sources[0].commit = commit
    assert.deepEqual(stableProblems(validateClaimsLedger({ schemaVersion: 1, claims: [candidate] }, baseline)), [{
      code: 'EXTERNAL_SOURCE_REVISION_MISMATCH',
      claimId: 'CMP-FW-TEST-001',
      sourceIndex: 0,
    }])
  }
})
