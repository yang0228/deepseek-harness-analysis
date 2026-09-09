# Deep-Dive Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six source-led deep dives that explain lifecycle, composition, sessions, tools/PTC, sandboxing, and orchestration without weakening the qualifications established in the core handbook.

**Architecture:** Each deep dive owns one mechanism and follows a fixed reader path: concise answer, runtime mechanism, source walkthrough, diagram, failure/limit table, and links back to core claims. New ledger claims cover only details not already represented by a core claim; shared conclusions reuse the existing canonical id and add the deep-dive target to its `documents` array.

**Tech Stack:** Markdown, GitHub Mermaid, JSON evidence ledger, existing Node inspector/verifier.

**Spec:** [`docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`](../specs/2026-09-04-evidence-handbook-design.md)

## Global Constraints

- Complete the foundation and core-handbook plans first, with a clean passing verifier.
- Never copy upstream source blocks. Explain behavior in original prose and cite immutable full-SHA line spans.
- Use the same five-part chapter sequence: concise answer, mechanism, evidence, qualifications, onward links.
- Reuse a core claim for an identical conclusion. Create a `DSH-DD-*` claim only for a distinct, source-supported conclusion.
- A claim with `confidence: qualified` must carry the limiting sentence in both the ledger and visible prose; `maturity: experimental` is independent and never substitutes for confidence.
- Diagrams describe relationships or lifecycles, not decorative summaries. Keep them inline and GitHub-native.
- Keep the exact terminology: Profile/Bundle/Patch at application boot; Agent Preset/Scope per session; durable session events versus live agent/capability events.
- Do not portray reload as arbitrary hot replacement, PTC as a benchmark result, sandboxing as complete system isolation, replay as a debugger, a Goal as a scheduler, Plan mode as a safety policy, or workflow workers as a security boundary.
- For each task, add or extend ledger targets first, run the verifier to see the missing anchor, then write the chapter and make it pass.

## File Map

- `docs/deep-dives/cordis-lifecycle.md` — Context/Realm/Fiber/Effect/Event lifecycle and disposal.
- `docs/deep-dives/profiles-bundles-presets.md` — application composition versus per-session composition.
- `docs/deep-dives/session-event-log.md` — append, commit, projection, persistence, resume, and completed-turn fork.
- `docs/deep-dives/tools-and-ptc.md` — ordinary guarded tool execution and PTC subdispatch.
- `docs/deep-dives/sandbox-execution.md` — policy resolution, platform providers, enforcement, and non-goals.
- `docs/deep-dives/subagents-goals-workflows.md` — delegation, continuation, Goal, Plan, Workflow, and experimental teams.
- `evidence/claims.json` — canonical deep-dive records plus reused core-document targets.
- `docs/source-map.md` and numbered core chapters — reciprocal navigation and source ownership.
- `test/handbook-navigation.test.mjs` — deep-dive reachability contract added after all six files exist.

## Document Contract

