# Core Evidence Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the Chinese-first five-chapter handbook, methodology, glossary, source map, and bilingual entry points with every highlighted conclusion tied to the pinned evidence ledger.

**Architecture:** The handbook is organized by reader questions rather than source order. Each chapter gives a concise answer, mechanism, immutable evidence, qualifications, and onward links. `evidence/claims.json` is the canonical fact ledger; exact one-line claim markers couple its document targets to prose in both directions, while `docs/source-map.md` provides the reverse path from package or subsystem to claims.

**Tech Stack:** Markdown, GitHub Mermaid, JSON claim ledger, the zero-dependency inspector/verifier from the foundation plan.

**Spec:** [`docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`](../specs/2026-09-04-evidence-handbook-design.md)

## Global Constraints

- Complete [`2026-09-05-foundation-and-evidence.md`](2026-09-05-foundation-and-evidence.md) first. Do not weaken its schema or checks to make prose pass.
- Write primary content in Chinese. Keep upstream canonical names in English/code form; `README.en.md` is a compact English summary, not a second full handbook.
- Use the exact baseline `76fda729799fe9b3848dbe2c211d4b231032b81e` and immutable GitHub blob URLs. Never cite `master` for an upstream fact.
- Use the approved five-part order: project overview, architecture, capabilities, differentiators, getting started.
- Mark claim kind, evidentiary confidence, DeepSeek Harness maturity, qualifications, and author inference explicitly. `Agent = Model + Harness` is this handbook's explanatory frame, not an upstream quotation.
- Distinguish Application Profiles (`web`, `headless`, `sdk`, `sdk-minimal`, `acp`) from Agent Presets (`standard`, `minimal`, `ptc`, `cordis`) everywhere. “Code” and “Creator” are labels, not authoritative ids.
- Every capability row names one exact owner using one of the literal prefixes `profile:`, `preset:`, `optional-package:`, or `experimental:` followed by its concrete id/path.
- State limitations beside benefits. Do not claim production readiness, general isolation, a full debugger, a benchmark product, or measured PTC speed/cost/quality improvements.
- Keep each factual paragraph on one physical line, diagrams inline, and all Markdown with one trailing newline.
- For each task, add ledger entries first and confirm the missing highlighted marker fails; then add prose/markers and make verification pass.

## File Map

- `docs/00-methodology.md` — baseline, source hierarchy, claim classification, and update method.
- `docs/glossary.md` — Chinese-to-upstream-English terminology map.
- `docs/source-map.md` — reverse index from exact upstream paths to claim ids and handbook targets.
- `docs/01-overview.md` — project identity, explanatory frame, all-plugin scope, and maturity limits.
- `docs/02-architecture.md` — Cordis lifecycle, capability seams, composition, turns, and durable history.
- `docs/03-capabilities.md` — Profile/Preset ownership matrices and enabled/optional/disabled/experimental classification.
- `docs/04-differentiators.md` — bounded analysis of plugin scope, lifecycle ownership, logging, per-session composition, and PTC.
- `docs/05-getting-started.md` — five distinct onboarding paths and their reproducibility limits.
- `README.md`, `README.en.md` — Chinese entry point and compact English summary.
- `evidence/claims.json` — canonical Core Claim Inventory records and document targets.
- `test/handbook-navigation.test.mjs` — reader-route and chapter-link contracts.

## Document Contract

Every numbered main-handbook document created by this plan uses this exact order: one H1; a `基线` line naming the full upstream SHA; `一句话结论`; `机制`; `证据`; `限制与适用范围`; and `继续阅读`. Deep dives use the distinct document contract in the Deep-Dive Plan. A highlighted conclusion is one physical line: derive `<a id="claim-${id.toLowerCase()}"></a> **Claim \`${id}\`:** ` and append that ledger entry's Chinese canonical `statement` byte-for-byte. The RED step for a newly added target runs `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, expects exit code 1, and requires stderr to name every new id plus `CLAIM_TARGET_MISSING`. The GREEN step repeats the identical command and expects exit code 0 with no stderr. Each task ends with its listed isolated commit only after GREEN verification and `git diff --check` pass.

## Core Claim Inventory

Use these stable ids and exact canonical Chinese statements. Copy the `statement` cell byte-for-byte into `evidence/claims.json` and every highlighted marker. Copy the `qualification` cell byte-for-byte for every qualified claim; `—` means omit the field.

