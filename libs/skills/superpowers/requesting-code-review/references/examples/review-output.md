# 审查输出示例

## 示例 1：完整审查（函数变更）

```
### 优点
- 数据库 schema 清晰，迁移规范（db.ts:15-42）
- 测试覆盖全面（18 个测试，覆盖所有边界情况）
- 错误处理良好，有降级方案（summarizer.ts:85-92）

### 影响范围（来自 GitNexus）

**变更规模：** 5 个符号，3 个文件，2 个执行流受影响

**风险等级：** MEDIUM

| 变更符号 | d=1 调用方 | 是否在 diff 中 | 测试覆盖 |
|---------|-----------|-------------|----------|
| validatePayment | processCheckout | ✅ | ✅ |
| validatePayment | webhookHandler | ❌ 漏改 | ❌ 无 |
| PaymentInput | createPayment | ❌ 漏改 | ✅ |

### 问题

#### Critical
1. **webhookHandler 未更新**
   - 文件：webhooks.ts:15（GitNexus d=1 分析）
   - 问题：调用 validatePayment 但未适配新签名
   - 修复：更新调用处，与 processCheckout 保持一致

#### Important
1. **CLI 包装器缺少帮助文本**
   - 文件：index-conversations:1-31
   - 问题：没有 --help 选项，用户无法发现 --concurrency
   - 修复：添加 --help 分支，附带使用示例

2. **日期校验缺失**
   - 文件：search.ts:25-27
   - 问题：无效日期静默返回空结果
   - 修复：校验 ISO 格式，抛出带示例的错误

#### Minor
1. **进度指示器**
   - 文件：indexer.ts:130
   - 问题：长时间操作没有"X / Y"计数器
   - 影响：用户不知道还要等多久

### 建议
- 添加进度报告以改善用户体验
- 考虑用配置文件管理排除的项目（提高可移植性）

### 评估

**可以合并：修复后可以**

**理由：** 核心实现扎实，但 GitNexus 分析发现 webhookHandler 依赖旧签名未更新（Critical），修复后即可合并。
```

## 示例 2：grep 兜底发现漏改（常量删除）

```
### 优点
- 常量提取逻辑清晰，统一管理（constants.ts:1-15）
- 主组件的防抖实现正确（SearchBar.tsx:42-58）

### 影响范围（来自 GitNexus + grep 兜底）

**变更规模：** 3 个符号，4 个文件，1 个执行流受影响

**风险等级：** HIGH（GitNexus 报 LOW，grep 兜底升级为 HIGH）

| 变更符号 | 分析来源 | d=1 调用方 | 是否在 diff 中 | 测试覆盖 |
|---------|---------|-----------|-------------|----------|
| SEARCH_DEBOUNCE_DELAY | gitnexus_impact | 0 个依赖 | — | — |
| SEARCH_DEBOUNCE_DELAY | grep 兜底 | MemberList.tsx:5 | ❌ 漏改 | ❌ 无 |
| SEARCH_DEBOUNCE_DELAY | grep 兜底 | SubDepartmentList.tsx:8 | ❌ 漏改 | ✅ |

> ⚠️ gitnexus_impact 返回 0 依赖，grep 发现 2 处 diff 外引用。这是 GitNexus 对 export const 的已知盲区。

### 问题

#### Critical
1. **MemberList 和 SubDepartmentList 未更新**
   - 文件：MemberList.tsx:5、SubDepartmentList.tsx:8（grep 兜底发现）
   - 问题：仍在 import 已删除的 SEARCH_DEBOUNCE_DELAY
   - 修复：更新这两个组件的 import 或内联防抖延迟值

#### Minor
1. **常量命名建议**
   - 文件：constants.ts:12
   - 问题：SEARCH_DEBOUNCE_DELAY 改为 DEBOUNCE_MS 后语义更通用
   - 影响：不影响功能，但改善可读性

### 评估

**可以合并：修复 Critical 后可以**

**理由：** gitnexus_impact 对常量引用存在盲区，grep 兜底发现 MemberList 和 SubDepartmentList 仍在引用已删除的 SEARCH_DEBOUNCE_DELAY（Critical），修复后即可合并。
```
