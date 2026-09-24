# 组合与生命周期架构

基线：DeepSeek Harness commit `46a7f68b0922371ce7144b668b90e377d8e799f4`。

## 一句话结论

DeepSeek Harness 用 Cordis 管理插件生命周期，用 Profile 组合 CLI 应用、用 Preset 组合 Agent；Desktop 的 Electron Host 复用共享 Web 应用。Session 日志记录可恢复事实，实时流式帧负责在途显示。

## 机制

### Cordis 与副作用所有权

模型适配器、工具注册表、Session 日志和 Agent loop 都作为插件挂载。Service 提供直接调用接口，类型化事件提供观察与策略扩展点；`inject` 声明的依赖控制插件激活和依赖变化后的重载。

<a id="claim-dsh-arch-001"></a> **Claim `DSH-ARCH-001`:** 通过 Cordis 生命周期 API 注册的副作用由所属插件的 Fiber 管理，并在卸载时启动清理。

`ctx.effect()` 和 `ctx.on()` 把注册交给所属 Fiber。卸载会启动拥有的 Effect wrapper，并等待其结算；同一 Effect 在无错误路径上逆序串接 disposer，不同 Effect 可以并行推进。

卸载结算不保证每个 disposer 都被调用或资源均已释放；未登记的外部副作用也不在自动清理范围内。

<a id="claim-dsh-arch-003"></a> **Claim `DSH-ARCH-003`:** 一个完整能力接缝由 Service Definition、Service Provider 与 Consumer 三种角色组成。

Service Definition 声明接口和 context key，Provider 实现能力，Consumer 调用接口。一个包可以兼任多种角色；单独一个 Provider 不构成完整能力接缝。

### 应用组合与 Desktop

<a id="claim-dsh-arch-004"></a> **Claim `DSH-ARCH-004`:** Application Profile 按顺序组合 Bundle 与 Patch；随附 YAML 默认仅为 `web` 启用 Patch 热重载。

CLI Profile 从空配置行开始，依次应用有序 Bundle、Profile Patch、Harness Home Patch 和 CLI `--patch`。按 id 定位的 Patch 替换整个 config，不做字段深度合并。

`headless`、`sdk` 与 `acp` 禁用 `dsh-hmr`，`sdk-minimal` 不挂载它；Profile Patch 可覆盖这些默认值。

<a id="claim-dsh-arch-008"></a> **Claim `DSH-ARCH-008`:** Desktop 由 Electron Node 模式运行独立 Host，复用共享 Web 应用与认证 HTTP 接口；默认端口为 `19387`。

Desktop 的 Host 以 `ELECTRON_RUN_AS_NODE=1` 运行 Electron，并调用共享 CLI Profile runner。窗口先读取打包的 Web 静态资源，再等待 Host 的 boot injections；Web 提供认证 HTTP API、RPC 与流。Node IPC 传递启动注入、就绪、致命错误和关闭通知。`$DSH_HOME/profiles/desktop` 由 Electron 独占管理，CLI 不能启动或修改；它不计入五个 CLI 模板，端口可由 Profile 配置覆盖。

```mermaid
flowchart LR
  subgraph CLI["CLI application"]
    DSH["dsh"] --> Profile["named Profile"] --> Layers["Bundle / Profile / Home / CLI patches"] --> Tree["Cordis tree"]
  end
  subgraph Desktop["Desktop application"]
    Electron["Electron"] --> Node["Electron Node-mode Host"] --> DesktopTree["shared Web application + enabled plugins"]
    Node <-->|"boot / lifecycle IPC"| Electron
    Electron --> Protocol["packaged Web assets"] --> Renderer["renderer"]
    Renderer <-->|"authenticated HTTP / RPC / streams"| Node
  end
  subgraph Agent["per-Agent composition"]
    Preset["Agent Preset revision"] --> Scope["Agent Scope parent binding"] --> Capabilities["prompt / tools / services"]
  end
  Tree --> Preset
  DesktopTree --> Preset
```

### Agent Preset 与 Scope