| Claim id | Kind / confidence / maturity | Canonical `statement` | Canonical `qualification` | Primary owner |
|---|---|---|---|---|
| `DSH-OVR-001` | `upstream-fact` / `verified` / `released` | DeepSeek Harness 是一个开源、基于 Cordis 且采用全插件架构的 Agent Harness。 | — | `docs/01-overview.md` |
| `DSH-OVR-002` | `analysis-inference` / `qualified` / `released` | 模型适配器、工具、会话与循环等产品能力可通过组合替换，但 Cordis、Loader 与受支持的 `dsh` Profile 启动链仍是应用装配基座。 | 这里的“可替换”描述组合层面的实现选择，不表示运行中的组件可以任意并发替换。 | `docs/01-overview.md` |
| `DSH-OVR-003` | `upstream-fact` / `qualified` / `released` | 固定基线中的 DeepSeek Harness 处于开发者预览阶段，明确允许破坏性变更，并要求运行前阅读安全说明。 | 该成熟度结论只描述固定提交，不预测后续版本状态。 | `docs/01-overview.md` |
| `DSH-ARCH-001` | `upstream-fact` / `qualified` / `released` | 通过 Cordis 生命周期 API 注册的副作用由所属插件的 Fiber 管理，并在卸载时启动清理。 | 卸载结算不保证每个 disposer 都被调用或资源均已释放；未登记的外部副作用也不在自动清理范围内。 | `docs/02-architecture.md` |
| `DSH-ARCH-002` | `upstream-fact` / `verified` / `released` | durable session、live agent 与 capability 三类事件域服务于不同生命周期。 | — | `docs/02-architecture.md` |
| `DSH-ARCH-003` | `upstream-fact` / `verified` / `released` | 一个完整能力接缝由 Service Definition、Service Provider 与 Consumer 三种角色组成。 | — | `docs/02-architecture.md` |
| `DSH-ARCH-004` | `upstream-fact` / `qualified` / `released` | Application Profile 按顺序组合 Bundle 与 Patch；已发布 Profile 中只有 `web` 在运行时重载 Patch。 | 自定义 Profile 默认可实时重载，而 `headless`、`sdk`、`sdk-minimal` 与 `acp` 只在启动时应用组合。 | `docs/02-architecture.md` |
| `DSH-ARCH-005` | `upstream-fact` / `verified` / `released` | Agent Preset 为每个 Agent 组合能力，Scope 通过父子关系隔离并继承注册。 | — | `docs/02-architecture.md` |
| `DSH-ARCH-006` | `upstream-fact` / `verified` / `released` | 一个 Turn 包含零个或多个模型与工具 Step，并由类型化 waterfall 扩展点控制。 | — | `docs/02-architecture.md` |
| `DSH-ARCH-007` | `upstream-fact` / `verified` / `released` | 所有进入模型请求的输入都可由追加式 Session Event Log 重建。 | — | `docs/02-architecture.md` |
| `DSH-CAP-001` | `upstream-fact` / `verified` / `released` | 固定基线发布 `web`、`headless`、`sdk`、`sdk-minimal` 与 `acp` 五个 Application Profile，并记录各自的 Bundle 与重载模式。 | — | `docs/03-capabilities.md` |
| `DSH-CAP-002` | `upstream-fact` / `verified` / `released` | 固定基线发布 `standard`、`minimal`、`ptc` 与 `cordis` 四个 Agent Preset，并为它们配置不同的工具呈现。 | — | `docs/03-capabilities.md` |
| `DSH-CAP-003` | `upstream-fact` / `qualified` / `released` | 已发布 LLM 组合以 DeepSeek 路由为中心，同时保留可配置的 pi-ai 路由。 | pi-ai 可声明兼容提供方，但固定组合没有预先启用所有目录中的提供方。 | `docs/03-capabilities.md` |
| `DSH-CAP-004` | `upstream-fact` / `verified` / `released` | 文件系统、Shell、Web、Skill、Job、Goal、Workflow 与工具执行都通过插件服务或执行管线接入。 | — | `docs/03-capabilities.md` |
| `DSH-CAP-005` | `upstream-fact` / `qualified` / `released` | 本地 Sandbox 提供方约束文件系统副作用，并报告实际 enforcement 状态。 | Windows ACL 与部分受支持的 Landlock ABI 可能返回 `partial`，而 `danger-full-access` 明确绕过约束；这些模式不承诺通用网络、进程或凭据隔离。 | `docs/03-capabilities.md` |
| `DSH-CAP-006` | `upstream-fact` / `verified` / `released` | Session 提供持久化、投影、恢复、Transcript 与已完成 Turn 的 Fork 原语。 | — | `docs/03-capabilities.md` |
| `DSH-CAP-007` | `upstream-fact` / `qualified` / `released` | `standard` Preset 启用进程内 Subagent，而外部产品 Provider 需要可选组合且对应工具行默认禁用。 | Provider 在 Host 中可用不等于模型已经获得对应工具。 | `docs/03-capabilities.md` |
| `DSH-CAP-008` | `upstream-fact` / `qualified` / `released` | durable current Goal 与 worker-thread Workflow 是两种不同的编排原语。 | Goal 不是调度器，Workflow Worker 的受限 API 也不是安全 Sandbox。 | `docs/03-capabilities.md` |
| `DSH-CAP-009` | `analysis-inference` / `qualified` / `released` | Session 原语与确定性 replay fixture 不构成专用的终端用户调试器或通用 Benchmark 产品。 | 该判断限制产品定位，不否认这些原语可被更高层工具组合使用。 | `docs/03-capabilities.md` |
| `DSH-DIFF-001` | `analysis-inference` / `qualified` / `released` | DeepSeek Harness 的插件替换范围覆盖产品能力组合，而不只覆盖工具注册。 | 该结论比较扩展范围，不声称所有运行中组件都能任意热替换。 | `docs/04-differentiators.md` |
| `DSH-DIFF-002` | `analysis-inference` / `qualified` / `released` | 生命周期拥有的 Effect 使卸载与重载清理具有明确责任。 | 只有通过生命周期 API 注册的副作用自动获得这一清理关系。 | `docs/04-differentiators.md` |
| `DSH-DIFF-003` | `analysis-inference` / `qualified` / `released` | 类型化的 live/durable 事件与 model-visible logging 使行为能够被观察和重建。 | live 事件总线本身不持久，重建依赖 durable Session Event Log 中已记录的输入。 | `docs/04-differentiators.md` |
| `DSH-DIFF-004` | `analysis-inference` / `qualified` / `released` | 每 Session 的 Agent Preset 允许同一 Host 承载不同能力组合。 | 组合在 Session 开始 Turn 后固定，不支持对活动会话任意换装工具。 | `docs/04-differentiators.md` |
| `DSH-DIFF-005` | `analysis-inference` / `qualified` / `released` | PTC 让模型编写的 TypeScript 程序通过受保护工具管线组合多次调用，因此可能减少模型与工具之间的往返。 | “可能减少往返”描述交互结构，没有量化速度、成本或质量收益。 | `docs/04-differentiators.md` |
| `DSH-START-001` | `analysis-inference` / `qualified` / `released` | 源码中的浮动 npm 命令、`0.1.2-rc.1` 版本声明与固定提交标识不同的复现目标，只有固定提交对应本手册分析的源码树。 | 源码版本声明不单独证明同名版本当前可从 npm registry 获取。 | `docs/05-getting-started.md` |
| `DSH-START-002` | `upstream-fact` / `verified` / `released` | Python SDK 使用显式 Harness Home 启动捆绑的标准 `dsh --profile sdk` 运行时。 | — | `docs/05-getting-started.md` |

