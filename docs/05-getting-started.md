# 可复现的入门路径

基线：DeepSeek Harness 上游提交 `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`。

## 一句话结论

<a id="claim-dsh-start-001"></a> **Claim `DSH-START-001`:** 源码中的浮动 npm 命令、`0.2.2-alpha.2` 版本声明与固定提交标识不同的复现目标，只有固定提交对应本手册分析的源码树。

<a id="claim-dsh-start-002"></a> **Claim `DSH-START-002`:** Python SDK 使用显式 Harness Home 启动捆绑的标准 `dsh --profile sdk` 运行时。

`DSH-START-001` 是手册作者的分析推断（`kind: analysis-inference`、`confidence: qualified`、`maturity: released`）；限定为：源码版本声明不单独证明同名版本当前可从 npm registry 获取。`DSH-START-002` 是上游事实（`kind: upstream-fact`、`confidence: verified`、`maturity: released`），无需额外限定。

## 机制

固定源码要求 Node.js `>=24.9.0` 与 pnpm `11.28.5`；这不同于只运行本手册校验脚本的 Node.js 要求。需要模型访问的路径由所选 Provider 决定凭据；默认 DeepSeek 路径使用 `DEEPSEEK_API_KEY`，兼容端点可使用 `DEEPSEEK_BASE_URL`，本手册不记录任何值。以下 Shell 路径只在 `mktemp -d` 成功后注册退出 trap，并以 `&&` 命令链使目录创建、目录进入与固定提交选择成为后续命令的前置条件；先停止持续运行的 Web UI，再退出 Shell，届时清理已成功创建的一次性根目录、工作区与 Harness Home。

### 1. 打包 Web UI

<a id="packaged-web-ui"></a>

此路径适合体验打包应用，但复现强度取决于 registry。`package_spec` 默认使末行等同于 `npx @deepseek-ai/dsh web`；要使它等同于 `npx @deepseek-ai/dsh@0.2.2-alpha.2 web`，把第一行改为注释所示的第二个值：

```sh
package_spec='@deepseek-ai/dsh' # 或 '@deepseek-ai/dsh@0.2.2-alpha.2'
experiment_root="$(mktemp -d)" &&
  trap 'rm -rf -- "$experiment_root"' EXIT &&
  mkdir -p "$experiment_root/workspace" "$experiment_root/dsh-home" &&
  cd "$experiment_root/workspace" &&
  export DSH_HOME="$experiment_root/dsh-home" &&
  npx "$package_spec" web
```

第一条命令跟随 npm registry 的解析结果；第二条显式选择固定源码所声明的 `0.2.2-alpha.2`，但只有 registry 暴露该版本时才会成功。版本号是源码元数据，不是 registry 可用性证据；两条命令也都不能证明所得包等同于 `dsh-v0.2.2-alpha.2-0-gf3803c9697` 所描述的固定源码树；该 Git describe 与 tag 同点，但 registry 构件仍需独立核验。上游快速开始没有设置 Harness Home，通常按 CLI 的 home 解析规则使用用户的 `~/.dsh`；这里显式设置 `DSH_HOME` 以避免写入日常 home。

### 2. 固定源码构建

<a id="pinned-source"></a>

此路径精确复现本手册分析的源码树，而不是只选择同名版本：

```sh
dsh_source_ready=
experiment_root="$(mktemp -d)" &&
  trap 'rm -rf -- "$experiment_root"' EXIT &&
  git clone https://github.com/deepseek-ai/deepseek-harness.git "$experiment_root/deepseek-harness" &&
  cd "$experiment_root/deepseek-harness" &&
  git checkout --detach f3803c96974ad4a94195fb97e5c637e9c2a3afe3 &&
  export DSH_HOME="$experiment_root/dsh-home" &&
  pnpm install &&
  pnpm run build &&
  dsh_source_ready=1 &&
  pnpm dsh web
```

`pnpm install` 与 clone 需要网络，`pnpm run build` 准备运行所需产物；这些操作必须在一次性 checkout 中进行，不要在作为证据源的上游目录中运行。

### 3. Headless 单次任务

<a id="headless"></a>

停止路径 2 的 Web UI 后，在同一 Shell 中运行下列命令。检查项要求路径 2 已完成构建、当前目录和 `DSH_HOME` 仍指向该一次性根目录，并再次读取 HEAD 以确认固定提交；任一条件失败都不会启动 Headless：

```sh
test "${dsh_source_ready:-}" = 1 &&
  test "$PWD" = "$experiment_root/deepseek-harness" &&
  test "$DSH_HOME" = "$experiment_root/dsh-home" &&
  test "$(git rev-parse HEAD)" = f3803c96974ad4a94195fb97e5c637e9c2a3afe3 &&
  pnpm dsh --profile headless "run the tests"
```

`dsh headless "run the tests"` 是同一 Profile 的简写，Profile 名须紧跟 `dsh`。位置参数是任务文本。若环境中已经安装 `dsh` 可执行文件，同一形式省略 `pnpm` 前缀：`dsh --profile headless "run the tests"`；这不会自动使已安装构件等同于固定源码。

