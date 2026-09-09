# DeepSeek Harness Evidence Handbook Design

## Status

Approved in conversation on 2026-09-04. This document specifies the first public release of `yang0228/deepseek-harness-analysis`.

## Summary

`deepseek-harness-analysis` is an independent, evidence-first Chinese architecture handbook for developers and architects studying DeepSeek Harness. It explains the project through five questions: what it is, how it is built, what it can do, what distinguishes it, and how to start using it. It links important claims to immutable upstream source locations, separates facts from analysis, records limitations alongside strengths, and includes a small set of read-only verification scripts.

The repository is not affiliated with DeepSeek, is not a fork or mirror of DeepSeek Harness, and does not replace upstream documentation. The expression `Agent = Model + Harness` is an explanatory frame used by this handbook, not an attributed upstream quotation.

## Audience and language

The primary audience is Agent framework developers and software architects who already understand basic Agent and TypeScript concepts. The main documentation is Chinese. `README.en.md` provides an English project summary, and `docs/glossary.md` maps the Chinese terminology to the canonical English terms used by upstream.

The writing is source-oriented but not source-order-oriented. A reader should be able to understand a subsystem before following the links into its implementation.

## Analysis baseline

The first release is pinned to this upstream state:

| Field | Value |
|---|---|
| Repository | `https://github.com/deepseek-ai/deepseek-harness` |
| Commit | `76fda729799fe9b3848dbe2c211d4b231032b81e` |
| Commit date | `2026-09-03` |
| `git describe` | `dsh-v0.1.2-rc.1-99-g76fda72979` |
| Root package version | `0.1.2-rc.1` |
| Handbook verification date | `2026-09-04` |

The commit, rather than the package version or nearest tag, is authoritative. The selected source is 99 commits after `dsh-v0.1.2-rc.1`, so a version-only citation would identify a different tree.

All upstream source links use the complete commit in a GitHub blob URL. A later upstream baseline is a new handbook snapshot and requires an explicit review; the first release does not continuously follow `master`.

## Goals

- Explain the all-plugin architecture, its Cordis substrate, and the limits of the “no privileged core” statement.
- Make application Profiles, Bundles, Patches, Agent Presets, and Scopes distinct and navigable concepts.
- Classify capabilities as enabled by a shipped composition, available as an optional composition, or experimental and excluded from official releases.
- Show how reversible effects, services, typed events, capability seams, and the session event log work together.
- Explain Programmatic Tool Calling without claiming unmeasured speed, cost, or quality improvements.
- Document safety limits and lifecycle constraints next to the mechanisms they qualify.
- Compare DeepSeek Harness with selected Agent frameworks and coding-agent products using common criteria and official primary sources.
- Let maintainers mechanically verify baseline facts, citations, internal links, and claim coverage.

## Non-goals

- Copying or vendoring the DeepSeek Harness source tree.
- Reimplementing DeepSeek Harness or publishing a compatible runtime.
- Exhaustively documenting every package, public type, configuration field, or API.
- Producing performance, cost, throughput, or quality rankings.
- Presenting the local sandbox as a general network, process, or credential isolation boundary.
- Presenting internal snapshot tests as a complete end-user time-travel debugger or benchmark product.
- Treating every package present in the monorepo as enabled in the default product.
- Publishing a documentation website or GitHub Pages build in the first release.

## Repository structure