---

### Task 1: Establish methodology, terminology, and the evidence index

**Files:**

- Create: `docs/00-methodology.md`
- Create: `docs/glossary.md`
- Create: `docs/source-map.md`
- Modify: `evidence/claims.json`
- Modify: `test/verify-evidence.test.mjs`
- Modify: `test/fixtures/handbook/valid/evidence/claims.json`
- Create: `test/fixtures/handbook/valid/docs/fact.md`
- Create: `test/fixtures/handbook/valid/docs/qualified.md`
- Create: `test/fixtures/handbook/valid/docs/inference.md`

**Evidence:** `packages/client/ui-agent-preset/src/client/locales.ts:34-45`.

**Interfaces:** Consumes the Foundation Plan's schema-v1 `Claim`, `ClaimMarker`, `DocumentClaimIndex`, `EvidenceProblem`, `validateClaimTargets({ root, ledger })`, CLI contracts, and the exact English Preset labels in the listed locale span. Produces the three handbook reference documents, three independent valid marker fixtures, and no production claim. The focused fixture contract is one marker per declared target and deliberately excludes unrelated repository/community validation; RED and GREEN assertions compare only `code`, `path`, and `claimId`.

**Executable RED/GREEN slice:** Replace the valid fixture ledger with three complete claims whose statements are `固定基线中的事实。`, `带适用范围的事实。`, and `作者依据证据作出的推论。`; use ids `DSH-FIX-FACT-001`, `DSH-FIX-QUAL-001`, and `DSH-FIX-INFER-001`, documents `docs/fact.md#claim-dsh-fix-fact-001`, `docs/qualified.md#claim-dsh-fix-qual-001`, and `docs/inference.md#claim-dsh-fix-infer-001`, and the exact qualifications `仅适用于固定基线。` and `这是作者推论，不是上游原文。`. Give each record this exact synthetic-but-valid source: `{ "type": "upstream", "repository": "https://github.com/deepseek-ai/deepseek-harness", "commit": "76fda729799fe9b3848dbe2c211d4b231032b81e", "path": "README.md", "startLine": 1, "endLine": 1, "url": "https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/README.md#L1" }`. The test reads that fixture ledger, calls `validateClaimTargets({ root: fixtureRoot, ledger: fixtureLedger })`, filters `CLAIM_TARGET_MISSING`, and deep-equals the sorted `{ code, path, claimId }` records. RED expects all three records before the documents exist. GREEN creates each document with exactly `# Fixture`, a blank line, and its exact marker line, then expects `[]`; repository/community files are outside this focused validator's responsibility.

- [ ] Add `test('accepts one verified fact, qualified fact, and inference marker')` with one object of each kind in `test/fixtures/handbook/valid/evidence/claims.json`, using field order `id`, `statement`, `kind`, `confidence`, `maturity`, `documents`, `sources`, `qualification`, `probe`.
- [ ] Point those fixture claims at `docs/fact.md`, `docs/qualified.md`, and `docs/inference.md`; run `node --test --test-name-pattern='accepts one verified fact' test/verify-evidence.test.mjs`; expect exit code 1 and one `CLAIM_TARGET_MISSING` diagnostic per path.
- [ ] Write methodology sections for baseline authority, source hierarchy, claim kinds, confidence/maturity, qualification rules, immutable links, inspector probes, human-review limits, comparison-source rules, and the seven-step baseline-update procedure.
- [ ] Define at least Agent Harness, Cordis, Plugin, Effect, Service Definition/Provider/Consumer, Event, Waterfall, Profile, Bundle, Patch, Agent Preset, Scope, Session Event Log, Projection, PTC, Goal, and Workflow in a Chinese/English terminology table.
- [ ] Make the Profile/Preset table list exact ids and purposes. Cite the locale span above and state exactly that `ptc` is displayed as PTC mode and `cordis` as Creator mode; do not infer those labels from the Chinese `preset.yml` metadata.
- [ ] Build `source-map.md` as `upstream path/subsystem → claim ids → handbook documents`, not a second narrative. Include baseline, boot/composition, core loop, sessions, tools/PTC, sandbox, subagents/goals/workflows, SDKs, and experimental packages. At this stage render not-yet-created handbook paths as code spans, not Markdown links; each owning task converts its path to a link only after creating the target.
- [ ] Add one exact marker line to each fixture document, with anchor, visible id, and statement matching its ledger entry. Re-run the focused test and `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`; expect exit code 0 for both without adding methodology-only claims to the production ledger.
- [ ] Commit: `docs: define handbook evidence method`.

