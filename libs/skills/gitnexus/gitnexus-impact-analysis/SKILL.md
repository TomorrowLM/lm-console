---
name: gitnexus-impact-analysis
description: "当用户想知道修改某段代码会影响什么、需要在编辑前做安全分析时使用。例如：'改 X 安全吗？'、'谁依赖了这个？'、'会影响哪些？'"
---

# GitNexus 影响分析

## 何时使用

- "改这个函数安全吗？"
- "修改 X 会影响什么？"
- "显示爆炸半径"
- "谁在用这段代码？"
- 进行非平凡的代码变更前
- 提交前 — 了解变更影响范围

## 工作流

```
1. gitnexus_impact({target: "X", direction: "upstream"})  → 查找上游依赖
2. READ gitnexus://repo/{name}/processes                   → 检查受影响的执行流
3. gitnexus_detect_changes()                               → 将当前 git 变更映射到受影响的流程
4. [常量/变量] grep 兜底验证                                → 覆盖 GitNexus 的已知盲区
5. 评估风险并向用户报告
```

> 如果索引过期（"Index is stale"）→ 在终端执行 `npx gitnexus analyze` 重建索引。

## 检查清单

```
- [ ] gitnexus_impact({target, direction: "upstream"}) 查找依赖方
- [ ] 优先审查 d=1 项（这些**一定会中断**）
- [ ] 检查高置信度（>0.8）依赖
- [ ] READ processes 检查受影响的执行流
- [ ] gitnexus_detect_changes() 做提交前检查
- [ ] 常量/变量的删除或重命名 → grep 兜底验证（见下方）
- [ ] 评估风险等级并向用户报告
```

## 输出解读

| 深度 | 风险等级         | 含义             |
| ---- | ---------------- | ---------------- |
| d=1  | **一定会中断**   | 直接调用方/导入方 |
| d=2  | 可能受影响       | 间接依赖         |
| d=3  | 可能需要测试     | 传递性影响       |

## 风险评估

| 影响范围                        | 风险等级 |
| ------------------------------- | -------- |
| <5 个符号，少量流程             | LOW      |
| 5-15 个符号，2-5 个流程         | MEDIUM   |
| >15 个符号或大量流程            | HIGH     |
| 关键路径（认证、支付）          | CRITICAL |

## 工具

**gitnexus_impact** — 符号爆炸半径分析的核心工具：

```
gitnexus_impact({
  target: "validateUser",
  direction: "upstream",
  minConfidence: 0.8,
  maxDepth: 3
})

→ d=1（一定会中断）:
  - loginHandler (src/auth/login.ts:42) [CALLS, 100%]
  - apiMiddleware (src/api/middleware.ts:15) [CALLS, 100%]

→ d=2（可能受影响）:
  - authRouter (src/routes/auth.ts:22) [CALLS, 95%]
```

**gitnexus_detect_changes** — 基于 git diff 的影响分析：

```
gitnexus_detect_changes({scope: "staged"})

→ 已变更: 5 个符号，3 个文件
→ 受影响流程: LoginFlow, TokenRefresh, APIMiddlewarePipeline
→ 风险: MEDIUM
```

## 常量/变量的 grep 兜底验证

> **已知限制：** GitNexus 对函数调用链和类继承的追踪很可靠，但对 `export const` / `export let` 等数据依赖的 import 引用存在结构性盲区。常量/变量的删除或重命名**不能仅依赖** `gitnexus_impact` 的结果。

**三层验证（常量/变量变更时必走）：**

| 层级 | 工具 | 作用 |
|------|------|------|
| 1. 结构分析 | `gitnexus_impact` | 给出调用链全景和风险评估 |
| 2. 文本搜索 | `rg "SYMBOL_NAME" --type <lang>` | 穷举所有出现位置，零漏报 |
| 3. 编译器验证 | `tsc --noEmit`（删除后） | 精确报出所有断引用 |

**执行规则：**
- 对每个被删除/重命名的常量或变量，执行 `rg "SYMBOL_NAME"` 全局搜索
- grep 发现 diff 外仍有引用 → **WILL BREAK**，风险升级
- grep 结果中的噪音（注释、字符串、同名不同作用域）需人工排除

## 示例：「改 validateUser 会影响什么？」

```
1. gitnexus_impact({target: "validateUser", direction: "upstream"})
   → d=1: loginHandler, apiMiddleware（一定会中断）
   → d=2: authRouter, sessionManager（可能受影响）

2. READ gitnexus://repo/my-app/processes
   → LoginFlow 和 TokenRefresh 涉及 validateUser

3. 风险：2 个直接调用方，2 个流程 = MEDIUM
```

## 示例：「删除 SEARCH_DEBOUNCE_DELAY 安全吗？」

```
1. gitnexus_impact({target: "SEARCH_DEBOUNCE_DELAY", direction: "upstream"})
   → 0 个依赖，风险: LOW  ⚠️ 常量引用可能有盲区

2. rg "SEARCH_DEBOUNCE_DELAY" --type ts --type tsx
   → src/components/MemberList.tsx:5 (import)
   → src/components/SubDepartmentList.tsx:8 (import)
   → grep 发现 2 处 diff 外引用 → 一定会中断

3. 风险：GitNexus 报 LOW，grep 发现 2 个漏改 → 实际 HIGH
```

### 红线

**绝不要：**
- 因为 GitNexus 报告 LOW 风险就跳过 grep 验证 — 常量/变量引用是已知盲区
- 因为 grep 结果有噪音就忽略全部结果 — 应人工排除而非跳过
- 在索引过期（stale）的情况下信任分析结果 — 必须先重建索引
- 仅凭 `gitnexus_impact` 返回 0 依赖就判定符号可安全删除
