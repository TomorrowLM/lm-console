# GitNexus — 代码智能技能集

> **本目录为 GitNexus 系列技能的唯一物理存储位置。**
> 所有技能通过**技能名**（`gitnexus-guide` 等）被引用，与物理目录位置无关。

## 结构

```
gitnexus/
├── gitnexus-guide/           ★ 总入口 / 使用手册 / 路由中心
├── gitnexus-exploring/       架构探索：代码结构、执行流追踪
├── gitnexus-impact-analysis/ 影响范围分析：爆炸半径评估
├── gitnexus-debugging/       Bug 追踪：调用链定位根源
├── gitnexus-pr-review/       PR 审查：变更影响 + 风险评估
├── gitnexus-refactoring/     安全重构：跨文件协调重构
└── gitnexus-cli/             CLI 操作：索引管理 / 状态查询 / wiki 生成
```

## 入口方式

| 方式 | 说明 |
|------|------|
| **独立使用** | 直接加载对应技能的 SKILL.md |
| **通过 superpowers** | 作为叠加增强层，在主流程节点上条件性加载（见 `superpowers/SKILL.md` 路由表 L31） |
| **总入口** | 始终推荐从 `gitnexus-guide` 进入，由其根据任务类型路由到具体子技能 |

## 路由关系

```
用户意图                          → gitnexus-guide 路由到
─────────────────────────────────────────────────────────
"X 是怎么工作的？"                → gitnexus-exploring
"改这个函数会波及哪些代码？"        → gitnexus-impact-analysis
"为什么 X 失败了？"               → gitnexus-debugging
"帮我安全地重命名/提取/拆分 X"      → gitnexus-refactoring
"审查这个 PR 的风险"              → gitnexus-pr-review
"索引状态 / 清理 / 生成 wiki"     → gitnexus-cli
```

## 与 superpowers 的集成

GitNexus 作为 **叠加增强层** 嵌入 superpowers 工作流：

```
新功能开发:  ... → writing-plans[+gitnexus] → subagent-driven-development[+gitnexus] → requesting-code-review[+gitnexus]
Bug 修复:    ... → systematic-debugging[+gitnexus] → ...
PR 审查:     ... → requesting-code-review[+gitnexus] → ...
```

---
## 迁移记录

**2026-05-11**：将 7 个 `gitnexus-*` 文件夹从 `skills/` 根目录物理移入 `skills/gitnexus/`。

结论：纯物理移动（无需符号链接）可行，原因：
- `superpowers/SKILL.md` 中所有引用均为**技能名**（`gitnexus-guide`），不涉及物理路径
- AI 系统按技能名注册和调用，与目录位置无关
- 根目录无需保留反向符号链接
