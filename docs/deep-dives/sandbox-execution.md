# 本地 Sandbox 执行边界

## 基线

本章描述提交 `d743267388641bc76f17c45ce8b4c231aed1d32c` 的文件系统效果约束。未运行跨平台探针，不从操作系统名称推导部署的实际 enforcement。

## 一句话结论

<a id="claim-dsh-cap-005"></a> **Claim `DSH-CAP-005`:** 本地 Sandbox 提供方约束文件系统副作用，并报告实际 enforcement 状态。

<a id="claim-dsh-dd-sandbox-001"></a> **Claim `DSH-DD-SANDBOX-001`:** Sandbox 请求先解析文件系统副作用模式；受约束模式再选择平台 Provider，而 `danger-full-access` 直接绕过 confinement。

该模式约束文件系统副作用，不构成通用网络、进程或凭据隔离。

<a id="claim-dsh-dd-sandbox-002"></a> **Claim `DSH-DD-SANDBOX-002`:** Linux、macOS 与 Windows 使用不同的本地 Sandbox Provider，并报告各自的 enforcement 状态。

Windows ACL 与部分受支持的 Landlock ABI 可能诚实返回 `partial`。

<a id="claim-dsh-dd-sandbox-003"></a> **Claim `DSH-DD-SANDBOX-003`:** 必需的 confinement 不可用时执行会失败关闭，而 `danger-full-access` 会明确绕过 confinement。

`danger-full-access` 是调用方选择的无约束模式，不能被描述为 Sandbox 保护。

## 机制

### 每次调用解析策略