Each deep dive has exactly one H1 followed by `基线`, `一句话结论`, `机制`, `源码导读`, `限制与失败`, and `继续阅读`. Every highlighted conclusion uses the exact one-line marker contract defined in the core-handbook plan. For each task, RED is `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, exit 1, with one `CLAIM_TARGET_MISSING` diagnostic for every newly added document target. GREEN is the identical command plus `git diff --check`, both exit 0 with no stderr. Commit only the files listed for that task after GREEN.

## Deep-Dive Claim Inventory

Use these exact canonical Chinese statements and qualifications. Copy each `statement` and non-`—` `qualification` byte-for-byte into the ledger and every marker.

| Claim id | Kind / confidence / maturity | Canonical `statement` | Canonical `qualification` |
|---|---|---|---|
| `DSH-DD-CORDIS-001` | `upstream-fact` / `verified` / `released` | 子 Context 与隔离 Realm 共同决定插件可见性和 Service 解析范围。 | — |
| `DSH-DD-CORDIS-002` | `upstream-fact` / `qualified` / `released` | 同一 Effect 内的 disposer 默认逆序串接，单个 disposer 失败可能跳过其后续清理，而 Fiber 会记录错误并继续卸载。 | 跨 Effect 没有全局串行完成顺序；需要确保各项清理均被尝试的资源所有者必须显式处理清理异常。 |
| `DSH-DD-CORDIS-003` | `upstream-fact` / `verified` / `released` | Event Listener 由 Fiber 拥有，Waterfall Listener 通过显式调用 `next()` 委托后续处理。 | — |
| `DSH-DD-COMP-001` | `upstream-fact` / `verified` / `released` | Profile 从空配置行开始，依次应用 Bundle、Profile Patch、Home Patch 与 CLI Patch。 | — |
| `DSH-DD-COMP-002` | `upstream-fact` / `qualified` / `released` | Application Profile 的 `live` 或 `startup` 模式决定 Patch 变更何时进入应用组合。 | `live` 只覆盖 Patch 重载，不表示任意插件可以在活动请求中并发替换。 |
| `DSH-DD-COMP-003` | `upstream-fact` / `qualified` / `released` | Agent Preset 挂载完整的每 Agent 组合，复制出的用户 Preset 是独立快照。 | 部署升级不会更新已复制 Preset，因此副本会与其来源逐渐漂移。 |
| `DSH-DD-SESSION-001` | `upstream-fact` / `verified` / `released` | 追加式 Session Event Log 默认要求读取方认识每种事件，只有标记 `ignorable: true` 的未知事件可以跳过。 | — |
| `DSH-DD-SESSION-002` | `upstream-fact` / `verified` / `released` | 类型化 Projection 折叠已提交事件前缀，为 Host 与 Client 生成视图而不替代原始日志。 | — |
| `DSH-DD-SESSION-003` | `upstream-fact` / `qualified` / `released` | Resume 与已完成 Turn 的 Fork 在显式持久化所有权规则下保留已提交历史。 | Fork 选定的前缀不能结束于未完成 Turn 内；持久化 Provider 仍负责日志的耐久性与格式拒绝。 |
| `DSH-DD-TOOLS-001` | `upstream-fact` / `verified` / `released` | 注册工具携带策略与取消元数据，依次经过 pre-execute、provider execute 与 post-execute Waterfall。 | — |
| `DSH-DD-TOOLS-002` | `upstream-fact` / `verified` / `released` | `run_code` 的子调用复用普通工具执行的分阶段受保护管线，而不是绕过它。 | — |
| `DSH-DD-TOOLS-003` | `upstream-fact` / `qualified` / `released` | 每次 PTC 运行使用全新程序状态，并受资源与并发上限约束。 | 程序中的中间 JavaScript 值不会自动成为 durable Session Event。 |
| `DSH-DD-SANDBOX-001` | `upstream-fact` / `qualified` / `released` | Sandbox 请求先解析文件系统副作用模式；受约束模式再选择平台 Provider，而 `danger-full-access` 直接绕过 confinement。 | 该模式约束文件系统副作用，不构成通用网络、进程或凭据隔离。 |
| `DSH-DD-SANDBOX-002` | `upstream-fact` / `qualified` / `released` | Linux、macOS 与 Windows 使用不同的本地 Sandbox Provider，并报告各自的 enforcement 状态。 | Windows ACL 与部分受支持的 Landlock ABI 可能诚实返回 `partial`。 |
| `DSH-DD-SANDBOX-003` | `upstream-fact` / `qualified` / `released` | 必需的 confinement 不可用时执行会失败关闭，而 `danger-full-access` 会明确绕过 confinement。 | `danger-full-access` 是调用方选择的无约束模式，不能被描述为 Sandbox 保护。 |
| `DSH-DD-ORCH-001` | `upstream-fact` / `qualified` / `released` | 同一个 Subagent Service 接纳进程内与外部产品 Provider，并暴露不同的 continuation 语义。 | Provider 可注册不等于对应模型工具已在当前 Preset 中启用。 |
| `DSH-DD-ORCH-002` | `upstream-fact` / `qualified` / `released` | Goal 保存一个 durable current objective，并在进程内维护 activation。 | Resume 或 Fork 后需要重新激活 Goal；Goal 本身不是调度器。 |
| `DSH-DD-ORCH-003` | `upstream-fact` / `qualified` / `released` | Workflow 程序在受限 Worker API 中运行，并在完成或失败后执行 Dispose。 | Worker 的 API 限制用于缩小执行能力，但不构成安全 Sandbox。 |
| `DSH-DD-ORCH-004` | `upstream-fact` / `verified` / `experimental` | Agent Teams 位于私有 experimental package 中，并被官方发布排除。 | — |

---

### Task 1: Trace the Cordis lifecycle

**Files:**

- Create: `docs/deep-dives/cordis-lifecycle.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `vendor/cordis/src/context.ts:17-20,38-40,70-125`; `vendor/cordis/src/registry.ts:91-123,164-185,293-336`; `vendor/cordis/src/events.ts:24-32,37-108,177-243,254-301`; `vendor/cordis/src/fiber.ts:70-93,114-117,180-203,222-295,427-441,597-639,675-695`; `vendor/cordis/src/reflect.ts:134-170,225-242,267-304`; `vendor/cordis/src/utils.ts:27-31`; `vendor/loader/src/config/isolate.ts:25-101`; `docs/cordis-primer.md:9-45`.

