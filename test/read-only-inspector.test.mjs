import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import {
  inspectUpstream,
  main,
  readPresetRoster,
  UpstreamInspectionError,
} from '../scripts/inspect-upstream.mjs'
import { createFixtureRepository } from './helpers/fixture-repo.mjs'

const runFile = promisify(execFile)
const template = new URL('./fixtures/upstream-template/', import.meta.url)
const commitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-02T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z',
}

function baselineFor(fixture, commit = fixture.sha) {
  return {
    repository: 'https://github.com/example/upstream',
    commit,
    commitDate: '2026-01-02',
    gitDescribe: fixture.gitDescribe,
    rootPackageVersion: '0.0.0',
    verificationDate: '2026-01-03',
  }
}

async function git(root, args) {
  return (await runFile('git', args, { cwd: root, env: commitEnv, shell: false })).stdout
}

async function commitChanges(root) {
  await git(root, ['add', '--all'])
  await git(root, ['commit', '-m', 'fixture variation'])
  return (await git(root, ['rev-parse', 'HEAD'])).trim()
}

function expectedFacts(fixture) {
  const profiles = [
    { id: 'alpha', bundles: ['bundle-c'] },
    { id: 'beta-minimal', bundles: ['bundle-b', 'bundle-a'] },
  ]
  const presets = [
    { id: 'cordis', order: 40, sourcePath: 'packages/bundle/web-app/presets/cordis.patch.yml' },
    { id: 'minimal', order: 20, sourcePath: 'packages/bundle/web-app/presets/minimal.patch.yml' },
    { id: 'ptc', order: 30, sourcePath: 'packages/bundle/web-app/presets/ptc.patch.yml' },
    { id: 'standard', order: 10, sourcePath: 'packages/bundle/web-app/presets/standard.patch.yml' },
  ]
  return {
    schemaVersion: 2,
    repository: 'https://github.com/example/upstream',
    commit: fixture.sha,
    commitDate: '2026-01-02',
    gitDescribe: fixture.gitDescribe,
    rootPackageVersion: '0.0.0',
    profiles,
    presets,
    probes: {
      'upstream.commit': fixture.sha,
      'upstream.commit-date': '2026-01-02',
      'upstream.git-describe': fixture.gitDescribe,
      'upstream.root-package-version': '0.0.0',
      'profile:alpha': profiles[0],
      'profile:beta-minimal': profiles[1],
      'preset:cordis': presets[0],
      'preset:minimal': presets[1],
      'preset:ptc': presets[2],
      'preset:standard': presets[3],
    },
  }
}

async function captureMain(argv) {
  let stdout = ''
  let stderr = ''
  const code = await main(argv, {
    stdout: { write: value => { stdout += value } },
    stderr: { write: value => { stderr += value } },
  })
  return { code, stdout, stderr }
}

test('inspection preserves Git and every non-dot-git path', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const beforeGit = await fixture.readGitState()
  const beforeFiles = await fixture.readWorktreeSnapshot()
  assert.equal(beforeGit.status, '')
  const facts = await inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture) })
  const afterGit = await fixture.readGitState()
  const afterFiles = await fixture.readWorktreeSnapshot()
  assert.equal(afterGit.status, '')
  assert.deepEqual(afterGit, beforeGit)
  assert.deepEqual(afterFiles, beforeFiles)
  const sentinel = beforeFiles.find(entry => entry.path === '.ignored-sentinel')
  assert.equal(sentinel?.kind, 'file')
  assert.equal(Number.isInteger(sentinel?.mode), true)
  assert.equal(sentinel?.byteLength, Buffer.byteLength('ignored-before-inspection\n'))
  assert.equal(sentinel?.digest, createHash('sha256').update('ignored-before-inspection\n').digest('hex'))
  const ignoredLink = beforeFiles.find(entry => entry.path === '.ignored-link')
  assert.equal(ignoredLink?.kind, 'symlink')
  assert.equal(ignoredLink?.target, '.ignored-sentinel')
  assert.equal(ignoredLink?.byteLength, Buffer.byteLength('.ignored-sentinel'))
  assert.deepEqual(facts, expectedFacts(fixture))
})