```text
deepseek-harness-analysis/
├── README.md
├── README.en.md
├── CITATION.cff
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── NOTICE.md
├── SECURITY.md
├── SUPPORT.md
├── .editorconfig
├── .gitignore
├── package.json
├── docs/
│   ├── 00-methodology.md
│   ├── 01-overview.md
│   ├── 02-architecture.md
│   ├── 03-capabilities.md
│   ├── 04-differentiators.md
│   ├── 05-getting-started.md
│   ├── source-map.md
│   ├── glossary.md
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-09-04-evidence-handbook-design.md
│   │   └── plans/
│   │       ├── 2026-09-05-foundation-and-evidence.md
│   │       ├── 2026-09-05-core-handbook.md
│   │       ├── 2026-09-05-deep-dives.md
│   │       └── 2026-09-05-comparisons-and-publication.md
│   ├── maintainer/
│   │   └── repository-settings.md
│   ├── deep-dives/
│   │   ├── cordis-lifecycle.md
│   │   ├── profiles-bundles-presets.md
│   │   ├── session-event-log.md
│   │   ├── tools-and-ptc.md
│   │   ├── sandbox-execution.md
│   │   └── subagents-goals-workflows.md
│   └── comparisons/
│       ├── methodology.md
│       ├── agent-frameworks.md
│       └── coding-agent-products.md
├── evidence/
│   ├── baseline.json
│   ├── claims.json
│   └── observations/
│       └── upstream-facts.json
├── scripts/
│   ├── inspect-upstream.mjs
│   └── verify-evidence.mjs
├── test/
│   ├── helpers/
│   │   └── fixture-repo.mjs
│   ├── fixtures/
│   │   ├── handbook/
│   │   ├── upstream-template/
│   │   └── workflows/
│   ├── comparison-evidence-contract.test.mjs
│   ├── evidence-schema-contract.test.mjs
│   ├── evidence-target-contract.test.mjs
│   ├── handbook-navigation.test.mjs
│   ├── inspect-upstream.test.mjs
│   ├── parser-contract.test.mjs
│   ├── read-only-inspector.test.mjs
│   ├── repository-community-contract.test.mjs
│   ├── repository-workflow-contract.test.mjs
│   ├── verify-cli-contract.test.mjs
│   └── verify-evidence.test.mjs
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── factual-error.yml
    │   ├── upstream-drift.yml
    │   └── analysis-proposal.yml
    ├── workflows/
    │   └── verify.yml
    ├── dependabot.yml
    └── pull_request_template.md
```

`README.md` is an entry point rather than a duplicate handbook. It contains the non-affiliation statement, pinned baseline, principal findings, safety warning, five-chapter navigation, and reading paths. Detailed explanations live in `docs/`.

`docs/superpowers/` intentionally ships as maintainer provenance for the approved design and the executable implementation plans. It is not part of the reader-facing handbook navigation, and its prose does not create evidence claims. Repository-wide link, placeholder, and secret checks still cover it.

GitHub-native Mermaid diagrams remain inline in the owning documents. The first release does not add generated SVG files or a browser rendering toolchain.

## Content architecture

Every main chapter follows the same sequence:

1. concise answer;
2. mechanism;
3. immutable source evidence;
4. qualifications and limits;
5. links to the relevant deep dives and upstream documentation.

### Project overview

The overview describes DeepSeek Harness as DeepSeek’s open-source, Cordis-based, all-plugin agent harness. It explains the handbook’s `Agent = Model + Harness` frame and distinguishes a replaceable product capability from the Cordis, Loader, and `dsh` boot substrate required to assemble the application.

### Architecture

The architecture chapter covers:

- the Cordis plugin tree and lifecycle;
- service-key dependency injection;
- typed event domains and dispatch modes;
- reversible registrations;
- the Service Definition, Service Provider, and Consumer roles of a capability seam;
- application composition through Profile, Bundle, Patch, and named `dsh` launch surfaces;
- session composition through Agent Preset and Scope;
- the turn and step flow;
- the append-only session event log and model-history projection.

The chapter must qualify replaceability: implementations are replaceable behind stable services and events, but an active application or session does not permit arbitrary concurrent replacement. Only the Web profile and custom live profiles reload patches during execution; one-shot and stdio profiles apply their layers at startup.

### Capabilities

Capabilities are grouped by their actual activation path. Every capability-matrix row names one of these exact owners rather than saying only “default” or “available”:

- `profile:<name>` for an application-level row reached through `web`, `headless`, `sdk`, `sdk-minimal`, or `acp`, including the exact bundle that contributes it;
- `preset:<id>` for a session-level row enabled by `standard`, `minimal`, `ptc`, or `cordis`;
- `optional-package:<path>` for a release-family source package that no enabled row in a shipped Profile and Preset pair reaches; this label does not independently assert npm registry availability;
- `experimental:<path>` for packages under `packages/experimental` that are excluded from official releases.

