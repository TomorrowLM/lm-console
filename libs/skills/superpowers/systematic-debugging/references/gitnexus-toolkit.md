# GitNexus 工具速查

本文件汇总 systematic-debugging 技能各阶段使用的 GitNexus 工具，包含完整参数和示例。

## 目录

- [gitnexus_query — 语义搜索](#gitnexus_query--语义搜索)
- [gitnexus_context — 符号上下文](#gitnexus_context--符号上下文)
- [gitnexus_cypher — 自定义图查询](#gitnexus_cypher--自定义图查询)
- [gitnexus_impact — 影响面分析](#gitnexus_impact--影响面分析)
- [gitnexus_detect_changes — 变更检测](#gitnexus_detect_changes--变更检测)
- [gitnexus_rename — 安全重命名](#gitnexus_rename--安全重命名)
- [Resources — 只读资源](#resources--只读资源)

---

## gitnexus_query — 语义搜索

**阶段：** 1（侦察）

用错误信息或症状关键词搜索相关代码。

```
gitnexus_query({query: "payment validation error"})

→ Processes: CheckoutFlow, ErrorHandling
→ Symbols: validatePayment, handlePaymentError, PaymentException
```

**技巧：**
- 用错误信息中的关键词搜索，不要整句粘贴
- 搜不到就换关键词：试函数名、错误码、业务术语
- 结果会返回 Processes（执行流）和 Symbols（符号），优先看 Processes

---

## gitnexus_context — 符号上下文

**阶段：** 1（侦察）、2（根因）

查看符号的 360° 上下文：调用者、被调用者、所属执行流。

```
gitnexus_context({name: "validatePayment"})

→ Incoming calls: processCheckout, webhookHandler
→ Outgoing calls: verifyCard, fetchRates (external API!)
→ Processes: CheckoutFlow (step 3/7)
```

**在根因调查中的用法：**
- Incoming calls → 谁传入了错误数据？
- Outgoing calls → 它依赖的外部调用是否异常？
- Processes → 它在执行流的哪一步？上下游是什么？

---

## gitnexus_cypher — 自定义图查询

**阶段：** 2（根因）

当 query 和 context 不够用时，用 Cypher 做精确的调用链追踪。

**追踪调用链（向上 2 层）：**
```cypher
MATCH path = (a)-[:CodeRelation {type: 'CALLS'}*1..2]->(b:Function {name: "validatePayment"})
RETURN [n IN nodes(path) | n.name] AS chain
```

**找所有调用者：**
```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "validatePayment"})
RETURN caller.name, caller.filePath ORDER BY caller.filePath
```

---

## gitnexus_impact — 影响面分析

**阶段：** 3（影响面）

修改前评估爆炸半径。

```
gitnexus_impact({
  target: "validateUser",
  direction: "upstream",
  minConfidence: 0.8,
  maxDepth: 3
})

→ d=1 (WILL BREAK):
  - loginHandler (src/auth/login.ts:42) [CALLS, 100%]
  - apiMiddleware (src/api/middleware.ts:15) [CALLS, 100%]

→ d=2 (LIKELY AFFECTED):
  - authRouter (src/routes/auth.ts:22) [CALLS, 95%]
```

**参数：**
- `target` — 要修改的符号名
- `direction` — `"upstream"`（谁依赖我）或 `"downstream"`（我依赖谁）
- `minConfidence` — 最小置信度（建议 0.8）
- `maxDepth` — 最大深度（建议 3）

---

## gitnexus_detect_changes — 变更检测

**阶段：** 2（检查近期变更）、5（提交前验证）

基于 git diff 分析当前变更的影响。

```
gitnexus_detect_changes({scope: "staged"})

→ Changed: 5 symbols in 3 files
→ Affected: LoginFlow, TokenRefresh, APIMiddlewarePipeline
→ Risk: MEDIUM
```

**scope 选项：**
- `"staged"` — 已暂存的变更
- `"all"` — 所有未提交的变更
- `"compare"` — 与基准分支对比（用于 PR 审查）

---

## gitnexus_rename — 安全重命名

**阶段：** 4（TDD 修复中的重构步骤）

自动化的多文件协调重命名，基于知识图谱和 AST 分析。

```
gitnexus_rename({symbol_name: "validateUser", new_name: "authenticateUser", dry_run: true})
→ 12 edits across 8 files
→ 10 graph edits (high confidence), 2 ast_search edits (review)
→ Changes: [{file_path, edits: [{line, old_text, new_text, confidence}]}]
```

**参数：**
- `symbol_name` — 当前符号名
- `new_name` — 新名称
- `dry_run` — `true` 预览不执行，`false` 应用变更

**用法：**
1. 先 `dry_run: true` 预览所有编辑
2. 检查 graph edits（高置信度）和 ast_search edits（需人工审查）
3. 确认后 `dry_run: false` 应用
4. `gitnexus_detect_changes()` 验证变更范围

---

## Resources — 只读资源

通过 READ 工具读取，提供代码库的结构化视图。

| 资源 | 内容 | 大小 |
|------|------|------|
| `gitnexus://repo/{name}/context` | 代码库概况，检查索引是否过期 | ~150 tokens |
| `gitnexus://repo/{name}/clusters` | 所有功能区域及内聚度评分 | ~300 tokens |
| `gitnexus://repo/{name}/cluster/{name}` | 功能区域的成员和文件路径 | ~500 tokens |
| `gitnexus://repo/{name}/process/{name}` | 执行流的逐步追踪 | ~200 tokens |
| `gitnexus://repo/{name}/processes` | 所有执行流列表 | ~300 tokens |
| `gitnexus://repo/{name}/schema` | 图 Schema（用于 Cypher 查询） | ~200 tokens |

**提示：** 如果 context 提示 "Index is stale"，在终端运行 `npx gitnexus analyze` 重新索引。
