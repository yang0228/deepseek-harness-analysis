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

const currentUpstreamSource = {
  type: 'upstream',
  repository: validBaseline.repository,
  commit: validBaseline.commit,
  path: 'README.md',
  startLine: 1,
  endLine: 1,
  url: `${validBaseline.repository}/blob/${validBaseline.commit}/README.md#L1`,
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

test('upstream fact rejects external-only sources', () => {
  assert.deepEqual(selected(validateClaimsLedger(validLedger({
    kind: 'upstream-fact',
    confidence: 'verified',
    maturity: 'released',
  }), validBaseline)), [
    { code: 'UPSTREAM_SOURCE_REQUIRED', claimId: 'CMP-TEST-001' },
  ])
})

test('upstream fact reports malformed external-only sources without a relationship duplicate', () => {
  const value = validLedger({
    kind: 'upstream-fact',
    confidence: 'verified',
    maturity: 'released',
  })
  delete value.claims[0].sources[0].url
  assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [
    {
      code: 'LEDGER_SCHEMA_ERROR',
      field: '/claims/0/sources/0/url',
      claimId: 'CMP-TEST-001',
      sourceIndex: 0,
    },
  ])
})

test('upstream fact accepts an upstream-only source', () => {
  assert.deepEqual(selected(validateClaimsLedger(ledger(structuredClone(currentUpstreamSource), {
    kind: 'upstream-fact',
    confidence: 'verified',
    maturity: 'released',
  }), validBaseline)), [])
})

test('upstream fact accepts mixed upstream and external sources', () => {
  const value = ledger(structuredClone(currentUpstreamSource), {
    kind: 'upstream-fact',
    confidence: 'verified',
    maturity: 'released',
  })
  value.claims[0].sources.push(structuredClone(currentExternalSource))
  assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [])
})

test('analysis inference preserves mixed upstream and external sources', () => {
  const value = ledger(structuredClone(currentUpstreamSource), {
    kind: 'analysis-inference',
    confidence: 'qualified',
    maturity: 'released',
    qualification: 'Author analysis.',
  })
  value.claims[0].sources.push(structuredClone(currentExternalSource))
  assert.deepEqual(selected(validateClaimsLedger(value, validBaseline)), [])
})

for (const [name, kind] of [
  ['array kind', ['external-comparison']],
  ['inherited constructor kind', 'constructor'],
  ['inherited prototype kind', '__proto__'],
  ['object kind with hostile coercion keys', { toString: 'external-comparison', valueOf: null }],
  ['null kind', null],
]) {
  test(`ledger rejects ${name} without coercion or inherited lookup`, () => {
    assert.deepEqual(selected(validateClaimsLedger(validLedger({ kind }), validBaseline)), [{
      code: 'LEDGER_SCHEMA_ERROR',
      field: '/claims/0/kind',
      claimId: 'CMP-TEST-001',
    }])
  })
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
