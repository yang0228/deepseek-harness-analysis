# 能力与组合归属

基线：DeepSeek Harness commit `46a7f68b0922371ce7144b668b90e377d8e799f4`。

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
| Web | 已发布；默认启用 HMR | `profile:web` | `dsh-base` + `dsh-web-app` 提供 HTTP/Web runtime、浏览器插件与四个 Preset 声明，默认选择 `standard` | 模型工具由所选 Preset 决定；全文搜索默认 `openAt: never` |
| Headless | 已发布；默认禁用 HMR | `profile:headless` | `dsh-base` + `dsh-headless` 创建一次 Agent，等待静止并从 durable interval 输出最终结果 | 无监听端口；stdout 为最终文本，reasoning delta 在 stderr |
| SDK | 已发布；默认禁用 HMR | `profile:sdk` | `dsh-base` + `dsh-sdk-app` 在 stdio 上提供 SDK JSON-RPC | stdout 专用于协议；工具来自 Profile 组合 |
| SDK Minimal | 已发布；独立完整树 | `profile:sdk-minimal` | `dsh-sdk-minimal` 直接组合 SDK server、DeepSeek adapter、一个平台持久 Shell 与 JSONL Session | 默认没有 filesystem editor 或 compaction；`danger-full-access` 允许访问进程可访问的路径 |
| ACP | 已发布；默认禁用 HMR | `profile:acp` | `dsh-base` + `dsh-acp-app` 装载 automation-only ACP server | stdout 专用于 ACP |

