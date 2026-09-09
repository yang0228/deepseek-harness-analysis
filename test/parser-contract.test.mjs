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

const profileFailures = [
  ['renamed declaration', profileSource.replace('PROFILE_TEMPLATES', 'RENAMED')],
  ['spread entry', profileSource.replace("  'beta-minimal':", '  ...sharedProfiles,\n  \'beta-minimal\':')],
  ['computed bundle value', profileSource.replace("['bundle-c']", '[resolveBundle()]')],
  ['missing patchReload', profileSource.replace(", patchReload: 'live'", '')],
  ['missing entry comma', profileSource.replace(" },\n  alpha", " }\n  alpha")],
  ['duplicate profile id', profileSource.replace('  alpha:', "  'beta-minimal':")],
  ['trailing property', profileSource.replace("patchReload: 'live' }", "patchReload: 'live', label: 'extra' }")],
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
    { id: 'alpha', bundles: ['bundle-c'], patchReload: 'live' },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'], patchReload: 'startup' },
  ])
})

test('Preset parser accepts the exact metadata triplet', () => {
  assert.deepEqual(
    parsePresetMetadata('name: 合成模式\ndescription: 只用于测试\norder: 7\n', 'preset.yml'),
    { name: '合成模式', description: '只用于测试', order: 7 },
  )
})

const presetFailures = [
  ['missing key', 'name: 合成模式\norder: 7\n', 2],
  ['duplicate key', 'name: 合成模式\nname: 重复名称\norder: 7\n', 2],
  ['unknown key', 'name: 合成模式\nsummary: 未知字段\norder: 7\n', 2],
  ['reordered key', 'description: 只用于测试\nname: 合成模式\norder: 7\n', 1],
  ['indented key', ' name: 合成模式\ndescription: 只用于测试\norder: 7\n', 1],
  ['multiline value', 'name: 合成模式\ndescription: 第一行\n第二行\norder: 7\n', 3],
  ['malformed order', 'name: 合成模式\ndescription: 只用于测试\norder: 07\n', 3],
]

for (const [name, source, line] of presetFailures) {
  test(`Preset parser rejects ${name}`, () => {
    const path = `fixtures/${name}/preset.yml`
    assert.throws(
      () => parsePresetMetadata(source, path),
      error => error.code === 'PRESET_METADATA_PARSE_ERROR'
        && error.details.path === path
        && error.details.line === line,
    )
  })
}

for (const [name, scalar] of [
  ['alias', '*missing'],
  ['anchor', '&copy value'],
  ['local tag', '!text value'],
  ['standard tag', '!!str value'],
  ['verbatim tag', '!<tag:example.com,2026:text> value'],
  ['flow sequence', '[value]'],
  ['flow mapping', '{name: value}'],
  ['inline comment', 'value # comment'],
  ['quoted inline comment', '"value" # comment'],
  ['unterminated double quote', '"unterminated'],
  ['unterminated single quote', "'unterminated"],
  ['unopened quote', 'unterminated"'],
  ['quoted escape', '"escaped\\nvalue"'],
  ['literal multiline indicator', '|'],
  ['folded multiline indicator', '>-'],
]) {
  test(`Preset parser rejects unsupported scalar ${name}`, () => {
    const path = 'fixture/preset.yml'
    assert.throws(
      () => parsePresetMetadata(`name: ${scalar}\ndescription: 合成说明\norder: 7\n`, path),
      error => error.code === 'PRESET_METADATA_PARSE_ERROR'
        && error.details.path === path && error.details.line === 1,
    )
  })
}

test('Preset parser ignores comment-only YAML examples and decodes supported quotes', () => {
  assert.deepEqual(parsePresetMetadata(
    '# Example: | !!str &copy *copy [value]\nname: "合成模式"\n  # description: !<tag:example.com,2026:text> value\ndescription: \'合成说明 # 字面内容\'\norder: 7\n',
    'fixture/preset.yml',
  ), { name: '合成模式', description: '合成说明 # 字面内容', order: 7 })
})

test('Preset parser retains original line locations after comments', () => {
  assert.throws(
    () => parsePresetMetadata('# note\nname: 合成模式\n# note\ndescription: *missing\norder: 7\n', 'fixture/preset.yml'),
    error => error.code === 'PRESET_METADATA_PARSE_ERROR'
      && error.details.path === 'fixture/preset.yml' && error.details.line === 4,
  )
})
