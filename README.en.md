# DeepSeek Harness Analysis

[中文主手册](README.md)

DeepSeek Harness Analysis is an independent, evidence-linked guide for developers, technical decision-makers, and open-source contributors. It explains the architecture, capability ownership, differentiators, and reproducible entry paths of DeepSeek Harness without acting as official DeepSeek documentation or support.

## Baseline

All upstream findings are pinned to DeepSeek Harness commit `76fda729799fe9b3848dbe2c211d4b231032b81e`. This snapshot is a reproducible analysis target, not a statement about the current upstream release or production readiness.

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

From this repository, use a clean checkout of the pinned upstream source:

```sh
npm test
npm run verify -- --source /absolute/path/to/clean/deepseek-harness
```

The verifier checks repository structure, Claim targets, immutable citations, committed observations, and the upstream baseline. Reviewers must still judge whether sources and qualifications support each conclusion.

## Safety and contribution

The pinned upstream is a developer preview, permits breaking changes, and is not a production-readiness promise. Read the pinned upstream [`SAFETY.md`](https://github.com/deepseek-ai/deepseek-harness/blob/76fda729799fe9b3848dbe2c211d4b231032b81e/SAFETY.md) before running model-generated code or commands. Repository security reports follow [SECURITY.md](SECURITY.md); upstream product questions use the [current upstream repository](https://github.com/deepseek-ai/deepseek-harness).

See [CONTRIBUTING.md](CONTRIBUTING.md) for evidence and baseline-update requirements, [SUPPORT.md](SUPPORT.md) for support boundaries, and [`CITATION.cff`](CITATION.cff) for citation metadata. Maintainer: [`@yang0228`](https://github.com/yang0228).
