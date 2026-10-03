<p>
  <img src="docs/assets/banner.jpeg" alt="Operator Memory，面向编码智能体的自我改进上下文引擎">
</p>

[English](README.md) | **简体中文**

# Operator Memory

### 面向编码智能体的自我改进上下文引擎。

智能体在单次会话中表现出色，但会话一结束就会忘记一切。后续会话只能浪费 token 重新收集不完整的上下文：重新探索代码库、重新理解架构、重新讲授每一个决策和纠正。

Operator Memory 给智能体一个大脑，用于记录他们的全部工作。智能体在工作时，会自动在这个大脑中记录 —— 规格、决策、规范、研究、经验教训。每个新会话都从这些文件开始。

## 你将获得

- **完整的上下文引擎** —— Operator Memory 在单一集成系统中提供记忆、文档、代码库索引和技能。
- **自动文档** —— 规格、决策、研究和经验教训由智能体在日常工作中自动记录。没有捕获步骤，没有后台任务。
- **透明的记忆** —— 记忆以文档形式存储，你可以阅读、更新和删除。
- **可共享的知识** —— 每个文档都可以选择共享。用 Git 跟踪文档，与团队分享知识。
- **零基础设施** —— 无需 embeddings、向量数据库、后台流水线或模型配置。

## 工作原理

Operator 给智能体一个持久的 Markdown 工作区，保存在三个位置：

- `.operator/` —— 私有项目知识，保留在你的机器上
- `.operator-shared/` —— 随仓库一起发布的项目知识
- `~/.operator/user/` —— 你的个人规则和知识，跨项目使用

每个会话都运行同一个循环：

1. **查阅（Consult）** —— 智能体从大脑出发：指令、代码库索引、规格、指南。
2. **构建（Build）** —— 智能体基于这些知识进行正常的开发工作。
3. **更新（Update）** —— 智能体记录发生的变化：新的规格、决策、规范、经验教训。

<p>
  <img src="docs/assets/change-the-loop.png" alt="记忆感知的智能体循环：查阅大脑、构建、更新大脑">
</p>

当项目事实发生变化时，智能体会更新规范文件，而不是添加一条 RAG 数据库记录。更多细节见[架构文档](docs/architecture.md)（英文）。

## 安装 Operator

Operator 通过 Operator Helper 管理。使用 npm 安装 Helper：

```sh
npm install --global @aerovato/operator-helper
```

或使用 Bun：

```sh
bun add --global --minimum-release-age 0 @aerovato/operator-helper@latest
```

然后为你的 harness 安装 Operator 适配器：

```sh
# OpenCode 2
operator-helper install opencode-v2

# OpenCode 1（旧版）
operator-helper install opencode

# Pi
operator-helper install pi

# Codex
operator-helper install codex

# Claude Code
operator-helper install claude-code

# DeepSeek Harness
operator-helper install deepseek

# Code Puppy
operator-helper install code-puppy
```

各 harness 的验证、命令、更新和故障排除，请参阅 [harness 文档](docs/harnesses/)（英文）。

## 设置 Operator

设置就是与智能体的一场对话。在新的会话中逐个运行以下命令。

1. 仅首次：`/operator:user-init` —— 设置你的全局用户分区。
2. 在每个新项目中：`/operator:project-init` —— 搭建 Operator、迁移已有文档并为仓库建立索引。
3. 开启新会话，正常工作即可。

在现有项目上冷启动时，建议让智能体为你即将开发的具体功能、模块或系统创建第一批规格。这些文档建立后，后续会话会自动维护它们。

## 日常工作流

1. 给智能体正常的开发任务。
2. 智能体自动查阅已有知识：索引用于导航代码，规格用于模块契约，指南用于第三方集成细节。
3. 智能体自动更新已有知识：当项目事实变化时，相关文档会被自动更新。
4. 下一个会话从更新后的知识继续。

有时智能体对创建、合并或拆分文档会犹豫不决。此时，引导智能体做出更大的架构决策：

- "在实现这个功能之前，先为它写一份规格。"
- "把这次研究记录下来，避免重复调查。"
- "这两份文档有重叠。把它们合并。"
- "这份文档太大了。拆分它。"
- "把这份规格提升到 Shared，让团队也能收到。"

## 对比其他记忆插件

其他记忆插件把遗忘当作问题本身。他们认为解决方案是向智能体重放过去的上下文：要么捕获片段再通过 RAG 检索，要么把一个巨型会话压缩后无限延续，全程不记录任何东西。两种方案都有缺陷。

- **片段不是知识。** 其他插件把片段当作记忆记录 —— 不完整、缺上下文、记录时就已过时。
- **检索是一场抽奖。** RAG 插件积累数千个 chunk，却只返回有损的 top-k 切片。被丢掉了什么，无从知晓。
- **记忆会静默失败。** 存储是个黑盒：你无法看到记住了什么、忘记了什么、为什么 —— 失败会在之后以错误答案的形式浮现。
- **压缩不是文档。** 上下文压缩能让上下文窗口续命，但留不下任何可共享、可检视的项目事实。
- **你在花钱维护垃圾。** 每个后台 dreamer、curator 和 analyst 都是一座 token 熔炉，烧掉配额，却产不出一份你能阅读、能信任的文档。

Operator Memory 不试图回忆过去。它记录当下，让未来无需猜测。智能体知道的东西，是一个你能够打开的文件。而不是 RAG 数据库里的 13 行记录。

RAG 智能体在回忆。Operator 在理解。

## 路线图

**Operator Memory 正在积极开发中。** 更多功能正在路上，包括对其他 harness 的支持。

#### 大脑改进

- **观察引擎（Observation Engine）** —— 随时间学习持久的用户观察，与显式用户指令分开保存。
- **可靠的大脑更新** —— 在长对话中保持规格等大脑文档的最新状态，而不是仅依赖智能体自己记住。

#### 上下文管理

- **缓存感知的上下文管理** —— 缓存过期时自动刷新 preamble 并执行工具调用剪枝。
- **无损上下文压缩** —— 通过无损上下文压缩无损扩展上下文。

#### 更多 Harness

- **Claude Code** —— 研究待定

## 了解更多

- [工作流](docs/workflow.md)（英文）- 如何引导持续文档化并维护一个有用的大脑。含命令参考。
- [架构](docs/architecture.md)（英文）- 分区、目录、索引和确定性上下文加载的工作原理。
- [Harness 文档](docs/harnesses/)（英文）- 各 harness 的安装、验证、命令、更新和故障排除。
- [故障排除](docs/troubleshooting.md)（英文）- 验证、修复和更新恢复。
- [演示](https://github.com/aerovato/operator-demo-terra-js) - 一个用 Operator 以智能体驱动方式构建的类 Minecraft Web 应用。[录制的对话](https://opncd.ai/share/2F8fjjEp)展示了大脑在整个过程中的使用和维护。

## 许可证

BSD 3-Clause。见 [`LICENSE`](LICENSE)。
