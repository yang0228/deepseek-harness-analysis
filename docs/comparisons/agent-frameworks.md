# Agent 框架机制比较

本章按[固定的七项框架标准](methodology.md)比较 LangGraph、Microsoft AutoGen 与 OpenAI Agents SDK，并把 DSH 对应项限制在固定上游基线已经记录的机制。所有外部页面均于 2026-09-08（Asia/Shanghai）访问；页面没有提供可登记的固定文档版本或不可变 commit，因此来源只记录 publisher 与访问日期。AutoGen 的维护状态来自获准使用的可变 `main` README，不作为不可变 commit 证据。

## LangGraph

<a id="claim-cmp-fw-langgraph-001"></a> **Claim `CMP-FW-LANGGRAPH-001`:** LangGraph 是面向长时、有状态工作流与 Agent 的低层编排框架和运行时，可在同一图中组合确定性步骤与由大模型驱动的步骤。

<a id="claim-cmp-fw-langgraph-002"></a> **Claim `CMP-FW-LANGGRAPH-002`:** LangGraph 的 checkpointer 按 thread 保存图状态检查点，store 保存跨 thread 的应用数据；检查点支持续接、故障恢复、回放与从既有检查点分叉。

<a id="claim-cmp-fw-langgraph-003"></a> **Claim `CMP-FW-LANGGRAPH-003`:** LangGraph 的 `interrupt()` 可在节点内暂停执行并保存状态；调用方以相同 `thread_id` 和 `Command(resume=...)` 恢复时，该节点会从开头重新执行。

