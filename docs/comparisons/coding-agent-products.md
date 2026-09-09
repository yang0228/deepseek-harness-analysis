# 编码 Agent 产品表面比较

本章按[固定的六项产品标准](methodology.md)比较 Claude Code 与 OpenAI Codex，并把 DSH 对应项限制在固定上游基线已记录的用户或集成表面。所有外部页面均于 2026-09-08（Asia/Shanghai）访问；页面没有提供可登记的固定文档版本或不可变 commit，因此来源只记录 publisher 与访问日期。

## Claude Code

<a id="claim-cmp-prod-claude-001"></a> **Claim `CMP-PROD-CLAUDE-001`:** Claude Code 以工具和 MCP 接入操作及外部服务，以 Skills 承载按需知识与工作流，并用 Plugins 打包 Skills、Hooks、Subagents 和 MCP servers。

<a id="claim-cmp-prod-claude-002"></a> **Claim `CMP-PROD-CLAUDE-002`:** Claude Code Hooks 在工具执行、会话边界、提示提交、权限请求和压缩等生命周期事件触发外部处理，所有匹配来源的 Hooks 都会运行。

<a id="claim-cmp-prod-claude-003"></a> **Claim `CMP-PROD-CLAUDE-003`:** Claude Code 的权限规则与权限模式共同决定工具调用被允许、拒绝还是请求批准，规则可来自管理、用户、项目和本地配置层。

<a id="claim-cmp-prod-claude-004"></a> **Claim `CMP-PROD-CLAUDE-004`:** Claude Code Subagents 在独立上下文中执行任务并向父会话返回结果；Claude Agent SDK 将 Agent 循环、工具和上下文管理能力提供给应用代码。