### Task 2: Write the project overview

**Files:**

- Create: `docs/01-overview.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** upstream `README.md:1-15`; `docs/architecture.md:9-29,41-47`; `package.json:1-10`.

**Interfaces:** Consumes the exact `DSH-OVR-001`–`DSH-OVR-003` inventory rows, schema-v1 ledger records, the Document Contract, and the listed immutable upstream spans. Produces `docs/01-overview.md`, three ledger records targeting its three anchors, and source-map rows. It may link only to `00-methodology.md`, `glossary.md`, and `source-map.md` at this stage.

**Executable RED/GREEN slice:** Insert the three complete inventory records in id order, with `documents` equal to `docs/01-overview.md#claim-dsh-ovr-001` through `003`, sources limited to the Evidence spans above, and the exact statement/qualification text above. RED runs the Document Contract command and asserts three parsed problems equal `{ code: 'CLAIM_TARGET_MISSING', claimId: <id> }`. GREEN creates the contracted headings and exact three marker lines, then expects no problem for those ids. The minimum body contains the literal sentences `Agent = Model + Harness 是本手册的解释框架，不是上游原文。`, `这里的“可替换”描述组合层面的实现选择，不表示运行中的组件可以任意并发替换。`, and `固定基线处于开发者预览阶段。` plus the specified Mermaid diagram and existing-target links.

- [ ] Add `DSH-OVR-001` through `DSH-OVR-003` with immutable line spans and targets `#claim-dsh-ovr-001` through `003`; run the Document Contract RED command and require exit 1 plus one `CLAIM_TARGET_MISSING` diagnostic naming each id.
- [ ] Write sections `一句话结论`, `Agent = Model + Harness`, `一切皆插件`, `可替换能力与装配基座`, and `成熟度与边界`.
- [ ] Explain that model reasoning and Harness world interaction are a reader model, while upstream's factual terms are “agent harness,” Cordis, and all-plugin architecture.
- [ ] Qualify “no privileged core”: model adapter, tool registry, session log, and loop are replaceable plugins, but a running product is still booted by Cordis, Loader, and the supported `dsh` Profile launcher.
- [ ] Add a compact Mermaid context diagram with Model, Harness plugin tree, tools/services, session log, and external world; do not imply a security boundary.
- [ ] Link only the already-created methodology, glossary, and source map; do not link the not-yet-created architecture or capability chapters. Add exact marker lines and update the source map. Run the Document Contract GREEN command and `git diff --check`; require both exit 0. Task 8 adds the complete five-chapter navigation, and Plan 3 later adds the Cordis deep-dive link.
- [ ] Commit: `docs: explain the project and its boundaries`.

### Task 3: Explain composition and lifecycle architecture

**Files:**

- Create: `docs/02-architecture.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/architecture.md:9-72,111-117`; `docs/cordis-primer.md:9-45`; `vendor/cordis/src/fiber.ts:64-93,114-117,427-441,675-695`; `packages/boot/app-boot/src/profile.ts:1-23,49-72,136-169`; `packages/preset/agent-presets/src/preset.ts:1-70`; `packages/preset/agent-presets/src/index.ts:380-426,745-794`; `packages/preset/agent-presets/src/mount.ts:368-415`; `packages/core/scope/src/index.ts:32-82,129-147`.

**Interfaces:** Consumes `DSH-ARCH-001`–`DSH-ARCH-005`, their exact inventory text, `ProfileObservation`, `PresetObservation`, and the listed upstream spans. Produces the first architecture chapter slice, five anchors, one two-lane Mermaid graph, and matching source-map rows; it does not yet describe Turn/Event mechanics.

**Executable RED/GREEN slice:** Add the five complete claim records in inventory order and target `docs/02-architecture.md#claim-dsh-arch-001` through `005`; assign the listed `vendor/cordis/src/fiber.ts` spans to `DSH-ARCH-001` so its lifecycle ownership, cleanup initiation, and failure qualification are source-backed. RED asserts five structured `{ code: 'CLAIM_TARGET_MISSING', claimId }` records. GREEN writes the contracted headings plus exact marker lines and these literal invariants: `Service Definition、Service Provider 与 Consumer 三者共同构成完整能力接缝。`, `web 在运行时重载 Patch；headless、sdk、sdk-minimal 与 acp 只在启动时应用组合；自定义 Profile 默认实时重载。`, and `Agent Preset 在每个 Agent 的子 Scope 中组合能力。`; verification returns no problem for those ids.

- [ ] Add `DSH-ARCH-001` through `DSH-ARCH-005`; run the Document Contract RED command and require five `CLAIM_TARGET_MISSING` diagnostics naming `DSH-ARCH-001` through `005`.
- [ ] Write `Cordis 与微内核`, `可逆副作用`, `服务与类型化事件`, `能力接缝`, and `两层组合` sections.
- [ ] Include a Mermaid flowchart whose application lane is `dsh → Profile → ordered Bundles → profile/home/CLI Patches → Cordis tree` and whose session lane is `Agent Preset → agent.ctx Scope → prompt/tools/services`.
- [ ] State Profile reload rules exactly: shipped `web` is live; `headless`, `sdk`, `sdk-minimal`, and `acp` are startup-only; custom Profiles default live. Do not imply arbitrary concurrent component swapping.
- [ ] State the three seam roles and use filesystem/shell or LLM as one concrete example; do not call a lone provider a seam.
- [ ] Add exact marker lines and links only to already-created overview/methodology/glossary/source-map targets, update the source map, run the Document Contract GREEN command and `git diff --check`, then commit: `docs: explain harness composition and lifecycle`. Task 8 adds the complete five-chapter navigation; Plan 3 adds reciprocal deep-dive links only after creating those files.

