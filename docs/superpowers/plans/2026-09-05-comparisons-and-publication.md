# Comparisons and GitHub Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish two evidence-based, non-ranking comparison reports, complete final repository quality checks, create `yang0228/deepseek-harness-analysis`, apply GitHub project settings, and tag the verified snapshot.

**Architecture:** A comparison methodology separates Agent frameworks from coding-agent products and records external facts in the same claim ledger as upstream facts. Publication is a gated state machine: local evidence pass, authenticated-owner/nonexistence preflight, public repository creation, first CI pass, account-setting verification, required-check enforcement, then an annotated snapshot tag.

**Tech Stack:** Markdown, JSON evidence ledger, official first-party web sources, existing Node verifier, Git, GitHub web UI or authenticated GitHub CLI when available, GitHub Actions.

**Spec:** [`docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`](../specs/2026-09-04-evidence-handbook-design.md)

## Global Constraints

- Complete the foundation, core-handbook, and deep-dive plans first. Begin with a clean local `main` and a passing source-backed verifier.
- Compare two different sets: LangGraph/AutoGen/OpenAI Agents SDK as frameworks; Claude Code/OpenAI Codex as coding-agent products. Never mix them into one ranking.
- Use only official documentation, official repositories, specifications, and first-party release notes. For OpenAI material, invoke the `openai-docs` skill: Agents SDK evidence may use only `developers.openai.com/api/docs/guides/agents` and its official child pages; Codex evidence may use only `developers.openai.com`, `platform.openai.com`, or `learn.chatgpt.com`. No other host is permitted for either OpenAI subject.
- Capture actual access date, publisher, and version or repository commit when exposed. Keep “not documented” distinct from “not supported.”
- When an external source uses an immutable GitHub blob or tree URL matching `^https://github\.com/[^/]+/[^/]+/(?:blob|tree)/([0-9a-f]{40})/.+$`, its ledger `commit` field is mandatory and must equal capture group 1 byte-for-byte. For example, `https://github.com/acme/example/blob/0123456789abcdef0123456789abcdef01234567/README.md` requires `"commit": "0123456789abcdef0123456789abcdef01234567"`; a mismatch or omission is `EXTERNAL_SOURCE_REVISION_MISMATCH` for that claim and source index.
- Label each comparison statement as documented fact, qualified fact, unavailable information, or author inference. Do not score, crown a winner, benchmark, or claim speed/cost/quality superiority.
- The verifier remains offline. External-link freshness and first-party authority are manual review gates.
- Treat GitHub repository creation, settings, push, and tag as user-authorized publication work, but stop before mutation on ambiguous identity, target existence, permissions, network, or authentication.
- Never overwrite an existing remote, change a different repository, force-push, expose a credential, or create the tag before CI and settings gates pass.
- The authoring host currently has no `gh` executable. Prefer an already authenticated GitHub browser session; use `gh` only if it becomes available and authenticated without installing it implicitly.
- Keep disposable comparison notes under `/private/tmp/deepseek-harness-analysis-research/`; never commit them or treat search-result text as evidence.

## File Map

- `docs/comparisons/methodology.md` — object grouping, common criteria, evidence classes, missing-information policy, and prohibited conclusions.
- `docs/comparisons/agent-frameworks.md` — LangGraph, AutoGen, and OpenAI Agents SDK comparison using the fixed framework claims.
- `docs/comparisons/coding-agent-products.md` — Claude Code and OpenAI Codex comparison using the fixed product claims.
- `evidence/claims.json` — external-comparison facts and the two explicitly qualified cross-project inferences.
- `test/comparison-evidence-contract.test.mjs` — offline external-source and commit/URL consistency contracts.
- `README.md`, `docs/00-methodology.md`, `docs/glossary.md`, `docs/source-map.md` — comparison navigation and shared terminology.
- `docs/maintainer/repository-settings.md` — versioned owner checklist for GitHub-only settings and Action provenance.
- `CITATION.cff` and `.github/ISSUE_TEMPLATE/factual-error.yml`, `.github/ISSUE_TEMPLATE/upstream-drift.yml`, `.github/ISSUE_TEMPLATE/analysis-proposal.yml` — post-push native-rendering checks.
- Git refs `refs/heads/main`, `refs/heads/codex/record-repository-settings`, and `refs/tags/snapshot-76fda729` — publication artifacts created only after their preceding gates pass.

## Canonical Comparison Claims

The following Chinese `statement` values are final. Copy each sentence byte-for-byte into `evidence/claims.json` and after its one-line document marker; implementation may narrow a statement only when the cited official page no longer supports it, and such a change requires returning to design review rather than inventing replacement prose during execution.

| Claim id | `kind / confidence / maturity` | Canonical Chinese `statement` |
|---|---|---|
| `CMP-FW-LANGGRAPH-001` | `external-comparison / verified / not-applicable` | LangGraph 是面向长时、有状态工作流与 Agent 的低层编排框架和运行时，可在同一图中组合确定性步骤与由大模型驱动的步骤。 |
| `CMP-FW-LANGGRAPH-002` | `external-comparison / verified / not-applicable` | LangGraph 的 checkpointer 按 thread 保存图状态检查点，store 保存跨 thread 的应用数据；检查点支持续接、故障恢复、回放与从既有检查点分叉。 |
| `CMP-FW-LANGGRAPH-003` | `external-comparison / verified / not-applicable` | LangGraph 的 `interrupt()` 可在节点内暂停执行并保存状态；调用方以相同 `thread_id` 和 `Command(resume=...)` 恢复时，该节点会从开头重新执行。 |
| `CMP-FW-AUTOGEN-001` | `external-comparison / verified / not-applicable` | AutoGen Core 中，Agent 通过可序列化消息通信，运行时负责直接消息、发布订阅和消息处理器调度。 |
| `CMP-FW-AUTOGEN-002` | `external-comparison / verified / not-applicable` | AutoGen AgentChat 提供多种团队预设和终止条件；团队在未调用 `reset()` 时保留对话历史与上下文，并可继续上一次运行。 |
| `CMP-FW-AUTOGEN-003` | `external-comparison / verified / not-applicable` | AutoGen 项目维护的 `autogen-ext` 包提供 Agent、模型客户端、工具、代码执行器和 Agent 运行时等组件实现。 |
| `CMP-FW-OPENAI-001` | `external-comparison / verified / not-applicable` | OpenAI Agents SDK 以 Agent 封装模型、指令及可选的工具、护栏、MCP、交接和结构化输出，并由运行器执行包含模型调用、工具调用和交接的 Agent 循环。 |
| `CMP-FW-OPENAI-002` | `external-comparison / verified / not-applicable` | OpenAI Agents SDK 把工具作为 Agent 的可选能力，并允许管理 Agent 将其他 Agent 作为受限工具调用，同时保留最终答复的控制权。 |
| `CMP-FW-OPENAI-003` | `external-comparison / verified / not-applicable` | OpenAI Agents SDK 支持由应用保存历史、由 Session 持久化状态或复用服务端标识来续接下一轮，并用 tracing 记录工具与交接等调用以辅助调试审批流程。 |
| `CMP-FW-OPENAI-004` | `external-comparison / verified / not-applicable` | OpenAI Agents SDK 以 handoff 或 agents-as-tools 组织多 Agent 工作流，并以输入、输出和工具护栏及人工审批决定运行继续、暂停或停止。 |
| `CMP-ANALYSIS-FW-001` | `analysis-inference / qualified / not-applicable` | 三个框架都提供 Agent 编排，但主要组合单位不同：LangGraph 以图和持久化状态为中心，AutoGen 以消息运行时和团队为中心，OpenAI Agents SDK 以 Agent、运行器、工具和交接为中心；DSH 的比较重点是 Cordis 插件生命周期与可替换能力接口。 |
| `CMP-PROD-CLAUDE-001` | `external-comparison / verified / not-applicable` | Claude Code 以工具和 MCP 接入操作及外部服务，以 Skills 承载按需知识与工作流，并用 Plugins 打包 Skills、Hooks、Subagents 和 MCP servers。 |
| `CMP-PROD-CLAUDE-002` | `external-comparison / verified / not-applicable` | Claude Code Hooks 在工具执行、会话边界、提示提交、权限请求和压缩等生命周期事件触发外部处理，所有匹配来源的 Hooks 都会运行。 |
| `CMP-PROD-CLAUDE-003` | `external-comparison / verified / not-applicable` | Claude Code 的权限规则与权限模式共同决定工具调用被允许、拒绝还是请求批准，规则可来自管理、用户、项目和本地配置层。 |
| `CMP-PROD-CLAUDE-004` | `external-comparison / verified / not-applicable` | Claude Code Subagents 在独立上下文中执行任务并向父会话返回结果；Claude Agent SDK 将 Agent 循环、工具和上下文管理能力提供给应用代码。 |
| `CMP-PROD-CODEX-001` | `external-comparison / verified / not-applicable` | OpenAI 的编码任务入口包括 ChatGPT 桌面应用中的 Codex、Codex CLI、IDE 扩展与 Codex cloud，各入口覆盖不同的本地或云端工作流。 |
| `CMP-PROD-CODEX-002` | `external-comparison / verified / not-applicable` | OpenAI Codex 通过配置文件、`AGENTS.md`、Skills、Plugins、Hooks 与 MCP 调整指令、工具连接和工作流。 |
| `CMP-PROD-CODEX-003` | `external-comparison / verified / not-applicable` | 在本地执行中，OpenAI Codex 以 sandbox policy 限制文件系统和命令执行，并以独立的 approval policy 决定何时请求用户授权。 |
| `CMP-PROD-CODEX-004` | `external-comparison / verified / not-applicable` | Codex 提供 Subagents、非交互模式、SDK 与 App Server，用于任务委托和程序化集成；定时任务通过 ChatGPT 桌面应用或网页端管理。 |
| `CMP-ANALYSIS-PROD-001` | `analysis-inference / qualified / not-applicable` | Claude Code 与 OpenAI Codex 的官方材料主要描述成品编码 Agent 的用户、扩展和安全界面，而 DSH 是可组合的 Agent 运行时；因此可比单位是工具、执行策略、会话与委托表面，而不是隐藏实现或总体优劣。 |