| 标准 | 官方事实 | 官方来源 | DSH 对应表面 | 未见官方文档说明 | 作者推论 |
|---|---|---|---|---|---|
| 工具与 hook 扩展 | 内置工具执行文件、搜索、命令和 Web 操作；MCP 接入外部服务，Skills 按需加载知识与工作流，Plugins 打包 Skills、Hooks、Subagents 和 MCP servers。Hooks 来自不同设置层时合并，所有匹配处理器会运行；同一 handler 在多个 settings file 重复定义时只运行一次，plugin 或 skill 的副本仍独立。同步 handler 有 timeout，`async` command hook 不等待完成且不强制该 timeout。 | [Extend Claude Code](https://code.claude.com/docs/en/features-overview)、[Tools reference](https://code.claude.com/docs/en/tools-reference)、[MCP](https://code.claude.com/docs/en/mcp)、[Settings](https://code.claude.com/docs/en/configuration)、[Hooks guide](https://code.claude.com/docs/en/hooks-guide)、[Hooks reference](https://code.claude.com/docs/en/hooks)（Anthropic，访问 2026-09-08） | DSH 把模型可见 schema 与执行元数据登记到工具管线，并以插件提供 Web、Skill、Workflow 等能力，见[注册工具与 PTC](../deep-dives/tools-and-ptc.md)。 | — | 两者都公开工具与扩展入口，但 Claude Code 的成品扩展组合不等同于 DSH 的 Cordis 插件生命周期。 |
| 执行策略 | 权限规则按工具与输入匹配 allow、ask 或 deny，权限模式改变工具调用的批准方式；任一层的 deny 先于 allow，managed settings 优先级最高。 | [Configure permissions](https://code.claude.com/docs/en/permissions)（Anthropic，访问 2026-09-08） | DSH 的本地 Sandbox 只约束文件系统副作用，不承诺通用网络、进程或凭据隔离；Windows ACL 与部分 Landlock 可报告 `partial`，`sdk-minimal` 还显式使用 `danger-full-access`，见[本地 Sandbox 执行边界](../deep-dives/sandbox-execution.md)。 | 未见官方文档说明：指定页面没有描述与 DSH `full`/`partial` enforcement 相同的结果分类。 | 权限规则与 DSH 文件系统 confinement 解决的问题有交集，但不证明保护范围或安全强度相同。 |
| 会话恢复 | `SessionStart` hook 在会话开始或恢复时触发，并区分 `startup`、`resume`、`clear`、`compact` 和 `fork` 来源。 | [Hooks guide](https://code.claude.com/docs/en/hooks-guide)、[Hooks reference](https://code.claude.com/docs/en/hooks)（Anthropic，访问 2026-09-08） | DSH 以 durable Session Event Log、投影和 fork 表达会话状态，见 [Session Event Log 深挖](../deep-dives/session-event-log.md)。 | 未见官方文档说明：指定 Claude Code 页面没有给出可与 DSH durable 事件日志对照的会话持久化数据模型。 | 恢复事件的存在不能推出隐藏的保存或重放实现。 |
| 委托 | Subagent 在自己的上下文、系统提示、工具和权限中执行，并把结果返回主会话；非 fork subagent 默认不看到父会话历史。 | [Create custom subagents](https://code.claude.com/docs/en/sub-agents)（Anthropic，访问 2026-09-08） | DSH 将 Subagent Provider 与 model-facing Consumer 分开，Standard 只默认启用进程内 spawn/fork，见[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | 两者都提供委托，但上下文初始化和 Provider 组合不作等价解释。 |
| UI 表面 | 同一类 hook 事件在终端、IDE 扩展、桌面应用和 Claude Code on the web 中触发；云端会话不读取本地用户 settings file。 | [Hooks reference](https://code.claude.com/docs/en/hooks)（Anthropic，访问 2026-09-08） | DSH 的 `web`、`headless` 和 `sdk` 等应用入口由 Profile 组合，见[架构概览](../02-architecture.md)与[可复现的入门路径](../05-getting-started.md)。 | 未见官方文档说明：指定页面没有对这些客户端的全部交互与会话能力作统一目录。 | 本行只比较公开入口，不把同一 hook 事件集解释为客户端完全等价。 |
| SDK 与自动化访问 | Claude Agent SDK 可从文件系统加载项目指令、Skills、Hooks 和 Subagents；Hooks 在指定生命周期事件触发外部处理。 | [Claude Code features in the SDK](https://code.claude.com/docs/en/agent-sdk/claude-code-features)、[Hooks guide](https://code.claude.com/docs/en/hooks-guide)（Anthropic，访问 2026-09-08） | DSH 以 `sdk` 与 `sdk-minimal` Profile 通过 stdio JSON-RPC 提供 SDK 运行时，其 wire 与执行限制见[能力与组合归属](../03-capabilities.md)和[可复现的入门路径](../05-getting-started.md)。 | 未见官方文档说明：指定 Claude Code 页面没有提供独立定时任务管理界面的说明。 | SDK 与 hook 构成程序化和事件驱动入口，但不表示它们拥有与 DSH Workflow 相同的调度模型。 |

## OpenAI Codex

以下事实仅使用 `learn.chatgpt.com` 上指定的官方 OpenAI 页面；页面内部导航或示例中的其他主机不作为本章证据。

<a id="claim-cmp-prod-codex-001"></a> **Claim `CMP-PROD-CODEX-001`:** OpenAI 的编码任务入口包括 ChatGPT 桌面应用中的 Codex、Codex CLI、IDE 扩展与 Codex cloud，各入口覆盖不同的本地或云端工作流。

<a id="claim-cmp-prod-codex-002"></a> **Claim `CMP-PROD-CODEX-002`:** OpenAI Codex 通过配置文件、`AGENTS.md`、Skills、Plugins、Hooks 与 MCP 调整指令、工具连接和工作流。

<a id="claim-cmp-prod-codex-003"></a> **Claim `CMP-PROD-CODEX-003`:** 在本地执行中，OpenAI Codex 以 sandbox policy 限制文件系统和命令执行，并以独立的 approval policy 决定何时请求用户授权。

<a id="claim-cmp-prod-codex-004"></a> **Claim `CMP-PROD-CODEX-004`:** Codex 提供 Subagents、非交互模式、SDK 与 App Server，用于任务委托和程序化集成；定时任务通过 ChatGPT 桌面应用或网页端管理。

| 标准 | 官方事实 | 官方来源 | DSH 对应表面 | 未见官方文档说明 | 作者推论 |
|---|---|---|---|---|---|
| 工具与 hook 扩展 | `config.toml` 和项目配置控制行为与 `AGENTS.md` 发现；MCP 提供工具连接，Skills 打包指令、资源和可选脚本，Plugins 可打包 Skills 与 MCP server，Hooks 在 Codex 生命周期中运行脚本或 MCP 工具。 | [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)、[MCP](https://learn.chatgpt.com/docs/extend/mcp)、[Hooks](https://learn.chatgpt.com/docs/hooks)、[Build skills](https://learn.chatgpt.com/docs/build-skills)、[Build plugins](https://learn.chatgpt.com/docs/build-plugins)（OpenAI，访问 2026-09-08） | DSH 的指令、工具 schema、Provider 和执行管线分属可组合插件，见[能力与组合归属](../03-capabilities.md)与[注册工具与 PTC](../deep-dives/tools-and-ptc.md)。 | — | Codex 的产品配置和通用插件目录不等于 DSH 的 Application Profile 和 capability Provider 解析。 |
| 执行策略 | 本地桌面应用、CLI 与 IDE 扩展里的命令在受限环境中运行；sandbox policy 定义技术限制，approval policy 独立决定何时停止并请求授权。 | [Sandbox](https://learn.chatgpt.com/docs/sandboxing)、[Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)（OpenAI，访问 2026-09-08） | DSH 的本地 Sandbox 只约束文件系统副作用，不承诺通用网络、进程或凭据隔离；Windows ACL 与部分 Landlock 可报告 `partial`，`danger-full-access` 明确绕过 confinement，见[本地 Sandbox 执行边界](../deep-dives/sandbox-execution.md)。 | 未见官方文档说明：指定 OpenAI 页面没有将其模式与 DSH `full`/`partial` enforcement 或平台 Provider 逐项对照。 | 两者都显式区分自主执行与越界决策，但本行不推断保护范围或安全强度相同。 |
| 会话恢复 | Codex SDK 可启动、续接和恢复本地 thread；App Server 向客户端提供 conversation history 与串流 Agent 事件；桌面应用的 Projects 与搜索表面用于组织和查找 chat。 | [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)、[App Server](https://learn.chatgpt.com/docs/app-server)、[Projects and chats](https://learn.chatgpt.com/docs/projects)（OpenAI，访问 2026-09-08） | DSH 以 durable Session Event Log、投影和 fork 管理会话，见 [Session Event Log 深挖](../deep-dives/session-event-log.md)。 | 未见官方文档说明：指定 OpenAI 页面没有公开各客户端后面的完整持久化实现。 | 续接 API 和可见 chat 管理与 DSH 事件日志是不同层级的会话表面。 |
| 委托 | ChatGPT Work 与 Codex 可并行生成专用 Subagents 并汇总结果；Codex cloud 为任务分配独立云端环境并允许并行后台工作。 | [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[Codex cloud](https://learn.chatgpt.com/docs/cloud)（OpenAI，访问 2026-09-08） | DSH 默认的 Standard Preset 启用进程内 spawn/fork，外部 Codex、Claude Code 与其他 Provider 需额外组合，见[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | Subagent 与 cloud 任务是两种委托表面，不证明与 DSH Provider 的调度或通信实现相同。 |
| UI 表面 | ChatGPT 桌面应用中可选 Codex 并打开项目或文件夹；CLI 面向本地终端循环，IDE 扩展使用编辑器上下文，Codex cloud 在独立云端环境中运行并行任务。 | [ChatGPT desktop app](https://learn.chatgpt.com/docs/app)、[Codex CLI](https://learn.chatgpt.com/docs/codex/cli)、[Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide)、[Codex cloud](https://learn.chatgpt.com/docs/cloud)（OpenAI，访问 2026-09-08） | DSH 把 Web、Headless 与 SDK 等应用入口组合成受支持的 Profile，见[架构概览](../02-architecture.md)与[可复现的入门路径](../05-getting-started.md)。 | — | 本行只比较可见入口及其工作位置，不推断客户端内部结构或功能对等。 |
| SDK 与自动化访问 | `codex exec` 支持管线与机器可读输出；SDK 程序化控制本地 Codex Agent，App Server 为客户端提供认证、对话历史、批准和事件；定时任务在 ChatGPT 网页端或桌面应用创建与管理，CLI 和 IDE 扩展不提供 Scheduled 管理界面。 | [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)、[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)、[App Server](https://learn.chatgpt.com/docs/app-server)、[Scheduled tasks](https://learn.chatgpt.com/docs/automations)（OpenAI，访问 2026-09-08） | DSH 的 SDK Profile 提供 stdio JSON-RPC，Workflow 以 worker thread 运行编排程序但不是调度器，见[能力与组合归属](../03-capabilities.md)和[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | 命令行自动化、SDK/App Server 集成与定时任务管理是不同表面，不应合并为一种调度实现。 |

## 与 DSH 的限定比较

<a id="claim-cmp-analysis-prod-001"></a> **Claim `CMP-ANALYSIS-PROD-001`:** Claude Code 与 OpenAI Codex 的官方材料主要描述成品编码 Agent 的用户、扩展和安全界面，而 DSH 是可组合的 Agent 运行时；因此可比单位是工具、执行策略、会话与委托表面，而不是隐藏实现或总体优劣。

这是基于公开产品表面与 DSH 已记录架构所作的跨层比较，不代表隐藏实现、性能、成本或质量结论。

因此，本章只对照公开的工具、执行策略、会话恢复、委托、UI 与程序化入口。表格中的 `未见官方文档说明` 只表示指定来源在访问日没有给出足够信息，不表示产品不支持该能力。

## 继续查阅

- [比较方法](methodology.md)
- [Agent 框架机制比较](agent-frameworks.md)
- [证据反向索引](../source-map.md)
- [架构概览](../02-architecture.md)