**Interfaces:** Consumes core claims `DSH-ARCH-001`–`002`, the three exact `DSH-DD-CORDIS-*` inventory rows, and the listed Cordis source spans. Produces one three-claim deep dive, optional identical-statement targets added to the two reused core records, one lifecycle diagram, a failure/cost table, and source-map rows; Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add the three complete deep-dive records and any exact-statement reused targets before creating the document. RED parses verifier stderr and deep-compares one `CLAIM_TARGET_MISSING` record for every new `docs/deep-dives/cordis-lifecycle.md#claim-...` target. GREEN creates the Document Contract headings, inserts the three inventory statements byte-for-byte, and requires no remaining problem for those targets.

- [ ] Add `DSH-DD-CORDIS-001` through `003`; extend `DSH-ARCH-001` and `DSH-ARCH-002` only where the exact canonical statement appears. Run RED and require every new or extended target id in the missing-marker diagnostics.
- [ ] Write sections `Context 树与可见性`, `Plugin/Fiber 生命周期`, `Effect 与 disposer`, `事件注册与 waterfall`, `卸载与 reload`, and `失败模式`.
- [ ] Add one lifecycle flowchart: `plugin request → child Fiber/context → configured activation/entrypoint → owned registration → active → disposal request → detach/invalidate → start owned Effect wrappers → normal-path reverse chaining or failed wrapper with skipped same-Effect cleanup → Fiber logs failure → disposal settles`. Show pending-before-activation Effect draining, and show Service isolation as a separate branch rather than a global namespace.
- [ ] Explain synchronous registration versus async cleanup, ownership of `ctx.on()` listeners, reverse disposal order, and why missing `next()` intentionally short-circuits a waterfall.
- [ ] Add a cost table for lifecycle coupling, reload boundaries, and disposer responsibility. Avoid claiming every arbitrary side effect is automatically reversible; only registrations owned through lifecycle APIs are.
- [ ] Add exact markers and source-map rows without adding core/deep-dive navigation, run GREEN, and commit: `docs: trace the Cordis plugin lifecycle`.

### Task 2: Separate Profiles, Bundles, Patches, Presets, and Scopes

**Files:**