Use these exact qualifications:

- `CMP-ANALYSIS-FW-001`: `这是基于各项目公开抽象与 DSH 已记录架构所作的跨项目归纳，不代表实现等价或完整内部架构比较。`
- `CMP-ANALYSIS-PROD-001`: `这是基于公开产品表面与 DSH 已记录架构所作的跨层比较，不代表隐藏实现、性能、成本或质量结论。`

Each production external source record has this field order:

```json
{
  "type": "external",
  "url": "https://docs.langchain.com/oss/python/langgraph/persistence",
  "publisher": "LangChain",
  "accessDate": "2026-09-05"
}
```

When the source is an immutable repository blob or tree, use a `commit` field with its full SHA instead of `version`. The URL must match the regular expression in Global Constraints, and the field must equal its captured 40-character lowercase SHA exactly; a mismatch or omission is `EXTERNAL_SOURCE_REVISION_MISMATCH`. Omit both version and commit only when the publisher exposes neither. For example, `CMP-FW-LANGGRAPH-001` targets `docs/comparisons/agent-frameworks.md#claim-cmp-fw-langgraph-001`, whose full marker line is `<a id="claim-cmp-fw-langgraph-001"></a> **Claim \`CMP-FW-LANGGRAPH-001\`:** LangGraph 是面向长时、有状态工作流与 Agent 的低层编排框架和运行时，可在同一图中组合确定性步骤与由大模型驱动的步骤。`.

---

### Task 1: Define a comparison method that prevents false equivalence

**Files:**

- Create: `docs/comparisons/methodology.md`
- Modify: `docs/00-methodology.md`
- Modify: `docs/glossary.md`
- Modify: `docs/source-map.md`
- Modify: `README.md`
- Create: `test/comparison-evidence-contract.test.mjs`
- Modify: `test/fixtures/handbook/valid/evidence/claims.json`
- Create: `test/fixtures/handbook/valid/docs/comparisons/sample.md`

**Interfaces:**

- Input: the foundation plan's `validateClaimsLedger(value, baseline)`, `validateClaimTargets(options)`, `EvidenceProblem`, external-source revision rules, and valid handbook fixture.
- Output: `docs/comparisons/methodology.md` with headings `# 比较方法`, `## 对象分组`, `## Agent 框架标准`, `## 编码 Agent 产品标准`, `## 证据分类`, `## 缺失信息`, and `## 禁止结论`; linked terminology/source-map entries; one offline policy test.
- Validation contract: an external GitHub blob or tree URL matching `^https://github\.com/[^/]+/[^/]+/(?:blob|tree)/([0-9a-f]{40})/.+$` requires `source.commit === match[1]`; absence or inequality returns `{ code: "EXTERNAL_SOURCE_REVISION_MISMATCH", claimId: "CMP-FW-TEST-001", sourceIndex: 0 }` for the isolated fixture ledger.
- Document contract: framework rows use columns `标准 | 官方事实 | 官方来源 | DSH 对应机制 | 未见官方文档说明 | 作者推论`; product rows use `标准 | 官方事实 | 官方来源 | DSH 对应表面 | 未见官方文档说明 | 作者推论`. Cells never contain scores.

**Executable RED/GREEN slice:** Create `test/comparison-evidence-contract.test.mjs` with this complete content:

```js
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { validateClaimsLedger, validateClaimTargets } from '../scripts/verify-evidence.mjs'

const fixtureRoot = fileURLToPath(new URL('./fixtures/handbook/valid/', import.meta.url))
const blobUrl = 'https://github.com/acme/example/blob/0123456789abcdef0123456789abcdef01234567/README.md'

function stableProblems(problems) {
  return problems.map(problem => Object.fromEntries(
    ['code', 'path', 'field', 'claimId', 'sourceIndex']
      .filter(key => problem[key] !== undefined)
      .map(key => [key, problem[key]]),
  ))
}

async function comparisonFixture() {
  const baseline = JSON.parse(await readFile(join(fixtureRoot, 'evidence/baseline.json'), 'utf8'))
  const fixtureLedger = JSON.parse(await readFile(join(fixtureRoot, 'evidence/claims.json'), 'utf8'))
  const claim = fixtureLedger.claims.find(candidate => candidate.id === 'CMP-FW-TEST-001')
  assert.ok(claim, 'CMP-FW-TEST-001 fixture claim must exist')
  return { baseline, fixtureLedger, claim }
}

test('external comparison metadata policy is offline', async t => {
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = async () => {
    fetchCalls += 1
    throw new Error('offline verifier attempted HTTP')
  }
  try {
    const { baseline, fixtureLedger, claim } = await comparisonFixture()
    assert.deepEqual(validateClaimsLedger({ schemaVersion: 1, claims: [claim] }, baseline), [])
    assert.deepEqual(await validateClaimTargets({ root: fixtureRoot, ledger: fixtureLedger }), [])
    for (const [field, mutate] of [
      ['publisher', source => { delete source.publisher }],
      ['accessDate', source => { delete source.accessDate }],
      ['url', source => { source.url = 'http://docs.example.invalid/comparison' }],
    ]) {
      const candidate = structuredClone(claim)
      mutate(candidate.sources[0])
      assert.deepEqual(stableProblems(validateClaimsLedger({ schemaVersion: 1, claims: [candidate] }, baseline)), [{
        code: 'LEDGER_SCHEMA_ERROR',
        field: `/claims/0/sources/0/${field}`,
        claimId: 'CMP-FW-TEST-001',
        sourceIndex: 0,
      }])
    }
    const emptyRoot = await mkdtemp(join(tmpdir(), 'dsh-comparison-target-'))
    t.after(() => rm(emptyRoot, { recursive: true, force: true }))
    await mkdir(join(emptyRoot, 'docs/comparisons'), { recursive: true })
    assert.deepEqual(stableProblems(await validateClaimTargets({
      root: emptyRoot,
      ledger: { claims: [claim] },
    })), [{
      code: 'CLAIM_TARGET_MISSING',
      path: 'docs/comparisons/sample.md',
      claimId: 'CMP-FW-TEST-001',
    }])
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(fetchCalls, 0)
})

test('external GitHub blob commit matches URL', async () => {
  const { baseline, claim } = await comparisonFixture()
  const matching = structuredClone(claim)
  matching.sources = [{
    type: 'external',
    url: blobUrl,
    publisher: 'Example Project',
    accessDate: '2026-09-05',
    commit: '0123456789abcdef0123456789abcdef01234567',
  }]
  assert.deepEqual(validateClaimsLedger({ schemaVersion: 1, claims: [matching] }, baseline), [])
  for (const commit of ['1123456789abcdef0123456789abcdef01234567', undefined]) {
    const candidate = structuredClone(matching)
    if (commit === undefined) delete candidate.sources[0].commit
    else candidate.sources[0].commit = commit
    assert.deepEqual(stableProblems(validateClaimsLedger({ schemaVersion: 1, claims: [candidate] }, baseline)), [{
      code: 'EXTERNAL_SOURCE_REVISION_MISMATCH',
      claimId: 'CMP-FW-TEST-001',
      sourceIndex: 0,
    }])
  }
})
```

- [ ] Create the test above, then run `node --test --test-name-pattern='external comparison metadata policy is offline|external GitHub blob commit matches URL' test/comparison-evidence-contract.test.mjs`; expect exit 1 with both selected test names failed because the `CMP-FW-TEST-001` fixture row is absent.
- [ ] Append this exact object to `test/fixtures/handbook/valid/evidence/claims.json` without changing the existing rows:

```json
{
  "id": "CMP-FW-TEST-001",
  "statement": "合成比较事实。",
  "kind": "external-comparison",
  "confidence": "verified",
  "maturity": "not-applicable",
  "documents": [
    "docs/comparisons/sample.md#claim-cmp-fw-test-001"
  ],
  "sources": [
    {
      "type": "external",
      "url": "https://docs.langchain.com/oss/python/langgraph/overview",
      "publisher": "LangChain",
      "accessDate": "2026-09-05"
    }
  ]
}
```

- [ ] Create `test/fixtures/handbook/valid/docs/comparisons/sample.md` with exactly `<a id="claim-cmp-fw-test-001"></a> **Claim \`CMP-FW-TEST-001\`:** 合成比较事实。` followed by one LF.
- [ ] Re-run the exact focused command; expect exit 0, two selected tests passed, zero failed, empty stderr, and zero calls to the throwing `fetch` spy.
- [ ] Define framework criteria exactly: composition, replaceable capability interfaces, lifecycle ownership, state/persistence, tool execution, orchestration, extension mechanisms.
- [ ] Define product criteria exactly: tool/hook extension, execution policy, session recovery, delegation, UI surfaces, SDK/automation access.
- [ ] Define the row template: documented fact, official source, version/commit/access date, DSH counterpart, unavailable information, author inference.
- [ ] State that differing abstraction levels are reported rather than normalized away; there is no score, winner, ranking, benchmark, or undocumented-internals column.
- [ ] Add comparison terminology to the glossary, external-source policy to the general methodology, and source-map rows. Link the new comparison methodology from README, but render the two not-yet-created report paths as code spans rather than links so generic link verification remains GREEN.
- [ ] From the active authoring worktree, run `npm test`, `npm run verify -- --source /Users/qingyang/github_repo/deepseek-harness`, and `git diff --check`; require exit 0 for all three. Then run `git add README.md docs/00-methodology.md docs/comparisons/methodology.md docs/glossary.md docs/source-map.md docs/superpowers/plans/2026-09-05-comparisons-and-publication.md test/comparison-evidence-contract.test.mjs test/fixtures/handbook/valid/docs/comparisons/sample.md test/fixtures/handbook/valid/evidence/claims.json`, `git diff --cached --check`, and `git commit -m 'docs: define non-ranking comparison method'`.

### Task 2: Research and write the Agent-framework comparison

**Files:**

- Create: `docs/comparisons/agent-frameworks.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`

**Interfaces:**

- Input: the eleven fixed framework claim rows and the exact official source set below; no search snippet or uncited memory may enter the ledger.
- Output: eleven ledger entries and eleven byte-identical one-line markers in `docs/comparisons/agent-frameworks.md`, ordered `LangGraph`, `Microsoft AutoGen`, `OpenAI Agents SDK`, `与 DSH 的限定比较`.
- Source assignment: `CMP-FW-LANGGRAPH-001` uses overview; `CMP-FW-LANGGRAPH-002` uses persistence plus `use-time-travel`; `CMP-FW-LANGGRAPH-003` uses interrupts; `CMP-FW-AUTOGEN-001` uses message-and-communication; `CMP-FW-AUTOGEN-002` uses teams; `CMP-FW-AUTOGEN-003` uses extensions; `CMP-FW-OPENAI-001` uses define-agents plus running-agents; `CMP-FW-OPENAI-002` and `CMP-FW-OPENAI-004` use orchestration plus guardrails-approvals; `CMP-FW-OPENAI-003` uses running-agents, results, and integrations-observability.
- Failure contract: if a named page no longer supports its fixed sentence, mark the task blocked for design review; do not rewrite the claim or substitute another host during implementation.

**Official source set to verify at implementation time:**

- LangGraph: `https://docs.langchain.com/oss/python/langgraph/overview`, `https://docs.langchain.com/oss/python/langgraph/persistence`, `https://docs.langchain.com/oss/python/langgraph/use-time-travel`, and `https://docs.langchain.com/oss/python/langgraph/interrupts`. If one no longer supports its assigned claim, stop for design review; any approved replacement with an official immutable GitHub URL must be added here with its exact 40-character `commit` before implementation resumes.
- Microsoft AutoGen: `https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html`, `https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html`, `https://microsoft.github.io/autogen/stable/user-guide/extensions-user-guide/index.html`, and `https://github.com/microsoft/autogen/blob/main/README.md?plain=1`.
- OpenAI Agents SDK: `https://developers.openai.com/api/docs/guides/agents`, `https://developers.openai.com/api/docs/guides/agents/quickstart`, `https://developers.openai.com/api/docs/guides/agents/define-agents`, `https://developers.openai.com/api/docs/guides/agents/running-agents`, `https://developers.openai.com/api/docs/guides/agents/orchestration`, `https://developers.openai.com/api/docs/guides/agents/guardrails-approvals`, `https://developers.openai.com/api/docs/guides/agents/results`, and `https://developers.openai.com/api/docs/guides/agents/integrations-observability`. These are the only permitted OpenAI Agents SDK sources; record a version only when one of these pages exposes it.

