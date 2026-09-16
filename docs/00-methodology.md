# 证据方法

本页定义手册如何固定分析对象、分类结论、连接证据，以及在基线变更时保留人工判断。它是查阅型参考；章节中的高亮结论才是生产 Claim。

## 基线权威

手册唯一的上游基线是 DeepSeek Harness commit `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720`，验证日期为 `2026-09-16`。该 commit 而非 package version、最近 tag 或 `master` 决定本手册中“上游事实”的含义；精确值由 [`evidence/baseline.json`](../evidence/baseline.json) 保管。

上游文件在手册中始终使用包含完整 40 位 commit 的 GitHub `blob` URL，并标明一个包含端点的行号范围。上游树、观察结果、Claim 记录和手册文本都不自动跟随分支漂移。

## 来源层级

| 顺序 | 来源 | 用途与限制 |
|---|---|---|
| 1 | 固定 commit 中的 Git 对象 | 判定 DeepSeek Harness 上游事实；工作树中的未提交内容不是证据。 |
| 2 | [`evidence/baseline.json`](../evidence/baseline.json) 与 [`evidence/observations/upstream-facts.json`](../evidence/observations/upstream-facts.json) | 记录基线元数据和读取器可重复提取的观察；不代替源文件。 |
| 3 | [`evidence/claims.json`](../evidence/claims.json) | 作为 Core Claim Inventory 的唯一正式记录，绑定标识符、标准陈述、分类、限定、文档目标与来源。 |
| 4 | 章节中的高亮 Claim marker | 向读者展示 ledger 中的标准陈述；其文本必须与 ledger 按字节一致。 |
| 比较专用 | 外部项目的官方一手资料 | 只支撑外部比较事实；不反向改写 DeepSeek Harness 基线事实。 |

## Claim 分类

| `kind` | 含义 | 证据要求 |
|---|---|---|
| `upstream-fact` | 能在固定上游树中直接核对的事实。 | 至少一个 `type: upstream` 且含完整 commit 和固定行号的上游来源；可以同时列外部来源。 |
| `analysis-inference` | 作者根据明示证据得出的解释或评估，不是上游原文。 | `confidence` 必须为 `qualified`，并附与结论直接相关的限定语。 |
| `external-comparison` | 有关外部框架或产品的比较事实。 | 使用官方一手资料，记录 publisher 和 access date，`maturity` 为 `not-applicable`。 |

## 信心与成熟度

`confidence` 表示证据支撑强度：`verified` 表示记录可在声明条件下直接核对，`qualified` 表示读者必须同时阅读限定语。`maturity` 独立表示 DeepSeek Harness 对象的发布状态：`released`、`experimental` 或不适用的 `not-applicable`。“已验证”不等于“已发布”，实验性机制也可以有直接、可核对的证据。

## 限定语规则

`qualified` Claim 必须有非空 `qualification`；`verified` Claim 不得携带 `qualification`。限定语应写明适用的 commit、组合、平台、生命周期或作者判断等实际条件，不得用模糊措辞代替限制。每项能力的优点与限制在同一阅读位置出现。

## 不可变链接

上游来源记录的 `repository`、`commit`、`path`、`startLine` 和 `endLine` 共同生成 URL。验证器拒绝 commit 不一致、路径非规范、行号越界或 URL 不匹配的记录，并要求每条 `upstream-fact` 至少包含一个结构有效的上游来源；该要求不禁止同一 Claim 同时使用外部来源。引用不使用可移动的分支名。

## 读取器 Probe

[`scripts/inspect-upstream.mjs`](../scripts/inspect-upstream.mjs) 在检查绝对路径、准确 HEAD 和干净工作树后，只读地提取 commit、commit date、`git describe`、根 package version、Profile 列表和 Agent Preset 列表。每个可重复观察在 `probes` 中使用 `upstream.*`、`profile:<id>` 或 `preset:<id>` 名称；Claim 只有在命名观察存在时才能引用它。

## 人工复核边界

读取器的 Profile 扫描器是针对固定声明语法的词法扫描，不是通用 TypeScript parser。控制条件之后的正则字面量可能被误判为声明，后缀位置的除法表达式可能被误判为解析失败。本次五个 Profile 与四个 Preset 记录已由 AI 分析代理与固定源声明逐项比较，仍待维护者人工确认；每次基线更新都必须重做声明与观察结果的人工比较。现有测试只证明固定输入契约，不证明扫描器能正确解析任意 TypeScript。

人工复核还负责判定外部 publisher 是否真的属于官方一手来源、链接在 access date 是否有效，以及分析推论是否超出已列证据。离线验证器不发起 HTTP 请求，因此不替代这些判断。正文中的上游 blob 引用同样检查固定 SHA、规范路径和行号；提供 `--source` 时再检查 Git blob 与跨度。`docs/superpowers/` 是历史设计与计划，不作为当前事实来源，保留其原始基线。

示例引用请放在行内代码或独立的 fenced code block 中。轻量扫描器会跳过这些格式，但不是完整 Markdown parser，不识别缩进代码块或引用块内的围栏；不要用这些未支持的格式承载浮动链接示例。

## 比较来源规则

外部比较只使用官方文档、官方仓库、规范或第一方 release note。每个来源记录 `publisher` 和 `accessDate`；发布者提供版本或 commit 时，记录至多一项，不得同时记录两者。带 commit 的 GitHub 来源必须在 URL 修订段中包含同一个完整 commit。不同抽象层级、不可得信息和作者推论必须明示标注，比较不产生总分、胜者或性能排名。

比较陈述分为官方事实、限定事实、未见官方文档说明和作者推论；“未见官方文档说明”只描述列明查阅范围中的信息缺口，不表示对象不支持某项能力。框架与编码 Agent 产品分组比较，各行记录官方事实、官方来源、版本或 commit 与访问日期、DSH 对应项、不可得信息和作者推论；完整列定义与禁止结论见[比较方法](comparisons/methodology.md)。

OpenAI 比较来源只使用 `developers.openai.com`、`platform.openai.com` 或 `learn.chatgpt.com` 下的当前官方页面；本手册不使用仓库链接或 `openai.github.io` 支撑这类结论。

本次变化见 [2026-09-16 基线升级记录](updates/2026-09-16.md)。外部产品的既有比较资料保留原访问日期，本次未把它们标为重新核验。

## 七步基线更新

1. 将 [`evidence/baseline.json`](../evidence/baseline.json) 改为一个明确的上游 commit。
2. 从该 commit 的干净 checkout 重新生成 [`evidence/observations/upstream-facts.json`](../evidence/observations/upstream-facts.json)，并逐项人工比较全部 Profile 声明与读取器观察。
3. 在修改正文之前运行证据验证，先暴露声明、schema、引用和观察的结构漂移。
4. 更新受新树影响的 Claim、章节、图表与比较文档。
5. 在 pull request 说明中记录新增、删除、改变和新增限定的结论。
6. 通过完整的仓库验证工作流。
7. 合并后创建新的 `snapshot-<short-sha>` tag。

没有定时任务会自动改写证据或正文；基线更新始终是一个聚焦且经人工审查的变更。

## 继续查阅

- [术语表](glossary.md)
- [证据反向索引](source-map.md)
- [比较方法](comparisons/methodology.md)
- [`evidence/claims.json`](../evidence/claims.json)
