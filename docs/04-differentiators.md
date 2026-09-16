# 差异化机制评估

基线：DeepSeek Harness commit `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720`。

## 一句话结论

以下结论均为 `analysis-inference / qualified`。它们分析机制与代价，不为产品排名，也不声称量化性能收益。

<a id="claim-dsh-diff-001"></a> **Claim `DSH-DIFF-001`:** DeepSeek Harness 的插件替换范围覆盖产品能力组合，而不只覆盖工具注册。

<a id="claim-dsh-diff-002"></a> **Claim `DSH-DIFF-002`:** 生命周期拥有的 Effect 使卸载与重载清理具有明确责任。

<a id="claim-dsh-diff-003"></a> **Claim `DSH-DIFF-003`:** 类型化的 live/durable 事件与 model-visible logging 使行为能够被观察和重建。

<a id="claim-dsh-diff-004"></a> **Claim `DSH-DIFF-004`:** 每 Session 的 Agent Preset 允许同一 Host 承载不同能力组合。

<a id="claim-dsh-diff-005"></a> **Claim `DSH-DIFF-005`:** PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。

## 机制

| 机制 | 收益 | 代价与适用场景 |
|---|---|---|
| 产品能力组合 | 模型、会话、工具、循环均可经接口和配置选择实现，而不只是增加工具名 | 仍受依赖、生命周期与应用入口约束；适合需要替换能力提供者的运行系统 |
| 生命周期 Effect | 创建注册的插件同时拥有清理责任 | 未登记的外部资源不会自动撤销；失败的 disposer 也不保证资源已释放 |
| live / durable 分离 | 实时事件更新界面，日志保存模型历史及已结算的响应流 | 进程在结算前丢失，不保证该次流可恢复；不是逐 token 写入 durable log |
| 每 Session Preset | 同一 Host 使用不同工具、提示词和 Agent 侧服务组合 | standing mount 的同代插件共享；插件需按 Session 管理状态；旧代保持到树卸载 |
| PTC 组合调用 | 一个程序内组织多次工具调用、处理执行期中间值 | 程序和工具仍有审批、取消、资源与文件策略限制；往返减少取决于任务 |

### 日志支持重建，但不是逐帧持久化

新版把 `agent/assistant-stream` 的 start/chunk/end 作为 live 事件；结算时，完整 compact stream 嵌入 `assistant/message`，失败、取消或重试的已结算尝试进入仅供日志使用的 `assistant/attempt`。后者不增加模型历史。模型请求仍从日志投影，而不是从界面流倒推。[Session log](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/architecture.md#L107-L125)

### Preset 选择与更新

文件变更为后续 Session 建立新 generation，已经加入的 Session 保留原 generation。会话开启 Turn 或完成过 Turn 后拒绝切换；仅执行 command 而未开启 Turn 不触发该锁定。因此 Preset 适合在对话开始前选择能力，不是任意运行时工具换装。[generation](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/src/index.ts#L409-L418)；[选择门禁](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/src/index.ts#L737-L751)

### PTC 的新执行基础

`run_code` 的 bindings 复用普通工具的 staged scheduler，保留 policy、guard、结果收尾与 durable 子调用记录。当前内置 TypeScript Provider 是 `dsh-ptc-runtime-node`：每次运行启动新的 Node 子进程，应用会话的文件系统 Sandbox 策略，并在结束或取消时清理可管理的进程范围。它不再使用旧手册描述的忙碌计算计时 Worker。[PTC 管线](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L123-L129)；[Node Provider](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L12)

默认 elapsed deadline 为 120 秒、上限 600 秒，包含运行中的嵌套工具及其审批等待，不包含 runtime 启动前的整段程序提权审批；输出、控制帧与 V8 old-generation heap 各有独立限制。它们不是整个进程树的 CPU/RSS 上限。Sandbox 的文件效果限制也不是通用网络隔离，`danger-full-access` 仍是明确旁路。[配置与执行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L46-L74)；[限制](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L137-L144)

## 证据

| Claim | 固定来源 |
|---|---|
| `DSH-DIFF-001` | [全插件与能力接口](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/architecture.md#L9-L13)；[三角色能力接缝](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/architecture.md#L127-L133) |
| `DSH-DIFF-002` | [Effect 与事件](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/cordis-primer.md#L9-L45) |
| `DSH-DIFF-003` | [事件与持久化](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/architecture.md#L107-L125) |
| `DSH-DIFF-004` | [standing composition](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/README.md#L98-L102)；[选择门禁](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/preset/agent-presets/src/index.ts#L737-L751) |
| `DSH-DIFF-005` | [工具内的 PTC](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L123-L129)；[Node 执行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L60-L74) |

## 限制与适用范围

| Claim | 限定 |
|---|---|
| `DSH-DIFF-001` | 该结论比较扩展范围，不声称所有运行中组件都能任意热替换。 |
| `DSH-DIFF-002` | 只有通过生命周期 API 注册的副作用自动获得这一清理关系。 |
| `DSH-DIFF-003` | live 事件总线本身不持久，重建依赖 durable Session Event Log 中已记录的输入。 |
| `DSH-DIFF-004` | 组合在 Session 开始 Turn 后固定，不支持对活动会话任意换装工具。 |
| `DSH-DIFF-005` | “可能减少往返”描述交互结构，没有量化速度、成本或质量收益。 |

普通 native 模式也可一次返回多个工具调用；不能把“native 每次只能调用一个工具”作为 PTC 的优势依据。所有 `released` 成熟度均不表示生产就绪。

## 继续阅读

- [上一章：能力与组合归属](03-capabilities.md)
- [Cordis 插件生命周期](deep-dives/cordis-lifecycle.md)
- [工具与 PTC](deep-dives/tools-and-ptc.md)
- [Sandbox 执行边界](deep-dives/sandbox-execution.md)
- [会话日志](deep-dives/session-event-log.md)
- [可复现上手](05-getting-started.md)
- [证据方法](00-methodology.md)与[反向索引](source-map.md)