- [ ] Before browsing OpenAI material, invoke `openai-docs`; browse only the `developers.openai.com/api/docs/guides/agents` source set above. Do not follow repository links as evidence. Record the actual implementation access date.
- [ ] For each page, capture only explicit behavior in `/private/tmp/deepseek-harness-analysis-research/frameworks.md`. Record page title, publisher, version/commit if visible, access date, and the exact statement it supports.
- [ ] Add the eleven framework rows from the canonical table to `claims.json` before creating `agent-frameworks.md`. Copy every id, statement, kind, confidence, maturity, and the one fixed analysis qualification exactly; do not choose a different classification or draft new claim prose.
- [ ] From the active authoring worktree, run `node scripts/verify-evidence.mjs --source /Users/qingyang/github_repo/deepseek-harness`; require exit 1, empty stdout, and exactly this JSON on stderr followed by one LF:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-LANGGRAPH-001"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-LANGGRAPH-002"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-LANGGRAPH-003"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-AUTOGEN-001"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-AUTOGEN-002"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-AUTOGEN-003"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-OPENAI-001"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-OPENAI-002"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-OPENAI-003"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-FW-OPENAI-004"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/agent-frameworks.md",
      "claimId": "CMP-ANALYSIS-FW-001"
    }
  ]
}
```
- [ ] Write one subsection per framework using the seven framework criteria and one final synthesis section that compares mechanisms with DSH without treating the systems as identical abstraction levels. Copy the eleven canonical sentences from this plan byte-for-byte; each marker uses the literal lower-case claim id as its anchor and the literal upper-case claim id as its visible id.
- [ ] For LangGraph, cover only documented graph nodes/edges, checkpointed thread state, persistence/time travel/fork, and interrupt/resume behavior.
- [ ] For AutoGen, cover only documented message-driven communication, runtime, AgentChat teams/termination/state, and `autogen-ext` extension components.
- [ ] For OpenAI Agents SDK, cover only documented Agent/Runner, tools/agents-as-tools, sessions, tracing, handoffs, guardrails, and lifecycle hooks.
- [ ] Mark absent primary-source information as `未见官方文档说明`; do not convert it into a negative support claim. Add source-map entries, then rerun the exact source-backed verifier command; require exit 0, empty stderr, and exactly this stdout followed by one LF:

```json
{
  "ok": true,
  "inspectedUpstream": true,
  "claimCount": 56
}
```

- [ ] Run `rg -n '更快|降低成本|性能提升|最佳|领先|winner|ranking|benchmark' docs/comparisons/agent-frameworks.md`; require exit 1 and empty stdout. Run `git add docs/comparisons/agent-frameworks.md docs/source-map.md evidence/claims.json`, `git diff --cached --check`, and `git commit -m 'docs: compare agent framework mechanisms'`.

### Task 3: Research and write the coding-agent product comparison

**Files:**

- Create: `docs/comparisons/coding-agent-products.md`
- Modify: `evidence/claims.json`
- Modify: `docs/source-map.md`
- Modify: `docs/comparisons/methodology.md`
- Modify: `docs/comparisons/agent-frameworks.md`
- Modify: `README.md`

**Interfaces:**

- Input: the nine fixed product claim rows and the exact official source set below; OpenAI evidence is accepted only from the three allowed OpenAI hosts.
- Output: nine ledger entries and nine byte-identical one-line markers in `docs/comparisons/coding-agent-products.md`, ordered `Claude Code`, `OpenAI Codex`, `与 DSH 的限定比较`; reciprocal links among the two reports and methodology; final README links.
- Source assignment: `CMP-PROD-CLAUDE-001` uses features-overview, tools-reference, mcp, and configuration; `CMP-PROD-CLAUDE-002` uses hooks-guide and hooks; `CMP-PROD-CLAUDE-003` uses permissions; `CMP-PROD-CLAUDE-004` uses sub-agents and agent-sdk/claude-code-features. `CMP-PROD-CODEX-001` uses app, codex/cli, codex/ide, and cloud; `CMP-PROD-CODEX-002` uses config-file/config-reference, extend/mcp, hooks, build-skills, and build-plugins; `CMP-PROD-CODEX-003` uses sandboxing and agent-approvals-security; `CMP-PROD-CODEX-004` uses agent-configuration/subagents, automations, non-interactive-mode, codex-sdk, and app-server.
- Failure contract: if a named page no longer supports its fixed sentence, mark the task blocked for design review; do not rewrite the claim or substitute another host during implementation.

**Official source set to verify at implementation time:**

- Claude Code: `https://code.claude.com/docs/en/features-overview`, `https://code.claude.com/docs/en/tools-reference`, `https://code.claude.com/docs/en/hooks-guide`, `https://code.claude.com/docs/en/hooks`, `https://code.claude.com/docs/en/permissions`, `https://code.claude.com/docs/en/configuration`, `https://code.claude.com/docs/en/sub-agents`, `https://code.claude.com/docs/en/mcp`, and `https://code.claude.com/docs/en/agent-sdk/claude-code-features`.
- OpenAI Codex: `https://learn.chatgpt.com/docs/app`, `https://learn.chatgpt.com/docs/codex/cli`, `https://learn.chatgpt.com/docs/codex/ide`, `https://learn.chatgpt.com/docs/cloud`, `https://learn.chatgpt.com/docs/config-file/config-reference`, `https://learn.chatgpt.com/docs/extend/mcp`, `https://learn.chatgpt.com/docs/hooks`, `https://learn.chatgpt.com/docs/build-skills`, `https://learn.chatgpt.com/docs/build-plugins`, `https://learn.chatgpt.com/docs/agent-configuration/subagents`, `https://learn.chatgpt.com/docs/sandboxing`, `https://learn.chatgpt.com/docs/agent-approvals-security`, `https://learn.chatgpt.com/docs/projects`, `https://learn.chatgpt.com/docs/automations`, `https://learn.chatgpt.com/docs/codex-sdk`, `https://learn.chatgpt.com/docs/app-server`, and `https://learn.chatgpt.com/docs/non-interactive-mode`. Equivalent pages reached through `developers.openai.com` redirects are permitted; no other host is permitted.