The application matrix records that `web`, `headless`, `sdk`, and `acp` layer their surface bundle over `dsh-base`, while `sdk-minimal` owns a standalone tree. The session matrix records Standard’s full native tool presentation, Minimal’s persistent shell and string-replace editor, PTC’s `run_code` presentation with the general workflow tool disabled, and Cordis/Creator’s Standard capabilities plus runtime inspection and preset authoring. The dormant pi-ai row is attributed to `dsh-base`; Codex and Claude Code subagent tool rows are attributed to their exact preset rows and marked disabled; alternative search providers and Agent Teams are attributed to their package paths rather than described as active defaults.

The model section says that pi-ai can configure multiple provider routes and hand-declared compatible gateways. It does not claim that OpenAI, Anthropic, Bedrock, Azure, Gemini, or every catalog provider is preconfigured and enabled out of the box.

The sandbox section states that the shipped local providers cover Linux, macOS, and Windows, while their declared modes govern filesystem effects. It reports the pinned upstream qualification that the Windows backend and older supported Landlock ABIs may return `enforcement: 'partial'`; because the cited upstream documentation does not publish a kernel-version threshold in that statement, the handbook does not invent one. The claim remains `qualified` and links to the exact sandbox source and documentation lines. `sdk-minimal` deliberately uses danger-full-access.

The session section covers durable events, projections, persistence, resume, transcripts, and completed-turn forks. It distinguishes these primitives and the repository’s deterministic replay tests from a dedicated user-facing debugger or general benchmark suite.

The delegation section distinguishes the in-process providers enabled by the Standard preset from optional Codex, Claude Code, ACP, and DSH SDK providers. It also distinguishes one durable current goal from a scheduler, and model-authored workflow programs from a security sandbox.

### Differentiators

The differentiators chapter evaluates:

- product-wide plugin replacement rather than tool-only extension;
- lifecycle-owned reversible side effects;
- three-role capability seams;
- typed durable and live event domains;
- the `model-visible means logged` invariant;
- per-session capability composition;
- Programmatic Tool Calling through the normal tool execution pipeline.

Each item includes the architectural benefit, the cost or constraint, and the situations where the mechanism matters. PTC is described as reducing potential model/tool round trips by allowing a model-written TypeScript program to compose tool calls; the handbook makes no quantitative improvement claim without a separate benchmark.

### Getting started

The onboarding chapter separates five paths:

1. packaged Web UI: upstream’s floating quick start, `npx @deepseek-ai/dsh web`, plus `npx @deepseek-ai/dsh@0.1.2-rc.1 web` as an explicitly selected version matching the version declared by the pinned source tree, subject to that version being present in the reader’s configured npm registry;
2. source checkout: `pnpm install`, `pnpm run build`, then `pnpm dsh web`;
3. one-shot Headless profile;
4. the TypeScript SDK and its SDK-serving profile;
5. the Python SDK, its bundled runtime, and explicit Harness home.

The chapter states that the floating npm command follows the registry and does not reproduce the handbook baseline. The explicit npm version matches the version string declared by the pinned source tree, but the handbook neither treats registry availability as a pinned-source fact nor equates that package artifact with the post-tag source commit. Exact handbook reproduction requires checking out commit `76fda729799fe9b3848dbe2c211d4b231032b81e`, then using the source-build path. It records the baseline’s Node requirement (`^22.19.0 || >=24.0.0`), pnpm version (`11.7.0`), credential expectations, developer-preview status, and upstream safety warning. Any handbook experiment that executes dsh creates explicit disposable workspace and Harness-home directories; the canonical upstream quick-start command is shown as documentation and clearly states that its ordinary run uses the user’s Harness home. No example contains a real credential.

## Profile and preset terminology

The handbook treats this distinction as a central correction:

| Layer | Current shipped values | Purpose |
|---|---|---|
| Application Profile | `web`, `headless`, `sdk`, `sdk-minimal`, `acp` | Starts a complete application composition through the `dsh` launcher. |
| Agent Preset | `standard`, `minimal`, `ptc`, `cordis` | Gives one session its tools, prompt sections, skills, and scoped services. |

The UI names `ptc` as PTC mode and `cordis` as Creator mode. “Code” and “Creator” are descriptive labels, not the authoritative preset directory identifiers in the pinned tree.

## Comparative analysis

The first release uses two separate comparison sets so unlike systems are not placed in one ranking:

- **Agent frameworks:** LangGraph, Microsoft AutoGen, and the OpenAI Agents SDK.
- **Coding-agent products:** Claude Code and OpenAI Codex.