### Task 4: Explain turn execution and durable event history

**Files:**

- Modify: `docs/02-architecture.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/architecture.md:64-109`; `docs/agent-lifecycle.md:4-80`; `docs/tool-execution-pipeline.md:1-62`; `packages/core/session/src/types.ts:20-120,436-470`.

**Interfaces:** Consumes the existing architecture chapter, `DSH-ARCH-006`–`DSH-ARCH-007`, `SessionEventMap`, waterfall semantics, and the listed spans. Produces two additional ledger records/anchors, the Turn/Event section, one sequence diagram, and source-map rows without changing the Task 3 claims.

**Executable RED/GREEN slice:** Add two complete inventory records targeting `docs/02-architecture.md#claim-dsh-arch-006` and `007`. RED asserts two structured missing-target problems. GREEN appends the contracted sections, exact marker lines, and the literal statements `live 扩展事件不等于 durable Session Event Log。`, `Waterfall listener 必须调用 next() 才会委托后续处理。`, and `所有进入模型请求的输入都可由追加式 Session Event Log 重建。`; verification returns no problem for either id.

- [ ] Add `DSH-ARCH-006` and `DSH-ARCH-007`, point them at absent markers, run the Document Contract RED command, and require exit 1 with both ids in `CLAIM_TARGET_MISSING` diagnostics.
- [ ] Add `事件域`, `Turn 与 Step`, `工具执行瀑布`, `追加式日志与投影`, and `model-visible means logged` sections.
- [ ] Use one Mermaid sequence diagram showing inbox claim, `turn/start`, `step/start`, model request, tool calls through pre/execute/post, `step/end`, and `turn/end`; visually distinguish durable events from live extension events.
- [ ] State waterfall delegation (`next()`), zero-step turns, and that history, raw chunks, resume/fork/transcript/telemetry derive from the log. Do not call the live event bus durable.
- [ ] Add limitations: projection is not the original raw source; deterministic replay fixtures are not a complete end-user debugger or performance benchmark.
- [ ] Add exact marker lines/source-map rows, run the Document Contract GREEN command and `git diff --check`, then commit: `docs: map turns and durable session history`.

### Task 5: Build the ownership-aware capability matrix

**Files:**

- Create: `docs/03-capabilities.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `packages/boot/app-boot/src/profile.ts:136-158`; `packages/preset/agent-presets/presets/standard/preset.yml:1-3`; `packages/preset/agent-presets/presets/minimal/preset.yml:1-3`; `packages/preset/agent-presets/presets/ptc/preset.yml:1-3`; `packages/preset/agent-presets/presets/cordis/preset.yml:1-3`; `packages/preset/agent-presets/presets/standard/agent.cordis.yml:1-251`; `packages/preset/agent-presets/presets/minimal/agent.cordis.yml:1-88`; `packages/preset/agent-presets/presets/ptc/agent.cordis.yml:1-271`; `packages/preset/agent-presets/presets/cordis/agent.cordis.yml:1-262`; `packages/bundle/base/cordis.patch.yml:1-498`; `packages/bundle/web-app/cordis.patch.yml:1-444`; `packages/bundle/headless/cordis.patch.yml:1-30`; `packages/bundle/sdk-app/cordis.patch.yml:1-21`; `packages/bundle/acp-app/cordis.patch.yml:1-20`; `packages/bundle/sdk-minimal/cordis.patch.yml:1-168`; `packages/web/web-search-exa/package.json:1-12`; `packages/web/web-search-perplexity/package.json:1-12`; `packages/subagent/subagent-acp/package.json:1-12`; `packages/subagent/subagent-codex/package.json:1-12`; `packages/subagent/subagent-claude-code/package.json:1-12`; `packages/subagent/subagent-dsh-sdk/package.json:1-12`; `packages/subagent/subagent-codex/cordis.patch.yml:1-5`; `packages/subagent/subagent-claude-code/cordis.patch.yml:1-6`; `packages/experimental/AGENTS.md:1-9`; `packages/experimental/agent-team/package.json:1-10`; `packages/experimental/agent-team-profile/package.json:1-37`; `packages/experimental/agent-team-profile/cordis.patch.yml:1-37`; `packages/experimental/agent-team-web-profile/package.json:1-36`; `packages/experimental/agent-team-web-profile/cordis.patch.yml:1-6`; `packages/experimental/client-ui-agent-team/package.json:1-10`; `packages/experimental/tool-agent-team/package.json:1-10`; `packages/webhook/webhook/package.json:1-12`; `packages/webhook/webhook-github/package.json:1-12`; `docs/subsystems/webhook.md:5-37`; `docs/subsystems/llm-streaming.md:277-317,414-484,727-865`; `packages/llm/llm-pi-ai/README.md:10-12,25-71,144-150`; `docs/subsystems/tools.md:9-170,474-702`; `docs/subsystems/sandbox.md:1-79,154-219`; `docs/subsystems/session.md:178-381,563-649`; `docs/subsystems/subagent.md:1-170,389-464`; `docs/subsystems/goal.md:1-30,72-151`; `docs/subsystems/workflow.md:1-13,39-158`; `packages/sdk/server/README.md:12,46-52,123-128`; `docs/testing.md:12-16`.

**Interfaces:** Consumes `DSH-CAP-001`–`DSH-CAP-009`, the inspector's exact Profile/Preset observations, the four ownership prefixes, and the explicit evidence roster above. Produces one nine-claim chapter, an application matrix with five rows, a session matrix with four rows, subsystem capability tables, and source-map rows. Every row exposes separate `availability`, `owner`, `mechanism`, and `limit` cells; no row derives availability from confidence or maturity.

**Executable RED/GREEN slice:** Copy the nine canonical inventory rows into the ledger in id order with targets `docs/03-capabilities.md#claim-dsh-cap-001` through `009`; assign only the exact paths and line spans above, attach `profile:<id>` or `preset:<id>` probes only to roster claims `001` and `002`, assign the pi-ai documentation spans to `DSH-CAP-003` for configurable and hand-declared routes, and assign `docs/testing.md:12-16` to `DSH-CAP-009` for its replay-fixture premise. RED parses stderr JSON and deep-compares nine `{ code: 'CLAIM_TARGET_MISSING', path: 'docs/03-capabilities.md', claimId }` records. GREEN creates the contracted document with the nine byte-identical marker lines and tables whose owner cells use only the four approved prefixes, then requires no problem for those ids.

