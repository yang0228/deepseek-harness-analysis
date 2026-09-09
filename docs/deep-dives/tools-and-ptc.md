# 注册工具与 Programmatic Tool Calling

## 基线

本章只描述 DeepSeek Harness commit `76fda729799fe9b3848dbe2c211d4b231032b81e` 中的工具注册、普通调用管线和 Programmatic Tool Calling（PTC）。源码链接固定到该提交；普通调用的正常委托路径、拒绝分支、取消分支和管线异常分支具有不同的阶段覆盖。

## 一句话结论

工具注册表同时拥有模型可见 schema 与执行元数据；普通调用和 `run_code` 子调用在不同入口之后复用同一组 prepare、dispatch、finalize 与 finish 阶段，而 PTC 只把多个调用编排进一次程序运行，并不撤销策略、取消、并发或资源约束。

<a id="claim-dsh-cap-004"></a> **Claim `DSH-CAP-004`:** 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。

<a id="claim-dsh-dd-tools-001"></a> **Claim `DSH-DD-TOOLS-001`:** 注册工具携带策略与取消元数据，依次经过 pre-execute、provider execute 与 post-execute Waterfall。

<a id="claim-dsh-dd-tools-002"></a> **Claim `DSH-DD-TOOLS-002`:** `run_code` 的子调用复用普通工具执行的分阶段受保护管线，而不是绕过它。

<a id="claim-dsh-dd-tools-003"></a> **Claim `DSH-DD-TOOLS-003`:** 每次 PTC 运行使用全新程序状态，并受资源与并发上限约束。

程序中的中间 JavaScript 值不会自动成为 durable Session Event。

<a id="claim-dsh-diff-005"></a> **Claim `DSH-DIFF-005`:** PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。

“可能减少往返”描述交互结构，没有量化速度、成本或质量收益。

## 机制

### 普通工具路径