### 4. TypeScript SDK

<a id="typescript-sdk"></a>

此路径适合已经安装 `@deepseek-ai/dsh-sdk-client` 及其匹配 `dsh` 依赖的 TypeScript 项目。`DeepSeekHarness` 通过 `sdk` Application Profile 启动独立子进程；`dshHome` 与 Agent 的 `cwd` 都指向一次性目录，两个 `finally` 分别保证回收运行时和删除实验目录：

```ts
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client'

const root = await mkdtemp(join(tmpdir(), 'dsh-ts-sdk-'))
const dshHome = join(root, 'dsh-home')
const workspace = join(root, 'workspace')
await mkdir(dshHome)
await mkdir(workspace)

try {
  const harness = new DeepSeekHarness({
    profile: 'sdk',
    dshHome,
    cwd: workspace,
    processCwd: workspace,
  })
  try {
    const result = await harness.run('say hi')
    console.log(result.finalResponse)
  } finally {
    await harness.close()
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
```

`cwd` 指定 Agent workspace，`processCwd` 指定子进程工作目录；`provider`、`model`、`reasoningEffort` 与 `maxTokens` 可在初始化时选择 route、推理力度与每次输出上限。`run()` 收集 prompt 的 durable inbox receipt 到下一次 whole-agent idle 之间的活动；`finalResponse` 是其中最后一条 root-session assistant 文本。期间的 steering 或其他排队工作也可能参与，因此它不表示某一 prompt 的因果独占答复。

不要为了只设置 `DSH_HOME` 而传入仅含一个键的 `env`：该字段会整体替换子进程环境；直接使用 `dshHome` 可在继承父进程环境的同时传播 Harness Home。

<a id="claim-dsh-start-003"></a> **Claim `DSH-START-003`:** SDK 的 `session/wait` 等待既有会话的 root Agent 与正在推进的托管后代工作，而 `run()` 仍以下一次 whole-agent idle 为活动区间终点。

