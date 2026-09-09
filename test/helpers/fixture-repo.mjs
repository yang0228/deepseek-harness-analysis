import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { cp, lstat, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, sep } from 'node:path'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
const fixedEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-02T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z',
}

async function git(root, args) {
  return (await runFile('git', args, { cwd: root, env: fixedEnv })).stdout
}

async function snapshot(root, current = root, output = []) {
  const entries = await readdir(current, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (current === root && entry.name === '.git') continue
    const absolute = join(current, entry.name)
    const info = await lstat(absolute)
    const path = relative(root, absolute).split(sep).join('/')
    const kind = info.isDirectory() ? 'directory' : info.isSymbolicLink() ? 'symlink' : 'file'
    const target = kind === 'symlink' ? await readlink(absolute) : undefined
    const bytes = kind === 'directory'
      ? Buffer.from('directory')
      : kind === 'symlink'
        ? Buffer.from(target)
        : await readFile(absolute)
    output.push({
      path,
      kind,
      mode: info.mode,
      byteLength: bytes.byteLength,
      digest: createHash('sha256').update(bytes).digest('hex'),
      ...(target === undefined ? {} : { target }),
    })
    if (kind === 'directory') await snapshot(root, absolute, output)
  }
  return output
}

export async function createFixtureRepository(templateUrl) {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-analysis-fixture-'))
  const root = join(parent, basename(new URL(templateUrl).pathname) || 'upstream')
  await cp(templateUrl, root, { recursive: true })
  await writeFile(join(root, '.gitignore'), '.ignored-sentinel\n.ignored-link\n')
  await git(root, ['init', '--initial-branch=main'])
  await git(root, ['add', '.'])
  await git(root, ['commit', '-m', 'fixture'])
  await git(root, ['tag', 'v0.0.0'])
  await writeFile(join(root, '.ignored-sentinel'), 'ignored-before-inspection\n')
  await symlink('.ignored-sentinel', join(root, '.ignored-link'))
  const sha = (await git(root, ['rev-parse', 'HEAD'])).trim()
  const gitDescribe = (await git(root, ['describe', '--tags', '--always', '--long'])).trim()
  return {
    root,
    sha,
    gitDescribe,
    cleanup: () => rm(parent, { recursive: true, force: true }),
    readGitState: async () => ({
      head: (await git(root, ['rev-parse', 'HEAD'])).trim(),
      status: await git(root, ['status', '--porcelain=v1', '--untracked-files=all']),
      tree: await git(root, ['ls-tree', '-r', '--full-tree', 'HEAD']),
    }),
    readWorktreeSnapshot: () => snapshot(root),
  }
}