test('inspection rejects relative source', async () => {
  await assert.rejects(
    inspectUpstream({ source: 'relative-source', baseline: { commit: '0123456789abcdef0123456789abcdef01234567' } }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'SOURCE_NOT_ABSOLUTE'
      && error.details.actual === 'relative-source',
  )
})

test('inspection rejects missing source directory', async t => {
  const parent = await mkdtemp(join(tmpdir(), 'missing-inspector-source-'))
  t.after(() => rm(parent, { recursive: true, force: true }))
  const source = join(parent, 'missing')
  await assert.rejects(
    inspectUpstream({ source, baseline: { commit: '0123456789abcdef0123456789abcdef01234567' } }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'SOURCE_NOT_DIRECTORY'
      && error.details.path === source,
  )
})

test('inspection normalizes Git read failures', async t => {
  const source = await mkdtemp(join(tmpdir(), 'not-a-git-repository-'))
  t.after(() => rm(source, { recursive: true, force: true }))
  await assert.rejects(
    inspectUpstream({ source, baseline: { commit: '0123456789abcdef0123456789abcdef01234567' } }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_GIT_READ_ERROR'
      && error.details.operation === 'git rev-parse HEAD',
  )
})

test('inspection rejects wrong HEAD', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const expected = '0123456789abcdef0123456789abcdef01234567'
  await assert.rejects(
    inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture, expected) }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_HEAD_MISMATCH'
      && assert.deepEqual(error.details, { expected, actual: fixture.sha }) === undefined,
  )
})

for (const [name, prepare, dirtyPaths] of [
  ['tracked', root => writeFile(join(root, 'package.json'), '{not json}\n'), ['package.json']],
  ['staged', async root => {
    await writeFile(join(root, 'staged.txt'), 'staged\n')
    await git(root, ['add', 'staged.txt'])
  }, ['staged.txt']],
  ['untracked', root => writeFile(join(root, 'untracked.txt'), 'untracked\n'), ['untracked.txt']],
]) {
  test(`inspection rejects ${name} dirtiness`, async t => {
    const fixture = await createFixtureRepository(template)
    t.after(fixture.cleanup)
    await prepare(fixture.root)
    await assert.rejects(
      inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture) }),
      error => error instanceof UpstreamInspectionError
        && error.code === 'UPSTREAM_DIRTY'
        && assert.deepEqual(error.details.dirtyPaths, dirtyPaths) === undefined,
    )
  })
}

test('inspection rejects missing authoritative file', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const packagePath = join(fixture.root, 'package.json')
  await rm(packagePath)
  const commit = await commitChanges(fixture.root)
  await assert.rejects(
    inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture, commit) }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_FILE_MISSING'
      && error.details.path === packagePath,
  )
})

test('inspection rejects unreadable authoritative file', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const packagePath = join(fixture.root, 'package.json')
  await rm(packagePath)
  await mkdir(packagePath)
  await writeFile(join(packagePath, 'entry'), 'directory in place of file\n')
  const commit = await commitChanges(fixture.root)
  await assert.rejects(
    inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture, commit) }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_FILE_READ_ERROR'
      && error.details.path === packagePath,
  )
})

test('inspection rejects malformed package manifest', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const packagePath = join(fixture.root, 'package.json')
  await writeFile(packagePath, '{not json}\n')
  const commit = await commitChanges(fixture.root)
  await assert.rejects(
    inspectUpstream({ source: fixture.root, baseline: baselineFor(fixture, commit) }),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_PACKAGE_PARSE_ERROR'
      && error.details.path === packagePath,
  )
})

test('Preset roster normalizes missing and unreadable paths', async t => {
  const missingSource = await mkdtemp(join(tmpdir(), 'missing-preset-roster-'))
  const unreadableSource = await mkdtemp(join(tmpdir(), 'unreadable-preset-roster-'))
  t.after(() => rm(missingSource, { recursive: true, force: true }))
  t.after(() => rm(unreadableSource, { recursive: true, force: true }))
  const missingPath = join(missingSource, 'packages/bundle/web-app/presets')
  await assert.rejects(
    readPresetRoster(missingSource),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_FILE_MISSING'
      && error.details.path === missingPath,
  )
  const unreadablePath = join(unreadableSource, 'packages/bundle/web-app/presets')
  await mkdir(join(unreadableSource, 'packages/bundle/web-app'), { recursive: true })
  await writeFile(unreadablePath, 'not a directory\n')
  await assert.rejects(
    readPresetRoster(unreadableSource),
    error => error instanceof UpstreamInspectionError
      && error.code === 'UPSTREAM_FILE_READ_ERROR'
      && error.details.path === unreadablePath,
  )
})

