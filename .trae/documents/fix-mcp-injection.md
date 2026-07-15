# 修复 Dashboard MCP 注入功能

## 问题概要

用户在 Dashboard 中注入项目和全局 MCP 时，注入没有生效。经分析发现以下根本原因：

### 根本原因分析

1. **Trae IDE 的 MCP 注入格式完全错误（最核心问题）**
   - 当前注入器写入的是 `mcp.json` 格式（`{mcpServers: {name: {command, args, type}}}`）到 `~/.trae/mcps.json` 或 `<project>/.trae/mcp.json`
   - 实际上 Trae IDE 使用**目录结构**存储 MCP 服务器配置：`~/.trae/mcps/<server-id>/<agent-type>/<server-name>/SERVER_METADATA.json` + `tools/*.json`
   - 证据：`~/.trae/mcps.json` 已存在且有注入记录（3 个 MCP 服务器），但 Trae IDE 根本不读取此文件
   - 正确的格式: `SERVER_METADATA.json` 包含 `{"server_name": "xxx"}`，每个工具是一个独立的 `tools/<tool-name>.json` 文件

2. **McpRegistry 缺少 Trae 路径的扫描**
   - 项目级: 未扫描 `<project>/.trae/mcp.json`
   - 全局级: 未扫描 `~/.trae/mcps.json`
   - 导致即使 MCP Tab 也看不到 Trae 已注入的记录

3. **Qoder 全局路径在 macOS 上不匹配**
   - Registry 扫描: `~/.config/qoder/mcp.json`
   - Injector 写入: `~/Library/Application Support/Qoder/SharedClientCache/mcp.json`
   - macOS 上注入成功但注册表永远发现不了

4. **CLI 工具 `inject_mcp` 缺少 `trae` 目标**
   - 当前只支持 `qoder | claude | vscode`
   - 而 `inject_skill` 支持 5 个目标（含 trae）

### 额外发现

5. **本地 MCP 包使用相对路径**
   - `registry.ts` 第 83 行: `args: [path.join('libs', 'mcps', entry.name, 'dist', 'index.js')]`
   - 注入到其他项目后相对路径失效，应使用绝对路径

---

## 修复方案

### 修复 1: McpRegistry 扫描路径补充 + Qoder 路径修复

**文件**: `console/mcp/registry.ts`

- 在 `configPaths` 中添加项目级 `.trae/mcp.json` 和全局 `~/.trae/mcps.json`
- 修正 Qoder 全局路径以匹配实际的 macOS/Windows/Linux 路径
- 修复本地 MCP 包 args 使用绝对路径

### 修复 2: CLI 工具 `inject_mcp` 添加 `trae` 目标

**文件**: `console/index.ts`

- 在 `inject_mcp` 工具的 `targets` 枚举中添加 `'trae'`

### 修复 3: Trae IDE 专用 MCP 注入实现（核心修复）

**文件**: `console/mcp/injection.ts` + `console/core/path-resolver.ts`

Trae IDE 使用目录结构而非 `mcp.json` 格式，需要实现专用的注入逻辑：

- Trae 的 MCP 目录结构:
  ```
  ~/.trae/mcps/<server-id>/solo_agent/<server-name>/
    SERVER_METADATA.json     → {"server_name": "<name>"}
    tools/
      <tool-name>.json       → {"name": "...", "description": "...", "arguments": {...}}
  ```
- 注入流程:
  1. 通过 `spawn` 启动 MCP 服务器，发送 `tools/list` 获取工具列表
  2. 为每个工具在正确目录下创建 JSON 文件
  3. 创建 `SERVER_METADATA.json`
  4. 使用确定性 server-id（基于 serverName 的哈希或清理后名称）

**文件改动**:

- `path-resolver.ts`: 
  - 项目级 Trae MCP 路径改为 `<project>/.trae/mcps/<server-id>/solo_agent/<server-name>/`
  - 全局级 Trae MCP 路径改为 `~/.trae/mcps/<server-id>/solo_agent/<server-name>/`
  - 新增 `traeMcpDir()` 方法返回 Trae 的 MCP 目录路径

- `injection.ts`:
  - 在 `injectOne()` 中检测 `target === 'trae'` 时走专用路径
  - 实现 `injectTrae()` 方法：启动 MCP 服务器 → 探测工具 → 写入目录结构文件
  - 使用 `spawn` + JSON-RPC `tools/list` 获取工具定义

- `types.ts`:
  - `InjectResult` 不需要修改（status/error 字段已满足需求）

---

## 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `console/mcp/registry.ts` | 修改 | 补充 Trae 扫描路径，修正 Qoder 全局路径，修复本地包 args 为绝对路径 |
| `console/core/path-resolver.ts` | 修改 | 新增 Trae MCP 目录路径方法，修正已有 Trae 路径 |
| `console/mcp/injection.ts` | 修改 | 新增 Trae 专用注入逻辑（目录结构 + 工具探测） |
| `console/index.ts` | 修改 | `inject_mcp` 工具 targets 添加 `trae` |

---

## 验证步骤

1. 启动 lm-console 服务: `cd console && npm run dev`
2. 打开 Dashboard: `cd dashboard && npm run dev`
3. 在「注入控制台」Tab 中:
   - 选择「MCP 注入」模式
   - 选择「全局」作用域
   - 勾选「Trae IDE」
   - 选择一个 MCP 预设，点击「全部注入」
4. 验证: 检查 `~/.trae/mcps/` 目录下是否生成了正确的目录结构和工具文件
5. 在 MCP Tab 中验证: 刷新后应能看到已注入的服务器
6. 验证 Qoder 全局检测：确保 registry 能扫描到 `~/Library/Application Support/Qoder/SharedClientCache/mcp.json`
