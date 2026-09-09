# 差异化机制评估

基线：DeepSeek Harness commit `76fda729799fe9b3848dbe2c211d4b231032b81e`。

## 一句话结论

以下五项结论都是作者基于固定源码的 `analysis-inference`，用于说明机制、收益、代价与适用场景，不构成产品排序或量化效果比较。

<a id="claim-dsh-diff-001"></a> **Claim `DSH-DIFF-001`:** DeepSeek Harness 的插件替换范围覆盖产品能力组合，而不只覆盖工具注册。

<a id="claim-dsh-diff-002"></a> **Claim `DSH-DIFF-002`:** 生命周期拥有的 Effect 使卸载与重载清理具有明确责任。

<a id="claim-dsh-diff-003"></a> **Claim `DSH-DIFF-003`:** 类型化的 live/durable 事件与 model-visible logging 使行为能够被观察和重建。

<a id="claim-dsh-diff-004"></a> **Claim `DSH-DIFF-004`:** 每 Session 的 Agent Preset 允许同一 Host 承载不同能力组合。

<a id="claim-dsh-diff-005"></a> **Claim `DSH-DIFF-005`:** PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。

## 机制

每项分析采用相同结构。这里的“收益”描述机制允许的选择或可观察结果，不表示对其他系统的相对评价。

### 产品能力组合

#### 机制

Cordis 把模型适配器、工具注册表、Session Event Log 与 Agent loop 都装载为插件。一个完整能力接缝由 Service Definition、Service Provider 与 Consumer 三种角色组成，因此替换 Provider 可以沿稳定 Service 接口影响 Consumer，而不要求只在工具目录中增加一个入口。

#### 收益

同一套组合模型可以覆盖模型路由、Session、Agent loop、工具及其他能力提供者；能力选择由装配决定，扩展点不局限于模型可见工具。

#### 代价与适用场景

该结论比较扩展范围，不声称所有运行中组件都能任意热替换。替换仍受插件依赖、生命周期和具体 Application Profile 的装载方式约束，适用于通过组合选择实现的场景。

### 生命周期拥有的 Effect

#### 机制

插件通过 `ctx.effect()` 或 `ctx.on()` 注册 Service、listener 与其他副作用；Cordis 生命周期保存 disposer，并在插件卸载时撤销这些注册。

#### 收益

副作用的创建者同时登记清理方法，卸载与重载不需要由无关组件猜测清理责任。

#### 代价与适用场景

只有生命周期 API 拥有的副作用获得自动清理关系。直接创建但未登记的计时器、进程或外部资源仍需插件显式管理，因此这一机制适合能够把资源所有权表达为 Effect 的扩展。

### 类型化事件与可重建输入

#### 机制

类型化事件把 durable session、live agent 与 capability 三个事件域分开；Service Definition、Service Provider 与 Consumer 通过声明合并和指定派发模式协作。Session Event Log 则记录送入模型请求的输入，`deriveMessages()` 从该日志投影模型历史。

#### 收益

live 事件提供在途观察与策略拦截，durable Session Event Log 提供跨重载的事实来源；两者配合，使运行行为可被观察，并使已记录的 model-visible 输入可被重建。

#### 代价与适用场景

live 事件不等于 durable log。只存在于进程内事件、但没有进入日志的数据不能从 replay 恢复，因此需要重建的 model-visible 输入必须先定义并记录相应 Session Event。

### 每 Session 的 Agent Preset

#### 机制

每个 Agent 按 Session 选择 Agent Preset，并把自身 Scope 绑定到所选 Preset 的 standing mount。`standard`、`ptc` 与 `cordis` 装载不同能力组合；同一 Preset generation 的插件实例由加入它的 Session 共享，参与插件自行按 Session 保存可变状态，而不是为每个 Session 创建一套插件实例。

#### 收益

同一 Host 可以同时承载不同的 Agent 能力组合，并让每个 Agent 只解析其 Preset Scope 中可见的 prompt、tools 与 services。组合文件变化会为后续 Session 建立新 generation，已经加入的 Session 保留原 generation。

#### 代价与适用场景

组合在 Session 开始 Turn 后固定，不支持对活动会话任意换装工具。服务端在 Turn 已打开或至少一个 Turn 已完成时拒绝选择；只运行 command 或 standalone plugin event 不会打开 Turn，因此 commands-only Session 仍可选择 Preset。该机制适合在对话开始前选择能力集合，不提供活动对话中的任意换装。

### PTC 组合调用

#### 机制

`run_code` 让模型提交一个 TypeScript 程序，并只把当前 Agent 可见的工具 schema 生成成 bindings。每个子调用使用 registry 的共享 staged scheduler 执行 `prepare`、`dispatch`、`finalize` 与 `finish`；公开 `execute` 也经过同一组阶段和 `prepareExecution`，因此两条路径共享 pre-execute policy、guard、dispatch 与结果收尾，而不是由 PTC 直接调用某个字面上的 `registry.execute` 方法。每次运行创建新的 Worker、调度队列、bindings 与取消状态，程序之间不保留运行状态。