test('CLI emits only JSON on success', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const baselinePath = join(fixture.root, '.ignored-sentinel')
  await writeFile(baselinePath, `${JSON.stringify(baselineFor(fixture))}\n`)
  const result = await captureMain(['--source', fixture.root, '--baseline', baselinePath])
  assert.equal(result.code, 0)
  assert.equal(result.stderr, '')
  assert.deepEqual(JSON.parse(result.stdout), expectedFacts(fixture))
  assert.equal(result.stdout.endsWith('\n'), true)
})

test('CLI keeps stdout empty on preflight failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'inspector-cli-preflight-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const baselinePath = join(root, 'baseline.json')
  const commit = '0123456789abcdef0123456789abcdef01234567'
  await writeFile(baselinePath, `${JSON.stringify({ commit })}\n`)
  const notDirectory = join(root, 'file')
  await writeFile(notDirectory, 'not a directory\n')
  const notRepository = await mkdtemp(join(tmpdir(), 'inspector-cli-not-git-'))
  t.after(() => rm(notRepository, { recursive: true, force: true }))
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const fixtureBaselinePath = join(fixture.root, '.ignored-sentinel')
  await writeFile(fixtureBaselinePath, `${JSON.stringify(baselineFor(fixture, commit))}\n`)

  const cases = [
    {
      name: 'relative source',
      argv: ['--source', 'relative-source', '--baseline', baselinePath],
      error: { code: 'SOURCE_NOT_ABSOLUTE', details: { actual: 'relative-source' } },
    },
    {
      name: 'non-directory source',
      argv: ['--source', notDirectory, '--baseline', baselinePath],
      error: { code: 'SOURCE_NOT_DIRECTORY', details: { path: notDirectory } },
    },
    {
      name: 'Git read failure',
      argv: ['--source', notRepository, '--baseline', baselinePath],
      error: { code: 'UPSTREAM_GIT_READ_ERROR', details: { operation: 'git rev-parse HEAD' } },
    },
    {
      name: 'HEAD mismatch',
      argv: ['--source', fixture.root, '--baseline', fixtureBaselinePath],
      error: { code: 'UPSTREAM_HEAD_MISMATCH', details: { expected: commit, actual: fixture.sha } },
    },
  ]
  for (const value of cases) {
    await t.test(value.name, async () => {
      const result = await captureMain(value.argv)
      assert.equal(result.code, 1)
      assert.equal(result.stdout, '')
      assert.deepEqual(JSON.parse(result.stderr), { ok: false, error: value.error })
    })
  }

  await writeFile(fixtureBaselinePath, `${JSON.stringify(baselineFor(fixture))}\n`)
  await writeFile(join(fixture.root, 'dirty.txt'), 'dirty\n')
  const dirtyResult = await captureMain(['--source', fixture.root, '--baseline', fixtureBaselinePath])
  assert.equal(dirtyResult.code, 1)
  assert.equal(dirtyResult.stdout, '')
  assert.deepEqual(JSON.parse(dirtyResult.stderr), {
    ok: false,
    error: { code: 'UPSTREAM_DIRTY', details: { dirtyPaths: ['dirty.txt'] } },
  })
})

test('inspector CLI distinguishes invalid baseline input', async t => {
  const root = await mkdtemp(join(tmpdir(), 'invalid-inspector-baseline-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const paths = [join(root, 'malformed.json'), join(root, 'missing.json')]
  await writeFile(paths[0], '{not json}\n')
  for (const baselinePath of paths) {
    const result = await captureMain(['--source', root, '--baseline', baselinePath])
    assert.equal(result.code, 1)
    assert.equal(result.stdout, '')
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      error: { code: 'INSPECTOR_BASELINE_INVALID', details: { path: baselinePath } },
    })
  }
})

test('CLI reserves internal error for unclassified programming failures', async t => {
  const fixture = await createFixtureRepository(template)
  t.after(fixture.cleanup)
  const baselinePath = join(fixture.root, '.ignored-sentinel')
  await writeFile(baselinePath, `${JSON.stringify(baselineFor(fixture))}\n`)
  let stderr = ''
  const code = await main(['--source', fixture.root, '--baseline', baselinePath], {
    stdout: { write: () => { throw new TypeError('synthetic writer failure') } },
    stderr: { write: value => { stderr += value } },
  })
  assert.equal(code, 1)
  assert.deepEqual(JSON.parse(stderr), {
    ok: false,
    error: { code: 'INSPECTOR_INTERNAL_ERROR', details: {} },
  })
})