| 标准 | 官方事实 | 官方来源 | DSH 对应机制 | 未见官方文档说明 | 作者推论 |
|---|---|---|---|---|---|
| 组合方式 | `StateGraph` 以节点承载步骤、以边连接执行路径；同一图可以组合确定性步骤和由大模型驱动的步骤。 | [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)（LangChain，访问 2026-09-08） | DSH 通过 Cordis 插件和受支持的 Profile 组合应用，[架构概览](../02-architecture.md)记录其装配层。 | — | 两者都能组合 Agent 工作，但图与插件是不同抽象层级。 |
| 可替换能力接口 | 查阅页把节点函数作为图步骤，并允许单独使用 LangGraph 或配合 LangChain 组件。 | [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)（LangChain，访问 2026-09-08） | DSH 的完整能力接缝由 Service Definition、Service Provider 与 Consumer 组成，见[能力与组合归属](../03-capabilities.md)。 | 未见官方文档说明：这些页面没有描述与 DSH 三角色能力接缝对应的替换接口。 | 不把可替换节点实现解释为与 DSH capability Provider 等价。 |
| 生命周期归属 | `interrupt()` 暂停节点时由 checkpointer 保存状态；恢复时节点从开头重新执行。 | [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)（LangChain，访问 2026-09-08） | DSH 由 Cordis Fiber 拥有经生命周期 API 注册的副作用，见 [Cordis 插件生命周期](../deep-dives/cordis-lifecycle.md)。 | 未见官方文档说明：这些页面没有给出插件卸载或 disposer 归属机制。 | 节点恢复语义不能推出插件资源清理语义。 |
| 状态与持久化 | checkpointer 保存 thread 内图状态检查点，store 保存跨 thread 的应用数据；既有检查点可用于恢复、回放和分叉。 | [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)、[Use time-travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel)（LangChain，访问 2026-09-08） | DSH 将 durable Session Event Log、投影和 fork 作为会话机制，见 [Session Event Log 深挖](../deep-dives/session-event-log.md)。 | — | 两者都保存可续接状态，但 LangGraph 图检查点与 DSH 事件日志不是同一种持久化模型。 |
| 工具执行 | 本次指定页面只把工具列为可与图组合的 Agent 组件，没有展开工具调用管线。 | [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)（LangChain，访问 2026-09-08） | DSH 通过共享的受保护工具管线执行普通工具与 PTC，见[注册工具与 PTC](../deep-dives/tools-and-ptc.md)。 | 未见官方文档说明：指定页面没有提供足以与 DSH 工具准备、批准和执行阶段逐项对照的资料。 | 不依据本次来源推断工具执行阶段相同。 |
| 编排 | 图的节点和边定义执行关系；interrupt 允许调用方在保存状态后以相同 thread 恢复。 | [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)、[Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)（LangChain，访问 2026-09-08） | DSH 分别提供 Subagent、Goal、Plan mode 与 Workflow，见[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | LangGraph 以图控制流为中心；DSH 比较的是插件提供的多种编排能力。 |
| 扩展机制 | LangGraph 页面说明它可独立使用，也可配合 LangChain 的模型与工具组件。 | [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)（LangChain，访问 2026-09-08） | DSH 以插件、Bundle、Patch、Preset 和能力 Provider 扩展组合，见[架构概览](../02-architecture.md)与[能力与组合归属](../03-capabilities.md)。 | 未见官方文档说明：指定页面没有列出与 DSH 插件生命周期对应的扩展包机制。 | 集成组件关系不等于 DSH 的全插件应用装配。 |

## Microsoft AutoGen

AutoGen 官方仓库的 `main` README 在访问日将项目标为 maintenance mode，说明不再接收新功能或增强并由社区维护，同时把新用户引向 Microsoft Agent Framework；本节只描述仍由指定 AutoGen 文档公开的机制。

<a id="claim-cmp-fw-autogen-001"></a> **Claim `CMP-FW-AUTOGEN-001`:** AutoGen Core 中，Agent 通过可序列化消息通信，运行时负责直接消息、发布订阅和消息处理器调度。

<a id="claim-cmp-fw-autogen-002"></a> **Claim `CMP-FW-AUTOGEN-002`:** AutoGen AgentChat 提供多种团队预设和终止条件；团队在未调用 `reset()` 时保留对话历史与上下文，并可继续上一次运行。

<a id="claim-cmp-fw-autogen-003"></a> **Claim `CMP-FW-AUTOGEN-003`:** AutoGen 项目维护的 `autogen-ext` 包提供 Agent、模型客户端、工具、代码执行器和 Agent 运行时等组件实现。

| 标准 | 官方事实 | 官方来源 | DSH 对应机制 | 未见官方文档说明 | 作者推论 |
|---|---|---|---|---|---|
| 组合方式 | AutoGen Core 的 Agent 以可序列化消息通信，运行时负责投递和处理器调度；AgentChat 将多个 Agent 组成团队。 | [Message and Communication](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html)、[Teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html)（Microsoft，访问 2026-09-08） | DSH 以 Cordis 插件和 Profile 组合应用，并通过 capability Consumer 使用 Provider，见[架构概览](../02-architecture.md)。 | — | AutoGen 的消息运行时和团队不是 DSH 的插件装配层。 |
| 可替换能力接口 | `autogen-ext` 按 Agent、模型客户端、工具、执行器和 Agent runtime 提供组件实现。 | [Extensions](https://microsoft.github.io/autogen/stable/user-guide/extensions-user-guide/index.html)（Microsoft，访问 2026-09-08） | DSH 用 Service Definition、Service Provider 与 Consumer 明确一个完整能力接缝，见[能力与组合归属](../03-capabilities.md)。 | 未见官方文档说明：指定页面没有把这些组件表述为与 DSH 三角色能力接缝相同的替换接口。 | 组件分类显示扩展点，但不证明两个项目的依赖解析和替换规则相同。 |
| 生命周期归属 | runtime 在投递首条消息时创建 Agent 实例；团队的 `reset()` 清除团队及其 Agent 状态。 | [Message and Communication](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html)、[Teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html)（Microsoft，访问 2026-09-08） | DSH 由 Cordis Fiber 管理登记的 Effect 和 disposer，见 [Cordis 插件生命周期](../deep-dives/cordis-lifecycle.md)。 | 未见官方文档说明：指定页面没有描述与 DSH 插件卸载清理相同的所有权规则。 | Agent 创建和团队重置不能代替插件副作用归属比较。 |
| 状态与持久化 | 团队默认在运行之间保留对话历史与上下文；`reset()` 清除状态；不提供新 task 的再次运行可从上次停止处继续。 | [Teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html)（Microsoft，访问 2026-09-08） | DSH 通过 Session Event Log 保存 durable 事实，并由投影和 fork 生成会话视图，见 [Session Event Log 深挖](../deep-dives/session-event-log.md)。 | 未见官方文档说明：该团队页没有说明这些内存状态是否构成跨进程耐久存储。 | 团队连续运行与 DSH durable Session 不作等价解释。 |
| 工具执行 | `autogen-ext` 提供工具和代码执行器实现；Core 运行时通过消息投递触发 Agent 处理器。 | [Extensions](https://microsoft.github.io/autogen/stable/user-guide/extensions-user-guide/index.html)、[Message and Communication](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html)（Microsoft，访问 2026-09-08） | DSH 的普通工具和 PTC 共用准备、批准与执行管线，见[注册工具与 PTC](../deep-dives/tools-and-ptc.md)。 | 未见官方文档说明：指定页面没有给出足以逐阶段对照 DSH 工具管线的执行契约。 | 执行器组件的存在不证明调用管线相同。 |
| 编排 | Core 支持直接消息和基于 topic/subscription 的发布；AgentChat 提供 round-robin、selector、Magentic-One 与 swarm 团队预设和终止条件。 | [Message and Communication](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html)、[Teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html)（Microsoft，访问 2026-09-08） | DSH 将 Subagent、Goal、Plan mode 与 Workflow 分为不同责任，见[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | AutoGen 以消息和团队协调 Agent；DSH 的对应项是多个独立插件能力。 |
| 扩展机制 | `autogen-ext` 包含项目维护的组件实现；官方 `main` README 把 AutoGen 标为 maintenance mode。 | [Extensions](https://microsoft.github.io/autogen/stable/user-guide/extensions-user-guide/index.html)、[AutoGen README](https://github.com/microsoft/autogen/blob/main/README.md?plain=1)（Microsoft，访问 2026-09-08；README 位于可变 `main`） | DSH 通过插件、Provider、Bundle、Patch 和 Preset 扩展或重组应用，见[架构概览](../02-architecture.md)。 | — | 当前维护状态限制这份比较的时效，不改变指定页面对既有机制的描述。 |

## OpenAI Agents SDK

以下事实仅使用官方 OpenAI 文档中获准的 Agents SDK 页面，不使用 SDK 仓库或其他主机作为证据。

<a id="claim-cmp-fw-openai-001"></a> **Claim `CMP-FW-OPENAI-001`:** OpenAI Agents SDK 以 Agent 封装模型、指令及可选的工具、护栏、MCP、交接和结构化输出，并由运行器执行包含模型调用、工具调用和交接的 Agent 循环。

<a id="claim-cmp-fw-openai-002"></a> **Claim `CMP-FW-OPENAI-002`:** OpenAI Agents SDK 把工具作为 Agent 的可选能力，并允许管理 Agent 将其他 Agent 作为受限工具调用，同时保留最终答复的控制权。

<a id="claim-cmp-fw-openai-003"></a> **Claim `CMP-FW-OPENAI-003`:** OpenAI Agents SDK 支持由应用保存历史、由 Session 持久化状态或复用服务端标识来续接下一轮，并用 tracing 记录工具与交接等调用以辅助调试审批流程。

<a id="claim-cmp-fw-openai-004"></a> **Claim `CMP-FW-OPENAI-004`:** OpenAI Agents SDK 以 handoff 或 agents-as-tools 组织多 Agent 工作流，并以输入、输出和工具护栏及人工审批决定运行继续、暂停或停止。

| 标准 | 官方事实 | 官方来源 | DSH 对应机制 | 未见官方文档说明 | 作者推论 |
|---|---|---|---|---|---|
| 组合方式 | Agent 封装模型、指令和可选运行能力；Runner 循环处理模型输出、工具调用、handoff 与最终结果。 | [Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)、[Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)（OpenAI，访问 2026-09-08） | DSH 通过 Cordis 插件和 Profile 组合 Agent 应用，见[架构概览](../02-architecture.md)。 | — | Agent/Runner 是工作流运行抽象，DSH 的比较重点是插件组合和能力接口。 |
| 可替换能力接口 | 工具、MCP servers、handoffs、guardrails 与 structured outputs 都是 Agent 的可选配置；manager 可把 specialist Agent 作为受限工具调用。 | [Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)、[Orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)（OpenAI，访问 2026-09-08） | DSH 的 Service Definition、Provider 与 Consumer 共同定义可替换能力接缝，见[能力与组合归属](../03-capabilities.md)。 | 未见官方文档说明：指定页面没有把 Agent 配置项定义为与 DSH 三角色能力接缝相同的 Provider 解析机制。 | 可选 Agent 能力与 DSH Provider 替换是不同层级的扩展。 |
| 生命周期归属 | Runner 在一次应用 turn 内循环，直到返回最终结果、发生失败或因审批暂停。 | [Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)、[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)（OpenAI，访问 2026-09-08） | DSH 由 Cordis Fiber 拥有并清理由生命周期 API 登记的 Effect，见 [Cordis 插件生命周期](../deep-dives/cordis-lifecycle.md)。 | 未见官方文档说明：获准页面没有列出 per-Agent lifecycle hook API、回调顺序或 disposer 归属。 | Runner 的单次运行生命周期不能替代 DSH 插件资源生命周期比较。 |
| 状态与持久化 | 下一轮可复用应用保存的 history、由 Session 加载并持久化的历史、`conversationId` 或 `previousResponseId`；审批暂停返回可恢复 state。 | [Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)、[Results and state](https://developers.openai.com/api/docs/guides/agents/results)（OpenAI，访问 2026-09-08） | DSH 以 durable Session Event Log、投影和 fork 管理会话，见 [Session Event Log 深挖](../deep-dives/session-event-log.md)。 | — | 两者都提供续接表面，但 SDK 的多种 continuation strategy 与 DSH 事件日志机制不等价。 |
| 工具执行 | Runner 执行模型产生的工具调用后继续循环；工具护栏检查函数工具的输入或结果，人工审批可在敏感工具产生副作用前暂停。 | [Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)、[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)（OpenAI，访问 2026-09-08） | DSH 的工具准备、批准与执行共用受保护管线，PTC 复用同一管线，见[注册工具与 PTC](../deep-dives/tools-and-ptc.md)。 | — | 两者都有工具控制点，但本比较不推断控制点的实现或安全属性相同。 |
| 编排 | handoff 把控制权转给 specialist；agents-as-tools 让 manager 调用受限 specialist 并保留最终答复所有权；guardrails 与审批决定运行继续、暂停或停止。 | [Orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)、[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)（OpenAI，访问 2026-09-08） | DSH 的 Subagent、Goal、Plan mode 与 Workflow 分别负责委派、持续目标、计划记录和工作流执行，见[编排责任边界](../deep-dives/subagents-goals-workflows.md)。 | — | Agents SDK 以 Agent 所有权转移或嵌套调用组织工作；DSH 对应的是多种可组合插件能力。 |
| 扩展机制 | Agent 可接入工具和 MCP；内置 tracing 记录模型、工具、handoff、guardrail 与 custom span，并可用于调试审批流程。 | [Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)、[Integrations and observability](https://developers.openai.com/api/docs/guides/agents/integrations-observability)（OpenAI，访问 2026-09-08） | DSH 通过插件和 capability Provider 扩展，并以 durable/live 事件记录模型可见行为，见[架构概览](../02-architecture.md)。 | 未见官方文档说明：获准页面没有提供与 DSH Bundle、Patch 和 Preset 相同的应用装配机制。 | 工具、MCP 与 tracing 扩展运行能力，但不等同于 DSH 的应用级插件重组。 |

## 与 DSH 的限定比较

<a id="claim-cmp-analysis-fw-001"></a> **Claim `CMP-ANALYSIS-FW-001`:** 三个框架都提供 Agent 编排，但主要组合单位不同：LangGraph 以图和持久化状态为中心，AutoGen 以消息运行时和团队为中心，OpenAI Agents SDK 以 Agent、运行器、工具和交接为中心；DSH 的比较重点是 Cordis 插件生命周期与可替换能力接口。

这是基于各项目公开抽象与 DSH 已记录架构所作的跨项目归纳，不代表实现等价或完整内部架构比较。

因此，本章只对照公开机制：图与检查点、消息 runtime 与团队、Agent 与 Runner，以及 DSH 的 Cordis 生命周期和能力接缝。表格中的 `未见官方文档说明` 只表示指定来源在访问日没有给出足够信息，不表示对应框架不支持该能力。

## 继续查阅

- [比较方法](methodology.md)
- [编码 Agent 产品表面比较](coding-agent-products.md)
- [证据反向索引](../source-map.md)
- [架构概览](../02-architecture.md)
