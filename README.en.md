# DeepSeek Harness Analysis

[中文主手册](README.md)

DeepSeek Harness Analysis is an independent, evidence-linked guide for developers, technical decision-makers, and open-source contributors. It explains the architecture, capability ownership, differentiators, and reproducible entry paths of DeepSeek Harness without acting as official DeepSeek documentation or support.

Choose your next step in the Chinese handbook: [read online, no setup required](README.md#read-online), [verify evidence locally, optional](README.md#verify-locally), or [run the upstream application](README.md#run-harness). The [worked evidence example](README.md#evidence-example) links directly to the pinned rule, request-header fields, and message-projection implementation, with their limitations.

## Baseline

All upstream findings are pinned to DeepSeek Harness commit `46a7f68b0922371ce7144b668b90e377d8e799f4`. This snapshot is a reproducible analysis target, not a statement about the current upstream release or production readiness.

Verified on 2026-09-24 against source version `0.1.7-rc.1`. See the [baseline update record](docs/updates/2026-09-24.md). External comparisons retain their original 2026-09-08 access date; this update rechecks the DSH side only.

## What changed in this baseline

- Desktop runs its private Host in Electron Node mode, reusing the shared Profile runner and complete Web application. Its authenticated Web Host defaults to port `19387`; it is not a sixth CLI Profile template.
- YAML plugin composition controls HMR. Agent Presets are declarative plugin rows; retired revisions are disposed after their last reference is released, and restart resolves the current definition.
- Session v4 adds structured message roles and sources. Forking an unfinished prefix synthesizes missing results and closing events; those records do not prove the original operations completed. Persistence support for `developer/message` is not end-to-end model support.
- Office Skills and Workspace Dependencies now have explicit composition coverage. Workflow can use background Jobs; published Agent Teams remain opt-in and experimental.

## Principal corrections

- Plugin replacement covers product capability composition, not only tool registration; it does not make every running component arbitrarily hot-swappable.
- Lifecycle-owned Effects assign explicit cleanup responsibility for unload and reload, but only for side effects registered through lifecycle APIs.
- Typed live/durable events and model-visible logging support observation and reconstruction, but only durable session events persist.
- Per-session Agent Presets let one Host carry different capability compositions; an active Session cannot arbitrarily swap tools.
- PTC may reduce model-to-tool round trips structurally, but this handbook reports no measured speed, cost, or quality gain.

## Contents

- [Project overview](docs/01-overview.md)
- [Composition and lifecycle architecture](docs/02-architecture.md)
- [Capabilities and composition ownership](docs/03-capabilities.md)
- [Differentiator assessment](docs/04-differentiators.md)
- [Reproducible getting-started paths](docs/05-getting-started.md)
- [Evidence methodology](docs/00-methodology.md), [source map](docs/source-map.md), and [glossary](docs/glossary.md)

The Chinese handbook is primary; the chapters keep upstream English names and exact source citations.

## Verification

Local verification is optional and separate from reading the handbook or running the upstream application. It requires Git and Node.js `^22.19.0 || >=24.0.0`, but no third-party dependencies or model API key. From this repository, use a clean checkout of the pinned upstream source:

```sh
npm test
npm run verify -- --source /absolute/path/to/clean/deepseek-harness
```

The verifier checks repository structure, Claim targets, immutable citations, committed observations, and the upstream baseline. Reviewers must still judge whether sources and qualifications support each conclusion.

## Safety and contribution

The pinned upstream is a developer preview, permits breaking changes, and is not a production-readiness promise. Read the pinned upstream [`SAFETY.md`](https://github.com/deepseek-ai/deepseek-harness/blob/46a7f68b0922371ce7144b668b90e377d8e799f4/SAFETY.md#L5-L23) before running model-generated code or commands. Repository security reports follow [SECURITY.md](SECURITY.md); upstream product questions use the [current upstream repository](https://github.com/deepseek-ai/deepseek-harness).

See [CONTRIBUTING.md](CONTRIBUTING.md) for evidence and baseline-update requirements, [SUPPORT.md](SUPPORT.md) for support boundaries, and [`CITATION.cff`](CITATION.cff) for citation metadata. Maintainer: [`@yang0228`](https://github.com/yang0228).
