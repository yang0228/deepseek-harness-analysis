# 能力与组合归属

基线：DeepSeek Harness commit `76fda729799fe9b3848dbe2c211d4b231032b81e`。

## 一句话结论

DeepSeek Harness 的能力是否可用，取决于 Application Profile、Agent Preset、显式加入的可选包或实验包；源码中存在一个包，不等于当前 Agent 已获得它。

<a id="claim-dsh-cap-001"></a> **Claim `DSH-CAP-001`:** 固定基线发布 `web`、`headless`、`sdk`、`sdk-minimal` 与 `acp` 五个 Application Profile，并记录各自的 Bundle 与重载模式。

<a id="claim-dsh-cap-002"></a> **Claim `DSH-CAP-002`:** 固定基线发布 `standard`、`minimal`、`ptc` 与 `cordis` 四个 Agent Preset，并为它们配置不同的工具呈现。

本章把 Availability、Owner、Mechanism 与 Limit 分开记录。Availability 是固定组合中的启用状态，不从 Claim 的证据信心或成熟度推导；Owner 使用 `profile:`、`preset:`、`optional-package:` 或 `experimental:` 中恰好一个前缀。

## 机制

Application Profile 组合 Host 与应用入口，Agent Preset 决定每个 Agent 的提示词、工具和 Agent 侧服务。可选包只有在部署显式组合后才可能可用，实验包则被固定基线的发布族排除。

### Application Profile 矩阵

固定基线的 `PROFILE_TEMPLATES` 只有以下五行；`web` 使用 live Patch reload，其余四个使用 startup-only Patch application。

| Application Profile | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Web | 已发布；Patch live reload | `profile:web` | `dsh-base` + `dsh-web-app` 提供 HTTP/Web runtime、浏览器 roster 与四个系统 Preset，默认选择 `standard` | Agent 能力仍由所选 Preset 决定；全文 content search 的 `openAt: never` 需要后续 Patch 才会开启 |
| Headless | 已发布；Patch 只在启动时应用 | `profile:headless` | `dsh-base` + `dsh-headless` 创建一次 Agent 并输出 durable result | 单次任务入口；不装载 Host、HTTP server、Web runtime 或 browser plugin |
| SDK | 已发布；Patch 只在启动时应用 | `profile:sdk` | `dsh-base` + `dsh-sdk-app` 在 stdio 上提供 SDK JSON-RPC | stdout 专用于 JSON-RPC；该入口关闭 LLM 生成的 Session title |
| SDK Minimal | 已发布；Patch 只在启动时应用 | `profile:sdk-minimal` | `dsh-sdk-minimal` 是独立完整 Cordis tree，直接组合 SDK server、DeepSeek adapter、持久 Shell、`str_replace_editor` 与 JSONL Session | 不叠加 `dsh-base`；使用 `danger-full-access`，因此绕过文件系统 confinement |
| ACP | 已发布；Patch 只在启动时应用 | `profile:acp` | `dsh-base` + `dsh-acp-app` 装载 automation-only ACP server，并为该入口选择 DeepSeek route | stdout 专用于 ACP；它不是浏览器或 SDK wire |

### Agent Preset 矩阵

Preset 是每个 Session/Agent 的能力组合，不是第六种应用入口。

| Agent Preset | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Standard | 已发布、只读系统 Preset | `preset:standard` | 完整 native tool presentation：平台 Shell、文件与检索、Job、Skill、Goal/Plan、compaction、进程内 `spawn`/`fork`、Workflow/Ralph、ask-user、todo 与 Web | Codex 与 Claude Code 是 disabled one-shot 工具行；ACP 与 DSH SDK 没有对应 disabled 行；Provider 安装本身不授予工具 |
| Minimal | 已发布、只读系统 Preset | `preset:minimal` | 按平台启用一个持久 Shell，并提供 `str_replace_editor`；PTY 属于 Agent-local realm | 没有 Standard 的其余 roster，也没有 context compaction；editor 使用 Preset 内的 bare local filesystem |
| PTC | 已发布、只读系统 Preset | `preset:ptc` | `dsh-agent-tool-presentation` 以 `mode: ptc` 把工具注册表呈现为 `run_code`；Workflow engine 与 Ralph worker 保留 | 只禁用通用 model-facing `workflow` 工具，不禁用 Workflow engine |
| Cordis / Creator | 已发布、只读系统 Preset | `preset:cordis` | Standard 能力加 `dsh-tool-cordis` 的运行时检查/装载和组合创作 Skill | 等同 Shell 信任级别：`cordis_mount` 会求值模型编写的 JavaScript，所写 Preset 可由其他 Session 装载 |

### LLM

