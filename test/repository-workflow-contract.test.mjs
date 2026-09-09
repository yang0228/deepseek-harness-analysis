import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('repository workflow is least privilege and fully pinned', async () => {
  const text = await readFile(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8')
  assert.match(text, /^permissions:\n  contents: read$/mu)
  assert.match(text, /^  verify:\n    name: verify$/mu)
  assert.equal((text.match(/^\s+persist-credentials: false$/gmu) ?? []).length, 2)
  assert.equal(text.includes('${{ secrets.'), false)
  assert.equal(/^\s+permissions:/mu.test(text.replace(/^permissions:\n  contents: read$/mu, '')), false)
  const actionRefs = [...text.matchAll(/^\s*uses:\s*([^\s#]+)$/gmu)].map(match => match[1])
  assert.deepEqual(actionRefs, [
    'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd',
    'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
    'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd',
  ])
  assert.equal((text.match(/^          path: (?:handbook|upstream)$/gmu) ?? []).length, 2)
  assert.match(text, /^        run: npm run verify -- --root "\$GITHUB_WORKSPACE\/handbook" --source "\$GITHUB_WORKSPACE\/upstream"$/mu)
  assert.equal((text.match(/^        working-directory: handbook$/gmu) ?? []).length, 2)
})
