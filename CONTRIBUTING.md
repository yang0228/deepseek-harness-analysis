# 参与贡献

DeepSeek Harness Analysis 是独立的证据链手册，不隶属于 DeepSeek，也不替代上游文档。贡献应帮助读者区分可复核事实、作者分析和外部比较。

开始修改前请从[中文主手册](README.md)选择对应章节；一般问题和上游产品支持边界见[支持范围](SUPPORT.md)。

## 证据要求

- `upstream-fact` 只使用固定基线中的 DeepSeek Harness 源码、仓库文档或可重复的只读探测结果。
- `analysis-inference` 必须标为 `qualified`，并写明推论成立的范围与限制。
- `external-comparison` 只使用被比较项目的官方文档、官方仓库、规范或第一方发布说明，并记录发布方和访问日期。
- 上游源码引用必须指向完整 40 位提交 SHA 的不可变 GitHub 地址；不要把分支、浮动标签、搜索结果或转述文章当作定论证据。
- 首次发布不接受性能、成本、吞吐量或质量的量化结论与排名；今后如需扩大范围，须另行审批范围变更。

发现事实错误、上游漂移或新的分析方向时，请选用相应的 [Issue Form](https://github.com/yang0228/deepseek-harness-analysis/issues/new/choose)。本仓库脚本或工作流的安全问题按 [SECURITY.md](SECURITY.md) 处理，不要在公开 Issue 中披露；DeepSeek Harness 上游安全问题按上游当前公开渠道处理。

## 修改流程

1. 说明涉及的 claim id、分类、置信度、成熟度和必要的 qualification。
2. 更新 `evidence/claims.json`、对应文档和全部受影响的不可变来源。
3. 若更新基线，先固定新的上游提交并生成观察文件，再运行验证以暴露结构漂移，随后更新受影响的结论、图示和比较内容。
4. 在拉取请求中列出新增、删除、变化和新增限定的结论，并说明基线影响。
5. 只记录实际运行过的命令。

提交前至少运行：

```sh
npm test
npm run verify -- --source /absolute/path/to/clean/deepseek-harness
```

验证器要求上游检出目录处于固定提交且工作树干净。贡献者仍需人工判断来源是否为官方一手资料、引用范围是否足以支持结论，以及限定语是否准确。

拉取请求还应说明来源权威性、修改的文件、未覆盖范围和审核者需要重点复核的风险。一般使用 MIT 许可提交原创内容；不要复制上游源码、资源或第三方通知正文。