<a id="claim-dsh-cap-003"></a> **Claim `DSH-CAP-003`:** 已发布 LLM 组合以 DeepSeek 路由为中心，同时保留可配置的 pi-ai 路由。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| DeepSeek 默认路由 | 在 base-backed Web 组合中启用 | `profile:web` | `dsh-base` 装载 native DeepSeek adapter，并把 `deepseek-official` / `deepseek-v4-flash` 设为 Agent 创建时的默认选择 | 这是固定组合的默认选择，不表示每个自定义 Profile 都必须使用它 |
| pi-ai 路由 | 已装载但初始 dormant；可由设置激活 | `profile:web` | `dsh-base` 装载初始没有 route 的 `dsh-llm-pi-ai`；`llm-pi-ai:` 设置可以增加或删除 live provider route，也可手写声明 route | pi-ai 可声明兼容提供方，但固定组合没有预先启用 OpenAI、Anthropic、Bedrock、Azure 或 Gemini 的全部目录 route |

### 工具与 Web

<a id="claim-dsh-cap-004"></a> **Claim `DSH-CAP-004`:** 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Standard native tools | 随 Standard 启用 | `preset:standard` | Preset 把 Shell、filesystem/search、Job、Skill、Goal、Workflow、ask-user、todo 与 Web Consumer 注册到 Agent 的工具目录 | Host 仍拥有底层 registry、provider、sandbox、persistence 与 model route；工具目录不等于底层服务所有权 |
| PTC tool presentation | 随 PTC 启用 | `preset:ptc` | `run_code` 让一次模型编写的 TypeScript 程序组合多次受保护工具调用 | 通用 `workflow` 工具被禁用，但 Workflow engine 与 Ralph 仍在；本行不表示已测得速度、成本或质量改进 |
| Exa search | 发布族中的可选包；需显式组合 | `optional-package:packages/web/web-search-exa` | 包身份声明它向 `ctx.web` 注册 Exa-backed search provider | 包存在不等于任何已发布 Profile/Preset 已启用它；部署还需显式配置 |
| Perplexity search | 发布族中的可选包；需显式组合 | `optional-package:packages/web/web-search-perplexity` | 包身份声明它向 `ctx.web` 注册 Perplexity-backed search provider | 包存在不等于任何已发布 Profile/Preset 已启用它；部署还需显式配置 |

### Sandbox

<a id="claim-dsh-cap-005"></a> **Claim `DSH-CAP-005`:** 本地 Sandbox 提供方约束文件系统副作用，并报告实际 enforcement 状态。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Base local Sandbox | base-backed Web 组合默认使用 `workspace-write` 与 approval `ask` | `profile:web` | 本地提供方覆盖 Linux bwrap/Landlock、macOS Seatbelt 与 Windows ACL restricted-token backend；Sandbox mode 只管理文件系统 effect，`workspace-write` 允许 workspace root 和 backend 承诺的临时目录 | Windows ACL 的 ambient gap 与较旧但受支持的 Landlock ABI 可能只报告 `partial`；`danger-full-access` 绕过 confinement；不承诺通用网络、进程或凭据隔离 |
| SDK Minimal direct execution | 随 SDK Minimal 启用 | `profile:sdk-minimal` | `danger-full-access` 让 Consumer 执行原始 argv，不调用 `ctx.sandbox` | 这是绕过 confinement，不是具有更宽根目录的受限 Sandbox |

### Session

<a id="claim-dsh-cap-006"></a> **Claim `DSH-CAP-006`:** Session 提供持久化、投影、恢复、Transcript 与已完成 Turn 的 Fork 原语。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Durable Web Session | 随 Web Profile 的 base 组合启用 | `profile:web` | append-only Session Event Log 支持 persistence、projection、resume、Transcript，以及以已完成 Turn 前缀创建 Fork | 投影不是原始事件；这些是可组合原语，不是完整终端用户 debugger |
| Minimal SDK Session | 随 SDK Minimal 启用 | `profile:sdk-minimal` | 独立树直接装载 JSONL persistence 与 SDK server | 它省略 `dsh-base` 的其余功能，并继承 `danger-full-access` 的执行限制 |

### Delegation 与 Agent Teams

<a id="claim-dsh-cap-007"></a> **Claim `DSH-CAP-007`:** `standard` Preset 启用进程内 Subagent，而外部产品 Provider 需要可选组合且对应工具行默认禁用。

