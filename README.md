# DeepSeek Harness Analysis

[English summary](README.en.md)

DeepSeek Harness Analysis 是面向 Agent 系统开发者、技术决策者与开源贡献者的中文证据链手册。它以固定源码为依据，帮助读者理解 DeepSeek Harness 的架构、能力归属、差异化机制和可复现入门路径，并把上游事实、作者推论与限定条件放在同一条可复核链路中。

本手册是由 `yang0228` 维护的独立项目，不隶属于 DeepSeek，也不是 DeepSeek Harness 的官方文档、支持渠道或安全响应方。

## 固定分析基线

全部上游结论固定到 DeepSeek Harness commit `76fda729799fe9b3848dbe2c211d4b231032b81e`。固定提交使来源和观察可重复核对；它不代表上游当前版本，也不把固定基线的开发者预览状态提升为生产就绪承诺。

## 五项主要结论

- [DeepSeek Harness 的插件替换范围覆盖产品能力组合，而不只覆盖工具注册。](docs/04-differentiators.md#claim-dsh-diff-001)这不表示所有运行中组件都能任意热替换。
- [生命周期拥有的 Effect 使卸载与重载清理具有明确责任。](docs/04-differentiators.md#claim-dsh-diff-002)只有通过生命周期 API 注册的副作用自动获得这一清理关系。
- [类型化的 live/durable 事件与 model-visible logging 使行为能够被观察和重建。](docs/04-differentiators.md#claim-dsh-diff-003)live 事件总线本身不持久，重建依赖 durable Session Event Log。
- [每 Session 的 Agent Preset 允许同一 Host 承载不同能力组合。](docs/04-differentiators.md#claim-dsh-diff-004)组合在 Session 开始 Turn 后固定，不支持对活动会话任意换装工具。
- [PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。](docs/04-differentiators.md#claim-dsh-diff-005)这里没有量化速度、成本或质量收益。

以上链接指向现有 Claim；正式分类、证据信心、成熟度和限定语由该章证据表与 [`evidence/claims.json`](evidence/claims.json) 共同给出。

## 安全提示

固定基线处于开发者预览阶段，允许破坏性变更，未经过安全审计，也不应视为生产就绪。运行模型生成的代码或命令前，请先阅读固定提交的 [上游 `SAFETY.md`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/SAFETY.md)，使用最小权限，并只暴露可承受风险的文件、网络和凭据。

本仓库自身的安全问题按 [SECURITY.md](SECURITY.md) 私密报告；DeepSeek Harness 上游问题应按上游当前公开渠道处理，不能提交到本手册的公开 Issue。

## 阅读路线

### 快速建立全貌

依次阅读[项目概览](docs/01-overview.md)、[能力与组合归属](docs/03-capabilities.md)和[可复现的入门路径](docs/05-getting-started.md)，先判断项目定位、能力启用位置和可执行入口。

### 理解系统机制

从[组合与生命周期架构](docs/02-architecture.md)进入，再读[差异化机制评估](docs/04-differentiators.md)，重点核对生命周期、事件日志、每 Session 组合与 PTC 的收益和限制。

### 审核证据链

先读[证据方法](docs/00-methodology.md)，再用[证据反向索引](docs/source-map.md)从上游路径定位 Claim，并用[术语表](docs/glossary.md)核对 Application Profile、Agent Preset 等固定术语。

### 比较框架与编码 Agent 产品

先读[比较方法](docs/comparisons/methodology.md)，再分别查阅[Agent 框架机制比较](docs/comparisons/agent-frameworks.md)与[编码 Agent 产品表面比较](docs/comparisons/coding-agent-products.md)。两类对象使用不同标准，不进入同一排名。

## 专题深挖

- [Cordis 插件生命周期](docs/deep-dives/cordis-lifecycle.md)
- [应用与 Session 的组合层](docs/deep-dives/profiles-bundles-presets.md)
- [Session Event Log：从追加到投影与 Fork](docs/deep-dives/session-event-log.md)
- [注册工具与 Programmatic Tool Calling](docs/deep-dives/tools-and-ptc.md)
- [本地 Sandbox 执行边界](docs/deep-dives/sandbox-execution.md)
- [Subagent、Goal、Plan mode 与 Workflow 的责任边界](docs/deep-dives/subagents-goals-workflows.md)

## 支持、贡献与引用

- 手册事实错误、证据缺口和一般问题见[支持范围](SUPPORT.md)。DeepSeek Harness 的安装、配置与产品使用问题请转向[上游仓库](https://github.com/deepseek-ai/deepseek-harness)的当前文档和支持渠道。
- 提交修改前请阅读[参与贡献](CONTRIBUTING.md)，保留 Claim 分类、不可变来源、限定语和固定基线验证链。
- 引用本手册时使用 [`CITATION.cff`](CITATION.cff) 中的首选引用信息，并注明版本 `snapshot-76fda729`。

维护者：[`@yang0228`](https://github.com/yang0228)。
