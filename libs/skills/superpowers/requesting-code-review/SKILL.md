---
name: requesting-code-review
description: "使用 CodeReview 子代理对代码变更进行系统性审查和影响分析。支持完整审查（含 GitNexus 影响分析）、diff 审查和附件审查三种模式。在子代理驱动开发中每个任务完成后、重要功能实现后、合并到 main 前、重构前、复杂 bug 修复后使用。"
---

# 请求代码审查

派遣 CodeReview 子代理在问题扩散前发现它们。审查者获得的是精心组织的评估上下文，而非完整的会话历史。**核心原则：早审查，勤审查。**

## 何时请求审查

**必须审查：**
- 子代理驱动开发中每个任务完成后
- 完成重要功能后
- 合并到 main 之前

**可选但有价值：**
- 卡住时（换个视角）
- 重构之前（建立基线）
- 修复复杂 bug 之后

## 审查模式

在开始审查前执行环境探测，根据结果选择模式。

### 环境探测

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1. 探测终端 | 执行 `npx gitnexus analyze`，失败后等待 2 秒重试一次 | 确认终端可用；同时刷新索引 |
| 2. 探测 MCP | 检查 GitNexus MCP 工具列表中是否有 `detect_changes` | 确认完整审查能力是否就绪 |
| 3. 确认附件 | 检查用户是否提供了附件文件（粘贴代码、拖拽文件等） | 作为模式 C 的判断依据。若降级后仍无附件，先询问审查范围 |

### 模式选择

| 模式 | 条件 | 审查方式 |
|------|------|----------|
| **A. 完整审查** | 终端可用 + GitNexus MCP 可用 | git diff + GitNexus 影响分析 + CodeReview 子代理 |
| **B. diff 审查** | 终端可用 + GitNexus MCP 不可用 | git diff + CodeReview 子代理（无影响分析） |
| **C. 附件审查** | 终端不可用（重试后确认）+ 用户提供了附件 | 静态走读。开头声明「本次审查为附件静态走读，未执行 git diff 和 GitNexus 影响分析」，不输出影响范围章节 |

## 审查流程

### 0. 前置验证（仅模式 A/B）
先使用 `superpowers:verification-before-completion` 确认测试通过、构建成功，不得审查未验证代码。

### 1. 获取变更范围

**模式 A/B：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # 或 origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**模式 C：** 跳过，直接使用附件文件作为审查范围。

### 2. 收集影响数据（仅模式 A，主会话执行）

> 子代理无法调用 MCP 工具。主会话完成所有 MCP 调用，结果以文本注入子代理 prompt。

| 步骤 | 操作 | 说明 |
|------|------|------|
| 刷新索引 | `npx gitnexus analyze` | 环境探测已执行则跳过，否则单独执行 |
| 确认仓库 | MCP `gitnexus.list_repos` | 确认索引就绪 |
| 变更影响 | MCP `gitnexus.detect_changes` | 获取变更符号、受影响流程、风险等级 |
| 深入分析 | 对高风险符号调 `gitnexus.impact` | 获取 d=1~3 调用链 |
| 补充上下文 | 对关键符号调 `gitnexus.context` | 获取完整调用关系 |

所有结果收集为文本，作为 `{GITNEXUS_DATA}` 注入。

### 3. 派遣 code-reviewer 子代理

使用 CodeReview 子代理，将 `code-reviewer.md` 模板填入 prompt。占位符按模式注入：

| 占位符 | 说明 | 模式 A | 模式 B | 模式 C |
|--------|------|--------|--------|--------|
| `{WHAT_WAS_IMPLEMENTED}` | 刚完成的内容 | ✅ | ✅ | ✅ |
| `{PLAN_OR_REQUIREMENTS}` | 预期功能。无正式计划填"无正式计划，审查重点放在代码质量、架构合理性和明显 bug" | ✅ | ✅ | ✅ |
| `{BASE_SHA}` / `{HEAD_SHA}` | 起始/结束提交 | ✅ | ✅ | ❌ |
| `{DESCRIPTION}` | 简要说明 | ✅ | ✅ | ✅ |
| `{GITNEXUS_DATA}` | 影响分析结果 | 实际数据 | "无 GitNexus 数据" | 不填 |

### 4. 处理反馈

- **Critical**：立即修复 → delta review
- **Important**：继续前修复 → delta review
- **Minor**：记录 `// TODO(review): <描述>`，每 5 个任务或每批次结束时集中清理
- **审查者有误**：用技术理由反驳，展示证明代码/测试

### 5. Delta Review

修复 Critical/Important 后执行轻量级重审，确认修复到位：

```
1. 获取修复 diff: BASE_SHA=$(git rev-parse HEAD~N) / HEAD_SHA=$(git rev-parse HEAD)
2. 派遣同一子代理：
   WHAT_WAS_IMPLEMENTED: 针对审查反馈的修复
   PLAN_OR_REQUIREMENTS: 上一轮 Critical/Important 问题列表
   DESCRIPTION: 修复了 N 个问题：[简要列出]
3. 子代理仅审查修复 diff，确认原始问题已解决 + 无新问题
   返回: PASS（可继续）/ FAIL（需再修）
```

**FAIL 处理：** 第 1 次 → 修复重试 | 第 2 次 → 回退完整审查 | 第 3 次 → 暂停并请求指导

只有 Minor 则无需 delta review。

## 红线

**绝不要：**
- 因为"很简单"就跳过审查
- 忽略 Critical 问题或带着未修复的 Important 继续推进
- 对合理技术反馈进行争辩
- 因工具偶发失败直接降级 — 必须重试 1 次再判定

**如果审查者有误：** 用技术理由反驳，展示证明其可行的代码/测试，要求澄清。

---

审查输出示例参见：`references/examples/review-output.md`