<a id="claim-dsh-arch-005"></a> **Claim `DSH-ARCH-005`:** Agent Preset 为每个 Agent 组合能力，Scope 通过父子关系隔离并继承注册。

`agent-preset` 普通插件声明完整的子插件列表，Registry 立即为声明建立独立 Scope 与 Loader 树，再把 Agent Scope 绑定为其子级。注册沿父链可见，Agent 专属注册仍归自己的 Scope。声明更新或删除会使旧修订退役；已有 Agent、子 Agent 与临时历史读取保留引用，最后一个引用释放后回收退役树。`composeFrom()` 让子 Agent 绑定父 Agent 的同一修订。

Profile Patch 重组应用树，Preset 选择改变 Agent 的能力组合，两者生命周期不同。详细限制见[组合专题](deep-dives/profiles-bundles-presets.md)。

### 事件域与 Turn

<a id="claim-dsh-arch-002"></a> **Claim `DSH-ARCH-002`:** durable session、live agent 与 capability 三类事件域服务于不同生命周期。

| 事件域 | 例子 | 用途 |
|---|---|---|
| durable session | `turn/*`、`step/*`、`system/message`、`developer/message`、`user/message`、`assistant/message`、`assistant/attempt`、`tool/*` | 追加到日志并经 `session/event` 广播，供恢复和投影使用。 |
| live agent | `agent/pre-step`、`agent/request`、`agent/assistant-stream` | 携带运行中的 Agent，控制或观察在途工作。 |
| capability | `llm/stream`、`tools/*`、`fs/*` | 在相应能力上连接策略与适配器。 |

<a id="claim-dsh-arch-006"></a> **Claim `DSH-ARCH-006`:** 一个 Turn 包含零个或多个模型与工具 Step，并由类型化 waterfall 扩展点控制。

Driver 先记录 `turn/start`，再认领输入。`agent/pre-step` 可以拒绝输入或把首个提议改为空，使 Turn 直接结束而不进入 Step。进入 Step 后，`agent/request` 与 `prepareCall()` 先确定实际模型路由，再提交 system、user 和 request 记录；这两个异步阶段内取消，不会提交该次 system 或 user 输入。

```mermaid
sequenceDiagram
  participant Driver
  participant Log as Session log
  participant Hooks as Live events
  participant Model
  Driver->>Log: turn/start
  Driver->>Hooks: agent/pre-step
  alt rejected or empty first claim
    Driver->>Log: turn/end (zero Step)
  else entered Step
    Driver->>Log: step/start
    Driver->>Hooks: agent/request
    Driver->>Driver: prepareCall and admit prompt
    Driver->>Log: system/message, user/message, request metadata
    Driver->>Model: frozen request derived from log
    Driver-->>Hooks: agent/assistant-stream start
    loop model chunks
      Model-->>Driver: chunk
      Driver-->>Hooks: agent/assistant-stream chunk
    end
    Driver->>Log: assistant/message or assistant/attempt (compact stream)
    Driver-->>Hooks: agent/assistant-stream committed end
    opt tool calls from committed message
      Driver->>Log: tool/call
      Driver->>Hooks: tools/pre-execute, execute, post-execute
      Driver->>Driver: finalizeContent
      Driver-->>Hooks: tools/result
      Driver->>Log: tool/result
    end
    Driver->>Log: step/end
    Driver->>Hooks: agent/turn-stopping
    Driver->>Log: turn/end
  end
```