- Create: `docs/deep-dives/profiles-bundles-presets.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `packages/boot/app-boot/src/profile.ts:1-23,49-72,136-217`; `apps/cli/src/profile-boot.ts:1-12,80-168,278-309`; `packages/boot/app-boot/README.md:48-55,139`; `packages/preset/agent-presets/src/preset.ts:1-70`; `packages/preset/agent-presets/src/display.ts:42-65`; `packages/client/ui-agent-preset/src/client/locales.ts:34-45`; `packages/preset/agent-presets/src/index.ts:93-99,248-250,333-426,745-794`; `packages/preset/agent-presets/src/mount.ts:368-415`; `packages/core/scope/src/index.ts:32-82,129-147`; `packages/preset/agent-presets/README.md:71-79,165-179`; `packages/preset/agent-presets/src/authoring.ts:105-165`; `packages/preset/agent-presets/presets/standard/preset.yml:1-3`; `packages/preset/agent-presets/presets/minimal/preset.yml:1-3`; `packages/preset/agent-presets/presets/ptc/preset.yml:1-3`; `packages/preset/agent-presets/presets/cordis/preset.yml:1-3`; `packages/preset/agent-presets/presets/standard/agent.cordis.yml:1-251`; `packages/preset/agent-presets/presets/minimal/agent.cordis.yml:1-88`; `packages/preset/agent-presets/presets/ptc/agent.cordis.yml:1-271`; `packages/preset/agent-presets/presets/cordis/agent.cordis.yml:1-262`; `packages/bundle/base/cordis.patch.yml:1-498`; `packages/bundle/web-app/cordis.patch.yml:1-444`; `packages/bundle/headless/cordis.patch.yml:1-30`; `packages/bundle/sdk-app/cordis.patch.yml:1-21`; `packages/bundle/acp-app/cordis.patch.yml:1-20`; `packages/bundle/sdk-minimal/cordis.patch.yml:1-168`.

**Interfaces:** Consumes `DSH-DD-COMP-001`–`003`, exact Profile/Preset observations, the locale-owned PTC mode and Creator mode labels, and reused core claims `DSH-ARCH-004`–`005` plus `DSH-CAP-001`–`002`. Produces one composition table, two-lane diagram, three new claim records/markers, only byte-identical reused targets, and source-map rows; Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add all new and reused document targets first; RED deep-compares stable missing-target records for every target in `profiles-bundles-presets.md`. GREEN writes the exact three inventory marker lines and literal distinctions `Profile/Bundle/Patch 属于应用启动组合。`, `Agent Preset/Scope 属于每 Session 组合。`, and `用户 Preset 副本不会随部署升级自动更新。`, then requires verifier success and inspector roster equality.

- [ ] Add `DSH-DD-COMP-001` through `003`; extend `DSH-ARCH-004`, `DSH-ARCH-005`, `DSH-CAP-001`, and `DSH-CAP-002` only where their exact statements repeat. Run RED and require each new target id in the diagnostics.
- [ ] Write a comparison table with columns `概念`, `生命周期`, `存放位置`, `当前值`, `谁应用它`, and `可变更方式`.
- [ ] Add a two-lane Mermaid diagram. Boot lane: `dsh launcher → Profile manifest → ordered Bundle patches → profile patch → home patch → --patch → Cordis app tree`. Session lane: `Agent creation → Preset discovery/resolution → reused-or-created standing generation from preset agent.cordis.yml → Agent Scope parent binding → tools/prompts/services`.
- [ ] Trace each shipped Profile and Preset to its exact files. Call out `sdk-minimal` as the standalone exception and `cordis` as the authoritative Creator id.
- [ ] Explain whole-config replacement in patches, startup versus live reload, user preset copies as drifting snapshots, and why Presets are complete compositions rather than Profile overlays.
- [ ] Run `npm run inspect -- --source /Users/qingyang/github_repo/deepseek-harness --baseline evidence/baseline.json` and compare its normalized Profile/Preset arrays to the prose roster; then add exact markers and source-map rows without adding core/deep-dive navigation, run GREEN, and commit: `docs: separate application and session composition`.

### Task 3: Follow the session event log from append to projection and fork

**Files:**

- Create: `docs/deep-dives/session-event-log.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/subsystems/session.md:1-9,138-218,253-317,365-381,483-518,552-581,623-649`; `docs/subsystems/session-projection.md:5-11,38-70,72-106,182-234`; `packages/core/session/src/types.ts:20-120,436-470`; `packages/core/session/src/index.ts:418-445,525-580,637-722,790-820,895-920,1139-1218`; `packages/session/session-projection/src/index.ts:1-17,40-117,181-223`; `packages/session/session-persistence/src/index.ts:115-146`; `packages/session/session-persistence/src/handle.ts:37-94`; `packages/session/session-persistence/src/storage-contract.ts:1-148`; `packages/session/session-persistence/src/errors.ts:1-137`.

**Interfaces:** Consumes `DSH-DD-SESSION-001`–`003` and exact-statement reuse candidates `DSH-ARCH-007`, `DSH-CAP-006`, and `DSH-CAP-009`. Produces one three-claim deep dive, a representation data-flow diagram, persistence/fork limit table, and source-map rows without redefining core claims; Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add the three records and only exact-statement reused targets; assign the session-projection documentation and implementation spans above to `DSH-DD-SESSION-002`. RED requires one structured missing-target problem per new target. GREEN writes the three canonical marker lines, distinguishes raw log/derived messages/client projection in separate prose lines, states the exact Fork and unknown-event qualifications, and requires zero target or source problems.

- [ ] Add `DSH-DD-SESSION-001` through `003`; extend `DSH-ARCH-007`, `DSH-CAP-006`, and `DSH-CAP-009` only where their canonical statements repeat. Run RED and require every new target id in the diagnostics.
- [ ] Write sections `事件封套与顺序`, `append/commit/broadcast`, `deriveMessages`, `typed projections`, `持久化与所有权`, `resume`, `completed-turn fork`, and `格式拒绝策略`.
- [ ] Add a data-flow diagram `producer → append-only log → committed prefix → model-history projection / UI projection / persistence / transcript / telemetry / fork seed`.
- [ ] Explain `SESSION_FORMAT_VERSION = 0`, required-on-read event types, `ignorable: true`, monotonic sequence ownership, seeded-prefix metadata, and failures for unsupported/corrupt logs.
- [ ] State that raw log, derived messages, and projected client state are distinct representations. State that repository replay/snapshot fixtures are deterministic test infrastructure, not a general debugger or benchmark product.
- [ ] Add exact markers and source-map rows without adding core/deep-dive navigation, run GREEN, and commit: `docs: trace durable session history`.

### Task 4: Trace registered tools and Programmatic Tool Calling

**Files:**

- Create: `docs/deep-dives/tools-and-ptc.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/tool-execution-pipeline.md:1-62`; `packages/core/tools/README.md:26-32,62-87,101-130,167-198,222-227`; `packages/core/tools/src/index.ts:213-261,282-295,548-573,649-663,777-887,1022-1053,1092-1115,1200-1209,1319-1352,1355-1442,1450-1498,1523-1612`; `packages/core/tools/src/schema.ts:545-617`; `packages/core/tools/src/ptc.ts:282-359,387-465,479-598,608-653`; `scripts/gen-tool-catalog.ts:1-6,200-215,230-243,708-740`; `packages/preset/agent-presets/presets/ptc/agent.cordis.yml:1-25,236-270`; `packages/code-runtime/code-runtime-worker-thread/README.md:12,42-49,141-146`.

**Interfaces:** Consumes `DSH-DD-TOOLS-001`–`003` and exact-statement reuse candidates `DSH-CAP-004` and `DSH-DIFF-005`. Produces one three-claim deep dive, a convergent direct/PTC sequence diagram, guard/resource-limit table, and source-map rows; Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add all new targets before the document; RED deep-compares the missing-target records. GREEN writes the three exact marker lines and a Mermaid sequence in which direct calls and `run_code` subcalls converge on the shared prepare/dispatch/finalize/finish implementations, preserving guards and live-versus-durable result ordering, then requires no target problem and no prohibited quantitative/ranking phrase.

- [ ] Add `DSH-DD-TOOLS-001` through `003`; extend `DSH-CAP-004` and `DSH-DIFF-005` only where their canonical statements repeat. Run RED and require every new target id in the diagnostics.
- [ ] Write the ordinary tool path first: registry/schema presentation; lossless argument snapshot before `tools/pre-execute` and guards; definition-owned parameter validation immediately before a `defineTool` body, with raw `ToolDefinition` validation remaining tool-owned; provider execution; `tools/post-execute`; live canonical `value`, durable `content`, and tool-private presentation `meta`; result logging/presentation; cancellation; and tool-owned background behavior such as bash through `ctx.jobs`.
- [ ] Add a Mermaid sequence diagram in which a direct call reaches the public execution entry while a `run_code` subcall reaches the internal scheduler, and both converge on shared prepare/dispatch/finalize/finish implementations with guards and live-versus-durable result ordering intact.
- [ ] Explain the generated TypeScript SDK, language renderer/runtime requirement, reserved `run_code`, tool visibility inside subdispatch, concurrency classification/cap, and fresh per-run state.
- [ ] Put PTC limits beside the mechanism: intermediate JS values are not durable session events, a workflow tool is disabled in the PTC Preset, and fewer model/tool turns are a potential interaction change rather than a measured performance result.
- [ ] Search this document for quantitative/ranking language, add exact markers and source-map rows without adding core/deep-dive navigation, run GREEN, and commit: `docs: trace tools and programmatic calling`.

### Task 5: Explain the local sandbox execution boundary

**Files:**

- Create: `docs/deep-dives/sandbox-execution.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/subsystems/sandbox.md:1-30,41-79,98-158,168-219`; `packages/sandbox/sandbox/src/index.ts:17-59,128-175`; `packages/sandbox/sandbox-policy/src/index.ts:59-77,104-178`; `packages/sandbox/sandbox-local/src/profiles.ts:12-58`; `packages/sandbox/sandbox-local/src/index.ts:151-187,307-344,486-539`; `packages/shell/bash-sandbox/src/index.ts:80-177`; `packages/sandbox/sandbox-windows-acl/src/index.ts:149-209`; `packages/bundle/sdk-minimal/cordis.patch.yml:41-45`.

**Interfaces:** Consumes `DSH-DD-SANDBOX-001`–`003` and exact-statement reuse candidate `DSH-CAP-005`. Produces one three-claim deep dive, policy decision flow, platform/enforcement table, explicit non-goals, and source-map rows; Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add the qualified records with their exact inventory qualifications and all targets first; RED requires the corresponding stable missing-target set. GREEN creates the three marker lines, includes `partial`, fail-closed, and `danger-full-access` as separate decision outcomes, and requires zero verifier problems while a terminology scan retains only explicit negations of general isolation.

- [ ] Add `DSH-DD-SANDBOX-001` through `003` with `confidence: qualified`; extend `DSH-CAP-005` only where its canonical statement repeats. Run RED and require every new target id in the diagnostics.
- [ ] Write sections `请求与已解析规格`, `策略模式`, `平台提供方`, `Shell 包装链`, `enforcement 状态`, `失败关闭`, and `明确不覆盖的风险`.
- [ ] Add a decision flowchart: requested mode → policy resolution → `danger-full-access` bypass OR provider selection → platform wrapper → subprocess. Show `partial` as an outcome, not an exception hidden in prose.
- [ ] Use a platform table for Linux bwrap/Landlock, macOS Seatbelt, and Windows ACL. Preserve the upstream qualification that Windows and older supported Landlock ABIs may report partial enforcement; do not invent a kernel threshold.
- [ ] State repeatedly but concisely that these modes govern filesystem effects, not general network/process/credential isolation. Note that `sdk-minimal` deliberately selects danger-full-access and that required confinement unavailable fails closed.
- [ ] Add exact markers and source-map rows without adding core/deep-dive navigation, run GREEN and a terminology search for overclaims; commit: `docs: define the sandbox execution boundary`.

### Task 6: Distinguish subagents, goals, plans, and workflows

**Files:**

- Create: `docs/deep-dives/subagents-goals-workflows.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Evidence:** `docs/subsystems/subagent.md:1-17,122-170,219-267,389-458`; `packages/subagent/subagent/src/types.ts:1-346`; `packages/subagent/subagent/src/index.ts:1-641`; `packages/subagent/subagent/src/continuation.ts:1-1719`; `packages/subagent/subagent-spawn-in-process/src/index.ts:34-69`; `packages/subagent/subagent-fork-in-process/src/index.ts:40-94`; `packages/subagent/subagent-codex/src/index.ts:63-110`; `packages/subagent/subagent-codex/README.md:12,96-103`; `packages/subagent/subagent-claude-code/src/index.ts:73-126`; `packages/subagent/subagent-claude-code/README.md:12,100-103`; `packages/subagent/subagent-acp/src/index.ts:141-188`; `packages/subagent/subagent-acp/README.md:12,88-94`; `packages/subagent/subagent-dsh-sdk/src/index.ts:129-199`; `packages/subagent/subagent-dsh-sdk/README.md:12,92-107`; `docs/subsystems/goal.md:1-30,72-100,143-145`; `packages/goal/goal/README.md:10-12,54-72,95-101,151-162`; `docs/subsystems/plan.md:1-17,31-39`; `docs/subsystems/workflow.md:1-13,39-65,93-128`; `packages/workflow/workflow/src/types.ts:1-131`; `packages/workflow/workflow/src/runtime-types.ts:1-49`; `packages/workflow/workflow-worker-thread/src/index.ts:2-5,106-201`; `packages/workflow/tool-workflow/src/index.ts:1-8,133-149,281-324`; `packages/experimental/agent-team/package.json:1-10`; `packages/experimental/agent-team-profile/README.md:1-12`; `packages/experimental/AGENTS.md:1-8`.

