import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const { commit: baseline } = JSON.parse(await readFile(new URL('evidence/baseline.json', root), 'utf8'))
const chapters = [
  'docs/01-overview.md',
  'docs/02-architecture.md',
  'docs/03-capabilities.md',
  'docs/04-differentiators.md',
  'docs/05-getting-started.md',
]

async function text(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('entry points expose the required reader routes', async () => {
  const chinese = await text('README.md')
  const english = await text('README.en.md')
  assert.ok(chinese.includes(baseline))
  assert.match(chinese, /独立项目|非官方/u)
  assert.ok(chinese.includes(`https://github.com/deepseek-ai/deepseek-harness/blob/${baseline}/SAFETY.md`))
  for (const target of [...chapters, 'docs/00-methodology.md', 'docs/source-map.md', 'docs/glossary.md', 'README.en.md']) {
    assert.ok(chinese.includes(`](${target})`), target)
  }
  assert.ok(english.includes('](README.md)'))
})

test('core chapters form a complete reading path', async () => {
  for (const [index, path] of chapters.entries()) {
    const chapter = await text(path)
    assert.ok(chapter.includes('](00-methodology.md)'), `${path}: methodology`)
    assert.ok(chapter.includes('](source-map.md)'), `${path}: source map`)
    if (index > 0) assert.ok(chapter.includes(`](${chapters[index - 1].split('/').at(-1)})`), `${path}: previous`)
    if (index + 1 < chapters.length) assert.ok(chapter.includes(`](${chapters[index + 1].split('/').at(-1)})`), `${path}: next`)
  }
})

test('deep dives are reachable from entry and owning chapters', async () => {
  const dives = [
    { file: 'cordis-lifecycle.md', owner: '02-architecture.md' },
    { file: 'profiles-bundles-presets.md', owner: '02-architecture.md' },
    { file: 'session-event-log.md', owner: '02-architecture.md' },
    { file: 'tools-and-ptc.md', owner: '03-capabilities.md' },
    { file: 'sandbox-execution.md', owner: '03-capabilities.md' },
    { file: 'subagents-goals-workflows.md', owner: '03-capabilities.md' },
  ]
  const readme = await text('README.md')
  for (const { file } of dives) assert.ok(readme.includes(`](docs/deep-dives/${file})`), file)
  const owners = new Map([
    ['docs/01-overview.md', ['cordis-lifecycle.md']],
    ['docs/02-architecture.md', ['cordis-lifecycle.md', 'profiles-bundles-presets.md', 'session-event-log.md']],
    ['docs/03-capabilities.md', ['tools-and-ptc.md', 'sandbox-execution.md', 'subagents-goals-workflows.md']],
    ['docs/04-differentiators.md', ['cordis-lifecycle.md', 'tools-and-ptc.md']],
    ['docs/05-getting-started.md', ['profiles-bundles-presets.md', 'sandbox-execution.md']],
  ])
  for (const [owner, expected] of owners) {
    const chapter = await text(owner)
    for (const dive of expected) assert.ok(chapter.includes(`](deep-dives/${dive})`), `${owner}: ${dive}`)
  }
  for (const { file, owner } of dives) {
    const chapter = await text(`docs/deep-dives/${file}`)
    assert.ok(chapter.includes(`](../${owner})`), `${file}: ${owner}`)
  }
})