图只展开一次 Step；工具或新输入可以使同一 Turn 继续。Waterfall listener 调用 `next()` 才委托后续处理；`agent/turn-stopping` 是 serial 事件，没有 `next()`。工具流水线在 `finalizeContent` 后发布 live `tools/result`，随后 Driver 才写 durable `tool/result`。[工具流水线](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/tool-execution-pipeline.md#L1-L62)提供细节。

### 日志、流式输出与模型历史

<a id="claim-dsh-arch-007"></a> **Claim `DSH-ARCH-007`:** 所有进入模型请求的输入都可由追加式 Session Event Log 重建。

日志用连续 `seq` 排序事实，`deriveMessages()` 从当前 surface 派生模型历史。System prompt 作为 `system/message` 进入历史，v4 还定义了增量工具变化的 `developer/message` 存储表示（当前 Provider 与 UI 尚不支持该历史）；`request/header` 保存调用配置、adapter defaults 和工具 schema。请求路由先确定，已接受输入再落日志，模型请求随后从日志构造。

`agent/assistant-stream` 的 start、chunk、end 是实时帧。请求结算时，完整 timed compact stream 写入一个 `assistant/message` 或 log-only `assistant/attempt`；后者保存失败、重试或取消尝试的证据，不增加模型消息。结算前的进程硬终止不会留下该 attempt 的 durable stream。当前日志不把 `assistant/chunk` 作为逐块持久事件。

当前逻辑格式是 v4。JSONL Provider 读取受支持的历史格式时执行静态迁移链；只读打开不写 successor，写打开先验证再发布新一代文件，原文件保持不变。持久化、Fork 与恢复细节见[Session 专题](deep-dives/session-event-log.md)。

## 证据

本页八项 Claim 均为 `upstream-fact`、成熟度 `released`；标准陈述、限定与来源由 [claim ledger](../evidence/claims.json) 保管。

| Claim | 证据信心 | 固定来源 |
|---|---|---|
| `DSH-ARCH-001` | `qualified` | [fiber.ts 418–441](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/vendor/cordis/src/fiber.ts#L418-L441)；[fiber.ts 675–695](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/vendor/cordis/src/fiber.ts#L675-L695) |
| `DSH-ARCH-002` | `verified` | [architecture.md 72–80](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L72-L80)；[runtime-types.ts 354–363](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/core/agent/src/runtime-types.ts#L354-L363) |
| `DSH-ARCH-003` | `verified` | [architecture.md 129–133](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L129-L133) |
| `DSH-ARCH-004` | `qualified` | [architecture.md 25–31](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L25-L31)；[README.md 50–63](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/boot/app-boot/README.md#L50-L63) |
| `DSH-ARCH-005` | `verified` | [README.md 46–58](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/preset/agent-preset-registry/README.md#L46-L58)；[index.ts 32–50](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/core/scope/src/index.ts#L32-L50) |
| `DSH-ARCH-006` | `verified` | [architecture.md 84–113](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L84-L113) |
| `DSH-ARCH-007` | `verified` | [architecture.md 119–127](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L119-L127)；[types.ts 234–250](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/core/session/src/types.ts#L234-L250)；[surface.ts 120–156](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/packages/core/session/src/surface.ts#L120-L156) |
| `DSH-ARCH-008` | `verified` | [architecture.md 51–55](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/docs/architecture.md#L51-L55)；[README.md 43–57](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/apps/desktop/README.md#L43-L57) |

## 限制与适用范围

`dsh-hmr` 的启用仅说明配置重载策略，不承诺任意模块或活动请求状态无缝替换。无效 Patch 不改变运行配置；有效 Patch 中的插件失败可能保留成功的其他条目，不能把整个更新理解为事务回滚。

Preset 的旧修订在退役且引用释放后回收；更新声明不会自动替换已运行 Agent 的能力，进程重启也不会恢复旧修订实现。实时 UI 帧与 durable 结算记录不能互换：日志投影可重建已提交历史，不保存尚未结算的内存状态。

确定性 replay fixture 用于固定场景回归；这些原语不构成通用 debugger，也不提供性能、成本或质量结论。

## 继续阅读

- [Cordis 插件生命周期](deep-dives/cordis-lifecycle.md)
- [应用与 Session 的组合层](deep-dives/profiles-bundles-presets.md)
- [Session Event Log](deep-dives/session-event-log.md)
- [上一章：项目概览](01-overview.md)
- [下一章：能力与组合归属](03-capabilities.md)
- [证据方法](00-methodology.md) · [术语表](glossary.md) · [证据反向索引](source-map.md)
