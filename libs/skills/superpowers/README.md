# Superpowers
> 名称：superpowers-zh
>
> 版本：1.1.8

## 简介

superpowers 是一个面向工程工作流的技能包，用来把复杂任务路由到更合适的子技能。它覆盖需求澄清、计划拆解、实现执行、调试定位、测试验证、代码审查、Git 收尾、中文团队协作，以及 MCP 和 workflow 等专项能力。

## Skills 路由表

### 流程类 Skills

| Skill | 何时进入 | 前置 Skill | 后续 Skill | 说明 |
|---|---|---|---|---|
| using-superpowers | 任何对话开始时 | 无 | 根据场景分流到其他 skill | 总入口，用来判断当前任务该走哪条流程。 |
| brainstorming | 需求不清、方案未定、要先收敛设计时 | using-superpowers | writing-plans / test-driven-development / 具体实现类 skill | 先澄清目标、边界、约束和实现方向。 |
| writing-plans | 需求已经明确，但任务步骤较多时 | using-superpowers / brainstorming | subagent-driven-development / executing-plans | 输出实现计划，拆清任务、文件、测试和验证步骤。适用于还没有明确任务清单的阶段。 |
| subagent-driven-development | 已有计划，且适合按任务拆分协作执行时 | writing-plans | requesting-code-review / verification-before-completion / git-finishing-development-branch | 在当前主流程里按任务推进，适合细粒度执行和阶段审查。适用于已经有明确任务清单的阶段。 |
| executing-plans | 已有计划，且要按顺序逐任务执行时 | writing-plans | verification-before-completion / git-finishing-development-branch | 先审查计划，再按任务顺序执行、验证和记录状态。 |
| dispatching-parallel-agents | 存在多个可独立推进的任务时 | writing-plans / systematic-debugging | requesting-code-review / verification-before-completion | 适合并行处理没有共享状态、没有顺序依赖的任务。 |
| verification-before-completion | 准备宣称"完成""修复完成""测试通过"之前 | test-driven-development / executing-plans / subagent-driven-development / systematic-debugging | requesting-code-review / git-finishing-development-branch | 所有完成性结论都要先过验证。 |
| requesting-code-review | 功能完成、准备合并、需要正式审查时 | verification-before-completion / subagent-driven-development | git-finishing-development-branch | 发起正式代码审查，暴露风险和遗漏。 |
| git-worktrees | 开始功能开发、执行计划前需要隔离工作区时 | using-superpowers | writing-plans / executing-plans / subagent-driven-development | 创建独立 worktree，降低对当前工作区的影响。 |
| git-finishing-development-branch | 开发完成、验证通过后要收尾时 | verification-before-completion / requesting-code-review | 无 | 负责合并、PR、保留或清理分支等收尾动作。 |



### 专项类 Skills

| Skill | 何时进入 | 前置 Skill | 后续 Skill | 说明 |
|---|---|---|---|---|
| systematic-debugging | 遇到 bug、失败测试、异常行为时 | using-superpowers | test-driven-development / verification-before-completion / requesting-code-review | 修之前先找根因，避免拍脑袋修复。有 GitNexus 索引时可叠加侦察和影响面分析。 |
| test-driven-development | 要实现功能或修 bug，且希望按测试先行推进时 | brainstorming / systematic-debugging / writing-plans | verification-before-completion / requesting-code-review | 先写失败测试，再写最小实现。 |
| chinese-documentation | 编写中文 README、说明文档、技术文档时 | using-superpowers | 无 | 规范中文排版、术语和文档结构。 |
| mcp-builder | 要构建 MCP 服务、工具或集成能力时 | brainstorming / writing-plans | test-driven-development / verification-before-completion | 关注 MCP 服务设计、接口和可用性。 |
| writing-skills | 新建、修改、验证 skill 自身时 | using-superpowers / brainstorming | verification-before-completion | 用来维护 skill 文档和 skill 体系本身。 |

### 叠加增强类 Skills

| Skill | 何时进入 | 叠加在哪类流程上 | 说明 |
|---|---|---|---|
| git-commit-conventions | 需要写中文 commit message 时 | verification-before-completion / git-finishing-development-branch | 统一中文项目的提交信息风格。 |
| git-workflow | 使用 Gitee、Coding、极狐 GitLab 等平台时 | git-worktrees / requesting-code-review / git-finishing-development-branch | 适配国内平台和中文团队协作方式。 |

