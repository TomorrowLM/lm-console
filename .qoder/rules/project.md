---
trigger: always_on
---

# lm-console 项目边界规则

## cache/ — 运行时数据目录

**边界定义**：存放程序运行时自动生成的数据。虽不提交 Git，但承载用户操作行为记录，需兼容**数据备份与迁移**场景。

| 文件 | 生成者 | 格式 | 说明 |
| ---- | ------ | ---- | ---- |
| `skill-cache.json` | `console/skill/cache.ts` → `SkillCache` | JSON 数组 | 技能元数据缓存（name / category / description / cachedAt），可重建 |
| `telemetry.jsonl` | `console/core/telemetry.ts` → `Telemetry` | JSONL（每行一条 JSON） | **用户操作行为日志**，记录技能命中、MCP 调用等事件，内存上限 5000 条，每 5s 异步刷盘 |

**规则**：
1. **禁止手动创建或编辑** cache 下的任何文件。所有内容由 `SkillCache` 和 `Telemetry` 类自动管理。
2. **禁止提交 Git**。已在 `.gitignore` 中声明为 Runtime data。
3. **目录自动创建**：`console/index.ts` 启动时通过 `fs.mkdir(CACHE_DIR, { recursive: true })` 确保目录存在。
4. **默认路径**：`{PROJECT_ROOT}/cache/`，可通过 `LM_CACHE_DIR` 环境变量覆盖。
5. **备份兼容**：`telemetry.jsonl` 采用 JSONL 格式（每行一条完整 JSON 记录），天然支持增量备份（`rsync --append` 或按行追加合并）。备份工具可直接读取单行 JSON 还原事件。
6. **迁移兼容**：将 `cache/` 目录整体复制到新环境即可完成数据迁移。`SkillCache.load()` 和 `Telemetry` 构造函数均从文件反序列化，对路径无硬编码依赖。
7. **重建能力**：`skill-cache.json` 丢失后可通过重新扫描 `libs/skills/` 重建；`telemetry.jsonl` 丢失后历史数据不可恢复，但不影响系统正常运行。

---

## libs/ — 静态资源库目录

**边界定义**：存放 lm-console 运行所需的静态源数据，属于项目资产的一部分，应提交 Git（子模块除外）。

### libs/skills/ — 技能定义（Git 子模块）

| 属性 | 说明 |
| ---- | ---- |
| **来源** | Git 子模块 → `https://github.com/TomorrowLM/lm-skill.git` |
| **扫描者** | `console/skill/registry.ts` → `SkillRegistry.scan(SKILLS_DIR)` |
| **内容** | 按分类目录组织的 `SKILL.md` 文件（如 `gitnexus/`、`writing-skills/`、`page-development-workflow/` 等） |
| **默认路径** | `{PROJECT_ROOT}/libs/skills`，可通过 `LM_SKILLS_DIR` 环境变量覆盖 |

**规则**：
1. **不直接修改** libs/skills 下的文件。技能内容通过 lm-skill 仓库独立维护，通过 `git submodule update --remote` 同步。
2. **子模块由 `SkillRegistry` 扫描**：启动时通过 `glob('**/SKILL.md')` 递归发现所有技能文件，解析 YAML frontmatter 提取元数据。
3. **目录结构约定**：一级目录为分类名（category），其下每个技能一个子目录，内含 `SKILL.md`。
4. **添加新技能**：应在 lm-skill 仓库中完成，然后在 lm-console 中执行 `git submodule update --remote libs/skills` 拉取更新。

### libs/config/ — 项目配置

| 属性 | 说明 |
| ---- | ---- |
| **用途** | 存放 lm-console 自身的配置文件 |
| **当前状态** | 预留目录，仅有 `.gitkeep` |

**规则**：
1. 配置文件应存放在此目录下，而非散落在项目根目录。
2. 配置变更需同步更新 `console/index.ts` 中的读取逻辑。

### libs/mcps/ — MCP 服务器定义

| 属性 | 说明 |
| ---- | ---- |
| **用途** | 存放预定义的 MCP 服务器配置模板 |
| **当前状态** | 预留目录，暂无内容 |

**规则**：
1. 预定义的 MCP 服务器 JSON 配置文件放在此目录下。
2. 扫描逻辑应在 `console/mcp/registry.ts` 中扩展，从本目录读取配置文件作为默认 MCP 服务器列表的来源之一。
3. 文件格式应与 IDE 的 `mcp.json` 中 `mcpServers` 结构一致。

---

## 关键路径映射

| 目录 | 环境变量 | 默认值 | 管理方式 |
| ---- | -------- | ------ | -------- |
| `cache/` | `LM_CACHE_DIR` | `{PROJECT_ROOT}/cache` | 运行时自动生成，不提交 Git，需兼容备份迁移 |
| `libs/skills/` | `LM_SKILLS_DIR` | `{PROJECT_ROOT}/libs/skills` | Git 子模块，独立维护 |
| `libs/config/` | — | `{PROJECT_ROOT}/libs/config` | 手动维护，提交 Git |
| `libs/mcps/` | — | `{PROJECT_ROOT}/libs/mcps` | 手动维护，提交 Git |