Provider 注册和 model-facing Consumer 是两个独立步骤。只有 Codex 与 Claude Code 在 Standard 中有 disabled 工具行；ACP 与 DSH SDK 不应被描述成已有 disabled Standard 行。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| In-process spawn/fork | 随 Standard 启用 | `preset:standard` | `spawn` 与 `fork` 以 continuable 工具发布，复用 Host 的 subagent registry | 只说明 Standard 的 model-facing 入口；Provider 在 Host 可用不等于模型已获得工具 |
| ACP provider | 发布族中的可选包；Standard 无 enabled/disabled 工具行 | `optional-package:packages/subagent/subagent-acp` | 通过 Agent Client Protocol 驱动进程外 child；部署必须注册 Provider 并另行发布工具 | 需要可执行命令；不能据此虚构 Standard disabled 行 |
| Codex provider | 可选 Profile Bundle 可注册 dormant Provider；Standard 工具行 disabled | `optional-package:packages/subagent/subagent-codex` | 通过官方 app-server protocol 驱动 one-shot backend；需要 Profile Bundle 与显式启用的 Preset 工具行 | Standard 的 dormant 行是 one-shot；Host Provider 可用仍不授予模型工具 |
| Claude Code provider | 可选 Profile Bundle 可注册 dormant Provider；Standard 工具行 disabled | `optional-package:packages/subagent/subagent-claude-code` | 通过官方 Agent SDK 驱动 one-shot backend；需要 Profile Bundle 与显式启用的 Preset 工具行 | Standard 的 dormant 行是 one-shot；Host Provider 可用仍不授予模型工具 |
| DSH SDK provider | 发布族中的可选包；Standard 无 enabled/disabled 工具行 | `optional-package:packages/subagent/subagent-dsh-sdk` | 通过 TypeScript SDK 和 stdio JSON-RPC 驱动进程外 child；部署必须注册 Provider 并另行发布工具 | 不能据此虚构 Standard disabled 行；它与 ACP/Codex/Claude Code 的 Agent route 字段支持不同 |
| Agent Team service | 私有实验包；不属于发布族 | `experimental:packages/experimental/agent-team` | 提供 implicit-root team roster、durable peer mailbox 与 shared task DAG | internal-only service package，不证明发布可用性 |
| Agent Team Profile | 私有实验 Profile layer；不属于五个 shipped Profile | `experimental:packages/experimental/agent-team-profile` | 在 `dsh-base` 上装载 Team service/tools，禁用重叠的全局 continuable controls，并把 spawn/fork 改为 one-shot | 是显式实验层，不是已发布的第六 Profile |
| Agent Team Web Profile | 私有实验 Web layer | `experimental:packages/experimental/agent-team-web-profile` | Host Team service 存在时装载 Team UI | 需要 Web app 和 Host-side Team layer |
| Agent Team Web UI | 私有实验 client plugin | `experimental:packages/experimental/client-ui-agent-team` | 提供 browser roster、task board 与 teammate navigation | 仅 UI component，不拥有 Host Team service |
| Agent Team tools | 私有实验 Consumer | `experimental:packages/experimental/tool-agent-team` | 在 `ctx.agentTeams` 上提供 scoped model-facing Team tools | 需要 Team service/provider 组合；不单独提供服务 |

### Goal 与 Workflow

<a id="claim-dsh-cap-008"></a> **Claim `DSH-CAP-008`:** durable current Goal 与 worker-thread Workflow 是两种不同的编排原语。

#### Goal

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Current Goal | 随 Standard 启用 | `preset:standard` | `goal/change` Session Event 持久化当前目标的完整 mutation snapshot，进程内 activation 单独决定是否继续一轮 | Goal 不是调度器；它表达同一 Session 的当前 durable objective 和 continuation 状态 |

#### Workflow

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Worker-thread Workflow | 随 Standard 启用 | `preset:standard` | model-written orchestration script 在 `node:worker_threads` provider 中执行，并通过受限 API 启动 Subagent | Worker 的受限 API 不是安全 Sandbox；Workflow 也不是 Agent loop 的内置部分 |
| PTC Ralph workflow engine | PTC 保留 engine 与 Ralph，禁用通用工具 | `preset:ptc` | worker-thread provider 仍以 `spawn` 运行，供 Ralph 使用 | 不能把 disabled `tool-workflow` 解释为整个 Workflow capability 被移除 |

### Webhook