- [ ] Invoke `openai-docs` before researching Codex and use only `developers.openai.com`, `platform.openai.com`, and `learn.chatgpt.com`. Do not use another host or search-result snippets as evidence.
- [ ] Capture source metadata and statements in `/private/tmp/deepseek-harness-analysis-research/products.md`; do not cite search-result snippets or third-party summaries in production.
- [ ] Add the nine product rows from the canonical table to `claims.json` before creating `coding-agent-products.md`. Copy every id, statement, kind, confidence, maturity, and the one fixed analysis qualification exactly; do not choose a different classification or draft new claim prose.
- [ ] From the active authoring worktree, run `node scripts/verify-evidence.mjs --source /Users/qingyang/github_repo/deepseek-harness`; require exit 1, empty stdout, and exactly this JSON on stderr followed by one LF:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CLAUDE-001"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CLAUDE-002"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CLAUDE-003"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CLAUDE-004"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CODEX-001"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CODEX-002"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CODEX-003"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-PROD-CODEX-004"
    },
    {
      "code": "CLAIM_TARGET_MISSING",
      "path": "docs/comparisons/coding-agent-products.md",
      "claimId": "CMP-ANALYSIS-PROD-001"
    }
  ]
}
```
- [ ] Write separate Claude Code and Codex sections across exactly six product criteria, followed by a bounded synthesis against DSH. Copy the nine canonical sentences from this plan byte-for-byte; each marker uses the literal lower-case claim id as its anchor and the literal upper-case claim id as its visible id.
- [ ] For Claude Code, cover only documented tools, MCP, skills/plugins, hooks, permission rules/modes, subagents, and SDK/automation surfaces. Do not infer hidden persistence architecture from UI behavior.
- [ ] For Codex, cover only documented client/CLI surfaces, configuration, tools/extensions, sandbox/approval policy, session recovery, delegation, and automation/SDK access actually exposed by official sources.
- [ ] State `未见官方文档说明` for unavailable facts and keep DSH's own safety limitations visible in the corresponding execution-policy row.
- [ ] Now that both reports exist, convert their source-map/README paths to links and add reciprocal navigation among methodology, framework report, and product report. Rerun the exact source-backed verifier command; require exit 0, empty stderr, and exactly this stdout followed by one LF:

```json
{
  "ok": true,
  "inspectedUpstream": true,
  "claimCount": 65
}
```

- [ ] Run `rg -n '更快|降低成本|性能提升|最佳|领先|winner|ranking|benchmark' docs/comparisons/agent-frameworks.md docs/comparisons/coding-agent-products.md`; require exit 1 and empty stdout. Run `git add README.md docs/comparisons/agent-frameworks.md docs/comparisons/coding-agent-products.md docs/comparisons/methodology.md docs/source-map.md evidence/claims.json`, `git diff --cached --check`, and `git commit -m 'docs: compare coding agent product surfaces'`.

### Task 4: Perform the complete local release audit

**Files:**

- Review: `.github/ISSUE_TEMPLATE/analysis-proposal.yml`
- Review: `.github/ISSUE_TEMPLATE/factual-error.yml`
- Review: `.github/ISSUE_TEMPLATE/upstream-drift.yml`
- Review: `.github/dependabot.yml`
- Review: `.github/pull_request_template.md`
- Review: `.github/workflows/verify.yml`
- Review: `docs/00-methodology.md`
- Review: `docs/01-overview.md`
- Review: `docs/02-architecture.md`
- Review: `docs/03-capabilities.md`
- Review: `docs/04-differentiators.md`
- Review: `docs/05-getting-started.md`
- Review: `docs/comparisons/agent-frameworks.md`
- Review: `docs/comparisons/coding-agent-products.md`
- Review: `docs/comparisons/methodology.md`
- Review: `docs/deep-dives/cordis-lifecycle.md`
- Review: `docs/deep-dives/profiles-bundles-presets.md`
- Review: `docs/deep-dives/sandbox-execution.md`
- Review: `docs/deep-dives/session-event-log.md`
- Review: `docs/deep-dives/subagents-goals-workflows.md`
- Review: `docs/deep-dives/tools-and-ptc.md`
- Review: `docs/glossary.md`
- Review: `docs/maintainer/repository-settings.md`
- Review: `docs/source-map.md`
- Review: `docs/superpowers/plans/2026-09-05-comparisons-and-publication.md`
- Review: `docs/superpowers/plans/2026-09-05-core-handbook.md`
- Review: `docs/superpowers/plans/2026-09-05-deep-dives.md`
- Review: `docs/superpowers/plans/2026-09-05-foundation-and-evidence.md`
- Review: `docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`
- Review: `evidence/baseline.json`
- Review: `evidence/claims.json`
- Review: `evidence/observations/upstream-facts.json`
- Review: `scripts/inspect-upstream.mjs`
- Review: `scripts/verify-evidence.mjs`
- Review: `test/comparison-evidence-contract.test.mjs`
- Review: `test/evidence-schema-contract.test.mjs`
- Review: `test/evidence-target-contract.test.mjs`
- Review: `test/handbook-navigation.test.mjs`
- Review: `test/helpers/fixture-repo.mjs`
- Review: `test/inspect-upstream.test.mjs`
- Review: `test/parser-contract.test.mjs`
- Review: `test/read-only-inspector.test.mjs`
- Review: `test/repository-community-contract.test.mjs`
- Review: `test/repository-workflow-contract.test.mjs`
- Review: `test/verify-cli-contract.test.mjs`
- Review: `test/verify-evidence.test.mjs`
- Review: `test/fixtures/handbook/valid/docs/comparisons/sample.md`
- Review: `test/fixtures/handbook/valid/docs/fact.md`
- Review: `test/fixtures/handbook/valid/docs/inference.md`
- Review: `test/fixtures/handbook/valid/docs/qualified.md`
- Review: `test/fixtures/handbook/valid/evidence/baseline.json`
- Review: `test/fixtures/handbook/valid/evidence/claims.json`
- Review: `test/fixtures/upstream-template/package.json`
- Review: `test/fixtures/upstream-template/packages/boot/app-boot/src/profile.ts`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/cordis/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/minimal/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/ptc/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/standard/preset.yml`
- Review: `test/fixtures/workflows/local.yml`
- Review: `test/fixtures/workflows/malformed.yml`
- Review: `test/fixtures/workflows/pinned.yml`
- Review: `test/fixtures/workflows/tagged.yml`
- Review: `.editorconfig`
- Review: `.gitignore`
- Review: `CITATION.cff`
- Review: `CODE_OF_CONDUCT.md`
- Review: `CONTRIBUTING.md`
- Review: `LICENSE`
- Review: `NOTICE.md`
- Review: `README.md`
- Review: `README.en.md`
- Review: `SECURITY.md`
- Review: `SUPPORT.md`
- Review: `package.json`

**Interfaces:**

- Input: the complete tracked release tree at the end of Task 3 and the clean pinned upstream checkout `/Users/qingyang/github_repo/deepseek-harness`.
- Output: either a byte-unchanged passing release tree or a return to the earlier task that owns a detected defect; Task 4 itself creates no catch-all correction file or empty audit commit.
- Acceptance: `npm test`, source-backed `npm run verify`, upstream SHA/cleanliness, whitespace, tracked-file inventory, placeholder/secret review, source-authority review, and prohibited-ranking review all pass in one run.
- Failure contract: name the exact path and earlier owning task, fix it there, commit under that scope, then restart Task 4 from its first command.

- [ ] Confirm local branch `main` and a clean worktree before audit corrections. On the initial audit require no remote named `origin`. On a Task 6 corrective re-entry, instead require exactly one `origin`, require its URL to be the canonical URL for the transport already recorded by Task 5, and make no remote mutation during Task 4.
- [ ] Run `node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (!((major === 22 && minor >= 19) || major >= 24)) process.exit(1); console.log(process.version)"`; require exit 0 and one version line, proving `^22.19.0 || >=24.0.0`.
- [ ] Run `npm test`; expect all inspector/verifier/community/workflow tests to pass.
- [ ] From the active authoring worktree, run `node scripts/verify-evidence.mjs --source /Users/qingyang/github_repo/deepseek-harness`; require exit 0, empty stderr, and the Task 3 success JSON with `claimCount` exactly `65`.
- [ ] Run `git -C /Users/qingyang/github_repo/deepseek-harness rev-parse HEAD`, `git -C /Users/qingyang/github_repo/deepseek-harness describe --tags --long`, and `git -C /Users/qingyang/github_repo/deepseek-harness status --short`; require `76fda729799fe9b3848dbe2c211d4b231032b81e`, `dsh-v0.1.2-rc.1-99-g76fda72979`, and empty status output respectively.
- [ ] The design spec intentionally publishes `docs/superpowers/` as maintainer design and implementation provenance. Include it in the expected-tree inventory, internal-link verification, credential/private-contact review, and placeholder review; do not silently exclude it from the release audit.
- [ ] Run `git diff --check`, then run `rg -n '[T]ODO|[T]BD|[C]HANGE_ME|example[@]example|s[k]-[A-Za-z0-9]' . --glob '!.git/**'`. Require the first command to exit 0. The scan includes `docs/superpowers/`: review every match and allow only the literal tokens embedded in verifier tests, search commands, or the design rule that prohibits unresolved markers; any candidate release-content marker, credential, sample email, or unexplained occurrence is a blocker. Record the reviewed provenance-file paths in the Task 4 audit result rather than silently excluding them.
- [ ] Separately inspect every result of `rg -n '更快|降低成本|性能提升|最佳|领先|winner|ranking|benchmark' README.md docs --glob '!docs/superpowers/**'`; planning instructions may name prohibited language, but the published reader-facing handbook and comparisons may not make those claims.
- [ ] Verify every expected file from the design tree exists, every community file is populated, every claim id is unique, and every external source has been human-confirmed first-party.
- [ ] Review Mermaid source for GitHub syntax and manually inspect rendered diagrams after the first push; do not add a browser dependency for this.
- [ ] Confirm no upstream code/assets/notices were copied and no credential or private contact address is present.
- [ ] If any check fails, stop Task 4 and return to the earlier task that owns the exact path. After that task commits its correction, restart Task 4 at the branch/worktree check; Task 4 creates no audit-only commit.