需要等待委托完成和 root 汇总的集成方，可以先订阅通知，再提交 prompt，调用低层 `request('session/wait', { sessionId })`，最后排空已排队通知。空闲但停放输入的后代不会阻塞等待；未知会话被拒绝，未被后续持久终止记录覆盖的 live Agent 失败也会报错。同一 transport 上，等待期间提交的通知先于响应。这个接口不提供某个 prompt 的因果独占结果，也不替代任意外部 Job 的完成检查。[协议语义](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/protocol/README.md#L38-L59)；[服务端等待实现](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/server/src/server.ts#L298-L321)；[客户端分工](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/README.md#L54-L62)。

<a id="claim-dsh-start-004"></a> **Claim `DSH-START-004`:** Session 的有效工作目录通过日志变更，并由 SDK 提供读取与设置接口；目录变更不改变原项目身份、Sandbox 写入根或已启动进程目录。

TypeScript 的 Session handle 提供 `getWorkingDirectory()`、`setWorkingDirectory(path)`，Python 提供对应的 `get_working_directory()`、`set_working_directory(path)`。相对路径按当前有效目录解析；读取或设置未知会话会创建它，但不启动模型 Turn。有效目录影响后续相对文件操作、新进程、指令和 Skill 查找；原项目身份与权限根仍有独立归属。目录事实会持久记录并进入下一次获准请求的用户上下文，通知被取消不撤销已提交的目录状态。[目录生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/docs/subsystems/working-directory.md#L5-L15)；[客户端接口](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/README.md#L34)。

SDK Server 把用户 prompt 构造成 `source.kind: user` 的消息并交给 Agent inbox；Session v4 的消息与来源格式详见[Session 专题](deep-dives/session-event-log.md)。这些 string prompt 示例无需手工构造底层 Session 事件。[SDK prompt 接纳](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/server/src/server.ts#L248-L269)。

### 保存与恢复会话

<a id="claim-dsh-start-005"></a> **Claim `DSH-START-005`:** SDK 通过 `session/resume` 显式恢复持久化会话；恢复保留历史与目录，不自动提交新输入，也不恢复外部进程。

TypeScript 使用 `await harness.resumeSession(savedId)`，Python 使用 `harness.resume_session(saved_id)`；需保存原 session id，并复用原 Harness Home、存储与工作区。`session(id)`／`start_session(id)` 只是惰性 handle，不替代恢复请求。未知、不可读、格式不兼容或已占用的会话会失败，不会悄悄创建替代会话；恢复会修补中断的最后一个 Turn。初始化选择的模型 route 会用于恢复后的 Agent，因此不保证恢复原模型配置。[恢复约定](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/protocol/README.md#L59-L61)；[客户端入口](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/README.md#L29-L35)；[服务端恢复与模型选择](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/server/src/server.ts#L481-L510)。

上面的入门示例在退出时删除一次性目录，适合实验；需要跨进程继续会话时，应改用调用方保留的 Harness Home 与工作区，不沿用删除目录的清理步骤。

### 5. Python SDK

<a id="python-sdk"></a>

此路径要求 Python `>=3.10`。Python 分发包名是 `deepseek-harness-sdk`；其固定源码元数据依赖同版本的捆绑运行时分发包 `deepseek-harness-runtime-bin`。两个 `pyproject.toml` 在该提交都声明 `0.0.0.dev0`，这不是 npm 版本，也不证明这些分发包当前可从 PyPI 获取。Python 客户端不是进程内重实现，而是通过 stdio JSON-RPC 驱动捆绑的标准 CLI；省略 `profile` 时默认启动 `dsh --profile sdk`。

```py
from pathlib import Path
from tempfile import TemporaryDirectory

from deepseek_harness import DeepSeekHarness

with TemporaryDirectory(prefix="dsh-python-sdk-") as root:
    experiment_root = Path(root)
    dsh_home = experiment_root / "dsh-home"
    workspace = experiment_root / "workspace"
    dsh_home.mkdir()
    workspace.mkdir()
    with DeepSeekHarness(
        dsh_home=str(dsh_home),
        cwd=str(workspace),
        runtime_cwd=str(workspace),
    ) as harness:
        result = harness.run("say hi")
        print(result.final_response)
```

`cwd` 指定 Agent workspace，`runtime_cwd` 指定子进程工作目录；`provider`、`model`、`reasoning_effort` 与 `max_tokens` 对应初始化选择。`TemporaryDirectory` 清理工作区与显式 Harness Home，context manager 先关闭捆绑运行时。`RunResult.final_response` 是活动区间内最后一条 root-session assistant 文本，`finish_reason` 是最后一个 root `turn/end` 的 kind；没有结束的 Turn 时为 `None`。平台运行时文件名可能包含 `deepseek-harness-sdk-runtime-<platform>-<arch>`，但该文件名不是 Python 分发包名；本路径只使用 `deepseek-harness-runtime-bin` 指代分发包。

打包 Python SDK 的基础 wheel 携带可执行运行时与轻量 Office Skills；完整 Office sidecar 和编写环境改为独立的显式下载。`download_office()` 获取 Office 执行资源，`download_primary_runtime()` 获取 Python、库与编写资源；SDK 启动或 Office 操作不会自动下载缺失资源。下载完成或显式选择资源后，SDK Profile 才按条件组合查询工具与 Skills；仅编写环境可提供 Skills，但 Kit CLI 禁用。`DSH_PRIMARY_RUNTIME` 可覆盖编写资源路径，空值禁用查询；Office sidecar 可以独立选择。上述 Agent 示例不需要为了普通模型任务下载 Office。[资源与激活](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk-runtime/README.md#L13-L28)；[独立 Office API](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk/README.md#L11-L27)；能力和限制见[Office Skills 与资源](03-capabilities.md#office-skills)。

## 证据

- npm 与源码命令：[README 第 17–41 行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/README.md#L17-L41)；版本、Node 与 pnpm：[package.json 第 1–10 行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/package.json#L1-L10)。
- Headless 与 Profile 参数：[CLI reference 第 26–44 行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/apps/cli/reference/README.md#L26-L44)。
- TypeScript SDK：[客户端启动与结果](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/README.md#L36-L62)、[字段定义](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/src/types.ts#L23-L83)与[argv、cwd 和 env 解析](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/sdk/client/src/launch.ts#L122-L156)。
- Harness Home：[home-paths README 第 12 行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/util/home-paths/README.md#L12)与[优先级规则](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/util/home-paths/README.md#L29-L39)。
- Python SDK：[启动与显式 home](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk/README.md#L5-L51)、[运行时与结果](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk/README.md#L105-L123)、[SDK 分发元数据](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk/pyproject.toml#L5-L16)与[runtime 分发元数据](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/python/sdk-runtime/pyproject.toml#L5-L21)。

## 限制与适用范围

固定基线是开发者预览软件，允许破坏性变更，未经过安全审计，也不应视为生产就绪。运行模型生成的代码或命令前应阅读固定提交的 [`SAFETY.md` 第 5–23 行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/SAFETY.md#L5-L23)，采用最小权限并只暴露可承受风险的文件、网络与凭据。

本章命令按固定源码与文档审查；本次更新只执行只读源码核对与手册验证。涉及 clone、registry、依赖安装、构建、模型调用或 Web 服务的示例未在本任务中执行，因此相应成功条件由固定源码说明而不是本次运行结果支持。

## 继续阅读

- [专题深挖：应用与 Session 的组合层](deep-dives/profiles-bundles-presets.md)
- [专题深挖：本地 Sandbox 执行边界](deep-dives/sandbox-execution.md)
- [上一章：差异化机制评估](04-differentiators.md)
- [证据方法](00-methodology.md)
- [证据反向索引](source-map.md)