- [ ] Add `DSH-CAP-001` through `DSH-CAP-009`, using `profile:*` and `preset:*` probe keys for mechanically observed rosters. Run the Document Contract RED command; require exit 1 and nine missing-marker diagnostics. Keep the source-backed primitives in `006` separate from the author-inference product-absence conclusion in `009`.
- [ ] Add an application matrix for exactly five Profiles. Record `web`, `headless`, `sdk`, and `acp` as their surface Bundle over `dsh-base`; record `sdk-minimal` as a standalone complete tree and `danger-full-access` exception.
- [ ] Add a session matrix for exactly four Presets: Standard full native tool presentation; Minimal persistent shell plus `str_replace_editor`; PTC `run_code` with general workflow disabled; Cordis/Creator Standard plus runtime inspection and preset authoring.
- [ ] Add capability tables for LLM, tools, sandbox, sessions, delegation, goals, workflows, webhooks, and SDK access. Every row must use exactly one ownership prefix.
- [ ] Mark the pi-ai adapter/config routes as a dormant/configurable base row, not proof that OpenAI/Anthropic/Bedrock/Azure/Gemini are all preconfigured. Use the exact owners `optional-package:packages/web/web-search-exa` and `optional-package:packages/web/web-search-perplexity` for alternative search providers. Give optional subagent providers four distinct rows owned by `optional-package:packages/subagent/subagent-acp`, `optional-package:packages/subagent/subagent-codex`, `optional-package:packages/subagent/subagent-claude-code`, and `optional-package:packages/subagent/subagent-dsh-sdk`; only the Codex and Claude Code tool rows are present and disabled in the Standard Preset, so do not invent disabled ACP or DSH SDK rows. Enumerate Agent Teams as five distinct owners: `experimental:packages/experimental/agent-team`, `experimental:packages/experimental/agent-team-profile`, `experimental:packages/experimental/agent-team-web-profile`, `experimental:packages/experimental/client-ui-agent-team`, and `experimental:packages/experimental/tool-agent-team`; do not collapse them into one row or imply release publication.
- [ ] Put these qualifications in the table itself: sandbox modes govern filesystem effects; Windows ACL and older Landlock ABI enforcement may be partial; `danger-full-access` bypasses confinement; sessions expose primitives rather than a full debugger; a goal is not a scheduler; workflow workers are not a security sandbox.
- [ ] Add exact marker lines, source-map entries, and links to existing core documents. Run the Document Contract GREEN command and `git diff --check`, then commit: `docs: map capabilities to shipped compositions`. Plan 3 adds links to all six deep dives after their files exist.

### Task 6: Evaluate differentiators without ranking or metrics

**Files:**

- Create: `docs/04-differentiators.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/architecture.md:9-13,64-72,103-115`; `docs/cordis-primer.md:9-45`; `packages/core/tools/README.md:226-227`; `packages/code-runtime/code-runtime-worker-thread/README.md:12,42-49,141-146`; `packages/core/tools/src/ptc.ts:282-359,387-465,479-598,608-653`; `packages/core/tools/src/index.ts:789-794,1319-1352,1450-1488`; `packages/preset/agent-presets/src/index.ts:1-14,227-239,380-426,610-727,745-794`; `packages/preset/agent-presets/presets/standard/agent.cordis.yml:1-251`; `packages/preset/agent-presets/presets/ptc/agent.cordis.yml:1-271`; `packages/preset/agent-presets/presets/cordis/agent.cordis.yml:1-262`.

**Interfaces:** Consumes `DSH-DIFF-001`–`DSH-DIFF-005`, the exact analysis qualifications in the inventory, and the architecture/capability chapters. Produces five qualified inference records, five byte-identical markers, one repeated `机制 / 收益 / 代价与适用场景` evaluation for each conclusion, and source-map rows. It produces no score, benchmark, winner, or quantitative performance statement.

**Executable RED/GREEN slice:** Add the five complete inventory records with targets `docs/04-differentiators.md#claim-dsh-diff-001` through `005` and their exact qualifications; assign the listed `packages/preset/agent-presets/src/index.ts` spans to `DSH-DIFF-004` so both per-Session selection and the started-Session lock are explicit. RED deep-compares five missing-target records by stable code/path/id. GREEN writes the contracted headings, exact marker lines, and the literal limitation sentences `只有生命周期 API 拥有的副作用获得自动清理关系。`, `live 事件不等于 durable log。`, and `PTC 可能减少往返不等于已测得速度、成本或质量提升。`; the focused verifier then returns no problem for these ids.