### Task 5: Preflight the exact GitHub destination without changing it

**Files:**

- Review: `.git/config`
- Review: `docs/maintainer/repository-settings.md`

**Interfaces:**

- Input: clean local `main`, the latest Task 4-audited commit, authenticated `yang0228`, and either the initial state of no `origin` plus a confirmed absent destination or a Task 6 corrective re-entry with the exact existing destination and canonical `origin`; SSH additionally requires an already trusted GitHub host key plus non-interactive key authentication.
- Output: a mutation-free preflight record containing mode `initial` or `correction`, local audited commit SHA, authenticated login, destination result, selected transport `ssh` or `https`, and a passing final test/verifier run. Initial mode records `404/nonexistent`; correction mode records the exact existing repository identity and its pre-correction remote `main` SHA.
- Failure contract: any prompt, redirect, unexpected destination result, rate limit, timeout, host-key failure, authentication failure, different login, wrong or extra remote, dirty tree, or correction-mode remote drift stops before repository creation or the next push.
- [ ] Run `git status --short --branch`, `git remote -v`, and `git log -1 --format='%H %s'`; require clean `main` at the latest Task 4-audited commit. In initial mode require no `origin`. In correction mode require exactly one `origin` whose URL is the canonical URL for the already selected transport; do not add, remove, or rewrite a remote in Task 5.
- [ ] Check `command -v gh`. If available, run `GH_PROMPT_DISABLED=1 gh auth status --hostname github.com` and `GH_PROMPT_DISABLED=1 gh api user --jq '.login'`; require login exactly `yang0228`. In initial mode run `GH_PROMPT_DISABLED=1 gh api repos/yang0228/deepseek-harness-analysis`; only an unambiguous HTTP 404 permits creation. In correction mode run `GH_PROMPT_DISABLED=1 gh repo view yang0228/deepseek-harness-analysis --json nameWithOwner,url,visibility,description` and require the exact Task 6 public-repository fields. Any authentication prompt or login flow is a stop condition.
- [ ] If `gh` remains absent, use the authenticated GitHub browser UI and confirm the signed-in account is `yang0228`. In initial mode visit `https://github.com/yang0228/deepseek-harness-analysis`; proceed only when GitHub identifies it as nonexistent and the New Repository owner selector offers `yang0228`. In correction mode require that URL to show the exact existing public repository, description, and owner recorded by Task 6.
- [ ] Record exactly one transport in initial mode and preserve that selection in correction mode. Whenever the selected transport is SSH, regardless of whether identity and destination were checked with `gh` or the browser, run `ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 -T git@github.com`; these options forbid credential prompts, forbid adding an unknown host key, and bound network waiting. Accept the conventional nonzero “no shell access” exit only when the response identifies `yang0228` exactly. An unknown host key, timeout, authentication failure, prompt, or different identity stops publication and requires user direction; never retry with `StrictHostKeyChecking=accept-new` or `no`.
- [ ] In correction mode, run the Task 6 transport-specific non-interactive `ls-remote --exit-code --heads origin refs/heads/main` command before accepting the new local commit and require the returned SHA to equal the last successfully pushed audited SHA. Stop without mutation on remote drift, a missing or different repository, redirect, 403/429, authentication prompt/failure, wrong identity, uncertain owner rights, or network ambiguity. Do not pick a different name, owner, or transport.
- [ ] From the active authoring worktree, re-run `npm test` and `node scripts/verify-evidence.mjs --source /Users/qingyang/github_repo/deepseek-harness`; require both to exit 0, the verifier to emit the exact Task 3 success JSON with `claimCount` `65`, and `git status --short` to remain empty. Record `git rev-parse HEAD` as the only SHA permitted for the next remote `main` update: the first push in initial mode or the corrective push in correction mode.

### Task 6: Create and push the public repository

**Files:**

- Modify: `.git/config`

**Interfaces:**

- Input: the complete Task 5 preflight record and its exact audited commit.
- Output: one public repository `yang0228/deepseek-harness-analysis`, one canonical `origin`, remote `refs/heads/main` equal to the latest Task 5-recorded audited commit, default branch `main`, successful `verify`, rendered README/Mermaid/CFF, three rendered Issue Forms, and a transcript record of the final remote SHA plus the CFF and Issue Form observations for Task 7.
- Transport contract: SSH remote operations use `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10'`; HTTPS remote operations use `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false`. The HTTPS prefix preserves already configured non-interactive credential helpers while disabling Git terminal/askpass prompts and Git Credential Manager interaction. Never fall back from one transport to the other automatically.
- Failure contract: any credential prompt, host-key prompt, authentication error, timeout, rejected push, or unexpected remote SHA stops immediately; preserve the repository at its last confirmed state—empty before the first push or at the preceding audited `main` during correction—and report that recoverable state.