**Interfaces:** Consumes `DSH-DD-ORCH-001`–`004`, exact-statement reuse candidates `DSH-CAP-007`–`008`, and the released/experimental split. Produces four new markers, provider/responsibility tables, two lifecycle diagrams, and source-map rows; `DSH-DD-ORCH-004` remains `verified` plus `experimental` with no qualification, and Task 7 owns every core/deep-dive navigation edge.

**Executable RED/GREEN slice:** Add all four records and any byte-identical reused targets first; RED requires four stable missing-target records for the new ids. GREEN writes the exact marker lines, separates Provider availability from tool enablement, and includes the literal limits `Goal 不是调度器。`, `Plan mode 不是安全策略。`, and `Workflow Worker 不是安全 Sandbox。`; verification must return no problem.

- [ ] Add `DSH-DD-ORCH-001` through `004`; set `004` to `confidence: verified`, `maturity: experimental`; extend `DSH-CAP-007` and `DSH-CAP-008` only where their canonical statements repeat. Run RED and require every new target id in the diagnostics.
- [ ] Open with a responsibility table: Subagent delegates work; Goal records one durable current objective; Plan mode records soft per-agent guidance; Workflow executes a model-authored program over an allowed API.
- [ ] Add a provider table separating Standard's in-process fresh/fork providers from optional ACP, Codex, Claude Code, and DSH SDK providers, including one-shot versus continuable behavior and the fact that disabled tool rows are not active defaults.
- [ ] Add one sequence diagram for parent delegation and continuation, and one small workflow lifecycle diagram `validate → worker → allowed calls → completion/error → dispose`.
- [ ] State that goal activation is process-local after resume/fork, Goal is not a scheduler, Plan mode is not approval/sandbox policy, worker code has no ordinary filesystem/network/timer/Node APIs, and worker containment is not a security boundary.
- [ ] Identify Agent Teams only as a private experimental package excluded from official releases, under the exact `DSH-DD-ORCH-004` marker.
- [ ] Add all exact markers and source-map rows without adding core/deep-dive navigation, run GREEN, and commit: `docs: distinguish delegation and orchestration primitives`.

