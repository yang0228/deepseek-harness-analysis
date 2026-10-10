# 能力与组合归属

基线：DeepSeek Harness commit `d743267388641bc76f17c45ce8b4c231aed1d32c`。

## 一句话结论

DeepSeek Harness 的能力是否可用，取决于 Application Profile、Agent Preset 与显式加入的可选包。包是否进入发布族、是否仍为 experimental、是否默认启用，是三个独立问题。

<a id="claim-dsh-cap-001"></a> **Claim `DSH-CAP-001`:** 固定基线发布 `web`、`headless`、`sdk`、`sdk-minimal` 与 `acp` 五个 Application Profile，并记录各自的 Bundle。

<a id="claim-dsh-cap-002"></a> **Claim `DSH-CAP-002`:** 固定基线发布 `standard`、`minimal`、`ptc` 与 `cordis` 四个 Agent Preset，并为它们配置不同的工具呈现。

本章分别记录 Availability、Owner、Mechanism 与 Limit。Availability 表示固定组合中的启用状态；Owner 使用 `profile:`、`preset:`、`optional-package:` 或 `experimental:` 中恰好一个前缀。这里的“发布”指源码中的发布族配置，不单独证明 registry 当前可下载该版本。

## 机制

Application Profile 组合 Host 与应用入口；Web 的 Agent Preset 选择 Session 的提示词、工具和 Agent 侧服务。Headless 与 SDK 使用各自 Profile 的组合，不能把 Web 的默认 Preset 直接套用到所有入口。

### Application Profile 矩阵

固定基线的 `PROFILE_TEMPLATES` 保留五行，仅声明 Bundle 列表。重载由最终 YAML 中的 HMR 插件决定：Base 默认启用配置重载，Headless、SDK 与 ACP 的 Bundle 显式禁用，独立的 SDK Minimal 也不装载 HMR。

| Application Profile | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Web | 已发布；默认启用 HMR | `profile:web` | `dsh-base` + `dsh-web-app` 提供 HTTP/Web runtime、浏览器插件与四个 Preset 声明，默认选择 `standard` | 模型工具由 Preset scope 与 Host global tools 共同决定；全文搜索默认 `openAt: never` |
| Headless | 已发布；默认禁用 HMR | `profile:headless` | `dsh-base` + `dsh-headless` 创建一次 Agent，等待子任务及其 root summary 收敛后从 durable interval 输出最终结果 | 无监听端口；stdout 为最终文本，reasoning delta 在 stderr |
| SDK | 已发布；默认禁用 HMR | `profile:sdk` | `dsh-base` + `dsh-sdk-app` 在 stdio 上提供 SDK JSON-RPC | stdout 专用于协议；工具来自 Profile 组合 |
| SDK Minimal | 已发布；独立完整树 | `profile:sdk-minimal` | `dsh-sdk-minimal` 直接组合 SDK server、DeepSeek adapter、平台持久 Shell、`working_directory` 与 JSONL Session | 默认没有 filesystem editor 或 compaction；`danger-full-access` 允许访问进程可访问的路径 |
| ACP | 已发布；默认禁用 HMR | `profile:acp` | `dsh-base` + `dsh-acp-app` 装载 automation-only ACP server | stdout 专用于 ACP |