- [ ] In initial mode only, with authenticated `gh`, run `GH_PROMPT_DISABLED=1 gh repo create yang0228/deepseek-harness-analysis --public --description 'DeepSeek Harness 架构与实现的证据链手册'` without `--source`, `--remote`, or `--push`, so `gh` creates no local remote. With the browser route, create a public empty repository named exactly `deepseek-harness-analysis` under `yang0228`, set that exact description, and do not initialize a README, license, or `.gitignore`. Then add exactly one remote: for SSH run `git remote add origin git@github.com:yang0228/deepseek-harness-analysis.git`; for HTTPS run `git remote add origin https://github.com/yang0228/deepseek-harness-analysis.git`. In correction mode, skip repository creation and `git remote add`; use only the exact existing repository and canonical `origin` accepted by Task 5. Do not add both URLs or change transport after an authentication failure.
- [ ] Run `git remote get-url origin`. If it is the exact SSH URL, run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' push --set-upstream origin main`. If it is the exact HTTPS URL, run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false push --set-upstream origin main`. No other URL is accepted; any prompt, authentication failure, timeout, or rejected push stops publication without retrying through another transport.
- [ ] If the initial creation succeeds but its push authentication fails, leave the new empty repository intact. If a corrective push fails, leave remote `main` at its last confirmed audited commit and preserve the new local audited commit. Report the recoverable state and obtain the user's Git credential direction; do not recreate or force-push.
- [ ] Separate transport from public identity. Independently run `GH_PROMPT_DISABLED=1 gh repo view yang0228/deepseek-harness-analysis --json nameWithOwner,url,visibility,description` when authenticated `gh` is available, or inspect the same four fields in the GitHub UI; require `yang0228/deepseek-harness-analysis`, `https://github.com/yang0228/deepseek-harness-analysis`, `PUBLIC`, and `DeepSeek Harness 架构与实现的证据链手册`. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' ls-remote --exit-code --heads origin refs/heads/main`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false ls-remote --exit-code --heads origin refs/heads/main`. Require the returned SHA to equal the recorded local commit; any authentication or network failure stops publication.
- [ ] Before any protection rule, inspect the repository's default branch via GitHub UI or `GH_PROMPT_DISABLED=1 gh api repos/yang0228/deepseek-harness-analysis --jq '.default_branch'`. Require `main`; if another default was assigned, set it to `main` through Settings or `GH_PROMPT_DISABLED=1 gh repo edit yang0228/deepseek-harness-analysis --default-branch main`, then verify again. Stop if `main` cannot be selected.
- [ ] Wait for the initial `verify` workflow. If it fails without requiring a tree change, wait for or rerun the same check. If a tracked-file correction is required, return to the earlier task that owns the exact path, commit the correction there, rerun Task 4 in corrective-re-entry mode from its first command, and rerun Task 5 in correction mode so it revalidates identity, destination, transport, remote state, and the new audited commit before the next push. Resume Task 6 at its transport-specific non-interactive push; do not tag or switch transports.
- [ ] Open the README and every Mermaid-bearing document in GitHub. If native rendering or navigation has a defect, use the same owning-task correction, full Task 4 re-audit, Task 5 correction preflight, push, and successful-`verify` loop; do not make or push an unaudited correction directly from Task 6.
- [ ] Open GitHub's “Cite this repository” surface and confirm `CITATION.cff` renders `yang0228`, `snapshot-76fda729`, the repository URL, and the preferred report citation. Open `/issues/new/choose` and confirm all three Issue Forms are offered and render their required fields: `factual-error.yml`, `upstream-drift.yml`, and `analysis-proposal.yml`. If CFF or form rendering has a defect, use the same owning-task correction, full Task 4 re-audit, Task 5 correction preflight, push, and successful-`verify` loop. Record the four successful rendering observations in the task transcript; Task 7 writes those observed results into `repository-settings.md`.
- [ ] After the final successful `verify` and native-rendering checks, rerun the selected transport's non-interactive `ls-remote --exit-code --heads origin refs/heads/main`, require its SHA to equal both `git rev-parse HEAD` and the latest audited commit recorded by Task 5, and record that value as the final Task 6 remote SHA consumed by Task 7.

### Task 7: Apply and verify repository settings

**Files:**

- Modify: `docs/maintainer/repository-settings.md`

**Interfaces:**

- Input: public repository with default branch `main`, successful check named `verify`, the exact Task 6 remote SHA, and Task 6's successful CFF and Issue Form rendering observations.
- Output: a completed dated repository checklist, including the Task 6 rendering observations, plus one normally merged PR from `codex/record-repository-settings`; local and remote `main` end at the merged commit.
- Settings contract: description `DeepSeek Harness 架构与实现的证据链手册`; Issues and private vulnerability reporting on; Wiki and Discussions off; Pages has no publishing source and no published site; seven topics in the documented order; `main` requires pull requests and `verify`.
- Failure contract: unavailable checks, insufficient permissions, prompts, failed CI, merge conflicts, or changed remote state stop without weakening the rule or bypassing protection.
- [ ] In GitHub Settings, reconfirm the exact repository description, enable Issues and private vulnerability reporting, disable Wiki and Discussions, and leave GitHub Pages with no publishing source and no published site. Set topics exactly to `deepseek`, `deepseek-harness`, `agent-harness`, `agent-runtime`, `architecture`, `cordis`, `typescript`.
- [ ] Reconfirm the default branch is `main`. Only after the first successful workflow exposes the check name, create a branch protection rule or ruleset for `main` that requires pull requests and the status check named exactly `verify`. Do not create the rule for another branch or require an unavailable check name.
- [ ] Verify each value with read-only UI/API output. Do not state that CI proves account-level settings.
- [ ] Run `git switch -c codex/record-repository-settings`, then mark only observed checklist rows complete with actor `@yang0228` and the actual observation date. Include every verified repository-setting row and the four CFF/Issue Form rendering rows observed in Task 6. Task 7 owns this versioned record; Task 9 only revalidates it. Run `git add docs/maintainer/repository-settings.md`, `git diff --cached --check`, and `git commit -m 'docs: record public repository settings'`. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' push --set-upstream origin codex/record-repository-settings`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false push --set-upstream origin codex/record-repository-settings`. Any prompt or authentication failure stops the task.
- [ ] With authenticated `gh`, run `GH_PROMPT_DISABLED=1 gh pr create --base main --head codex/record-repository-settings --title 'docs: record public repository settings' --body 'Records the observed public repository settings after the initial verify run.'`; otherwise create the same base, head, title, and body in the GitHub UI. Require the PR's `verify` check to pass and review the one-file checklist diff. With `gh`, run `GH_PROMPT_DISABLED=1 gh pr merge --merge --delete-branch`; otherwise select “Create a merge commit” and “Delete branch” in the UI. Do not disable or bypass the rule.
- [ ] Run `git switch main`. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' fetch origin main`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false fetch origin main`. Run `git merge --ff-only origin/main`. Run `git show-ref --verify --quiet refs/heads/codex/record-repository-settings`; on exit 0 run `git branch -d codex/record-repository-settings`, on exit 1 skip deletion because the merge command already removed the local branch, and on any other exit stop. Reconfirm public visibility, exact description, default branch `main`, required `verify`, private vulnerability reporting, exact topics, Issues on, Wiki/Discussions off, Pages without a publishing source and unpublished. Finally rerun the Task 6 transport-specific `ls-remote --exit-code --heads origin refs/heads/main` command and require its freshly read SHA to equal `git rev-parse HEAD`; do not compare with the pre-merge Task 6 SHA.

### Task 8: Create the verified snapshot tag

**Files:**

- Review: `CITATION.cff`
- Review: `evidence/baseline.json`
- Review: `docs/maintainer/repository-settings.md`

**Interfaces:**

- Input: clean local `main`, identical remote `main`, successful required `verify` on that commit, completed settings checklist, and absent local/remote `snapshot-76fda729` tag.
- Output: one unsigned annotated tag `snapshot-76fda729` whose peeled target equals `main`; no GitHub Release.
- Transport contract: SSH uses the exact `core.sshCommand` override from Task 6; HTTPS prefixes every lookup and push with the exact Task 6 `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false` command form.
- Failure contract: any prompt, authentication error, timeout, tag collision, non-fast remote state, or unequal peeled SHA stops without deleting, moving, or force-updating any tag.
- [ ] Run `git status --porcelain=v1`, `git branch --show-current`, and `git rev-parse HEAD`; require empty status, `main`, and one full commit SHA. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' ls-remote --exit-code --heads origin refs/heads/main`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false ls-remote --exit-code --heads origin refs/heads/main`. Require its SHA to equal `git rev-parse HEAD`, the GitHub `verify` check for that SHA to show success, and every repository-settings checkbox to be complete.
- [ ] Confirm `CITATION.cff` version is `snapshot-76fda729` and the baseline full SHA begins `76fda729`.
- [ ] Run `git tag --list snapshot-76fda729`; require exit 0 with empty stdout. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' ls-remote --exit-code --tags origin refs/tags/snapshot-76fda729`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false ls-remote --exit-code --tags origin refs/tags/snapshot-76fda729`. Require exit 2 with empty stdout, which means no matching remote ref. Exit 0 is a collision; any prompt, authentication error, timeout, or other result stops publication.
- [ ] Create the non-signing annotated tag with `git -c tag.gpgSign=false tag -a snapshot-76fda729 -m 'DeepSeek Harness evidence snapshot 76fda729'`. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' push origin refs/tags/snapshot-76fda729:refs/tags/snapshot-76fda729`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false push origin refs/tags/snapshot-76fda729:refs/tags/snapshot-76fda729`. Do not use `--tags`, a force option, an interactive credential flow, or a transport fallback.
- [ ] Run `git rev-parse 'snapshot-76fda729^{}'` and require the audited `HEAD`; run `git for-each-ref --format='%(contents:subject)' refs/tags/snapshot-76fda729` and require exactly `DeepSeek Harness evidence snapshot 76fda729` plus one trailing newline. For SSH run `git -c core.sshCommand='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' ls-remote --exit-code --tags origin 'refs/tags/snapshot-76fda729^{}'`; for HTTPS run `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/usr/bin/false SSH_ASKPASS=/usr/bin/false GCM_INTERACTIVE=0 git -c credential.interactive=false ls-remote --exit-code --tags origin 'refs/tags/snapshot-76fda729^{}'`. Require the peeled SHA to equal that same audited commit, then open `https://github.com/yang0228/deepseek-harness-analysis/tree/snapshot-76fda729`, require the tagged source tree to render, and require the `verify` workflow on its target commit to remain successful.
- [ ] Do not create a GitHub Release unless the user separately requests one; the approved first release requires the annotated snapshot tag, not a release asset.

