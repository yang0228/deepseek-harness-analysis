# 注册工具与 Programmatic Tool Calling

## 基线

本章描述提交 `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720` 的工具管线与 Node PTC Provider；不把旧 Worker 的限制迁移为新 Provider 的保证。

## 一句话结论

<a id="claim-dsh-cap-004"></a> **Claim `DSH-CAP-004`:** 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。

<a id="claim-dsh-diff-005"></a> **Claim `DSH-DIFF-005`:** PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。

“可能减少往返”描述交互结构，没有量化速度、成本或质量收益。

<a id="claim-dsh-dd-tools-001"></a> **Claim `DSH-DD-TOOLS-001`:** 注册工具携带策略与取消元数据，依次经过 pre-execute、provider execute 与 post-execute Waterfall。

<a id="claim-dsh-dd-tools-002"></a> **Claim `DSH-DD-TOOLS-002`:** `run_code` 的子调用复用普通工具执行的分阶段受保护管线，而不是绕过它。

<a id="claim-dsh-dd-tools-003"></a> **Claim `DSH-DD-TOOLS-003`:** 内置 Node PTC Provider 为每次运行创建新进程，并分别约束执行期限、输出、控制流量与堆内存。

## 机制

### 注册与执行

`defineTool` 同时声明参数 schema、canonical JSON output 和执行函数；参数在执行前验证。工具只向模型暴露允许的 schema，不把执行函数、收尾函数或内部元数据放进请求；见[模型 schema 投影](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L81-L103)。[工具注册](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L26-L64)

```mermaid
flowchart LR
  Call["durable tool/call"] --> Pre["pre-execute：允许 / 拒绝 / 审批"]
  Pre --> Guard["monotonic guards"]
  Guard --> Exec["execute：工具执行"]
  Exec --> Post["post-execute：结果整理"]
  Post --> Final["finalizeContent → tools/result"]
  Final --> Result["durable tool/result"]
```

图是正常委托路径；拒绝、取消或异常可以跳过工具 body。Waterfall 通过 `next()` 委托，guard 的拒绝不能被后续监听器变成许可。`tools/result` 是冻结最终结果的 live 通知，不是 durable `tool/result` 本身。[执行管线](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/docs/tool-execution-pipeline.md#L6-L60)

### PTC 呈现与值

`native` 呈现普通工具 schema；`ptc` 只呈现 `run_code` 与生成的 SDK；`both` 同时呈现两者。在 `ptc` 模式，模型直接调用其他工具名会在 policy 前得到 `UNKNOWN_TOOL`，程序应通过 `tools.name(args)` bindings 调用。当前绑定捕获工具 schema，子调用仍遵守 scope 可见性、审批与原生并发约定。[呈现与 PTC](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L123-L129)

PTC 运行时服务改为 [`ctx.ptcRuntime`](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L74-L77)。TypeScript 程序是 async function body，可使用顶层 `await` 和 `return`；仅接受可擦除类型语法。binding 的普通返回值留在程序内；模型主要看到外层结果，成功子调用的图片和子调用附带的 `additionalContexts` 仍会[进入后续模型上下文](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L632-L646)。中间值是执行期数据，不能假定日志保存了完整程序状态。[Provider 使用方式](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L26-L28)；[返回值](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L60-L64)

### 受保护子调用与日志

子调用使用 `prepare → dispatch → finalize / finish` 阶段；只有明确被分类为并发安全的 body 可以重叠，其他调用形成 exclusive barrier。默认 `maxParallelSubCalls=10`，不会把所有 JavaScript 并发都等同于可并发工具操作。[默认限制](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/index.ts#L778-L794)；[调度](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L418-L488)

当前 durable 事件是 `tool/ptc-dispatch-start` 与 `tool/ptc-dispatch`，不再使用旧的 `tool/code-dispatch*` 名称。start 保存调用配对 id、工具名和参数；settle 保存渲染 content 和错误信息。程序得到 canonical value 与日志持久化 rendered content 是不同的时间点；运行结束前会等待待追加日志工作。[子调用值与日志](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L531-L653)

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

数值是配置默认值而非 benchmark。完整程序的提权审批发生在 runtime 启动之前，不计入 Provider 的 elapsed deadline；见[提权与启动顺序](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L384-L399)和[实际运行调用](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L687-L708)。Provider 在运行前解析 cwd、deadline 和权限，再通过 Sandbox 与 subprocess 服务启动；结束或取消清理可管理的进程范围。更宽的 `sandbox_permissions` 要求非空理由并提前批准，拒绝后不会自动重新执行可能已产生副作用的程序。[Provider 配置与运行](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L30-L74)；[程序授权](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L127-L129)

## 源码导读

| 主题 | 固定来源 |
|---|---|
| 普通工具管线 | [工具 README](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L78-L102)；[取消行为](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/README.md#L119-L129) |
| 子调用共享阶段 | [PTC binding](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/core/tools/src/ptc.ts#L531-L653) |
| 新 Node Provider | [启动与通信](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L84-L94) |
| 执行限制 | [默认值](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L46-L74)；[已知限制](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L137-L144) |

## 限制与失败

`DSH-DD-TOOLS-003` 的限定为：期限与堆限制不是进程树 CPU/RSS 上限；文件约束继承所选 Sandbox 的 enforcement，脱离管理范围的后代进程可能无法清理。

直接 Node 文件、网络与进程 API 仍可使用，但受所选 OS 文件策略约束；`danger-full-access` 明确旁路。程序可见的 `process.env` 被清空，也不构成通用凭据隔离证明。需要的 confinement 不可用时失败关闭。[启动环境](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L84-L90)；[限制](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/ptc-runtime/ptc-runtime-node/README.md#L137-L144)

## 继续阅读

- [能力与组合归属](../03-capabilities.md)
- [本地 Sandbox](sandbox-execution.md)
- [证据方法](../00-methodology.md)
- [证据反向索引](../source-map.md)
- [Claim ledger](../../evidence/claims.json)