Webhook 不在任何 shipped Profile/Preset 的 enabled row 中，因此归属可选包，不归属 `profile:web`。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Generic Webhook runtime | 发布族中的公开包；仅显式部署组合可用 | `optional-package:packages/webhook/webhook` | [`ctx.webhookRuntime`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/webhook.md#L5-L31) 把 authenticated delivery 分派给 trusted rule；非空结果创建普通 Workspace-backed root Session | Fire-and-forget：没有 queue、retry、dedupe、crash replay、execution status、Agent-status listener 或 completion result |
| GitHub webhook adapter | 发布族中的公开包；仅显式部署组合可用 | `optional-package:packages/webhook/webhook-github` | [精确签名路由](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/webhook.md#L33-L37) 在解析前验证原始 JSON body，并在内存 dispatch 后返回 `202` | 只拥有 authentication/intake；rule 验证事件字段并执行外部调用。推荐部署把 WebServer 与浏览器 API 隔离 |

### SDK access

SDK 能力归属于装载 serving plugin 的 Profile；客户端实现细节留给上手章节。

| Capability | Availability | Owner | Mechanism | Limit |
|---|---|---|---|---|
| Full SDK runtime | 已发布 SDK application | `profile:sdk` | `dsh-sdk-app` + `dsh-sdk-jsonrpc-server` 在 stdio 上提供 newline-delimited JSON-RPC | 没有 per-session close、prompt cancel 或 causal per-prompt result；stdout purity 依赖组合 |
| Minimal SDK runtime | 已发布独立 SDK application | `profile:sdk-minimal` | 完整 minimal tree 直接装载同一 JSON-RPC server | 相同 wire 限制；另使用 `danger-full-access` 并省略 `dsh-base` feature set |

## 证据

九项结论的正式分类、限定、probe 与不可变来源由 [`evidence/claims.json`](../evidence/claims.json) 保管；[证据方法](00-methodology.md)解释 Availability、证据信心和成熟度为何是不同维度，[证据反向索引](source-map.md)提供按上游路径查找的入口。

| Claim | 种类 | 证据信心 | DeepSeek Harness 成熟度 | 固定来源 |
|---|---|---|---|---|
| `DSH-CAP-001` | `upstream-fact` | `verified` | `released` | [`profile.ts` 第 136–158 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/boot/app-boot/src/profile.ts#L136-L158)；probe `profile:web` |
| `DSH-CAP-002` | `upstream-fact` | `verified` | `released` | [`standard` Preset](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/standard/agent.cordis.yml#L1-L251) 与同目录四个 `preset.yml`/`agent.cordis.yml`；probe `preset:standard` |
| `DSH-CAP-003` | `upstream-fact` | `qualified` | `released` | [`dsh-base` Patch](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/bundle/base/cordis.patch.yml#L1-L498)；[`llm-pi-ai` README](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/llm/llm-pi-ai/README.md#L25-L71) |
| `DSH-CAP-004` | `upstream-fact` | `verified` | `released` | [`tools` subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/tools.md#L9-L170)；[`dsh-web-app` Patch](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/bundle/web-app/cordis.patch.yml#L1-L444) |
| `DSH-CAP-005` | `upstream-fact` | `qualified` | `released` | [`sandbox` subsystem 第 1–79 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/sandbox.md#L1-L79)、[第 154–219 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/sandbox.md#L154-L219) |
| `DSH-CAP-006` | `upstream-fact` | `verified` | `released` | [`session` subsystem 第 178–381 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/session.md#L178-L381)、[第 563–649 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/session.md#L563-L649) |
| `DSH-CAP-007` | `upstream-fact` | `qualified` | `released` | [`standard` delegation rows](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/standard/agent.cordis.yml#L159-L219)；[`subagent` subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/subagent.md#L1-L170) |
| `DSH-CAP-008` | `upstream-fact` | `qualified` | `released` | [`goal` subsystem 第 1–30 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/goal.md#L1-L30)、[第 72–151 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/goal.md#L72-L151)；[`workflow` subsystem 第 1–13 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/workflow.md#L1-L13)、[第 39–158 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/subsystems/workflow.md#L39-L158) |
| `DSH-CAP-009` | `analysis-inference` | `qualified` | `released` | 上述 Session primitives；[`docs/testing.md` 第 12–16 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/testing.md#L12-L16) |

## 限制与适用范围

<a id="claim-dsh-cap-009"></a> **Claim `DSH-CAP-009`:** Session 原语与确定性 replay fixture 不构成专用的终端用户调试器或通用 Benchmark 产品。

该判断是作者对产品定位的 `analysis-inference`，不否认 Session primitives 和 replay fixture 能被更高层工具组合使用。`released` 只表示本章涉及的非实验对象位于固定基线的发布代码路径，不表示生产就绪；Capability matrix 也不对 Profile、Preset 或 Provider 排名。

Sandbox 行只描述文件系统 effect；Windows ACL 与部分受支持的 Landlock ABI 可能报告 `partial`，而 `danger-full-access` 绕过 confinement。Goal 不是 scheduler，Workflow Worker 不是安全 Sandbox，Session primitives 不是完整 debugger。可选包和实验包的 Availability 均按组合与发布状态明确记录，不能从包目录存在或 Claim confidence 推导。

## 继续阅读

- [专题深挖：注册工具与 Programmatic Tool Calling](deep-dives/tools-and-ptc.md)
- [专题深挖：本地 Sandbox 执行边界](deep-dives/sandbox-execution.md)
- [专题深挖：Subagent、Goal、Plan mode 与 Workflow 的责任边界](deep-dives/subagents-goals-workflows.md)
- [上一章：组合与生命周期架构](02-architecture.md)
- [下一章：差异化机制评估](04-differentiators.md)
- [证据方法](00-methodology.md)
- [术语表](glossary.md)
- [证据反向索引](source-map.md)