- [ ] Add `DSH-DIFF-001` through `DSH-DIFF-005`, run the Document Contract RED command, and require exit 1 with five missing-marker diagnostics.
- [ ] Give each differentiator the same three subsections: `机制`, `收益`, `代价与适用场景`.
- [ ] Cover product-wide replacement, lifecycle-owned effects, three-role seams/typed events, model-visible logging, per-session composition, and PTC. Reuse a claim only when its statement remains identical across documents.
- [ ] Describe PTC as allowing one model-written TypeScript program to compose calls that re-enter the normal guarded pipeline and therefore *may* reduce model/tool round trips. State fresh state, resource limits, and non-replayable intermediate program values.
- [ ] Run `rg -n '更快|提速|降低成本|性能提升|最佳|领先|winner|benchmark' docs/04-differentiators.md`; review and remove any unsupported quantitative or ranking language.
- [ ] Add exact marker lines/source-map rows, run the Document Contract GREEN command and `git diff --check`, then commit: `docs: assess the harness differentiators`.

### Task 7: Write reproducible getting-started paths

**Files:**

- Create: `docs/05-getting-started.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `README.md:17-41`; `package.json:1-10`; `docs/architecture.md:41-47`; `apps/cli/reference/README.md:23-33`; `packages/sdk/client/README.md:25-48`; `packages/sdk/client/src/types.ts:23-65`; `packages/sdk/client/src/launch.ts:122-151`; `packages/util/home-paths/README.md:12,28-40`; `python/README.md:1-20`; `python/sdk/README.md:1-45`; `python/sdk/examples/README.md:1-40`; `python/sdk/pyproject.toml:5-16`; `python/sdk-runtime/pyproject.toml:5-16`; `SAFETY.md:5-23`.

**Interfaces:** Consumes `DSH-START-001`–`DSH-START-002`, the pinned source version/engine facts, and the five-path design. Produces exactly five numbered paths, two ledger records/markers, disposable experiment conventions, and source-map rows. The packaged path distinguishes an unpinned registry command from an explicitly selected source-declared version and never asserts registry publication or baseline equivalence.

**Executable RED/GREEN slice:** Add the two complete inventory records targeting `docs/05-getting-started.md#claim-dsh-start-001` and `002`; RED deep-compares two missing-target records. GREEN writes the contracted document and the exact five numbered headings `打包 Web UI`, `固定源码构建`, `Headless 单次任务`, `TypeScript SDK`, and `Python SDK`; it includes `pnpm dsh --profile headless "run the tests"` for the pinned source checkout and a TypeScript block that imports `DeepSeekHarness`, constructs it with `profile: 'sdk'`, runs `say hi`, prints `result.finalResponse`, and guarantees cleanup with `await using` or `close()` in `finally`. It inserts both exact marker lines and requires the verifier to return no problem for either id.

- [ ] Add `DSH-START-001` and `DSH-START-002`, run the Document Contract RED command, and require exit 1 with both missing-marker diagnostics.
- [ ] Write exactly five paths matching the design: (1) packaged Web UI, with floating and named-version commands as two reproducibility variants in the same path; (2) exact source checkout; (3) one-shot Headless using the exact pinned-checkout command `pnpm dsh --profile headless "run the tests"` and explaining that an installed `dsh` binary omits the `pnpm` prefix; (4) TypeScript SDK with the minimal `DeepSeekHarness` run/response/cleanup example and its `sdk` Profile; (5) Python SDK with its bundled runtime and explicit Harness home.
- [ ] Show these distinctions together: `npx @deepseek-ai/dsh web` follows the registry; `npx @deepseek-ai/dsh@0.1.2-rc.1 web` explicitly selects the version declared by the pinned source and succeeds only if that registry exposes it; neither command proves equivalence to the 99-commits-after-tag source tree. Exact handbook reproduction checks out the full SHA then uses `pnpm install`, `pnpm run build`, and `pnpm dsh web`.
- [ ] Include Node `^22.19.0 || >=24.0.0`, pnpm `11.7.0`, credential names without values, developer-preview warning, and a link to pinned `SAFETY.md`.
- [ ] Put runnable experiments in explicitly disposable workspace and Harness-home directories. State that the canonical upstream quick start normally uses the user's Harness home.
- [ ] Describe Python `deepseek-harness-sdk`, Python `>=3.10`, its bundled platform runtime, explicit home, and default `dsh --profile sdk` launch; do not imply an in-process Python reimplementation.
- [ ] Add the two exact marker lines and source-map rows, run the Document Contract GREEN command and `git diff --check`, then manually execute only already-installed, keyless `--help`/version commands that do not require package installation or model contact; record exactly which commands were run in the commit message or PR notes.
- [ ] Commit: `docs: add reproducible onboarding paths`.

### Task 8: Create the Chinese entry point and English summary

**Files:**

- Create: `README.md`
- Create: `README.en.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SUPPORT.md`
- Modify: `docs/01-overview.md`
- Modify: `docs/02-architecture.md`
- Modify: `docs/03-capabilities.md`
- Modify: `docs/04-differentiators.md`
- Modify: `docs/05-getting-started.md`
- Create: `test/handbook-navigation.test.mjs`