### 区别

#### verification-before-completion / requesting-code-review

这两个技能经常挨着出现，但职责不同，不能互相替代。

- `verification-before-completion`：关注"你现在有没有证据可以宣称完成"。它要求先运行验证命令、检查输出和退出码，再说"完成了""修复了""测试通过了"。
- `requesting-code-review`：关注"这份实现是否足够好，值得继续推进或合并"。它要求把需求、计划和变更范围交给审查子智能体，检查代码质量、架构、测试覆盖和需求符合度。

最短理解可以记成：

- `verification-before-completion`：证明"它确实成立"
- `requesting-code-review`：判断"它是否足够好"

典型顺序通常是：

1. 先用 `verification-before-completion`，确认当前任务或整体实现有新鲜的验证证据。
2. 再用 `requesting-code-review`，让审查子智能体对照计划和变更范围检查质量与风险。
3. 如果审查提出问题，修复后再回到验证，而不是只凭审查意见就宣称完成。

#### **subagent-driven-development/executing-plans**

这两个都属于"拿着现成计划去执行"，但执行方式完全不同。

这两个技能都属于"拿着现成计划去执行"，但分界线非常明确。

- `subagent-driven-development`：主会话负责调度，每个任务分派给一个全新的隔离子智能体去实现，并在任务后做两阶段审查。
- `executing-plans`：主会话自己把计划整理成待办清单，然后在当前会话里按顺序逐任务实现、验证和记录状态。

最短的区分是：

- `subagent-driven-development`：用子代理按任务执行
- `executing-plans`：你自己在当前流程里按任务执行

具体差异可以看 4 个方面。

**1. 执行主体不同**