### Task 7: Cross-link and accept all deep dives

**Files:**

- Modify: `README.md`
- Modify: `docs/01-overview.md`
- Modify: `docs/02-architecture.md`
- Modify: `docs/03-capabilities.md`
- Modify: `docs/04-differentiators.md`
- Modify: `docs/05-getting-started.md`
- Modify: `docs/source-map.md`
- Modify: `test/handbook-navigation.test.mjs`
- Modify: `docs/deep-dives/cordis-lifecycle.md`
- Modify: `docs/deep-dives/profiles-bundles-presets.md`
- Modify: `docs/deep-dives/session-event-log.md`
- Modify: `docs/deep-dives/tools-and-ptc.md`
- Modify: `docs/deep-dives/sandbox-execution.md`
- Modify: `docs/deep-dives/subagents-goals-workflows.md`
- Review: `evidence/claims.json`

**Interfaces:** Consumes the six completed deep dives and the Core Plan's `text(path)` test helper. Produces a reachable navigation graph: README links all six deep dives; exact relevant core chapters link each dive; every dive links its owning core chapter; all ledger targets remain unchanged. It creates no new claim.

**Executable RED/GREEN slice:** Append this complete test before adding navigation:

```js
test('deep dives are reachable from entry and owning chapters', async () => {
  const dives = [
    { file: 'cordis-lifecycle.md', owner: '02-architecture.md' },
    { file: 'profiles-bundles-presets.md', owner: '02-architecture.md' },
    { file: 'session-event-log.md', owner: '02-architecture.md' },
    { file: 'tools-and-ptc.md', owner: '03-capabilities.md' },
    { file: 'sandbox-execution.md', owner: '03-capabilities.md' },
    { file: 'subagents-goals-workflows.md', owner: '03-capabilities.md' },
  ]
  const readme = await text('README.md')
  for (const { file } of dives) assert.ok(readme.includes(`](docs/deep-dives/${file})`), file)
  const owners = new Map([
    ['docs/01-overview.md', ['cordis-lifecycle.md']],
    ['docs/02-architecture.md', ['cordis-lifecycle.md', 'profiles-bundles-presets.md', 'session-event-log.md']],
    ['docs/03-capabilities.md', ['tools-and-ptc.md', 'sandbox-execution.md', 'subagents-goals-workflows.md']],
    ['docs/04-differentiators.md', ['cordis-lifecycle.md', 'tools-and-ptc.md']],
    ['docs/05-getting-started.md', ['profiles-bundles-presets.md', 'sandbox-execution.md']],
  ])
  for (const [owner, expected] of owners) {
    const chapter = await text(owner)
    for (const dive of expected) assert.ok(chapter.includes(`](deep-dives/${dive})`), `${owner}: ${dive}`)
  }
  for (const { file, owner } of dives) {
    const chapter = await text(`docs/deep-dives/${file}`)
    assert.ok(chapter.includes(`](../${owner})`), `${file}: ${owner}`)
  }
})
```

- [ ] Append the test above, then run `node --test --test-name-pattern='deep dives are reachable' test/handbook-navigation.test.mjs`; expect exit 1 before navigation is added. Assert only missing structural links, never diagnostic prose.

- [ ] Add one `专题深挖` navigation block to the README, relevant “继续阅读” links from each core chapter, and each dive's exact owner link asserted by the test. Do not duplicate deep-dive prose.
- [ ] Verify every `DSH-DD-*` id exists once, every listed document target contains its explicit anchor, and no two claim entries state the same conclusion under different ids.
- [ ] Run `npm test` and `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`; expect all tests and source-backed checks to pass.
- [ ] Run `rg -n 'TODO|TBD|FIXME|XXX|完整隔离|任意热替换|性能提升|调试器|调度器|安全沙箱' docs/deep-dives`; inspect every match and retain only explicit negations/qualifications.
- [ ] Run `git diff --check` and confirm the upstream checkout remains clean.
- [ ] Source-review Mermaid blocks against GitHub-supported syntax. Publication Plan Task 6 exclusively owns native GitHub previews after the remote exists; do not add a renderer here.
- [ ] Commit: `docs: connect the architecture deep dives`.
