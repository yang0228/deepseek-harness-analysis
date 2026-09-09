import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { formatJson, main, readPresetRoster } from '../scripts/inspect-upstream.mjs'

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

test('Preset roster returns sorted ids from immediate directories', async () => {
  const source = new URL('./fixtures/upstream-template/', import.meta.url).pathname
  assert.deepEqual(await readPresetRoster(source), [
    { id: 'cordis', name: '创作样例', description: '提供扩展的合成测试能力', order: 40 },
    { id: 'minimal', name: '精简样例', description: '提供最少的合成测试能力', order: 20 },
    { id: 'ptc', name: '编排样例', description: '提供程序化的合成测试能力', order: 30 },
    { id: 'standard', name: '标准样例', description: '提供完整的合成测试能力', order: 10 },
  ])
})

test('CLI reports invalid usage as structured JSON', async () => {
  const argv = ['--source', '/tmp/only-source']
  let stdout = ''
  let stderr = ''
  const code = await main(argv, {
    stdout: { write: value => { stdout += value } },
    stderr: { write: value => { stderr += value } },
  })
  assert.equal(code, 1)
  assert.equal(stdout, '')
  assert.deepEqual(JSON.parse(stderr), {
    ok: false,
    error: { code: 'INSPECTOR_USAGE', details: { actual: argv } },
  })
})