`ctx.tools.register()` 把 `ToolDefinition` 放入有 Scope 的注册层；请求组装时，`schemas(scope)` 只向模型呈现名称、描述和参数 schema，执行函数、输出声明、超时、并发分类及 Host presenter 都留在 Host 侧。生成的工具目录也以实际启动插件后读取注册 schema 为事实来源，而不是从手写清单推断可见工具。[注册与展示](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/README.md#L26-L85)和[目录生成器](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/scripts/gen-tool-catalog.ts#L1-L6)分别说明运行时注册与文档投影。

执行开始时，注册表先为调用分配关联 token，再把参数复制为 lossless JSON 并冻结；这一步发生在 `tools/pre-execute` 与 monotonic guards 之前，但不是通用的参数 schema 验证。由 `defineTool` 创建的定义在自身 `execute` 包装器中校验参数，也就是策略与 guards 允许 dispatch 后、用户 body 前；原始 `ToolDefinition` 则自行负责输入校验。[执行创建](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1355-L1442)与[`defineTool` 包装器](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/schema.ts#L545-L617)固定了这项顺序和所有权。

Agent Loop 在调用注册表之前追加 durable `tool/call`，Host 可据此呈现 pending card。正常委托路径随后依次运行 `tools/pre-execute`，解析可选 approval，检查 monotonic guards，通过 `tools/execute` Waterfall 包住 definition/provider 的 `execute`，再运行 `tools/post-execute`。definition-owned `finalizeContent` 接着处理最后的模型内容，finish 阶段冻结 lossless 结果并同步发出 `tools/result`；Agent Loop 再追加 durable `tool/result`，Host 或 Client presenter 从已记录的参数、`content`、失败状态及可选 `meta` 渲染 completed card。[官方管线图](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/tool-execution-pipeline.md#L6-L60)给出日志和呈现相对执行阶段的位置。

结果字段有不同用途：成功结果的 `value` 是 execution-local canonical JSON，供调用方或 PTC 程序继续计算，故意不进入 durable event；`content` 是模型可见投影；`meta` 是工具私有的持久化呈现数据，供 Host presenter 与 Client renderer 独立收窄。[结果类型](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L282-L295)和[execution-local value](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L548-L573)区分了三者。

取消是协作式的。已取消的调用可在 pre-execute 前直接形成 final-result；approval 取消、策略拒绝和 dispatch 前取消形成仍需 post-execute 的结果；body 启动后的取消会等待 body 收敛，并只把成功结果改为 `ABORTED`。拒绝会跳过 body 但仍可进入 post-execute，而 prepare 或 dispatch 管线抛错会归一化为 final-result 并绕过 post-execute；因此上面的顺序只描述正常委托路径，不是所有结局都经过的强制清单。[prepare 分支](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1450-L1498)与[dispatch/finalize 分支](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1523-L1612)展示这些短路。

注册表没有通用“后台任务”结果字段。以 bash 为例，工具自己的 `run_in_background` 选项在启用时把进程注册到 `ctx.jobs`，再由 `job_*` 工具收集或停止；这是 bash 与 Job capability 共同拥有的行为，不是每个工具调用自动获得的后台机制。[生成器中的 bash 记录](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/scripts/gen-tool-catalog.ts#L230-L243)明确列出这项依赖。

### 直接调用与 PTC 的汇合点

```mermaid
sequenceDiagram
  participant Loop as Agent Loop
  participant Public as ToolRuntime.execute
  participant Program as run_code program
  participant Bridge as PTC scheduler bridge
  participant Stages as shared prepare/dispatch/finalize/finish
  participant Body as ToolDefinition.execute
  participant Session as Session log

  alt direct tool call
    Loop->>Public: ToolExecutionInput
    Public->>Stages: prepare
  else run_code subcall
    Program->>Bridge: tools.name(args)
    Bridge->>Stages: scheduler.prepare
  end
  Stages->>Stages: pre-execute, approval, guards
  Stages->>Body: dispatch through tools/execute
  Body-->>Stages: canonical value and content
  Stages->>Stages: post-execute, finalizeContent, finish
  alt direct tool call
    Stages-->>Public: frozen final result
    Public-->>Loop: result for durable tool/result
  else run_code subcall
    Stages-->>Bridge: frozen final result
    Bridge-->>Program: live canonical value
    Bridge->>Session: durable tool/code-dispatch content
  end
```

公共 `execute()` 调用 `prepareExecution` 后完成分阶段执行；PTC binding 不再次调用这个公共入口，而是使用注册表的 internal scheduler view。该 view 与公共入口引用相同的 prepare、dispatch、finalize、finish 实现，所以 pre-execute、guards、around-dispatch、post-execute、final content 和 final notification 没有被旁路。[共享 scheduler view](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L788-L794)、[公共入口](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1319-L1352)与[PTC bridge](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L479-L598)共同证明这个汇合关系。

PTC commit 阶段先取得 finish 后的结果。binding promise 随后把成功的 canonical `value` 交回运行中的程序，同时启动 `tool/code-dispatch` 的 durable `content` 处理；日志工作不阻塞该 live value，但 `run_code` 结束前会 drain 这些工作。因此“程序拿到中间值”与“Session 持久化子调用呈现”是两个时间点，durable 记录也不携带 canonical `value`。

### PTC 呈现、绑定与调度

在 `ptc` 模式下，模型直接看到的是保留名称 `run_code` 和针对已加载 runtime language 生成的 SDK；`both` 同时呈现普通 schema。注册表拒绝其他插件注册或 shadow `run_code`，并要求组合中存在 `ctx.codeRuntime` 以及对应语言的 SDK renderer，否则 prompt assembly 失败。[模式配置](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L649-L663)、[SDK 生成](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L857-L881)与[保留名称](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1022-L1053)构成同一呈现约束。

固定 PTC Preset 把 Agent 的工具呈现设为 `ptc`；host composition 提供 TypeScript runtime 时，生成的 TypeScript SDK 把该 Scope 当前可见的工具声明为 `tools.name(args)` bindings。创建 bindings 时会跳过 `run_code` 本身；每次子调用仍按同一个 Agent Scope 重新解析定义，所以 restriction 或 scoped registration 既影响 SDK 列表，也影响实际 subdispatch。[binding 建立](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L608-L653)与[PTC Preset 呈现](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/ptc/agent.cordis.yml#L263-L271)保持 announced surface 和 callable surface 对齐。

每个 subcall 在启动前按工具的 `isConcurrencySafe(args)` 分类；只有明确返回 `true` 的调用可以重叠，其他调用是 exclusive barrier。并行组受 `maxParallelSubCalls` 限制，开始顺序、policy 阶段与提交顺序保持串行；可并发的是 around-dispatch/body 阶段。分类异常或无效参数按 exclusive 处理，[调度循环](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L282-L359)和[容量判断](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L387-L465)共同规定该 fail-closed 分类。

### Guard 与资源限制

| 约束 | 固定基线默认值或行为 | 作用点 |
|---|---|---|
| pre-policy 与 guards | 无绕过；每个直接调用和 PTC subcall 分别执行 | shared prepare |
| 并发分类 | 只有 `isConcurrencySafe(args) === true` 才可重叠；其余为 exclusive | subcall 启动前重新分类 |
| `maxParallelSubCalls` | `10`；设为 `1` 时严格串行 | 单次 `run_code` 的 overlapping subcalls |
| `computeMs` | `60,000` ms measured busy-time | fresh worker |
| `maxWallMs` | `600,000` ms wall-clock ceiling | fresh worker |
| `maxOutputBytes` | `67,108,864` bytes | serialized outer logs 与 completion value 或 failure message |
| `maxOldGenerationSizeMb` | `512` MiB | worker heap |
| 每次运行状态 | 新建一个 Node worker；运行之间不携带程序状态 | code runtime backend |

这些数值是固定提交中的默认配置，不是性能测量。`maxOutputBytes` 约束 outer output；中间 binding value 不会因为未进入外层输出就获得一个另行承诺的字节上限，最终仍受 worker heap 和运行终止约束。[runtime 默认值](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L42-L49)与[已知限制](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L141-L146)界定各自范围。

## 源码导读

| 主题 | 固定来源 | 可核对行为 |
|---|---|---|
| 注册与普通管线 | [`tools` README 第 26–130 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/README.md#L26-L130)、[`index.ts` 第 1319–1352 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1319-L1352)、[第 1355–1442 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1355-L1442)、[第 1450–1498 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1450-L1498)、[第 1523–1612 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L1523-L1612) | schema 投影、结果字段、正常阶段与短路分支。 |
| schema validation | [`schema.ts` 第 545–617 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/schema.ts#L545-L617) | `defineTool` 在 body 前验证参数；raw definition 自行验证。 |
| PTC transport 与 scheduler | [`ptc.ts` 第 282–359 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L282-L359)、[第 387–465 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L387-L465)、[第 479–598 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L479-L598)、[第 608–653 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/ptc.ts#L608-L653) | reserved transport、绑定可见性、共享阶段、调度与 live/durable 结果。 |
| SDK 与目录 | [`index.ts` 第 649–663 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L649-L663)、[第 857–881 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/core/tools/src/index.ts#L857-L881)、[`gen-tool-catalog.ts` 第 200–215 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/scripts/gen-tool-catalog.ts#L200-L215) | runtime language renderer 要求、生成 SDK 与 `run_code` 目录来源。 |
| PTC Preset | [`agent.cordis.yml` 第 1–25 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/ptc/agent.cordis.yml#L1-L25)、[第 228–271 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/preset/agent-presets/presets/ptc/agent.cordis.yml#L228-L271) | 保留 workflow engine 给 `ralph`，禁用 model-facing workflow tool，并把工具呈现设为 PTC。 |
| fresh worker 与资源 | [`worker-thread` README 第 12 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L12)、[第 42–49 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L42-L49)、[第 141–146 行](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L141-L146) | fresh state、busy/wall/output/heap 限制与中间值边界。 |

## 限制与失败

| 情况 | 可见结果 | 边界或恢复责任 |
|---|---|---|
| model-direct call 在纯 `ptc` 模式命名普通工具 | `UNKNOWN_TOOL`，在 policy 前拒绝 | 改为从 `run_code` 内调用生成的 binding；`both` 模式才同时允许 native call |
| runtime 缺失或语言没有 SDK renderer | prompt assembly 失败 | 组合必须提供匹配语言的 `ctx.codeRuntime` 与 renderer |
| pre-policy 或 guard 拒绝 subcall | body 不执行，binding 以 `ToolCallError` 拒绝 | 程序可捕获失败，但不能把拒绝改成成功 |
| 已取消或达到 runtime budget | queued call 被放弃，in-flight call 收到 abort，worker 被终止 | 外层 `run_code` drain 已启动的 dispatch 后结束 |
| intermediate value 未进入 outer output | 不自动写入 durable Session Event | 程序显式提取并 return/print 所需信息；子调用 durable 记录只保存呈现 `content` |
| 子调用返回图片或 additional context | composite 把它们延后到 outer result 邻接关系之外 | 由外层执行上下文统一注入，不能假定普通值也进入对话 |
| PTC Preset 中的 workflow tool | `disabled: true`，不成为第二个 model-authored 编排入口 | workflow engine 仍供 `ralph` 使用，不能据此推断 tool 已启用 |

每次运行的新 Worker 提供状态清空和资源 containment，不提供完整安全隔离；源码明确把它的权限姿态描述为与 bash 相当，并指出 Worker 终止不会清理程序产生的 OS 进程。PTC 因此不能被描述为多租户安全边界。[runtime containment](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/packages/code-runtime/code-runtime-worker-thread/README.md#L12)限定了这项承诺。

PTC 可能把原本需要模型逐次决定的调用组合进一个程序，从而改变模型与工具的交互往返；固定源码没有给出速度、成本或质量的对照测量，因此本章不作性能提升或排名结论。

## 继续阅读

- [所属核心章节：能力与组合归属](../03-capabilities.md)
- [证据方法](../00-methodology.md)
- [证据反向索引](../source-map.md)
- [`evidence/claims.json`](../../evidence/claims.json)
