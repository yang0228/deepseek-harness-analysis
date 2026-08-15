import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePresetMetadata, parseProfileTemplates } from '../scripts/inspect-upstream.mjs'

const profileSource = `export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {
  'beta-minimal': { bundles: ['bundle-b', 'bundle-a'] },
  alpha: { bundles: ['bundle-c'] },
}\n`

test('Profile parser returns sorted ids without reordering bundles', () => {
  assert.deepEqual(parseProfileTemplates(profileSource), [
    { id: 'alpha', bundles: ['bundle-c'] },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'] },
  ])
})

const profileFailures = [
  ['renamed declaration', profileSource.replace('PROFILE_TEMPLATES', 'RENAMED')],
  ['spread entry', profileSource.replace("  'beta-minimal':", '  ...sharedProfiles,\n  \'beta-minimal\':')],
  ['computed bundle value', profileSource.replace("['bundle-c']", '[resolveBundle()]')],
  ['obsolete patchReload', profileSource.replace("['bundle-c']", "['bundle-c'], patchReload: 'live'")],
  ['missing entry comma', profileSource.replace(" },\n  alpha", " }\n  alpha")],
  ['duplicate profile id', profileSource.replace('  alpha:', "  'beta-minimal':")],
  ['trailing property', profileSource.replace("['bundle-c'] }", "['bundle-c'], label: 'extra' }")],
  ['unconsumed token', profileSource.replace("  alpha: {", '  unexpected\n  alpha: {')],
  ['header only in a block comment', `/* ${profileSource} */`],
  ['header only in line comments', profileSource.split('\n').map(line => `// ${line}`).join('\n')],
  ['header only in a double-quoted string', `const example = ${JSON.stringify(profileSource)}`],
  ['header only in a single-quoted string', "const example = '" + profileSource.replaceAll("'", '"').replaceAll('\n', '\\n') + "'"],
  ['header only in a template string', '\x60' + profileSource + '\x60'],
  ['header only in a regular expression', '/' + profileSource.replaceAll('\n', ' ') + '/'],
  ['multiple live declarations', profileSource + profileSource],
]

for (const [name, source] of profileFailures) {
  test(`Profile parser rejects ${name}`, () => {
    assert.throws(
      () => parseProfileTemplates(source),
      error => error.code === 'PROFILE_TEMPLATES_PARSE_ERROR'
        && Number.isInteger(error.details.offset),
    )
  })
}

test('Profile parser ignores commented and quoted decoys around one live declaration', () => {
  const decoys = `/* ${profileSource} */\n// ${profileSource.split('\n')[0]}\nconst example = ${JSON.stringify(profileSource)}\n`
  assert.deepEqual(parseProfileTemplates(decoys + profileSource + decoys), [
    { id: 'alpha', bundles: ['bundle-c'] },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'] },
  ])
})

const presetSource = `# A shipped declaration
- insert:
    - id: preset-example
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: example
        order: 7
        plugins:
          - id: sample
            name: '@example/plugin'
            disabled: !!js globalThis.__presetInspectorExecuted = true
            config:
              prompt: |
                id: decoy
                order: 999
`

test('Preset parser extracts declaration metadata without evaluating child expressions', () => {
  delete globalThis.__presetInspectorExecuted
  assert.deepEqual(parsePresetMetadata(presetSource, 'fixture/example.patch.yml'), { id: 'example', order: 7 })
  assert.equal(globalThis.__presetInspectorExecuted, undefined)
})

const presetFailures = [
  ['missing id', presetSource.replace('        id: example\n', '')],
  ['duplicate id', presetSource.replace('        id: example', '        id: example\n        id: other')],
  ['wrong plugin', presetSource.replace('@deepseek-ai/dsh-agent-preset', '@example/unrelated')],
  ['duplicate declaration', presetSource + presetSource],
  ['second inserted row', presetSource + '    - id: other\n      name: other\n'],
  ['second config', presetSource + '      config:\n        id: other\n'],
  ['trailing metadata', presetSource + '        order: 99\n'],
  ['extra top-level property', presetSource.replace('      config:', '      disabled: true\n      config:')],
  ['unknown config property', presetSource.replace('        order: 7', '        displayName: Example\n        order: 7')],
  ['reordered metadata', presetSource.replace('        id: example\n        order: 7', '        order: 7\n        id: example')],
  ['malformed order', presetSource.replace('order: 7', 'order: 07')],
  ['fractional order', presetSource.replace('order: 7', 'order: 7.5')],
  ['unsafe integer', presetSource.replace('order: 7', 'order: 9007199254740993')],
  ['tagged order', presetSource.replace('order: 7', 'order: !!js 7')],
  ['indented root', presetSource.replace('- insert:', ' - insert:')],
  ['tab indentation', presetSource.replace('        id:', '\tid:')],
  ['flow plugins', presetSource.replace('plugins:', 'plugins: []')],
  ['missing plugins', presetSource.slice(0, presetSource.indexOf('        plugins:'))],
  ['empty plugins', presetSource.slice(0, presetSource.indexOf('          - id:'))],
  ['non-list plugins', presetSource.replace('          - id: sample', '          id: sample')],
  ['different declaration id', presetSource.replace('preset-example', 'preset-other')],
]
for (const [name, source] of presetFailures) {
  test(`Preset parser rejects ${name}`, () => {
    assert.throws(
      () => parsePresetMetadata(source, 'fixture/example.patch.yml'),
      error => error.code === 'PRESET_METADATA_PARSE_ERROR'
        && error.details.path === 'fixture/example.patch.yml'
        && Number.isInteger(error.details.line),
    )
  })
}

for (const scalar of ['*missing', '&copy example', '!!js run()', '[example]', '{id: example}', 'example # comment', '"example" # comment', '"unterminated', "'unterminated", '"escaped\\nvalue"', '|', '>-']) {
  test(`Preset parser rejects unsupported id scalar ${scalar}`, () => {
    assert.throws(() => parsePresetMetadata(presetSource.replace('id: example', `id: ${scalar}`), 'fixture/example.patch.yml'),
      error => error.code === 'PRESET_METADATA_PARSE_ERROR' && error.details.line === 6)
  })
}

test('Preset parser retains physical line locations after blank lines and comments', () => {
  assert.throws(
    () => parsePresetMetadata(presetSource.replace('        id: example', '\n# note\n        id: *missing'), 'fixture/example.patch.yml'),
    error => error.code === 'PRESET_METADATA_PARSE_ERROR' && error.details.line === 8,
  )
})

test('Preset parser accepts quoted ids and trailing blank lines', () => {
  assert.deepEqual(
    parsePresetMetadata(presetSource.replace('id: example', 'id: "example"') + '\n', 'fixture/example.patch.yml'),
    { id: 'example', order: 7 },
  )
})
