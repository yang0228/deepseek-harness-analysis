# 安全政策

本政策只覆盖 DeepSeek Harness Analysis 仓库自身的脚本、证据验证逻辑和 GitHub Actions 工作流，不覆盖 DeepSeek Harness 产品、其依赖、模型服务或其他上游项目。

仓库发布后将启用 GitHub Private Vulnerability Reporting。发现本仓库范围内可能造成代码执行、工作流权限扩大、凭据暴露或验证绕过的问题时，请通过仓库 Security 页面中的私密报告入口提交，并附上影响、复现条件和建议缓解方式。在该入口尚不可用时，请勿公开披露细节或提交公开 Issue；应等待维护者完成仓库设置后再私密提交。

本项目不承诺固定响应时限、奖励或保密期限。`@yang0228` 会在 GitHub 提供的私密协作空间中评估报告、确认范围并协调修复和披露。

若问题属于 DeepSeek Harness 上游，请查看 [当前上游仓库](https://github.com/deepseek-ai/deepseek-harness) 是否已经发布安全披露渠道，并按其现行说明处理。固定基线中没有可由本手册代为承接的上游披露地址；任何上游漏洞都不得通过本手册的公开 Issue 报告。