**Interfaces:** Consumes the five existing numbered chapters, their stable headings, the exact baseline, and the support/contribution files. Produces both entry points and a closed reader graph: README links every chapter plus methodology/glossary/source map; each chapter links methodology/source map and its existing previous/next neighbor; English links Chinese. The navigation test exports nothing and performs only repository reads.

**Executable RED/GREEN slice:** Create `test/handbook-navigation.test.mjs` with this complete content before either entry point or final chapter navigation exists:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const baseline = '76fda729799fe9b3848dbe2c211d4b231032b81e'
const chapters = [
  'docs/01-overview.md',
  'docs/02-architecture.md',
  'docs/03-capabilities.md',
  'docs/04-differentiators.md',
  'docs/05-getting-started.md',
]

async function text(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('entry points expose the required reader routes', async () => {
  const chinese = await text('README.md')
  const english = await text('README.en.md')
  assert.ok(chinese.includes(baseline))
  assert.match(chinese, /独立项目|非官方/u)
  assert.ok(chinese.includes(`https://github.com/deepseek-ai/deepseek-harness/blob/${baseline}/SAFETY.md`))
  for (const target of [...chapters, 'docs/00-methodology.md', 'docs/source-map.md', 'docs/glossary.md', 'README.en.md']) {
    assert.ok(chinese.includes(`](${target})`), target)
  }
  assert.ok(english.includes('](README.md)'))
})

test('core chapters form a complete reading path', async () => {
  for (const [index, path] of chapters.entries()) {
    const chapter = await text(path)
    assert.ok(chapter.includes('](00-methodology.md)'), `${path}: methodology`)
    assert.ok(chapter.includes('](source-map.md)'), `${path}: source map`)
    if (index > 0) assert.ok(chapter.includes(`](${chapters[index - 1].split('/').at(-1)})`), `${path}: previous`)
    if (index + 1 < chapters.length) assert.ok(chapter.includes(`](${chapters[index + 1].split('/').at(-1)})`), `${path}: next`)
  }
})
```

- [ ] Add the complete navigation test above. It asserts structural paths and stable content, never a diagnostic sentence.
- [ ] Run `node --test --test-name-pattern='entry points expose the required reader routes' test/handbook-navigation.test.mjs`; expect exit 1 because `README.md` and `README.en.md` do not exist.
- [ ] Run `node --test --test-name-pattern='core chapters form a complete reading path' test/handbook-navigation.test.mjs`; expect exit 1 because the five existing chapters do not yet contain the complete previous/next graph. Record this second RED independently.
- [ ] Write the Chinese README as an entry page containing purpose, audience, non-affiliation, exact baseline, five principal findings, safety warning, three reading routes, support, contribution, citation, and maintainer. Link rather than duplicate chapter bodies.
- [ ] Write the English summary with purpose, baseline, principal corrections, contents, verification commands, non-affiliation, safety, contribution, and Chinese-primary link.
- [ ] Now that all five files exist, add previous/next chapter links plus methodology/source-map links to each chapter; preserve exact claim markers and do not duplicate section prose.
- [ ] Add contribution/support links now that their targets exist; keep external upstream usage and security routes distinct.
- [ ] Re-run the focused test, `npm test`, `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, and `git diff --check`; expect every command to exit 0.
- [ ] Commit: `docs: add handbook entry points`.

### Task 9: Core-handbook acceptance checkpoint

**Files:**

- Review: `README.md`
- Review: `README.en.md`
- Review: `CONTRIBUTING.md`
- Review: `SUPPORT.md`
- Review: `docs/00-methodology.md`
- Review: `docs/01-overview.md`
- Review: `docs/02-architecture.md`
- Review: `docs/03-capabilities.md`
- Review: `docs/04-differentiators.md`
- Review: `docs/05-getting-started.md`
- Review: `docs/glossary.md`
- Review: `docs/source-map.md`
- Review: `evidence/claims.json`
- Review: `test/handbook-navigation.test.mjs`

**Interfaces:** Consumes the complete core-handbook tree and clean pinned upstream checkout. Produces either a byte-unchanged passing checkpoint or a focused correction committed under the earlier task that owns the defect; it creates no catch-all file or empty commit. Acceptance requires unique inventory ids, resolved markers, a closed reader graph, source-backed verification, qualified risky terms, supported Mermaid syntax, clean whitespace, and unchanged upstream state.

- [ ] Verify every Core Claim Inventory id appears exactly once in `evidence/claims.json`, has at least one source, and resolves to an explicit anchor.
- [ ] Run `npm test` and `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`; expect a full pass.
- [ ] Confirm the generic internal-link check reports no missing file or fragment; this checkpoint must not rely on not-yet-created deep-dive pages.
- [ ] Run `rg -n 'TODO|TBD|FIXME|XXX|Agent = Model \+ Harness.*DeepSeek|Code.*preset id|Creator.*preset id' README* docs evidence`; expect no placeholder or misattribution match after review.
- [ ] Run `rg -n 'OpenAI|Anthropic|Bedrock|Azure|Gemini|沙箱|回放|基准|PTC|workflow|目标' docs/03-capabilities.md docs/04-differentiators.md docs/05-getting-started.md`; inspect every match for the required qualification.
- [ ] Confirm all Mermaid blocks use the documented GitHub-supported subset by source review. Publication Plan Task 6 exclusively owns native GitHub rendering checks after the repository exists; do not add a renderer dependency here.
- [ ] Confirm the upstream worktree is still clean and this repository has no unresolved changes after any acceptance correction commit.
- [ ] Commit any focused correction as `fix: close core handbook acceptance gap`; otherwise do not create an empty commit.