### Task 9: Publication acceptance and handoff

**Files:**

- Review: `.editorconfig`
- Review: `.gitignore`
- Review: `README.md`
- Review: `README.en.md`
- Review: `CITATION.cff`
- Review: `CODE_OF_CONDUCT.md`
- Review: `CONTRIBUTING.md`
- Review: `LICENSE`
- Review: `NOTICE.md`
- Review: `SECURITY.md`
- Review: `SUPPORT.md`
- Review: `package.json`
- Review: `docs/00-methodology.md`
- Review: `docs/01-overview.md`
- Review: `docs/02-architecture.md`
- Review: `docs/03-capabilities.md`
- Review: `docs/04-differentiators.md`
- Review: `docs/05-getting-started.md`
- Review: `docs/comparisons/agent-frameworks.md`
- Review: `docs/comparisons/coding-agent-products.md`
- Review: `docs/comparisons/methodology.md`
- Review: `docs/deep-dives/cordis-lifecycle.md`
- Review: `docs/deep-dives/profiles-bundles-presets.md`
- Review: `docs/deep-dives/sandbox-execution.md`
- Review: `docs/deep-dives/session-event-log.md`
- Review: `docs/deep-dives/subagents-goals-workflows.md`
- Review: `docs/deep-dives/tools-and-ptc.md`
- Review: `docs/glossary.md`
- Review: `docs/source-map.md`
- Review: `docs/superpowers/plans/2026-09-05-comparisons-and-publication.md`
- Review: `docs/superpowers/plans/2026-09-05-core-handbook.md`
- Review: `docs/superpowers/plans/2026-09-05-deep-dives.md`
- Review: `docs/superpowers/plans/2026-09-05-foundation-and-evidence.md`
- Review: `docs/superpowers/specs/2026-09-04-evidence-handbook-design.md`
- Review: `evidence/baseline.json`
- Review: `evidence/claims.json`
- Review: `evidence/observations/upstream-facts.json`
- Review: `.github/ISSUE_TEMPLATE/factual-error.yml`
- Review: `.github/ISSUE_TEMPLATE/upstream-drift.yml`
- Review: `.github/ISSUE_TEMPLATE/analysis-proposal.yml`
- Review: `.github/dependabot.yml`
- Review: `.github/pull_request_template.md`
- Review: `.github/workflows/verify.yml`
- Review: `docs/maintainer/repository-settings.md`
- Review: `scripts/inspect-upstream.mjs`
- Review: `scripts/verify-evidence.mjs`
- Review: `test/comparison-evidence-contract.test.mjs`
- Review: `test/evidence-schema-contract.test.mjs`
- Review: `test/evidence-target-contract.test.mjs`
- Review: `test/handbook-navigation.test.mjs`
- Review: `test/helpers/fixture-repo.mjs`
- Review: `test/inspect-upstream.test.mjs`
- Review: `test/parser-contract.test.mjs`
- Review: `test/read-only-inspector.test.mjs`
- Review: `test/repository-community-contract.test.mjs`
- Review: `test/repository-workflow-contract.test.mjs`
- Review: `test/verify-cli-contract.test.mjs`
- Review: `test/verify-evidence.test.mjs`
- Review: `test/fixtures/handbook/valid/docs/comparisons/sample.md`
- Review: `test/fixtures/handbook/valid/docs/fact.md`
- Review: `test/fixtures/handbook/valid/docs/inference.md`
- Review: `test/fixtures/handbook/valid/docs/qualified.md`
- Review: `test/fixtures/handbook/valid/evidence/baseline.json`
- Review: `test/fixtures/handbook/valid/evidence/claims.json`
- Review: `test/fixtures/upstream-template/package.json`
- Review: `test/fixtures/upstream-template/packages/boot/app-boot/src/profile.ts`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/cordis/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/minimal/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/ptc/preset.yml`
- Review: `test/fixtures/upstream-template/packages/preset/agent-presets/presets/standard/preset.yml`
- Review: `test/fixtures/workflows/local.yml`
- Review: `test/fixtures/workflows/malformed.yml`
- Review: `test/fixtures/workflows/pinned.yml`
- Review: `test/fixtures/workflows/tagged.yml`

**Interfaces:**

- Input: public `main`, public annotated tag `snapshot-76fda729`, successful `verify`, completed repository settings, and a local checkout at the tag target.
- Output: a handoff containing exactly the repository URL, tag URL, complete upstream SHA, local test pass count, verifier command, remote workflow conclusion, settings observation, and explicit non-goals; no repository mutation.
- Acceptance: every reported fact is observed from the public repository or the final local commands, and the parent DeepSeek Harness checkout remains byte-unchanged.
- Failure contract: omit no failed check and make no completion claim while any public URL, rendering surface, Issue Form, tag target, setting, test, or verifier result is unobserved.

- [ ] Verify the public URL and exact description, exact baseline, five chapters, six deep dives, two comparisons, methodology, source map, glossary, intentionally published `docs/superpowers/` maintainer provenance, community files, CI, and tag from the public repository. Confirm the provenance files contain no actual placeholder, credential, private contact, or unresolved token.
- [ ] Read-only recheck GitHub's rendered citation surface and `/issues/new/choose`; require the preferred report citation and all three Issue Forms (`factual-error.yml`, `upstream-drift.yml`, `analysis-proposal.yml`) before handoff. Do not edit or recommit the checklist in Task 9.
- [ ] From the checked-out tag target, run `git status --porcelain=v1`, `git rev-parse HEAD`, `git rev-parse 'snapshot-76fda729^{}'`, `npm test`, and `node scripts/verify-evidence.mjs --source /Users/qingyang/github_repo/deepseek-harness` once. Require empty status, equal commit SHAs, all tests passed, empty verifier stderr, and verifier stdout with `ok: true`, `inspectedUpstream: true`, and `claimCount: 65`; record the test runner's actual pass count.
- [ ] Report repository URL `https://github.com/yang0228/deepseek-harness-analysis`, tag URL `https://github.com/yang0228/deepseek-harness-analysis/tree/snapshot-76fda729`, pinned upstream SHA `76fda729799fe9b3848dbe2c211d4b231032b81e`, the actual test pass count, the exact verifier command above, the public workflow conclusion, and the observed repository-settings checklist. State these fixed non-goals: no GitHub Release, no GitHub Pages publishing source or site, no npm/PyPI package publication, and no upstream repository mutation.
- [ ] Run `git -C /Users/qingyang/github_repo/deepseek-harness status --short` and require empty output, then preserve the independent local repository without modifying the parent DeepSeek Harness checkout.
