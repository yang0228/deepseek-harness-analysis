# GitHub 仓库设置清单

本页记录 Git 无法保存或本地验证的 GitHub 设置。仓库已经发布。2026-09-16 通过 GitHub Repository API 重新读取了公开设置；下列已勾选项只表示 API 可确认的状态，不代表原生页面渲染已检查。未核验或未达到目标的设置保留待办，不在本次源码基线升级中自动修改。

- [x] 2026-09-16 — `@yang0228`：确认仓库为 public，URL 为 `https://github.com/yang0228/deepseek-harness-analysis`。
- [x] 2026-09-16 — `@yang0228`：API 确认描述为 `DeepSeek Harness 架构与实现的证据链手册`。
- [x] 2026-09-16 — `@yang0228`：确认默认分支为 `main`。
- [ ] 2026-09-06 — `@yang0228`：在首次引导完成后为 `main` 设置分支保护，并要求 `verify` 检查通过后才可合并。
- [ ] 2026-09-06 — `@yang0228`：启用 Private vulnerability reporting，并确认私密报告入口可用。
- [ ] 2026-09-06 — `@yang0228`：设置 topics 为 `deepseek`、`deepseek-harness`、`agent-harness`、`agent-runtime`、`architecture`、`cordis`、`typescript`，不增删条目。2026-09-16 API 返回 topics 为空，尚未设置。
- [x] 2026-09-16 — `@yang0228`：Issues 已启用。
- [ ] 2026-09-06 — `@yang0228`：关闭 Wiki。2026-09-16 API 仍为 `has_wiki: true`。
- [x] 2026-09-16 — `@yang0228`：Discussions 已关闭。
- [ ] 2026-09-06 — `@yang0228`：确认 GitHub Pages 没有发布源且没有已发布站点。2026-09-16 API 为 `has_pages: false`，发布源设置尚未直接检查。
- [ ] 2026-09-06 — `@yang0228`：完成全部设置与渲染记录前，不创建 `snapshot-46a7f68b` 标签。

## Action 来源记录

2026-09-06 通过 Action 官方仓库与发布页核对：`actions/checkout` v6.0.2 对应 `de0fac2e4500dabe0009e67214ff5f5447ce83dd`；`actions/setup-node` v7.0.0 对应 `820762786026740c76f36085b0efc47a31fe5020`。本地检查只验证工作流引用的仓库、完整 SHA 和结构，不能替代这项来源核对。

每个 Dependabot Action 更新提案都由 `@yang0228` 重新核对：打开对应 Action 的官方仓库和发布页，确认提案中的完整 SHA 属于该仓库且对应声明的发布版本，记录核对日期与来源链接，并在同一提案中更新工作流注释、本页来源记录和精确版本测试；完成核对及 `npm test` 后才可合并。不得沿用上一次提案的核对结果。

## 发布计划中的 GitHub 观察

这些观察尚未发生，也不是已完成的复选项。发布计划的 Task 6 负责观察 GitHub 是否显示 “Cite this repository”，以及三个 Issue Form 是否都能打开且没有 configuration-error banner；Task 7 把观察结果和日期写入已推送的本清单；Task 8 在打标签前确认本页所有复选项和观察记录完整；Task 9 在交付前重新核对已记录状态。本地 CFF、Issue Form 和 Markdown 结构验证不声称证明 GitHub 渲染，单独一次观察也不等于完成设置清单。
