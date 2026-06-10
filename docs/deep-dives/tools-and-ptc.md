# 注册工具与 Programmatic Tool Calling

## 基线

本章描述提交 `f3803c96974ad4a94195fb97e5c637e9c2a3afe3` 的工具管线与 Node PTC Provider。

## 一句话结论

<a id="claim-dsh-cap-004"></a> **Claim `DSH-CAP-004`:** 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。

<a id="claim-dsh-diff-005"></a> **Claim `DSH-DIFF-005`:** PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。

“可能减少往返”描述交互结构，没有量化速度、成本或质量收益。

<a id="claim-dsh-dd-tools-001"></a> **Claim `DSH-DD-TOOLS-001`:** 注册工具携带执行与取消元数据，调用依次经过 pre-execute、单调 guard、execute 与 post-execute 阶段，再冻结最终结果。

<a id="claim-dsh-dd-tools-002"></a> **Claim `DSH-DD-TOOLS-002`:** `run_code` 的子调用复用普通工具执行的分阶段受保护管线，保留可见性、审批、排序与日志规则。

<a id="claim-dsh-dd-tools-003"></a> **Claim `DSH-DD-TOOLS-003`:** 内置 Node PTC Provider 为每次运行创建新进程，并分别约束执行期限、输出、控制流量与堆内存。

<a id="claim-dsh-dd-tools-004"></a> **Claim `DSH-DD-TOOLS-004`:** 工具 canonical value、模型 content 与展示 meta 分开；仅替换或脱敏 content 不会撤销 PTC 程序取得 canonical value 的能力。

## 机制

### 注册与执行

`defineTool` 同时声明参数 schema、canonical JSON output 和执行函数；参数在执行前验证。工具只向模型暴露允许的 schema，不把执行函数、收尾函数或内部元数据放进请求；见[模型 schema 投影](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L88-L112)。[工具注册](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L26-L77)

```mermaid
flowchart LR
  Call["durable tool/call"] --> Pre["pre-execute：允许 / 拒绝 / 审批"]
  Pre --> Guard["monotonic guards"]
  Guard --> Exec["execute：工具执行"]
  Exec --> Project["projectContent：执行内容投影"]
  Project --> Post["post-execute：检查 / 替换 / 阻止"]
  Post --> Final["finalizeContent → tools/result"]
  Final --> Result["durable tool/result"]
```

