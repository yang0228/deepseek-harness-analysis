# 术语表

本页把手册的中文用词映射到上游使用的 canonical English term。定义用于区分组合层级和生命周期，不代替后续章节的实现证据。

## 中英文对照

| 中文术语 | Canonical English term | 本手册中的定义 |
|---|---|---|
| Agent 执行框架 | Agent Harness | 围绕模型组织工具、上下文、会话与执行生命周期的运行系统。 |
| Cordis | Cordis | DeepSeek Harness 的底层插件框架；插件通过共享 context 贡献 Service、Event 和可逆 Effect。 |
| 插件 | Plugin | 装载到 Cordis 树中的组合单元，可注册 Service、Event listener 或 Effect。 |
| 效果 | Effect | 由插件生命周期拥有的副作用注册；插件卸载时按所属关系撤销。 |
| 服务定义 | Service Definition | 声明能力接口、`ctx.<key>` 与共享类型的 Cordis Service 角色。 |
| 服务提供者 | Service Provider | 实现 Service Definition 并向 context 提供具体能力的角色。 |
| 消费者 | Consumer | 注入并使用 Service 的角色，常见形式是面向模型的工具。 |
| 事件 | Event | 按名称派发的扩展点；会话事件记录持久事实，Agent 和 capability 事件处理运行中协作。 |
| 瀑布事件 | Waterfall | 将 `next()` 续函数交给 listener 的事件模式；listener 必须调用 `next()` 才继续下游，不调用则截断链。 |
| 应用 Profile | Application Profile | 由 `dsh` launcher 启动的命名应用组合；它按顺序叠加 Bundle，并携带自身 Patch。 |
| 组合包 | Bundle | 分发 Cordis 配置行与其插件代码的 package，通过 manifest 指向自己的 Patch 文件。 |
| 补丁层 | Patch | 按层应用的配置修改；可按 id 替换一行的整个 config，或插入新行。 |
| Agent 预设 | Agent Preset | 为单个会话固定工具、prompt section、Skill 与作用域 Service 的插件组合。 |
| 作用域 | Scope | 以一个 Agent 为 key 的注册单元，同时控制注册的可见性与生命期；子 Agent 不自动继承父作用域。 |
| 会话事件日志 | Session Event Log | 按追加顺序保留持久会话事件的记录，是模型历史、恢复、转录与回放的源数据。 |
| 投影 | Projection | 将已提交会话事件递增 fold 为按 key 命名的类型状态，供 Host 或 Client carrier 读取。 |
| 程序化工具调用 | Programmatic Tool Calling (PTC) | 将工具以 SDK 形式提供给模型编写的 TypeScript 程序，使一个程序可组合多步调用；本术语不承诺速度、成本或质量改善。 |
| 目标 | Goal | 附着在现有会话上的单个持久完成目标；它是状态，不是 scheduler 或独立会话。 |
| 工作流 | Workflow | 由 Workflow Engine 执行的有界程序化编排，一次 run 可调度子 Agent 并产生结果；其 VM 不是安全隔离层；当前文件约束由共享 PTC Node Provider 与所选 Sandbox 实施。 |
| 官方事实 | Documented fact | 官方一手资料明示的外部对象事实；比较行同时给出来源与访问日期。 |
| 限定事实 | Qualified fact | 只有连同版本、平台、配置、查阅范围或其他适用条件才成立的事实。 |
| 未见官方文档说明 | Unavailable information | 在列明的官方资料和访问日期中未找到充分说明；不等于“不支持”。 |
| 作者推论 | Author inference | 作者依据已列证据作出的解释，与官方事实分列展示。 |
| 非排名比较 | Non-ranking comparison | 按固定标准并列证据和差异，不计算分数、胜者、排名或 benchmark 的比较方法。 |

## Profile 与 Agent Preset

Profile 决定一个 `dsh` 应用如何启动，Agent Preset 决定一个会话内的 Agent 获得哪些能力。两者不是同一层的别名。

| 层级 | 精确 id | 用途 |
|---|---|---|
| Application Profile | `web` | 启动浏览器应用，叠加 `dsh-base` 与 Web 应用 Bundle，并实时重载用户 Patch。 |
| Application Profile | `headless` | 启动无 server 的一次性任务运行器，在启动时应用 Patch。 |
| Application Profile | `sdk` | 启动 SDK JSON-RPC server，在启动时应用 Patch。 |
| Application Profile | `sdk-minimal` | 启动由独立 Bundle 拥有的显式最小 SDK 树，不叠加 `dsh-base`。 |
| Application Profile | `acp` | 启动仅用于自动化的 ACP server，在启动时应用 Patch。 |
| Agent Preset | `standard` | 为会话提供文件编辑、Shell、文件与 Web 检索、Skill、Plan、Goal、子 Agent 和 Workflow。 |
| Agent Preset | `minimal` | 为会话仅提供一个持久 Shell，不再包括 `str_replace_editor`；Shell [在 POSIX 上选择 bash、在 Windows 上选择 pwsh](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/presets/minimal/agent.cordis.yml#L1-L7)，对应的条件行分别见 [bash 第 30–40 行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/presets/minimal/agent.cordis.yml#L30-L40)和 [pwsh 第 50–61 行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/presets/minimal/agent.cordis.yml#L50-L61)。 |
| Agent Preset | `ptc` | 通过 PTC SDK 呈现工具；默认禁用 Workflow engine、通用 Workflow tool 与 Ralph。 |
| Agent Preset | `cordis` | 在 Standard 能力之上加入 runtime inspection、plugin experiment 和 preset-authoring guidance，用于创建自定义 Agent Preset。 |

固定上游 UI 英文 locale 将 `ptc` 显示为 PTC mode，将 `cordis` 显示为 Creator mode。这两个显示名称来自 [UI locale 第 36–47 行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-agent-preset/src/client/locales.ts#L36-L47)，不是从中文 `preset.yml` 元数据推断出的 id。不要把旧称“Code”写成 `code` Preset id；当前权威 id 是 `ptc` 和 `cordis`。

Desktop 使用保留的 `profiles/desktop` 插件区域与独立 Host，但不属于 `PROFILE_TEMPLATES` 中的第六行。会话 live stream、持久化 settlement 与格式 migration 的区别见[Session 专题](deep-dives/session-event-log.md)。

## 来源

- [上游架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/architecture.md#L15-L53)
- [上游术语表](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/glossary.md#L7-L45)
- [上游 Profile 声明](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/boot/app-boot/src/profile.ts#L139-L160)

## 继续查阅

- [证据方法](00-methodology.md)
- [证据反向索引](source-map.md)
- [比较方法](comparisons/methodology.md)