#### 收益

一个模型编写的程序可以在一次 `run_code` 中组合多次受保护工具调用，因此可能减少模型与工具之间的往返。子调用仍产生 durable start/settle 记录，工具的并发分类、取消与提交顺序继续由工具执行管线处理。

#### 代价与适用场景

Worker 配置分别限制忙碌计算时间、墙钟时间、外层序列化输出与堆内存；这不表示每个中间值都有独立字节上限。中间程序值只存在于本次执行，不能从 Session replay 重建，也没有 per-value byte cap，因而仍可能耗尽进程或 Worker 内存。Worker 的 trust posture 与 Bash 相当，不提供安全隔离；它还可能留下程序启动的 OS process。PTC 可能减少往返不等于已测得速度、成本或质量提升。

## 证据

五项结论的正式分类、限定与不可变来源由 [`evidence/claims.json`](../evidence/claims.json) 保管；[证据方法](00-methodology.md)说明 `analysis-inference`、`qualified` 与 `released` 的不同含义，[证据反向索引](source-map.md)提供按上游路径查找的入口。

| Claim | 种类 | 证据信心 | DeepSeek Harness 成熟度 | 固定来源 |
|---|---|---|---|---|
| `DSH-DIFF-001` | `analysis-inference` | `qualified` | `released` | [`architecture.md` 第 9–13 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/architecture.md#L9-L13)、[第 103–115 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/architecture.md#L103-L115) |
| `DSH-DIFF-002` | `analysis-inference` | `qualified` | `released` | [`cordis-primer.md` 第 9–45 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/cordis-primer.md#L9-L45) |
| `DSH-DIFF-003` | `analysis-inference` | `qualified` | `released` | [`architecture.md` 第 64–72 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/architecture.md#L64-L72)、[第 103–115 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/architecture.md#L103-L115) |
| `DSH-DIFF-004` | `analysis-inference` | `qualified` | `released` | [`agent-presets/index.ts` 第 1–14 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/src/index.ts#L1-L14)、[第 227–239 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/src/index.ts#L227-L239)、[第 380–426 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/src/index.ts#L380-L426)、[第 610–727 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/src/index.ts#L610-L727)、[第 745–794 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/src/index.ts#L745-L794)；[`standard`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/standard/agent.cordis.yml#L1-L251)、[`ptc`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/ptc/agent.cordis.yml#L1-L271)、[`cordis`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/cordis/agent.cordis.yml#L1-L262) Preset |
| `DSH-DIFF-005` | `analysis-inference` | `qualified` | `released` | [`ptc.ts` 第 282–359 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L282-L359)、[第 387–465 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L387-L465)、[第 479–598 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L479-L598)、[第 608–653 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L608-L653)；[`tools/index.ts` staged scheduler](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L789-L794)、[public execute](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1319-L1352) 与 [shared prepare](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1450-L1488)；[`tools` 限制](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/README.md#L226-L227)；[`worker-thread` runtime](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L12)、[配置](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L42-L49)与[限制](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L141-L146) |

## 限制与适用范围

下表逐字保留 Claim ledger 的限定；这些限定是每项作者推论的一部分，不能从结论中省略。

| Claim | 限定 |
|---|---|
| `DSH-DIFF-001` | 该结论比较扩展范围，不声称所有运行中组件都能任意热替换。 |
| `DSH-DIFF-002` | 只有通过生命周期 API 注册的副作用自动获得这一清理关系。 |
| `DSH-DIFF-003` | live 事件总线本身不持久，重建依赖 durable Session Event Log 中已记录的输入。 |
| `DSH-DIFF-004` | 组合在 Session 开始 Turn 后固定，不支持对活动会话任意换装工具。 |
| `DSH-DIFF-005` | “可能减少往返”描述交互结构，没有量化速度、成本或质量收益。 |

`released` 表示本章引用的机制位于固定基线的发布代码路径，不表示生产就绪。本章没有提供跨产品评分、相对名次或测量结果，也不把 fresh Worker、资源上限或 guard 等同于安全隔离。

## 继续阅读

- [专题深挖：Cordis 插件生命周期](deep-dives/cordis-lifecycle.md)
- [专题深挖：注册工具与 Programmatic Tool Calling](deep-dives/tools-and-ptc.md)
- [上一章：能力与组合归属](03-capabilities.md)
- [下一章：可复现的入门路径](05-getting-started.md)
- [证据方法](00-methodology.md)
- [术语表](glossary.md)
- [证据反向索引](source-map.md)
