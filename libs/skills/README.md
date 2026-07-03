# lm-skill

本目录包含三组技能：**GitNexus 系列**（代码智能）、**页面工作流系列**和 **开发协作系列（superpowers）**。

---

## GitNexus 系列

> **物理位置：`gitnexus/` 目录**（根目录下的 `gitnexus-*` 为反向符号链接，保持向后兼容）

基于知识图谱的代码智能工具集，提供代码理解、影响分析、安全重构等能力。

| 技能 | 描述 |
|------|------|
| `gitnexus-guide` | **使用手册 / 总入口**。GitNexus 工具与资源速查表，根据任务类型路由到对应技能 |
| `gitnexus-exploring` | **架构探索**。理解代码结构、追踪执行流、回答"X 是怎么工作的？" |
| `gitnexus-impact-analysis` | **影响范围分析**。评估修改的爆炸半径，回答"改了 X 会破坏什么？" |
| `gitnexus-debugging` | **Bug 追踪**。从错误信息出发，沿调用链定位根源 |
| `gitnexus-pr-review` | **PR 审查**。自动分析 PR 变更的爆炸半径、检查缺失的测试覆盖、评估合并风险 |
| `gitnexus-refactoring` | **安全重构**。跨文件协调重命名、提取模块、拆分服务，基于调用图保证一致性 |
| `gitnexus-cli` | **CLI 操作**。索引管理（analyze）、状态查询（status）、清理（clean）、生成文档（wiki）等命令行操作 |

> 入口方式：通过 `gitnexus-guide` 路由，或作为 superpowers 的叠加增强层使用（见 superpowers README）。

---

## 页面工作流系列

| 技能 | 描述 |
|------|------|
| `create-ui-workflow` | **UI 页面生成工作流**。编排 `create_api_mcp` → `create_ui_mcp` 的完整链路，以 `page.json` 为单一事实来源生成页面代码，自动处理 apiName 回填 |

---

## 开发协作系列

| 技能 | 描述 |
|------|------|
| `superpowers` | **前端开发者总路由中心**。根据任务场景（头脑风暴→方案设计→编码实现→调试→审查→交付）自动分流到 15+ 子技能，覆盖完整开发生命周期 |
| `using-superpowers` | **技能使用规范**。确立在任何对话/澄清/操作之前优先调用 Skill 工具的强制规则，并提供多平台（Claude Code / Copilot CLI / Hermes / Gemini CLI）的技能加载方式 |