`projectContent` 在 post-execute policy 前安装执行阶段准备的内容，policy 仍可替换或阻止它；`finalizeContent` 在 policy 之后执行最终变换。图是正常委托路径；拒绝、取消或异常可以跳过工具 body。Waterfall 通过 `next()` 委托，guard 的拒绝不能被后续监听器变成许可。`tools/result` 是冻结最终结果的 live 通知，不是 durable `tool/result` 本身。[执行管线](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/docs/tool-execution-pipeline.md#L5-L64)

成功执行的 JSON value 先按 output schema 验证，再分别生成模型 `content` 和可选展示 `meta`；两种投影都会快照。Post policy 可以替换 value、content 或转换为错误，但只改写 content 会保留程序返回值；若策略要阻止程序取得数据，应拒绝执行、转换为失败或替换 value。`presentationMeta` 现在用于 native 与 PTC 子调用，持久化给 Host/Client 展示，不改变模型内容。[值与投影](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/pipeline.ts#L486-L525)、[metadata 生成](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/pipeline.ts#L536-L566)与[工具作者契约](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L27-L37)支持该边界。

### PTC 呈现与值

当前呈现模式只有 `native` 与 `ptc`：前者呈现普通工具 schema，后者只呈现 `run_code` 与生成的 SDK；已移除 `both`。在 `ptc` 模式，模型直接调用其他工具名会在 policy 前得到 `UNKNOWN_TOOL`，程序应通过 `tools.name(args)` bindings 调用。当前绑定捕获工具 schema，子调用仍遵守 scope 可见性、审批与原生并发约定。[当前模式与配置](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L75-L84)与[呈现与 PTC](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/README.md#L52-L64)给出证据。

PTC 运行时服务是 [`ctx.ptcRuntime`](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/README.md#L38-L40)。TypeScript 程序是 async function body，可使用顶层 `await` 和 `return`；仅接受可擦除类型语法。binding 的普通返回值留在程序内；模型主要看到外层结果，成功子调用的图片和子调用附带的 `additionalContexts` 仍会[进入后续模型上下文](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L598-L610)。图片上下文以 `source.kind: ptc-mode` 归因，其他附加上下文保留产生它的工具归因。中间值是执行期数据，不能假定日志保存了完整程序状态。[Provider 使用方式](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L26-L28)；[返回值](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L64-L68)

### 受保护子调用与日志

子调用使用 `prepare → dispatch → finalize / finish` 阶段；开始和 policy 收尾走单条有序通道，只有明确被分类为并发安全的 around-dispatch/body 可以重叠。结果按提交调用的顺序收尾；其他调用形成 exclusive barrier，持续到 post-execute 完成。默认 `maxParallelSubCalls=10`，不会把所有 JavaScript 并发都等同于可并发工具操作。[默认限制](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/config.ts#L4-L13)；[阶段与调度顺序](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L380-L395)

当前 durable 事件是 `tool/ptc-dispatch-start` 与 `tool/ptc-dispatch`。start 保存调用配对 id、工具名和参数；settle 保存渲染 content、可选展示 meta 和结构化错误信息。新子调用 id 使用 `<parent>:ptc:<n>`，消费者按完整 id 配对，不解析其内部含义；历史 id 保留原字节。子调用事件是 log-only，不重复进入模型消息历史。[事件定义](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/types.ts#L11-L61)界定持久化内容。

程序得到 canonical value 后，`tools/ptc-dispatch-log` 可以把持久化 content 改成预览和定位信息；这种日志处理不改变程序值或模型结果。因此程序取值与日志追加是不同的时间点，settle append 作为待结算工作被跟踪，运行结束前会排空；进程硬终止不能据此恢复完整中间值或尚未追加的结算。[子调用值与日志](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L502-L566)与[结束时排空](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L675-L694)说明边界。Session 提交与磁盘 `flush` 耐久性仍分别成立。

### Node 进程、策略与资源

| 约束 | 默认值或行为 | 不代表什么 |
|---|---|---|
| 新程序状态 | 每次启动新的 Node 子进程 | 不支持跨调用保留变量、yield/wait 或自动重放 |
| `timeoutMs` / `maxTimeoutMs` | 120,000 / 600,000 ms，含运行中的嵌套工具及其审批等待 | 不是 CPU 忙碌时间；清理可在期限后继续结算 |
| `maxOutputBytes` | 67,108,864 bytes | 不是所有中间值的内存上限 |
| `maxMessageBytes` | 134,217,728 bytes | 不约束 Host binding 生成结果时的内部内存 |
| `maxPendingCalls` | 128 个 Host binding 请求 | 与工具池的 `maxParallelSubCalls` 不同 |
| `maxOldGenerationSizeMb` | 512 MiB | 不是整个进程或后代进程的 RSS 限额 |
| 文件策略 | 继承 Session Sandbox，批准后可对单次程序放宽 | 不改变会话既有策略，嵌套工具仍保留自己的授权 |

数值是配置默认值而非 benchmark。完整程序的提权审批发生在 runtime 启动之前，不计入 Provider 的 elapsed deadline；见[提权与启动顺序](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L354-L370)和[实际运行调用](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L675-L694)。程序启动前从 `workingDirectory` 捕获 Session 当前 cwd；程序内部的 cwd 保持初值，嵌套目录切换会影响后续工具调用使用的 Session cwd。Agent 所属的 `run_code` 缺少该服务时明确失败。[cwd 解析](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L251-L257)与[程序目录契约](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L25-L29)提供证据。

Provider 在运行前解析 cwd、deadline 和权限，再通过 Sandbox 与 subprocess 服务启动；结束或取消清理可管理的进程范围。`launch` 显式选择 `node-script` 或 `embedded` carrier；远程部署的 executable 与 bootstrap 必须位于 subprocess 的执行环境，不能假定 Host 路径在那里可用。更宽的 `sandbox_permissions` 要求非空理由并提前批准，拒绝后不会自动重新执行可能已产生副作用的程序。[Provider 配置与运行](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L30-L110)、[启动选择](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/src/launch.ts#L7-L62)与[程序授权](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L132)界定责任。

## 源码导读

| 主题 | 固定来源 |
|---|---|
| 普通工具管线 | [工具 README](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L86-L112)；[取消行为](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/README.md#L126-L132) |
| 子调用共享阶段 | [PTC binding](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tool-executor-ptc/src/ptc.ts#L502-L623) |
| 值、内容与展示 | [值与内容替换](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/pipeline.ts#L486-L525)；[native 与 nested metadata](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/pipeline.ts#L536-L566) |
| 新 Node Provider | [启动与通信](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L120-L136) |
| 执行限制 | [默认值](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L47-L110)；[已知限制](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L190-L201) |

## 限制与失败

`DSH-DD-TOOLS-003` 的限定为：期限与堆限制不是进程树 CPU/RSS 上限；文件约束继承所选 Sandbox 的 enforcement，脱离管理范围的后代进程可能无法清理。

直接 Node 文件、网络与进程 API 仍可使用，但受所选 OS 文件策略约束；`danger-full-access` 明确旁路。程序可见的 `process.env` 被清空，也不构成通用凭据隔离证明。需要的 confinement 不可用时失败关闭。[启动环境](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L120-L130)；[限制](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/ptc-runtime/ptc-runtime-node/README.md#L190-L201)

## 继续阅读

- [能力与组合归属](../03-capabilities.md)
- [本地 Sandbox](sandbox-execution.md)
- [证据方法](../00-methodology.md)
- [证据反向索引](../source-map.md)
- [Claim ledger](../../evidence/claims.json)