[Profile 声明](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/app-boot/src/profile.ts#L157-L174)；[Base HMR](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/base/cordis.patch.yml#L27-L32)；[Headless 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/headless/cordis.patch.yml#L33-L34)；[SDK 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/sdk-app/cordis.patch.yml#L24-L25)；[ACP 禁用 HMR](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/acp-app/cordis.patch.yml#L23-L24)；[Headless 命令行为](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/apps/cli/reference/README.md#L32-L42)；[SDK Minimal 组合](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/sdk-minimal/README.md#L12-L41)。Desktop 是独立 Host 启动路径，见[组合专题](deep-dives/profiles-bundles-presets.md)，不计入上述五个模板。

### Agent Preset 矩阵

| Agent Preset | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Standard | 已发布、Bundle 声明的 Preset | `preset:standard` | native tools：Shell、文件检索、Job、Skill、Goal/Plan、compaction、进程内 spawn/fork、Workflow、ask-user、todo、Web 与 present | Ralph、Codex 与 Claude Code 工具行默认 disabled |
| Minimal | 已发布、Bundle 声明的 Preset | `preset:minimal` | 固定完整 persona 与一个按平台选择的持久 Shell；PTY 使用独立 realm | 不包含 filesystem editor、运行时上下文或 compaction；Shell 仍消费 Host sandbox policy |
| PTC | 已发布、Bundle 声明的 Preset | `preset:ptc` | `mode: ptc` 将工具目录呈现为 `run_code`，依赖 Host 的 TypeScript PTC runtime | Workflow engine、通用 workflow 工具与 Ralph 均 disabled；若启用 Ralph，须同时恢复 engine |
| Cordis / Creator | 已发布、Bundle 声明的 Preset | `preset:cordis` | 在编码工具上提供运行时检查/装载、组合创作 Skill 与 `plugin_manager` | `cordis_mount` 求值模型编写的 JavaScript；管理工具每次调用需要 Full access 或审批，安装的 Host 插件在 workspace sandbox 外执行 |

[Standard delegation 与工具](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/presets/standard.patch.yml#L80-L146)；[Minimal 完整组合](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/presets/minimal.patch.yml#L4-L61)；[PTC 禁用行与 runtime 依赖](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/presets/ptc.patch.yml#L119-L152)。

Preset 由 Web Bundle 的 `presets/*.patch.yml` 注册，默认选择 `standard`。Web 只读展示组合；新增或覆盖 Preset 通过 Bundle Patch，Creator 可在对话中编写这类 Bundle。[注册与修改方式](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/preset/agent-preset-registry/README.md#L46-L58)。

### Plugin Manager

Base 提供 Profile 级 Plugin Manager，Web Plugins 页面可安装、启停和移除 Bundle；Standard/PTC 的模型管理工具默认禁用，Creator 启用。操作影响使用同一 Profile 的会话，HMR 决定立即应用还是重启生效。不兼容的安装会被拒绝；启动或重组时，不兼容或不可读取的 Bundle 被跳过，保存的 Bundle 选择仍保留，其余组合能否启动取决于所需服务是否齐全。例外授权只绑定精确插件版本与 DSH runtime 版本，不能代替依赖构建脚本授权。[管理范围、权限与应用](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/plugin-manager/README.md#L28-L42)；[兼容性与精确版本例外](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/plugin-manager/README.md#L60-L69)；[启动跳过与保存状态](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/app-boot/README.md#L50-L54)。

### LLM

<a id="claim-dsh-cap-003"></a> **Claim `DSH-CAP-003`:** 已发布 LLM 组合以 DeepSeek 路由为中心，同时保留可配置的 pi-ai 路由。

pi-ai 可声明兼容提供方，但固定组合没有预先启用所有目录中的提供方。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| DeepSeek 默认路由 | base-backed 组合启用 | `profile:web` | Agent 默认选择 `deepseek-official` / `deepseek-flash` | SDK initialization 可显式选择自己的 route，不能把 Web 默认值当成所有客户端的默认值 |
| pi-ai 路由 | 已装载、初始 dormant | `profile:web` | `llm-pi-ai:` 用户设置增加、更新或移除 live provider route | 目录中存在某 provider 不等于该部署已配置凭据并启用它 |

[Base 默认模型与 dormant pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/base/cordis.patch.yml#L80-L128)。

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

[MCP 配置、资源与结果](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/mcp/mcp-client/README.md#L12-L93)；[Base 资源服务](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/base/cordis.patch.yml#L491-L492)。

<a id="claim-dsh-cap-010"></a> **Claim `DSH-CAP-010`:** Browser use 与 Computer use 各有单一 Provider 注册服务，其公开实验性 Provider 需要显式启用。

这些 Provider 仍为实验性 opt-in；发布族配置不表示默认启用或生产就绪。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Browser use | 公开实验性 Provider，显式启用 | `experimental:packages/experimental/browser-use-runtime` | `ctx.browserUse` 注册一个 Provider；Playwright MCP、Chrome DevTools MCP 或 Stagehand 提供实际操作 | 初始引擎 Chromium；launched browser 随 live Session 回收，resume/fork 不恢复登录状态；attached browser 的 reservation 只在 Provider 实例内有效 |
| Computer use | 公开实验性 Provider，显式启用 | `experimental:packages/experimental/computer-use-cua-driver-native` | `ctx.computerUse` 注册一个 Provider；Cua Driver 提供 MCP 或 native 接入 | 单一 Provider 不等于 Session 独占桌面；平台权限由 Provider 要求，已送达的输入不能靠取消撤回 |

[Browser use 归属与生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/browser-use.md#L5-L37)；[Computer use 归属与共享桌面](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/computer-use.md#L5-L26)。

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

<a id="claim-dsh-cap-007"></a> **Claim `DSH-CAP-007`:** `standard` Preset 启用进程内 Subagent；Codex 与 Claude Code 工具默认禁用，其他外部 Provider 也需要显式组合。

Provider 在 Host 中可用不等于模型已经获得对应工具。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| In-process spawn/fork | 随 Standard 启用 | `preset:standard` | continuable child 支持后续消息与 cold resume；fork 复制已完成 Turn 前缀 | Base 的 fork 默认 one-shot，与 Web Standard 的 continuable 不同 |
| Codex provider | 可选 Bundle；Standard 工具 disabled | `optional-package:packages/subagent/subagent-codex` | 官方 app-server protocol 驱动 one-shot backend | 安装后重启 Host，并在新 Preset 中启用 Consumer |
| Claude Code provider | 可选 Bundle；Standard 工具 disabled | `optional-package:packages/subagent/subagent-claude-code` | 官方 Agent SDK 驱动 one-shot backend | 安装后重启 Host，并在新 Preset 中启用 Consumer |
| ACP provider | 可选包 | `optional-package:packages/subagent/subagent-acp` | ACP subprocess | Standard 无预置工具行，需自行组合 Consumer |
| DSH SDK provider | 可选包 | `optional-package:packages/subagent/subagent-dsh-sdk` | TypeScript SDK 与 stdio JSON-RPC | Standard 无预置工具行，需自行组合 Consumer |
| Agent Team domain/tools | 公开实验性包，opt-in | `experimental:packages/experimental/agent-team` | 持久 roster、成员 mailbox 与 shared task DAG；工具由 sibling Consumer 提供 | 需要 durable Session storage；共享 checkout，无 worktree isolation 或文件锁 |
| Agent Team Bundle | 随安装提供但默认关闭的实验性 Bundle | `experimental:packages/experimental/agent-team-profile` | 一次启用 Team domain/tools 与 Web roster/task board/navigation；`spawn_teammate` 选择 fresh/fork，禁用 Host 普通委托与重叠 controls | 不是第六个 shipped Profile；Workflow 仍用 fresh one-shot child；Preset scoped controls 仍可能同时出现 |

[Subagent 工具与 Provider 启用步骤](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/apps/cli/reference/README.md#L83-L93)；[Team 组合](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/experimental/agent-team-profile/README.md#L12-L51)；[Team 默认状态与限制](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/experimental/agent-team-profile/README.md#L102-L109)。

### Goal、Workflow 与 Schedule

<a id="claim-dsh-cap-008"></a> **Claim `DSH-CAP-008`:** durable current Goal 与通过 PTC Node 进程执行的 Workflow 是两种不同的编排原语。

Goal 状态不负责调度；Workflow 的 VM 不是安全隔离层，文件约束由所选 Sandbox 提供方执行，网络不在该策略内。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Current Goal | 随 Standard 启用 | `preset:standard` | `goal/change` 持久化目标 mutation，process-local activation 决定 continuation eligibility | Resume/Fork 后须重新激活；何时续轮由 driver 消费方决定 |
| Workflow | 随 Standard 启用 | `preset:standard` | `workflow-ptc` 复用 Node PTC runtime，每次在新建 Node 进程中运行 JS orchestration，通过 hooks 启动 Subagent；工具可等待完成或返回后台 Job | 没有整体 elapsed deadline；前台服从 caller/tool deadline；后台由 Job/owner 取消并负责 dispose |
| Ralph | Preset 行默认 disabled | `preset:standard` | 显式启用后通过同一 Workflow engine 执行 fresh-agent iteration | PTC Preset 还须恢复 engine；完成是 worker 自报，不是独立评估 |

[Workflow 执行、文件策略与取消](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/workflow/workflow-ptc/README.md#L12-L61)。该 engine 只接受 TypeScript PTC runtime；改用 Python PTC 时必须禁用 Workflow/Ralph 对应行。

<a id="claim-dsh-cap-012"></a> **Claim `DSH-CAP-012`:** Schedule 以可选组合提供持久化的一次性或固定间隔提醒，并在同一会话的 live root Agent 空闲时投递。

关闭或 cold Session 的提醒保持 overdue，等待下次 live root Agent；它不向会话外发送通知。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Schedule | 可选 overlay；Web UI row 默认 disabled | `optional-package:packages/schedule/schedule` | Session log 保存提醒；到期后以 ordinary follow-up 送入同一 idle conversation | 固定间隔至少五分钟；不提供日历规则、cold-session scheduler 或会话外通知；只作用于插件加载后创建的 root Agent |

[Schedule 配置与投递](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/schedule/schedule/README.md#L12-L83)；[Web 默认禁用行](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/cordis.patch.yml#L349-L354)。

<a id="office-skills"></a>

### Office Skills 与资源

<a id="claim-dsh-cap-013"></a> **Claim `DSH-CAP-013`:** Office Skills 提供 DOCX、PPTX 与 XLSX 工作流；打包的 Python SDK 默认组合运行时查询工具与 Office Skills。

源码 SDK 在没有 carrier 默认资源时仍需显式配置；运行时查询工具与 Office Skills 可分别禁用，Skill 本身不安装解释器或编写库。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Office Skills | 可选 Provider；打包 Python SDK 默认组合 | `optional-package:packages/skill/skill-office` | Skill catalog 按需加载 `office-docx`、`office-pptx`、`office-xlsx`，提供 OOXML 检查脚本与 LibreOffice Kit 路径 | 结构检查不证明分页、字体或图表视觉正确；部署仍需解释器、编写库、执行与交付工具 |
| SDK Office 运行时 | 打包 Python SDK 默认；源码 SDK opt-in | `profile:sdk` | `load_workspace_dependencies` 查询 carrier 的运行时资源；`DSH_PRIMARY_RUNTIME` 可替换资源路径 | 空值显式禁用；外部 payload 平台、架构或内容无效时拒绝使用 |

[Office 工作流与部署要求](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/skill/skill-office/README.md#L28-L50)；[资源布局与 SDK 默认](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/skill/tool-workspace-dependencies/README.md#L38-L47)；[SDK 条件组合](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/sdk-app/cordis.patch.yml#L27-L41)。Web Bundle 还提供 Office 到 PDF 的文档预览；它与模型控制浏览器或桌面的实验性 Provider 分属不同能力。[文档预览与浏览器 UI 行](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/cordis.patch.yml#L244-L255)。

### Webhook

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Generic Webhook runtime | 显式部署组合 | `optional-package:packages/webhook/webhook` | authenticated delivery 经 trusted rule 创建 Workspace-backed root Session | Fire-and-forget；没有 queue、retry、dedupe、crash replay 或 completion result |
| GitHub webhook adapter | 显式部署组合 | `optional-package:packages/webhook/webhook-github` | 在解析前验证原始 JSON body，内存 dispatch 后返回 `202` | adapter 负责 intake；rule 验证事件字段并执行外部调用 |

[Webhook runtime 与 GitHub adapter](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/webhook.md#L5-L37)。

### SDK access

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Full SDK runtime | 已发布 SDK application | `profile:sdk` | newline-delimited stdio JSON-RPC；初始化验证 route，prompt 返回 message id，客户端收集 durable receipt 至 idle 的活动区间 | 无 prompt cancel 或 per-session close；区间结果不表示某一 prompt 的因果独占答复 |
| Minimal SDK runtime | 已发布独立 SDK application | `profile:sdk-minimal` | 相同 server 与 wire，默认仅一个持久 Shell | 不包含 full base feature set；执行为 `danger-full-access` |

[SDK server](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/sdk/server/README.md#L42-L52)；[TypeScript run 结果](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/sdk/client/README.md#L48-L54)；[协议限制](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/sdk/protocol/README.md#L110-L116)。客户端字段与安全的一次性目录示例见[上手章节](05-getting-started.md)。

## 证据

Claim 分类、限定、probe 与全部不可变来源由 [`evidence/claims.json`](../evidence/claims.json) 保管；本章表格列出直接对应各项结论的主要来源。

| Claim | 种类 | 证据信心 | DeepSeek Harness 成熟度 | 固定来源 |
|---|---|---|---|---|
| `DSH-CAP-001` | `upstream-fact` | `verified` | `released` | [Profile templates](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/app-boot/src/profile.ts#L157-L174) |
| `DSH-CAP-002` | `upstream-fact` | `verified` | `released` | [Standard Preset](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/presets/standard.patch.yml#L4-L146) |
| `DSH-CAP-003` | `upstream-fact` | `qualified` | `released` | [默认模型与 pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/base/cordis.patch.yml#L80-L128) |
| `DSH-CAP-004` | `upstream-fact` | `verified` | `released` | [Base tools 与 runtime](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/base/cordis.patch.yml#L263-L398) |
| `DSH-CAP-005` | `upstream-fact` | `qualified` | `released` | [Sandbox modes](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/sandbox.md#L5-L79) |
| `DSH-CAP-006` | `upstream-fact` | `verified` | `released` | [Session fork 实现](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/core/session/src/index.ts#L1221-L1254) |
| `DSH-CAP-007` | `upstream-fact` | `qualified` | `released` | [Standard delegation](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/web-app/presets/standard.patch.yml#L86-L118) |
| `DSH-CAP-008` | `upstream-fact` | `qualified` | `released` | [Goal activation](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/goal/goal/README.md#L54-L72)；[Workflow runtime](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/workflow/workflow-ptc/README.md#L12-L61) |
| `DSH-CAP-009` | `analysis-inference` | `qualified` | `released` | [Session log](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/session.md#L5)；[Replay fixtures](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/testing.md#L11-L17) |
| `DSH-CAP-010` | `upstream-fact` | `qualified` | `experimental` | [Browser](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/browser-use.md#L5-L37)；[Computer](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/subsystems/computer-use.md#L5-L26) |
| `DSH-CAP-011` | `upstream-fact` | `verified` | `released` | [MCP client](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/mcp/mcp-client/README.md#L12-L28) |
| `DSH-CAP-012` | `upstream-fact` | `qualified` | `released` | [Schedule](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/schedule/schedule/README.md#L12-L83) |
| `DSH-CAP-013` | `upstream-fact` | `qualified` | `released` | [Office Skills](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/skill/skill-office/README.md#L28-L44)；[SDK 默认](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/bundle/sdk-app/cordis.patch.yml#L27-L41) |

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
