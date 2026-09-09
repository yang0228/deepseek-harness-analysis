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

for (const [name, scalar] of [
  ['standard tag', '!!str value'],
  ['verbatim tag', '!<tag:example.com,2026:text> value'],
  ['anchor', '&copy value'],
  ['flow sequence', '[value]'],
  ['flow mapping', '{name: value}'],
  ['inline comment', 'value # comment'],
  ['quoted inline comment', '"value" # comment'],
  ['unterminated double quote', '"unterminated'],
  ['unterminated single quote', "'unterminated"],
  ['unopened quote', 'unterminated"'],
  ['quoted escape', '"escaped\\nvalue"'],
]) {
  for (const [label, original, replace, validate, path] of [
    ['CITATION.cff', cff, 'message: Cite this evidence handbook.', value => validateCffText(value), 'CITATION.cff'],
    ['Issue Form', issueForm, 'description: Report an evidence error', value => validateIssueFormText(value, '.github/ISSUE_TEMPLATE/factual-error.yml'), '.github/ISSUE_TEMPLATE/factual-error.yml'],
  ]) {
    test(`${label} rejects unsupported scalar ${name}`, () => {
      const key = replace.slice(0, replace.indexOf(':'))
      assert.deepEqual(
        validate(original.replace(replace, `${key}: ${scalar}`)).map(({ code, path, field }) => ({ code, path, field })),
        [{ code: 'REPOSITORY_FILE_INVALID', path, field: '/syntax' }],
      )
    })
  }
}

test('CITATION.cff and Issue Forms ignore comment-only unsupported YAML examples', () => {
  const comment = '# Example: | !!str &copy *copy [value]\n  # value: !<tag:example.com,2026:text> value\n'
  assert.deepEqual(validateCffText(comment + cff), [])
  assert.deepEqual(validateIssueFormText(comment + issueForm, '.github/ISSUE_TEMPLATE/factual-error.yml'), [])
})

test('Issue Form scalar validation covers body attributes and dropdown options', () => {
  const path = '.github/ISSUE_TEMPLATE/test.yml'
  for (const [before, after] of [
    ['      label: Input', '      label: !!str Input'],
    ['        - One', '        - "unterminated'],
    ['        - label: Confirm', '        - label: [Confirm]'],
  ]) {
    assert.deepEqual(
      validateIssueFormText(supportedItems.replace(before, after), path).map(({ code, path, field }) => ({ code, path, field })),
      [{ code: 'REPOSITORY_FILE_INVALID', path, field: '/syntax' }],
    )
  }
})

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
  ['YAML verbatim tag', value => value.replace('description: Report an evidence error', 'description: !<tag:example.com,2026:text> value'), '/syntax'],
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