Framework comparison criteria are composition, replaceable capability interfaces, lifecycle ownership, state and persistence, tool execution, orchestration, and extension mechanisms. Product comparison criteria are tool and hook extension, execution policy, session recovery, delegation, UI surfaces, and SDK or automation access.

Only official documentation, official repositories, specifications, and first-party release notes may support external comparison facts. OpenAI comparison evidence follows the `openai-docs` source policy and is limited to current pages under `developers.openai.com`, `platform.openai.com`, or `learn.chatgpt.com`; repository links and `openai.github.io` are not used for those claims. Every source records an access date and additionally records at most one version or commit when the publisher exposes it. The comparison documents explicitly label differences in abstraction level, unavailable information, and author inference. They contain no total score, winner, performance ranking, or undocumented internal-architecture claim.

## Evidence model

`evidence/baseline.json` contains the fixed upstream values listed in the baseline table. Its field order and final newline are deterministic.

`evidence/claims.json` has `schemaVersion: 1` and a `claims` array. Each claim has:

- `id`: a unique value such as `DSH-ARCH-001`;
- `statement`: the Chinese conclusion used by the handbook;
- `kind`: `upstream-fact`, `analysis-inference`, or `external-comparison`;
- `confidence`: `verified` or `qualified`;
- `maturity`: `released`, `experimental`, or `not-applicable`; this field records DeepSeek Harness release maturity independently of evidentiary confidence;
- `documents`: one or more repository-relative Markdown paths with anchors;
- `sources`: one or more source records;
- optional `qualification`: the limit required to keep the statement accurate;
- optional `probe`: the named observation produced by the inspector.

The valid combinations are explicit. `analysis-inference` is always `qualified`; `upstream-fact` uses `released` or `experimental`; `external-comparison` uses `not-applicable`; and a DeepSeek Harness inference may use any maturity appropriate to its subject. An experimental mechanism can therefore be independently `verified` or `qualified`. Capability-table availability is a separate vocabulary—`enabled`, `optional`, `disabled`, or `experimental`—and is never inferred from claim confidence or maturity. Every `upstream-fact` has at least one upstream source record, although it may also cite external sources; no source-kind requirement is inferred for the other claim kinds. An upstream source record contains the upstream repository, complete commit, repository-relative path, one-based start and end lines, and immutable URL. An external source record contains the official URL, publisher, access date, and at most one of `version` or full `commit`; both may be absent when the publisher exposes neither, but they are never present together. When `commit` is present, the URL must itself be immutable and contain that exact 40-character commit as its revision segment; the first release recognizes GitHub `/blob/<commit>/...` and `/tree/<commit>/...` URLs and rejects a mismatch.

“Highlighted conclusion” has one mechanically recognizable form: a single line beginning `<a id="claim-dsh-arch-001"></a> **Claim \`DSH-ARCH-001\`:**`, with the lower-case anchor derived from the exact visible id. The conclusion text after that prefix must equal the ledger’s canonical `statement` byte for byte. Every such marker must name a ledger entry and appear in that entry’s `documents`; every ledger document target must resolve to exactly one such marker. An orphan `claim-*` anchor, an unknown visible claim id, an anchor/id mismatch, a statement mismatch, or a marked conclusion omitted from the ledger fails verification. Other prose may cite a claim by linking to its canonical marker, but does not become a new highlighted conclusion. Other cross-document targets use explicit stable anchors when another file links to a subsection. A claim may support several documents, but there is one canonical statement in the ledger. Source excerpts are not copied into the ledger.

## Verification data flow

```text
pinned upstream checkout
        ↓
read-only inspector
        ↓
normalized upstream-facts.json
        ↓
claims.json
        ↓
handbook prose and Mermaid diagrams
        ↓
local verification and GitHub Actions
```

`scripts/inspect-upstream.mjs --source <absolute-checkout>` first checks that the checkout is at the configured commit and clean. On a mismatch or dirty tree it exits nonzero before emitting formal observation JSON. On success it reads Git metadata and a small set of authoritative files, emits normalized JSON to stdout, and never writes to the upstream checkout. It extracts:

- commit, commit date, `git describe`, and root package version;
- shipped Profile names, bundle layers, and reload modes from the `PROFILE_TEMPLATES` declaration;
- shipped Agent Preset ids and their display metadata.

The Profile extractor is intentionally tied to the pinned declaration syntax. It fails with a named parse error when the block changes rather than guessing from prose.

`scripts/verify-evidence.mjs` validates the baseline and claim data, unique ids, confidence/maturity compatibility, the required upstream source for each `upstream-fact`, both directions of marked-claim coverage, internal document anchors, immutable upstream URL construction, external commit-to-URL consistency, local paths, line bounds, and probe references. With `--source`, it also compares the local checkout and freshly inspected observations with the committed baseline. The verifier performs no external HTTP requests and does not judge whether sources semantically support a statement; external-link freshness, first-party authority, and semantic sufficiency remain manual baseline-update responsibilities so CI does not become network-flaky.

Both scripts use Node.js ESM and only built-in modules. `package.json` defines the commands but has no runtime or development dependencies in the first release.

## Failure behavior

Verification fails with actionable messages:

- a commit mismatch prints the expected and actual complete SHA;
- a dirty upstream checkout makes the inspector exit before it emits formal observation JSON;
- an absent source path names the claim and missing path;
- an invalid or out-of-range line span names the source record;
- a document path or anchor mismatch names the claim and target;
- an orphan or mismatched highlighted-claim marker names the document and line;
- a Profile declaration that cannot be parsed names the expected declaration;
- a comparison source without a publisher or access date is rejected, while reviewers decide whether that publisher is an official primary source;
- an architectural conclusion that cannot be mechanically proved remains `analysis-inference` and requires human review.

There is no permissive fallback from an unknown input format to best-effort evidence.

## Testing

Node’s built-in test runner covers:

- clean extraction from representative pinned fixtures;
- dirty and mismatched checkout rejection;
- Profile declaration parse failure;
- Preset roster extraction;
- duplicate claim ids, invalid confidence/maturity values, and incompatible kind combinations;
- broken internal paths and anchors;
- orphan, unknown, id-mismatched, and statement-mismatched highlighted-claim markers;
- malformed immutable source URLs and line ranges;
- external comparison sources missing publisher/access date, carrying both version and commit, or whose commit differs from the immutable URL revision;
- successful end-to-end verification against a fixture repository.

The successful inspector/verifier integration test snapshots the upstream checkout’s HEAD and a recursive inventory of the actual checkout before the run, excluding only `.git`. The inventory includes ignored and untracked entries, directories, symbolic-link targets, file modes, byte lengths, and SHA-256 digests of file contents; the fixture contains a pre-existing ignored-file sentinel. The test repeats the same inventory afterward and requires exact equality, so a write to a tracked, untracked, or ignored path is observable. This direct before/after invariant complements the inspector’s internal read-only implementation choices.

The GitHub workflow checks out this repository and the exact DeepSeek Harness commit into separate paths, then runs the tests and verifier against that checkout. The upstream checkout fetches the tags and history needed to reproduce the recorded `git describe` value. The workflow declares `permissions: contents: read`, receives no secrets, and pins every referenced Action to a full 40-character commit SHA. Repository verification rejects a non-local `uses:` reference that is not a full SHA; the maintainer separately verifies and records that a newly introduced SHA belongs to the named Action repository. Mermaid is reviewed through GitHub rendering; the first release does not add a browser or Chromium dependency solely to validate diagrams.

## GitHub repository policy

The public repository URL is `https://github.com/yang0228/deepseek-harness-analysis`, its description is `DeepSeek Harness 架构与实现的证据链手册`, and `main` is its default branch. Before creation, the implementation verifies that this exact repository does not already exist and that the authenticated GitHub identity may create repositories for `yang0228`; it stops without modifying an existing repository when either check fails. The required `verify` check gates merges after the initial bootstrap. The handbook uses `snapshot-<upstream-short-sha>` release tags; the first release tag is `snapshot-76fda729`. `docs/maintainer/repository-settings.md` assigns `@yang0228` the post-bootstrap checklist for settings that Git cannot store: visibility, description, default branch, the required check, private vulnerability reporting, topics, Issues, Wiki, Pages, and Discussions. The first release is not tagged until `@yang0228` has completed that checklist; CI does not claim to prove account-level settings.