[Profile 声明](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/boot/app-boot/src/profile.ts#L178-L195)；[Base HMR](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L27-L32)；[Headless 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/headless/cordis.patch.yml#L32-L33)；[SDK 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/sdk-app/cordis.patch.yml#L18-L19)；[ACP 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/acp-app/cordis.patch.yml#L22-L23)；[Headless 命令行为](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/apps/cli/reference/README.md#L34-L44)；[Headless 子任务收敛](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/headless/src/index.ts#L375-L392)；[SDK Minimal 组合](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/sdk-minimal/README.md#L12-L41)。Desktop 是独立 Host 启动路径，见[组合专题](deep-dives/profiles-bundles-presets.md)，不计入上述五个模板。

### Agent Preset 矩阵

| Agent Preset | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Standard | 已发布、Bundle 声明的 Preset | `preset:standard` | native tools：Shell、文件检索、Job、Skill、Goal/Plan、Schedule、compaction、进程内 spawn/fork、Workflow、ask-user、todo、Web 与 present | Schedule 工具默认启用；Ralph、Codex 与 Claude Code 由独立可选 Bundle 加入 |
| Minimal | 已发布、Bundle 声明的 Preset | `preset:minimal` | 固定完整 persona 与一个按平台选择的持久 Shell；PTY 使用独立 realm | 不包含 filesystem editor、可选运行时上下文或 compaction；必需目录上下文与 Host global tools 仍可出现，Shell 消费 Host sandbox policy |
| PTC | 已发布、Bundle 声明的 Preset | `preset:ptc` | `mode: ptc` 将工具目录呈现为 `run_code`，依赖 Host 的 TypeScript PTC runtime | Workflow engine 与通用 workflow 工具默认 disabled；可选 Ralph Bundle 拥有自己的独立 engine |
| Cordis / Creator | 已发布、Bundle 声明的 Preset | `preset:cordis` | 在编码工具上提供运行时检查/装载、组合创作 Skill 与 `plugin_manager` | `cordis_mount` 求值模型编写的 JavaScript；管理工具每次调用需要 Full access 或审批，安装的 Host 插件在 workspace sandbox 外执行 |

[Standard delegation 与工具](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/presets/standard.patch.yml#L83-L137)；[Minimal 完整组合](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/presets/minimal.patch.yml#L4-L61)；[PTC Workflow 禁用行与工具呈现](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/presets/ptc.patch.yml#L116-L138)。

Preset 由 Web Bundle 的 `presets/*.patch.yml` 注册，默认选择 `standard`。Web 只读展示组合；新增或覆盖 Preset 通过 Bundle Patch，Creator 可在对话中编写这类 Bundle。[注册与修改方式](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/preset/agent-preset-registry/README.md#L46-L60)。

### Plugin Manager

Base 提供 Profile 级 Plugin Manager，Web Plugins 页面可安装、启停和移除 Bundle 及可独立定位的 plugin row；Standard/PTC 的模型管理工具默认禁用，Creator 启用。操作影响使用同一 Profile 的会话，HMR 决定立即应用还是重启生效。命名 registry/local spec 的不兼容安装在 pnpm 运行前拒绝；git/tarball 可能在安装后发现不兼容并尝试恢复 manifest/lockfile，已批准 build-script 的副作用可能保留；启动或重组时，不兼容或不可读取的 Bundle 被跳过，保存的 Bundle 选择仍保留，其余组合能否启动取决于所需服务是否齐全。例外授权只绑定精确插件版本与 DSH runtime 版本，不能代替依赖构建脚本授权。[管理范围、权限与应用](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/boot/plugin-manager/README.md#L28-L42)；[兼容性与精确版本例外](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/boot/plugin-manager/README.md#L66-L75)；[启动跳过与保存状态](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/boot/app-boot/README.md#L50-L54)。

### LLM

<a id="claim-dsh-cap-003"></a> **Claim `DSH-CAP-003`:** 已发布 LLM 组合以 DeepSeek 路由为中心，同时保留可配置的 pi-ai 路由。

Base 同时装载 API-key 与 account 两条 DeepSeek adapter；account 仅在登录状态合格时可用，且不回退到 API key。pi-ai 可声明兼容提供方，但固定组合没有预先启用所有目录中的提供方。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| DeepSeek 默认路由 | base-backed 组合启用 | `profile:web` | Agent 默认选择 `deepseek-official` / `deepseek-flash` | SDK initialization 可显式选择自己的 route，不能把 Web 默认值当成所有客户端的默认值 |
| DeepSeek account 路由 | Base 装载；登录后可用 | `profile:web` | `deepseek-account` 使用 account token，与 API-key route 共享 Messages transport | signed-out 或 ineligible 请求失败；模型 discovery 不探测 inference endpoint |
| pi-ai 路由 | 已装载、初始 dormant | `profile:web` | `llm-pi-ai:` 用户设置增加、更新或移除 live provider route | 目录中存在某 provider 不等于该部署已配置凭据并启用它 |

[Base 默认模型与 dormant pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L83-L131)；[两条 DeepSeek adapter](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L509-L517)；[account route 的认证边界](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/llm/llm-deepseek-account/README.md#L28-L46)。

### 工具、MCP 与图形操作

<a id="claim-dsh-cap-004"></a> **Claim `DSH-CAP-004`:** 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Standard native tools | 随 Standard 启用 | `preset:standard` | Consumer 把模型工具注册到 Agent 可见目录 | 底层 registry、provider、sandbox 与 persistence 仍由 Host 组合拥有 |
| PTC tool presentation | 随 PTC 启用 | `preset:ptc` | `run_code` 通过 Host runtime 执行模型程序并组合受保护工具调用 | 不由呈现模式推导速度、成本或质量改进 |
| Exa search | 可选包 | `optional-package:packages/web/web-search-exa` | 向 `ctx.web` 注册 search provider | 需显式组合与配置 |
| Perplexity search | 可选包 | `optional-package:packages/web/web-search-perplexity` | 向 `ctx.web` 注册 search provider | 需显式组合与配置 |

<a id="claim-dsh-cap-011"></a> **Claim `DSH-CAP-011`:** MCP Client 可接入外部工具、资源和服务器指令；已发布 Profile 提供共享资源服务，但默认不配置 MCP Server。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| MCP 外部服务 | Client 可选；共享资源服务随 Profile 提供 | `optional-package:packages/mcp/mcp-client` | 每个 entry 配置一个 stdio 或 Streamable HTTP server；工具为 `mcp__<server>__<tool>`，资源可查询/读取，server instructions 进入已记录提示词 | 默认无 server；不支持 MCP prompt templates；图片需要支持 image 的模型与 attachment store |

[MCP 配置、资源与结果](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/mcp/mcp-client/README.md#L12-L93)；[Base 资源服务](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L480-L481)。

<a id="claim-dsh-cap-010"></a> **Claim `DSH-CAP-010`:** Browser use 与 Computer use 各有单一 Provider 注册服务，其公开实验性 Provider 需要显式启用。

这些 Provider 仍为实验性 opt-in；发布族配置不表示默认启用或生产就绪。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Browser use | 公开实验性 Provider，显式启用 | `experimental:packages/experimental/browser-use-playwright-mcp` | `ctx.browserUse` 注册一个 Provider；Playwright MCP、Chrome DevTools MCP 或 Stagehand 提供实际操作 | 初始引擎 Chromium；launched browser 随 live Session 回收，resume/fork 不恢复登录状态；attached reservation 只在 Provider 实例内有效，已送达操作不能撤回 |
| Computer use | 公开实验性 Provider，显式启用 | `experimental:packages/experimental/computer-use-cua-driver-native` | `ctx.computerUse` 注册一个 Provider；Cua Driver 提供 MCP 或 native 接入 | 单一 Provider 不等于 Session 独占桌面；平台权限由 Provider 要求，已送达的输入不能靠取消撤回 |

[Browser use 归属与生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/browser-use.md#L5-L37)；[Computer use 归属与共享桌面](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/computer-use.md#L5-L26)。

MCP stdio transport 合并 scrubbed ambient env 与显式配置的 env，但由 MCP SDK 直接启动进程；该路径没有调用 DSH `sandbox.confine()`，不能把工具进入执行管线等同于 server 进程受文件约束。[stdio transport 源码](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/mcp/mcp-client/src/transport.ts#L15-L44)。

Stagehand 的 AI-assisted 操作另用配置的 native model；请求和用量尚未纳入 DSH Session model routing/usage accounting。浏览器 MCP 在 future Agent 创建或恢复时完成 discovery，busy attachment 不会在同一 activation 后续重试。[初始化与独立模型边界](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/browser-use.md#L27-L37)。

### Sandbox

<a id="claim-dsh-cap-005"></a> **Claim `DSH-CAP-005`:** 本地 Sandbox 提供方约束文件系统副作用，并报告实际 enforcement 状态。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Base local Sandbox | 默认 `workspace-write` 与 approval `ask` | `profile:web` | Linux bwrap/Landlock、macOS Seatbelt、Windows ACL restricted-token backend 执行文件 effect policy | Windows ACL 与部分受支持的 Landlock ABI 可返回 `partial`；不承诺通用网络、进程或凭据隔离 |
| SDK Minimal direct execution | 随 SDK Minimal 启用 | `profile:sdk-minimal` | `danger-full-access` 绕过文件 confinement | 一次性工作区不扩大操作系统本身的隔离保证 |

### Session

<a id="claim-dsh-cap-006"></a> **Claim `DSH-CAP-006`:** Session 提供持久化、投影、恢复、Transcript 与按事件前缀 Fork 的原语。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Durable Web Session | 随 Web 的 base 组合启用 | `profile:web` | append-only Event Log、持久化、投影、恢复、Transcript 与按事件前缀的 Fork；开放尾部补写 synthetic closers | 投影为派生视图；新基线的格式与迁移要求见[Session 专题](deep-dives/session-event-log.md) |
| Minimal SDK Session | 随 SDK Minimal 启用 | `profile:sdk-minimal` | 独立树装载 JSONL persistence 与同一 SDK server | 保留最小工具组合及 `danger-full-access` 执行策略 |

### Delegation 与 Agent Teams

<a id="claim-dsh-cap-007"></a> **Claim `DSH-CAP-007`:** `standard` Preset 启用进程内 Subagent；Codex 与 Claude Code 的可选 Bundle 同时加入 Provider 与 global tool，其他外部 Provider 需要显式组合。

Provider 在 Host 中可用不等于模型已经获得对应工具。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| In-process spawn/fork | 随 Standard 启用 | `preset:standard` | 统一 Activation API 管理 local child，支持后续消息与 cold resume；fork 复制已完成 Turn 前缀 | 启动工具只返回 child id，结果由 completion notice 投递；child 初始 cwd 单独捕获 |
| Codex provider | 可选 Bundle；默认不选中 | `optional-package:packages/subagent/subagent-codex` | 官方 app-server protocol 驱动一次 external Activation；Bundle 加入 global `subagent_codex` | completion notice 返回结果，无后续消息或 resume；原生权限由 Provider 配置 |
| Claude Code provider | 可选 Bundle；默认不选中 | `optional-package:packages/subagent/subagent-claude-code` | 官方 Agent SDK 驱动一次 external Activation；Bundle 加入 global `subagent_claude_code` | completion notice 返回结果，无后续消息或 resume；原生权限由 Provider 配置 |
| ACP provider | 可选包 | `optional-package:packages/subagent/subagent-acp` | ACP subprocess | Standard 无预置工具行，需自行组合 Consumer |
| DSH SDK provider | 可选包 | `optional-package:packages/subagent/subagent-dsh-sdk` | TypeScript SDK 与 stdio JSON-RPC | Standard 无预置工具行，需自行组合 Consumer |
| Agent Team domain/tools | 公开实验性包，opt-in | `experimental:packages/experimental/agent-team` | 持久 roster、direct peer inbox messages 与 shared task DAG；工具由 sibling Consumer 提供 | 需要 durable Session storage；共享 checkout，无 worktree isolation 或文件锁 |
| Agent Team Bundle | 随安装提供但默认关闭的实验性 Bundle | `experimental:packages/experimental/agent-team-profile` | 一次启用 Team domain/tools 与 Web roster/task board/navigation；`spawn_teammate` 选择 fresh/fork，禁用 Host 普通委托与重叠 controls | 不是第六个 shipped Profile；Workflow 仍通过独立 Activation 收集 child result；Preset scoped controls 仍可能同时出现 |

[Codex Bundle 启用](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/subagent/subagent-codex/README.md#L28-L36)；[Claude Code Bundle 启用](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/subagent/subagent-claude-code/README.md#L28-L36)；[Team 组合](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/experimental/agent-team-profile/README.md#L12-L51)；[Team 默认状态与限制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/experimental/agent-team-profile/README.md#L101-L108)。

### Goal、Workflow 与 Schedule

<a id="claim-dsh-cap-008"></a> **Claim `DSH-CAP-008`:** durable current Goal 与通过 PTC Node 进程执行的 Workflow 是两种不同的编排原语。

Goal 状态不负责调度；Workflow 的 VM 不是安全隔离层，文件约束由所选 Sandbox 提供方执行，网络不在该策略内。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Current Goal | 随 Standard 启用 | `preset:standard` | `goal/change` 持久化目标 mutation，process-local activation 决定 continuation eligibility | Resume/Fork 后须重新激活；何时续轮由 driver 消费方决定 |
| Workflow | 随 Standard 启用 | `preset:standard` | `workflow-ptc` 复用 Node PTC runtime，每次在新建 Node 进程中运行 JS orchestration，通过 hooks 启动 Subagent；工具可等待完成或返回后台 Job | 没有整体 elapsed deadline；前台服从 caller/tool deadline；后台由 Job/owner 取消并负责 dispose |
| Ralph | 可选实验 Bundle；默认关闭 | `experimental:packages/experimental/ralph-bundle` | 从 Preset/base 移到独立 Host group，以自己的 Workflow engine 提供 global `ralph` | 显式开启后所有 Preset 可见；仅用于用户明确要求的 fresh-agent iteration，完成是 worker 自报 |

[Workflow 执行、文件策略与取消](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/workflow/workflow-ptc/README.md#L12-L61)。该 engine 只接受 TypeScript PTC runtime；改用 Python PTC 时必须禁用相关 engine 与工具。[Ralph 的独立 Host group](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/experimental/ralph-bundle/README.md#L28-L40)。

<a id="claim-dsh-cap-012"></a> **Claim `DSH-CAP-012`:** Schedule 随 Web 默认组合提供 Host 持久任务、一次性和多种周期提醒，到期可恢复原会话并接纳 follow-up。

投递回执确认 inbox 持久接纳，不证明模型执行；Session flush 与 task-row 更新分开，崩溃或写入失败可能重复投递。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Schedule | Web 默认 service/UI；Standard、Cordis、PTC 默认工具 | `profile:web` | Host storage-domain 保存任务、历史与下次目标；支持 after/at/every/daily/weekly/cron，到期恢复原 Session 并 follow-up | every 至少 60 秒；每个周期任务只补最新 missed occurrence；依赖 Web Session controller 和 persistence，不能单独装载到 SDK/headless |

[Schedule 配置与投递](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/schedule/schedule/README.md#L12-L77)；[Web 默认 service/UI](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/cordis.patch.yml#L134-L140)。

<a id="office-skills"></a>

### Office Skills 与资源

<a id="claim-dsh-cap-013"></a> **Claim `DSH-CAP-013`:** Office Skills 提供 DOCX、PPTX 与 XLSX 工作流；Python SDK 根据显式下载或配置的资源启用 Office Skills 与运行时查询。

Office sidecar 与 authoring runtime 独立下载；SDK 启动不自动取得缺失资源，Skill 本身不安装解释器或编写库。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Office Skills | 可选 Provider；Python SDK 按资源启用 | `optional-package:packages/skill/skill-office` | Skill catalog 按需加载 `office-docx`、`office-pptx`、`office-xlsx`，提供 OOXML 检查脚本与 LibreOffice Kit 路径 | 结构检查不证明分页、字体或图表视觉正确；部署仍需解释器、编写库、执行与交付工具 |
| SDK Office 运行时 | SDK 条件组合；显式资源准备 | `profile:sdk` | `download_office()` 准备 Kit/Node；`download_primary_runtime()` 独立准备 Python、编写库与工具，启动时按资源启用 | `DSH_PRIMARY_RUNTIME` 空值禁用编写环境查询；只提供 authoring runtime 时 Skill 可用而 Kit CLI disabled |

[Office 工作流与部署要求](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/skill/skill-office/README.md#L28-L50)；[SDK 显式下载与资源选择](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/python/sdk-runtime/README.md#L15-L30)；[SDK 条件组合](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/sdk-app/cordis.patch.yml#L21-L36)。Web Bundle 还提供 Office 到 PDF 的文档预览；它与模型控制浏览器或桌面的实验性 Provider 分属不同能力。[文档预览与浏览器 UI 行](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/cordis.patch.yml#L282-L293)。

### Webhook

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Generic Webhook runtime | 公开实验包；显式部署组合 | `experimental:packages/experimental/webhook` | authenticated delivery 经 trusted rule 创建 Workspace-backed root Session | Fire-and-forget；没有 queue、retry、dedupe、crash replay 或 completion result |
| GitHub webhook adapter | 公开实验包；显式部署组合 | `experimental:packages/experimental/webhook-github` | 在解析前验证原始 JSON body，内存 dispatch 后返回 `202` | adapter 负责 intake；rule 验证事件字段并执行外部调用 |

[Webhook runtime 与 GitHub adapter](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/webhook.md#L5-L37)。

### SDK access

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Full SDK runtime | 已发布 SDK application | `profile:sdk` | stdio JSON-RPC；prompt 返回 message id；`run()` 收集 receipt 至下次 idle，`session/wait` 可另等 managed descendants 与 root summaries | 无 prompt cancel 或 per-session close；`run()` 区间不表示某一 prompt 的因果独占答复，`wait` 不创建会话 |
| Minimal SDK runtime | 已发布独立 SDK application | `profile:sdk-minimal` | 相同 server 与 wire，默认提供持久 Shell 与 `working_directory` | 不包含 full base feature set；执行为 `danger-full-access` |

[SDK server 与 wait](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sdk/server/README.md#L44-L56)；[TypeScript run 与低层 wait](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sdk/client/README.md#L50-L58)；[协议限制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sdk/protocol/README.md#L114-L120)。有效工作目录通过日志记录与 SDK get/set 操作改变，仍受原项目的 Sandbox 写入根限制，详见[目录状态与权限](05-getting-started.md#claim-dsh-start-004)。客户端字段与一次性目录示例见[上手章节](05-getting-started.md)。

## 证据

Claim 分类、限定、probe 与全部不可变来源由 [`evidence/claims.json`](../evidence/claims.json) 保管；本章表格列出直接对应各项结论的主要来源。

| Claim | 种类 | 证据信心 | DeepSeek Harness 成熟度 | 固定来源 |
|---|---|---|---|---|
| `DSH-CAP-001` | `upstream-fact` | `verified` | `released` | [Profile templates](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/boot/app-boot/src/profile.ts#L178-L195) |
| `DSH-CAP-002` | `upstream-fact` | `verified` | `released` | [Standard Preset](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/presets/standard.patch.yml#L4-L137) |
| `DSH-CAP-003` | `upstream-fact` | `qualified` | `released` | [默认模型与 pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L83-L131) |
| `DSH-CAP-004` | `upstream-fact` | `verified` | `released` | [Base tools 与 runtime](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/base/cordis.patch.yml#L273-L401) |
| `DSH-CAP-005` | `upstream-fact` | `qualified` | `released` | [Sandbox modes](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L5-L79) |
| `DSH-CAP-006` | `upstream-fact` | `verified` | `released` | [Session fork 实现](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/session/src/index.ts#L1363-L1396) |
| `DSH-CAP-007` | `upstream-fact` | `qualified` | `released` | [Standard delegation](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/web-app/presets/standard.patch.yml#L89-L115) |
| `DSH-CAP-008` | `upstream-fact` | `qualified` | `released` | [Goal activation](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/goal/goal/README.md#L54-L72)；[Workflow runtime](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/workflow/workflow-ptc/README.md#L12-L61) |
| `DSH-CAP-009` | `analysis-inference` | `qualified` | `released` | [Session log](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/session.md#L5)；[Replay fixtures](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/testing.md#L11-L17) |
| `DSH-CAP-010` | `upstream-fact` | `qualified` | `experimental` | [Browser](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/browser-use.md#L5-L37)；[Computer](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/computer-use.md#L5-L26) |
| `DSH-CAP-011` | `upstream-fact` | `verified` | `released` | [MCP client](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/mcp/mcp-client/README.md#L12-L28) |
| `DSH-CAP-012` | `upstream-fact` | `qualified` | `released` | [Schedule](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/schedule/schedule/README.md#L12-L77) |
| `DSH-CAP-013` | `upstream-fact` | `qualified` | `released` | [Office Skills](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/skill/skill-office/README.md#L28-L44)；[SDK 条件组合](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/bundle/sdk-app/cordis.patch.yml#L21-L36) |

## 限制与适用范围

<a id="claim-dsh-cap-009"></a> **Claim `DSH-CAP-009`:** Session 原语与确定性 replay fixture 不构成专用的终端用户调试器或通用 Benchmark 产品。

该判断限制产品定位，不否认这些原语可被更高层工具组合使用。它是作者的 `analysis-inference`；本章不对 Profile、Preset、Provider 或产品进行性能与质量排名。

`released` 表示对象位于固定基线的发布代码路径；`experimental` 表示仍处于实验成熟度。二者都不代表生产就绪，公开实验包也不会自动进入默认应用组合。

## 继续阅读

- [专题深挖：注册工具与 Programmatic Tool Calling](deep-dives/tools-and-ptc.md)
- [专题深挖：本地 Sandbox 执行边界](deep-dives/sandbox-execution.md)
- [专题深挖：Subagent、Goal、Plan mode 与 Workflow 的责任边界](deep-dives/subagents-goals-workflows.md)
- [上一章：组合与生命周期架构](02-architecture.md)
- [下一章：差异化机制评估](04-differentiators.md)
- [证据方法](00-methodology.md)
- [术语表](glossary.md)
- [证据反向索引](source-map.md)
