import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const baseline = '76fda729799fe9b3848dbe2c211d4b231032b81e'
const checkout = '/contract/experiment/deepseek-harness'
const home = '/contract/experiment/dsh-home'

function section(markdown, heading, nextHeading) {
  return markdown.split(heading)[1].split(nextHeading)[0]
}

function shellBlocks(markdown) {
  return [...markdown.matchAll(/```sh\n([\s\S]*?)```/gu)].map((match) => match[1])
}

function stubs(failure = '') {
  return `
exec 3>&1
FAIL_STAGE=${failure}
trace() { printf '%s\\n' "$*" >&3; }
mktemp() {
  trace "CALL mktemp $*"
  [ "$FAIL_STAGE" = mktemp ] && return 1
  printf /contract/experiment
}
mkdir() {
  trace "CALL mkdir $*"
  [ "$FAIL_STAGE" = mkdir ] && return 1
  return 0
}
cd() {
  trace "CALL cd $*"
  [ "$FAIL_STAGE" = cd ] && return 1
  PWD="$1"
  export PWD
}
git() {
  trace "CALL git $*"
  case "$1" in
    clone)
      [ "$FAIL_STAGE" = clone ] && return 1
      return 0
      ;;
    checkout)
      [ "$FAIL_STAGE" = checkout ] && return 1
      REVISION="$3"
      ;;
    rev-parse)
      printf '%s\\n' "$REVISION"
      ;;
  esac
}
pnpm() {
  trace "CALL pnpm $*|PWD=$PWD|DSH_HOME=$DSH_HOME|REVISION=$REVISION|BUILT=$BUILT|READY=$dsh_source_ready"
  [ "$FAIL_STAGE" = build ] && [ "$*" = 'run build' ] && return 1
  [ "$*" = 'run build' ] && BUILT=1
  return 0
}
npx() {
  trace "CALL npx $*|PWD=$PWD|DSH_HOME=$DSH_HOME"
}
rm() {
  trace "CALL rm $*"
}
`
}

function run(snippet, failure = '') {
  return spawnSync('/bin/sh', ['-c', stubs(failure) + snippet], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  })
}

function assertStopped(result, forbidden) {
  assert.notEqual(result.status, 0, result.stdout + result.stderr)
  for (const command of forbidden) assert.doesNotMatch(result.stdout, command)
}

test('packaged Web launch depends on disposable root creation and entry', async () => {
  const markdown = await readFile(new URL('docs/05-getting-started.md', root), 'utf8')
  const packaged = shellBlocks(section(markdown, '### 1. 打包 Web UI', '### 2. 固定源码构建')).join('\n')

  for (const [failure, forbidden] of [
    ['mktemp', [/CALL mkdir/u, /CALL cd/u, /CALL npx/u, /CALL rm/u]],
    ['mkdir', [/CALL cd/u, /CALL npx/u]],
    ['cd', [/CALL npx/u]],
  ]) {
    assertStopped(run(packaged, failure), forbidden)
  }

  const success = run(packaged)
  assert.equal(success.status, 0, success.stdout + success.stderr)
  assert.match(success.stdout, new RegExp(`CALL npx .* web\\|PWD=${checkout.replaceAll('/', '\\/').replace('deepseek-harness', 'workspace')}\\|DSH_HOME=${home.replaceAll('/', '\\/')}`, 'u'))
})

test('source Web and Headless launches depend on the pinned built checkout', async () => {
  const markdown = await readFile(new URL('docs/05-getting-started.md', root), 'utf8')
  const source = shellBlocks(section(markdown, '### 2. 固定源码构建', '### 3. Headless 单次任务')).join('\n')
  const headless = shellBlocks(section(markdown, '### 3. Headless 单次任务', '### 4. TypeScript SDK')).join('\n')
  const snippets = `${source}\n${headless}`

  for (const [failure, forbidden] of [
    ['mktemp', [/CALL git clone/u, /CALL cd/u, /CALL git checkout/u, /CALL pnpm/u, /CALL rm/u]],
    ['clone', [/CALL cd/u, /CALL git checkout/u, /CALL pnpm/u]],
    ['cd', [/CALL git checkout/u, /CALL pnpm/u]],
    ['checkout', [/CALL pnpm/u]],
    ['build', [/CALL pnpm dsh web/u, /CALL pnpm dsh --profile headless/u]],
  ]) {
    assertStopped(run(snippets, failure), forbidden)
  }

  const success = run(snippets)
  assert.equal(success.status, 0, success.stdout + success.stderr)
  assert.match(success.stdout, new RegExp(`CALL pnpm install\\|PWD=${checkout.replaceAll('/', '\\/')}\\|DSH_HOME=${home.replaceAll('/', '\\/')}\\|REVISION=${baseline}`, 'u'))
  assert.match(success.stdout, /CALL pnpm run build\|[^\n]*\|BUILT=\|/u)
  assert.match(success.stdout, /CALL pnpm dsh web\|[^\n]*\|BUILT=1\|READY=1/u)
  assert.match(success.stdout, new RegExp(`CALL git rev-parse HEAD[\\s\\S]*CALL pnpm dsh --profile headless run the tests\\|PWD=${checkout.replaceAll('/', '\\/')}\\|DSH_HOME=${home.replaceAll('/', '\\/')}\\|REVISION=${baseline}\\|BUILT=1\\|READY=1`, 'u'))
})