Community files follow GitHub’s supported locations:

- `README.md` explains purpose, use, support, maintainers, baseline, and navigation;
- `CONTRIBUTING.md` defines evidence quality, issue and pull-request expectations, and baseline updates;
- `CODE_OF_CONDUCT.md` is a concise project policy aligned with GitHub Community Guidelines; it directs abusive GitHub-hosted content to GitHub’s “Report abuse or spam” flow or Support portal, sends non-sensitive repository moderation requests to Issues, and names `@yang0228` as the repository moderator, so the project does not publish or invent a personal enforcement address;
- `SUPPORT.md` routes handbook support, upstream usage questions, and security reports separately;
- `SECURITY.md` covers only this repository’s scripts and workflows; because the pinned upstream tree publishes no `SECURITY.md`, it tells readers to consult the current upstream repository for any later disclosure route and never to report an upstream vulnerability through a public handbook Issue;
- the three Issue Forms capture factual errors, upstream drift, and analysis proposals;
- the pull-request template requires changed claim ids, source classification, and commands run.

Private vulnerability reporting is enabled for the public repository after creation. This is separate from `SECURITY.md`.

All original prose, diagrams, data files, and scripts use the MIT License. `NOTICE.md` identifies the independent project, attributes the MIT-licensed upstream repository, records the baseline, and states that DeepSeek names and marks belong to their respective owner. No upstream code or asset is redistributed in the first release, so upstream third-party notice files are linked rather than copied.

`CITATION.cff` is a CFF 1.2.0 software citation with `yang0228` as the author name, version `snapshot-76fda729`, and `https://github.com/yang0228/deepseek-harness-analysis`; its `preferred-citation` is a report for the handbook snapshot.

The repository topics are `deepseek`, `deepseek-harness`, `agent-harness`, `agent-runtime`, `architecture`, `cordis`, and `typescript`. Wiki remains disabled and GitHub Pages has no publishing source (or is explicitly unpublished) to preserve one documentation source. Issues are enabled; Discussions are omitted in the first release. `@yang0228` applies and verifies these values through the post-bootstrap checklist.

## Baseline update policy

A baseline update is one focused pull request that:

1. changes `baseline.json` to an explicit upstream commit;
2. regenerates `upstream-facts.json` from a clean checkout;
3. runs verification before prose changes to expose structural drift;
4. updates claims, chapters, diagrams, and comparisons affected by the new tree;
5. records added, removed, changed, and newly qualified conclusions in the pull-request description;
6. passes the complete repository verification workflow;
7. creates a new `snapshot-<short-sha>` tag after merge.

No scheduled job rewrites evidence or documentation automatically. A maintainer may open an upstream-drift issue, but judgment-bearing updates remain reviewed changes.

## Design references

- [Pinned DeepSeek Harness architecture](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/docs/architecture.md)
- [Pinned DeepSeek Harness README](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/README.md)
- [GitHub community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
- [GitHub citation files](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)
- [GitHub abuse and spam reporting](https://docs.github.com/en/communities/maintaining-your-safety-on-github)

## Acceptance criteria

The first release is complete when:

- the public repository exists at `https://github.com/yang0228/deepseek-harness-analysis` with the exact description and without replacing a pre-existing repository;
- the five main chapters, six deep dives, two comparison reports, methodology, source map, and glossary are present and internally linked;
- the README states the independent status, exact baseline, primary findings, safety warning, and reading routes without duplicating the handbook;
- Profiles and Agent Presets are named and separated exactly as specified;
- shipped, optional, and experimental capabilities are visibly distinguished;
- every highlighted architectural conclusion has a claim entry and immutable upstream evidence or is explicitly labeled as inference;
- every comparison fact cites an official primary source with an access date and, when the publisher exposes one, a version or commit;
- the inspector and verifier are read-only with respect to the upstream checkout and pass their tests;
- CI checks the exact upstream commit with read-only permissions and full-SHA Action references;
- the repository owner has completed the versioned post-bootstrap settings checklist;
- all GitHub community and citation files are populated with no placeholder text;
- no credential, copied upstream source, unsupported security promise, quantitative performance claim, or unresolved `TODO`/`TBD` remains;
- the `snapshot-76fda729` release tag is created only after the repository’s required verification check passes.