`ctx.sandboxPolicy.resolve()` 按“显式批准的模式 → Session 最近的 `sandbox/mode` → 部署默认值”解析；Session header 的不可变 cwd 是原项目与 workspace-write root，缺失时才用配置 fallback；新 `working-directory/change` 只改变该 Session 的有效目录，不扩大这个写入根。Provider 在对应执行环境解析真实路径，不能假定本地路径就是 SSH 远端路径。[解析实现](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-policy/src/index.ts#L155-L179)；[执行环境与策略](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L5-L79)

| 模式 | 行为 |
|---|---|
| `read-only` | 拒绝一般写入，POSIX 保留必要的 `/dev/null` 等 sink |
| `workspace-write` | 允许 workspace root 和 backend 承诺的临时区域 |
| `danger-full-access` | Consumer 使用原始 argv，不调用 confining Provider |

模式词汇只描述文件效果，不承诺统一的网络限制或进程可见性规则。个别 backend 可以有更强机制，但不能泛化为所有平台共同保证。[模式与 enforcement](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L9-L35)

`working_directory` / SDK get/set 以有效目录处理相对路径；已有 terminal、persistent shell 保留各自目录。切换到原项目外的有效目录不自动取得该目录写权限，Workflow 也分别捕获 cwd 与 standing file policy。详见[目录状态与权限](../05-getting-started.md#claim-dsh-start-004)。[working-directory 边界](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/working-directory.md#L5-L15)；[Workflow 捕获](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/workflow/workflow-ptc/README.md#L57-L61)。

### 平台提供方

| 平台 | 选择与机制 | enforcement / 限制 |
|---|---|---|
| Linux | bwrap 优先，Landlock 备选；竞争候选用功能探针选择 | bwrap 使用只读根、私有 PID namespace 和 workspace bind；Landlock 仅按 grants 限制文件效果，旧 ABI 可为 `partial` |
| macOS | Seatbelt / `sandbox-exec` | 拒绝文件写入再放行允许 roots；依赖平台仍提供该执行器 |
| Windows | ACL restricted-token runner | workspace 写入 SID 与 Session 私有 temp SID 分离；NTFS hard link、读取未约束，以及 AppContainer ACL 目录对低完整性子进程不可读等限制使其为 `partial` |

Linux 的两条路径也有区别：bwrap 的 workspace-write 用私有 `tmpfs /tmp`；Landlock 的同模式 grant 包含宿主 `/tmp` 和 workspace，不提供同样的私有 PID namespace。两者都不能由文件效果策略推导网络或凭据保密。[profile builders](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/src/profiles.ts#L16-L35)。

Provider 缓存选择结果到生命周期结束；修复运行器后需重载。单候选可跳过探针，但运行器自身拒绝仍必须作为失败报告。自定义 `runnerCommand` 跳过探针并相信操作者声明，因此不能把其 `full` 字段误读为独立安全审计。[选择、平台机制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/README.md#L69-L89)；[已知限制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/README.md#L129-L135)

### 执行与失败分类

```mermaid
flowchart TD
  Request[请求模式与 Session cwd] --> Resolve[解析完整策略]
  Resolve --> Mode{模式}
  Mode -->|danger-full-access| Raw[原始 argv：明确旁路]
  Mode -->|受约束| Confine[Sandbox Provider 包装 argv]
  Confine -->|不可用| Fail[SANDBOX_UNAVAILABLE：失败关闭]
  Confine -->|full 或 partial| Spawn[Subprocess 执行并保留 enforcement]
  Spawn --> Classify[区分运行器失败、文件拒绝、程序结果]
```

`await ctx.sandbox.confine(argv, policy, signal)` 在执行环境中解析路径并返回包装后的 argv；取消可以阻止尚未开始的启动。Consumer 负责执行和结果归因。`denial` 表示活动约束下的文件操作被拒；`runner failure` 表示运行器在内层命令执行前失败，必须优先识别。[分类规则](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L98-L156)

### 与 PTC、远程执行和外部服务的关系

当前 Node PTC Provider 也使用 Sandbox 和 subprocess 服务：受约束模式不可用时不允许悄悄以原始 Node 执行。文件策略、输出限制和进程清理仍是三个独立承诺，不能合并为“绝对安全”。[PTC 文件策略](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/ptc-runtime/ptc-runtime-node/README.md#L12)；[PTC 限制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/ptc-runtime/ptc-runtime-node/README.md#L135-L142)

`dsh-sandbox-ssh` 与 SSH filesystem/subprocess 提供方配套，由 running remote helper 在远端 canonicalize workspace root、调用其本地 Sandbox 并返回 enforcing argv；SSH subprocess 执行该 argv。远端 `partial` 不会变成 `full`，SSH host 与 helper 仍是 trusted infrastructure，digest checks 不建立 hostile-host 隔离。[SSH Sandbox](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/ssh/sandbox-ssh/README.md#L28-L40)；[远端信任边界](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/ssh/sandbox-ssh/README.md#L63-L68)。

MCP stdio server 的配置环境是在 scrubbed ambient env 上叠加显式 env，由 MCP SDK 的 `StdioClientTransport` 直接 spawn；源码没有调用 DSH `sandbox.confine()`。因此 MCP 工具经过正常执行管线不证明 MCP server 或其外部副作用受这套文件策略保护。[transport factory](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/mcp/mcp-client/src/transport.ts#L15-L44)。

Browser Provider 的 Session reservation 和 operation queue 管理资源归属；attached browser 的外部用户、其他进程仍在该 reservation 之外，取消也不能撤回已送达操作。这些 lifecycle 约束不能被描述为 OS 文件 Sandbox。[Browser ownership](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/browser-use.md#L19-L37)。

## 源码导读

| Claim / 主题 | 固定来源 |
|---|---|
| `DSH-DD-SANDBOX-001` | [模式词汇](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L9-L35)；[每调用解析](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-policy/src/index.ts#L155-L179) |
| `DSH-DD-SANDBOX-002` | [本地选择与状态](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/README.md#L51-L81)；[平台限制](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/README.md#L129-L135) |
| `DSH-DD-SANDBOX-003` | [失败关闭](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/sandbox.md#L154-L158)；[运行器错误](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sandbox/sandbox-local/README.md#L55-L57) |

## 限制与失败

`partial` 表示已建立但不完整的文件约束，不是 `full`，也不是 Provider 不存在；需要绝对文件承诺的 Consumer 必须拒绝或明确呈现这个区别。受约束模式没有静默旁路，而 `danger-full-access` 本身就是显式旁路。

本地 Provider 共享宿主机内核与文件系统，不等同于容器或 microVM。Node PTC 的环境清理是该 Provider 自己的行为，不是所有 Sandbox Consumer 都具有的能力。安全决策应依据实际 backend、enforcement 和暴露的资源，而不是仅依据“沙箱”名称。

## 继续阅读

- [能力与组合归属](../03-capabilities.md)
- [工具与 PTC](tools-and-ptc.md)
- [证据方法](../00-methodology.md)
- [证据反向索引](../source-map.md)
