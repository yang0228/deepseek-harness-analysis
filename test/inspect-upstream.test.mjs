import assert from 'node:assert/strict'
import { readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

import { formatJson, main, readPresetRoster } from '../scripts/inspect-upstream.mjs'
import { createFixtureRepository } from './helpers/fixture-repo.mjs'

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

test('Preset roster returns sorted declaration ids and their patch source paths', async () => {
  const source = new URL('./fixtures/upstream-template/', import.meta.url).pathname
  assert.deepEqual(await readPresetRoster(source), [
    { id: 'cordis', order: 40, sourcePath: 'packages/bundle/web-app/presets/cordis.patch.yml' },
    { id: 'minimal', order: 20, sourcePath: 'packages/bundle/web-app/presets/minimal.patch.yml' },
    { id: 'ptc', order: 30, sourcePath: 'packages/bundle/web-app/presets/ptc.patch.yml' },
    { id: 'standard', order: 10, sourcePath: 'packages/bundle/web-app/presets/standard.patch.yml' },
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

for (const variation of ['duplicate id', 'empty roster', 'symlink declaration']) {
  test(`Preset roster rejects ${variation}`, async t => {
    const fixture = await createFixtureRepository(new URL('./fixtures/upstream-template/', import.meta.url))
    t.after(fixture.cleanup)
    const root = join(fixture.root, 'packages/bundle/web-app/presets')
    if (variation === 'duplicate id') {
      await writeFile(join(root, 'copy.patch.yml'), await readFile(join(root, 'standard.patch.yml')))
    } else if (variation === 'empty roster') {
      for (const name of await readdir(root)) await rm(join(root, name))
    } else {
      await symlink('standard.patch.yml', join(root, 'alias.patch.yml'))
    }
    await assert.rejects(readPresetRoster(fixture.root), error => error.code === 'PRESET_ROSTER_PARSE_ERROR')
  })
}