`subagent-driven-development` 的主体是"子智能体"。控制者负责提取任务、分派实现者、再分派两个审查者，见 [SKILL.md](vscode-file://vscode-app/d:/software/front/Microsoft VS Code/560a9dba96/resources/app/out/vs/code/electron-browser/workbench/workbench.html)。

`executing-plans` 的主体是"当前会话本身"。它要求你先把计划整理成任务清单，然后一个任务一个任务地自己推进，见 [SKILL.md](vscode-file://vscode-app/d:/software/front/Microsoft VS Code/560a9dba96/resources/app/out/vs/code/electron-browser/workbench/workbench.html)。

**2. 适用前提不同**

`subagent-driven-development` 适合：

- 已经有实现计划
- 任务基本独立
- 想留在同一个主会话里协调
- 希望每个任务交给一个全新子代理去做

它自己的"何时使用"流程图就写得很直白：有计划、任务独立、留在当前会话时，走它，见 [SKILL.md](vscode-file://vscode-app/d:/software/front/Microsoft VS Code/560a9dba96/resources/app/out/vs/code/electron-browser/workbench/workbench.html)。

`executing-plans` 适合：

- 已经有书面计划
- 要按顺序逐任务推进
- 不依赖子代理协作
- 更像"严格照计划施工"

它的重点是先审查计划、重建任务清单、再顺序执行，见 [SKILL.md](vscode-file://vscode-app/d:/software/front/Microsoft VS Code/560a9dba96/resources/app/out/vs/code/electron-browser/workbench/workbench.html)。

**3. 审查机制不同**

`subagent-driven-development` 最大的特点是"两阶段审查"：

- 先规格合规审查
- 再代码质量审查

而且这是每个任务后都要做的，不是可选项。实现者修完，先过规格，再过质量，任何一轮不过都要回环修复，见 [SKILL.md](vscode-file://vscode-app/d:/software/front/Microsoft VS Code/560a9dba96/resources/app/out/vs/code/electron-browser/workbench/workbench.html)。

`executing-plans` 没有这种固定的"双审查子代理机制"。它强调的是：

- 先审查计划本身
- 每完成一个任务就跑验证
- 每 3 个任务回顾一次方向

所以它更像"严格任务执行 + 节点检查"，不是"子代理实现 + 双代理审查"。

**4. 节奏和成本不同**

`subagent-driven-development`：

- 质量更高
- 上下文污染更少
- 任务隔离更强
- 审查更严
- 但成本更高，流程更重，因为每个任务至少要跑实现者 + 规格审查 + 质量审查

`executing-plans`：

- 更直接
- 更轻量
- 更适合按计划线性推进
- 但没有子代理隔离和自动化双审查保护

所以它们不是"谁替代谁"，而是两种不同的执行模式。

`subagent-driven-development` 比 `executing-plans` 消耗更多 token 的原因在于其设计架构和执行模式：

##### 核心差异

- `subagent-driven-development` 的核心资产是**子智能体隔离**和**两阶段审查**。
- `executing-plans` 的核心资产是**线性推进**和**当前会话内的低成本执行**。

###### 1. **执行主体不同**

- **subagent-driven-development**：每个任务都需要创建**全新的、隔离的子智能体**
  - 每个子智能体都需要完整的上下文（任务描述、规格、约束等）
  - 每个审查也需要独立的子智能体
  - 每次交互都是完整的会话初始化
- **executing-plans**：在当前会话中**顺序执行**
  - 上下文在会话中累积
  - 不需要重复传递相同信息
  - 模型可以复用之前的理解

###### 2. **审查机制不同**

- **subagent-driven-development**：**两阶段审查**（规格合规 + 代码质量）
  - 每个任务需要 3 个子智能体：实现者 + 规格审查者 + 质量审查者
  - 每个审查者都需要完整的上下文
  - 发现问题时需要修复和重新审查（循环）
- **executing-plans**：**任务执行 + 节点检查**
  - 在当前会话中直接审查
  - 上下文共享，不需要重复传递
  - 审查更轻量

###### 3. **上下文隔离成本**

- **subagent-driven-development**：强制上下文隔离
  - 每个子智能体**不能继承**主会话的任何信息
  - 必须重新提供所有必要上下文
  - 避免污染，但增加 token 消耗
- **executing-plans**：上下文共享
  - 模型知道之前做了什么
  - 可以复用文件理解、架构决策等
  - 减少重复信息传递

##### Token 消耗对比

**subagent-driven-development（任务1示例）：**

1. **实现子智能体**：~500-800 tokens（任务描述 + 上下文 + 规则）
2. **规格审查子智能体**：~400-600 tokens（任务描述 + 实现报告 + 审查规则）
3. **代码质量审查子智能体**：~600-900 tokens（完整审查模板 + Git diff）
4. **修复子智能体**（发现问题时）：~400-600 tokens
5. **重新审查**（修复后）：~400-600 tokens

**总计**：~2300-3500 tokens/任务 × 审查循环次数

**executing-plans：**

1. **任务执行**：~200-400 tokens（基于已有上下文）
2. **节点检查**：~100-200 tokens（轻量验证）
3. **问题修复**：在当前会话中直接修复，无需额外上下文

**总计**：~300-600 tokens/任务

##### 质量 vs 效率权衡

###### subagent-driven-development 的优势：

- **更高质量**：强制隔离避免上下文污染
- **更严格审查**：两阶段审查确保规格匹配和代码质量
- **错误隔离**：一个任务的错误不会影响其他任务
- **可并行性**：理论上可以并行处理独立任务

###### executing-plans 的优势

- **更高效率**：token 消耗少 5-10 倍
- **更快迭代**：无需等待子智能体初始化
- **上下文连贯**：模型可以基于完整历史做决策
- **更适合简单任务**：不需要复杂审查流程

##### 适用场景建议

`subagent-driven-development` 适合：

- 已经有实现计划
- 任务边界比较清楚
- 希望每个任务交给全新的子智能体处理
- 希望每个任务后都有更严格的审查回路

`executing-plans` 适合：

- 已经有书面计划
- 想留在当前会话里自己顺序推进
- 任务之间耦合较强，拆成子智能体收益不大
- 更看重直接性和执行成本

###### 使用 subagent-driven-development 当：

- 任务复杂，需要高质量输出
- 任务独立，可以并行处理
- 需要严格保证规格匹配
- 预算充足，可以接受更高 token 成本



## 默认分流策略与入口模板

### 默认分流策略

如果用户只说"用 superpowers 帮我处理这个任务"，默认按下面规则判断：

1. 还没想清楚做什么 → `brainstorming`
2. 已经清楚要做什么，但步骤多 → `writing-plans`
	默认先在当前会话中输出完整计划，不落地为 md 文件，除非用户明确要求保存。
3. 已经有计划，要开始实现 → `subagent-driven-development`
    如果用户明确要留在当前会话，并要求按计划顺序逐任务推进，则切到 `executing-plans`。
4. 问题是 bug / 测试失败 / 构建失败 → `systematic-debugging`
5. 用户要审查代码 → `requesting-code-review`
6. 用户明确提到中文文档 / 中文 commit / 国内 Git 平台 → 叠加对应中文技能。
7. 用户明确提到 MCP 或技能编写 → `mcp-builder`、`writing-skills`

判断完成后，不要只返回技能名。应按以下格式继续：

1. 先宣告将使用哪个技能。
2. 立即读取对应技能的 `skills/superpowers/skills/<skill-name>/SKILL.md`；如果工具要求绝对路径，则先基于当前工作区根目录拼接后直接读取。
3. 再说明这样分流的原因。
4. 然后按该技能的规则进入下一步动作。

### 入口回复模板

当用户访问 `/superpowers` 且任务还没分流时，可以这样回复：

> 我将先判断这个任务最适合进入哪个 superpowers 子技能。
>
> 如果是需求不清、要先比较方案，我会使用 `brainstorming`。
> 如果是需求已定、要先在当前会话中输出实施计划，我会使用 `writing-plans`。
> 如果是已有计划、准备开始实现，我会使用 `subagent-driven-development`；如果你明确要留在当前会话里按计划逐任务执行，我会使用 `executing-plans`，再一项一项推进。
> 如果是 bug、失败测试或构建失败，我会使用 `systematic-debugging`。
> 如果任务需要 TDD、代码审查、中文团队协作、MCP、YAML 工作流或技能编写，我会在主流程上叠加或切换到对应技能。
>
> 一旦判断出明确场景，我会直接宣告"将使用哪个技能处理这个任务"，然后进入该技能，而不是停留在 `/superpowers` 总入口层面。

## 典型链路

### 1. 新功能开发

using-superpowers → brainstorming → writing-plans[+gitnexus] → subagent-driven-development[+gitnexus][+TDD] 或 executing-plans[+gitnexus][+TDD] → verification-before-completion → requesting-code-review[+gitnexus] → git-finishing-development-branch

适用场景：需求刚明确，要从想法走到实现、验证和收尾的完整流程。TDD 在子代理或执行流程内部执行。

### 2. 单会话按计划执行

using-superpowers → writing-plans → executing-plans[+TDD] → verification-before-completion → git-finishing-development-branch

适用场景：已经决定留在当前会话里，按计划逐任务顺序推进，不做并行分工。

### 3. 多任务协作执行

using-superpowers → writing-plans → subagent-driven-development[+TDD] → requesting-code-review → verification-before-completion → git-finishing-development-branch

适用场景：计划已经拆好，任务之间边界清晰，适合按任务分段推进并穿插审查。TDD 在子代理内部执行。

### 4. Bug 修复

using-superpowers → systematic-debugging[+gitnexus] → test-driven-development → verification-before-completion → requesting-code-review[+gitnexus] → git-finishing-development-branch

适用场景：出现 bug、失败测试、构建异常或不明行为，先找根因，再修复和验证。

### 5. 并行处理多个独立任务

using-superpowers → writing-plans → dispatching-parallel-agents → verification-before-completion → requesting-code-review

适用场景：多个任务相互独立，没有共享状态，也没有严格顺序依赖。

### 6. 中文团队代码审查

using-superpowers → requesting-code-review[+gitnexus] → verification-before-completion

适用场景：团队沟通以中文为主，希望 review 反馈既专业又符合本地协作习惯。

### 7. 中文文档编写

using-superpowers → chinese-documentation

适用场景：编写 README、技术说明、接入文档、操作手册等中文材料。

### 8. MCP 工具建设

using-superpowers → brainstorming → writing-plans → mcp-builder → test-driven-development → verification-before-completion

适用场景：设计和实现 MCP 服务、工具能力或外部系统集成。

### 9. Skill 自身维护

using-superpowers → brainstorming → writing-skills → verification-before-completion

适用场景：新增 skill、修改 skill、补规则、修路由或验证 skill 是否可执行。

## 按场景查找

| 我现在要做什么 | 推荐进入的 Skill | 常见后续 Skill | 说明 |
|---|---|---|---|
| 我还没想清楚方案 | brainstorming | writing-plans | 先澄清目标、边界、约束和实现方向。 |
| 我已经知道要做什么，但步骤很多 | writing-plans | subagent-driven-development / executing-plans | 先把任务、文件、测试和验证拆清楚。 |
| 我要让 AI 在写前端代码时遵守团队规范 | 编码规范已由 `rules/code.md` 自动约束，无需额外叠加 | - | 在开始实现前先加载前端编码规范。 |
| 我想按计划一步一步执行 | executing-plans | verification-before-completion | 适合当前会话内逐任务推进。 |
| 我想把计划拆给多个任务去推进 | subagent-driven-development | requesting-code-review / verification-before-completion | 适合任务边界明确的实现计划。 |
| 我有多个互不依赖的问题要同时处理 | dispatching-parallel-agents | verification-before-completion | 适合并行处理独立任务。 |
| 我在修 bug | systematic-debugging | test-driven-development / verification-before-completion | 先定位根因，不直接拍脑袋修。 |
| 我想按测试先行开发 | test-driven-development | verification-before-completion | 先写失败测试，再写最小实现。 |
| 我准备说"已经完成了" | verification-before-completion | requesting-code-review / git-finishing-development-branch | 先跑验证，再下结论。 |
| 我想发起代码审查 | requesting-code-review | git-finishing-development-branch | 正式进入 review 流程。 |
| 我想隔离当前开发环境 | git-worktrees | writing-plans / executing-plans | 先建 worktree，再开始实现。 |
| 我准备收尾、提 PR 或合并 | git-finishing-development-branch | 无 | 处理分支交付和清理动作。 |
| 我需要写中文 commit message | git-commit-conventions | git-finishing-development-branch | 统一提交信息风格。 |
| 我需要写中文 README 或技术文档 | chinese-documentation | 无 | 规范中文排版、术语和结构。 |
| 我使用 Gitee、Coding 或极狐 GitLab | git-workflow | requesting-code-review / git-finishing-development-branch | 适配国内 Git 平台工作方式。 |
| 我想构建 MCP 服务或工具 | mcp-builder | test-driven-development / verification-before-completion | 聚焦 MCP 的设计和实现方法。 |
| 我在维护 skill 本身 | writing-skills | verification-before-completion | 用于新增、修改、验证 skill。 |
| 我想用 superpowers，但还不知道选哪个 | using-superpowers | 任何具体 skill | 先做路由判断，再进入对应流程。 |
| 我想了解"改这个函数会波及哪些代码" | `gitnexus`（叠加于当前流程） | 无 | 通过 gitnexus-guide 加载影响分析能力。 |
| 我想追踪"X 是怎么被调用的" | `gitnexus`（叠加于当前流程） | brainstorming / systematic-debugging | 通过 gitnexus-guide 加载调用链探索能力。 |
| 我想评估"这个 PR 合并风险高吗" | `gitnexus`（叠加于 requesting-code-review） | requesting-code-review | 通过 gitnexus-guide 加载 PR 影响评估能力。 |
*GitNexus 触发速查**（语义识别优先，关键词为示例参考）
>
> | 触发信号（示例） | 语义意图 | 映射到 | 典型叠加节点 |
> |-----------------|----------|--------|-------------|
> | 爆炸半径/波及哪些/牵连哪些模块 | 变更的外部传播路径 | impact-analysis | writing-plans, executing-plans |
> | X是怎么工作的/调用链/上下游关系 | 代码角色与上下文关系 | exploring | brainstorming |
> | 沿调用链定位/根因追踪/从哪传来的 | 从错误点反推源头 | debugging | systematic-debugging |
> | PR风险/合并安全/会不会出事 | 变更的潜在破坏性影响 | pr-review | requesting-code-review |
> | 安全重命名/改名字会不会有坑 | 确认所有调用者可正确适配 | refactoring | subagent-driven-development |