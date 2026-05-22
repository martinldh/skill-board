# Skill Dashboard (skill-board)

An interactive HTML dashboard for browsing and launching [OpenCode](https://opencode.ai) skills. Scans local skill definitions, translates descriptions to Chinese, tracks usage, and presents everything in a searchable, filterable browser interface.

## Features

- **Auto-discovery** — reads every `SKILL.md` in the skills directory and parses YAML frontmatter
- **Chinese translation** — batch-translates skill descriptions via LLM (with cache)
- **Usage tracking** — logs local usage independently of telemetry settings
- **Search & filter** — real-time search by name/description, category tabs, sort by usage or name
- **Detail panel** — click any skill card to see full info and copy its trigger command
- **One-click trigger** — copies `/skill-name` to clipboard for instant invocation
- **Auto-refresh** — refreshes every 5 minutes, manual refresh with loading feedback
- **Dark/light mode** — follows system preference
- **Zero external deps** — all CSS/JS inlined, Google Fonts loaded from CDN

## Usage

```bash
# 1. Generate dashboard
bun run scripts/generate.ts

# 2. Start server
bun run scripts/serve.ts

# 3. Open in browser
open http://localhost:4173
```

Or use the OpenCode slash command: `/skill-board`

## Categorization

| Category | Matches |
|----------|---------|
| 测试 (Testing) | playwright\*, qa, test\*, browser |
| 文档 (Documentation) | docx, pdf, pptx, document-\*, make-pdf |
| 开发工具 (Dev Tools) | python-\*, git\*, ship, review, \*-dev |
| AI (AI/Planning) | claude, plan-\*, gbrain, office-hours |
| 设计 (Design) | design-\*, browse |
| 运维 (Operations) | cso, health, benchmark, canary, freeze, guard |
| 其他 (Other) | everything else |

---

# Skill Dashboard（技能看板）

一个交互式 HTML 仪表盘，用于浏览和启动 [OpenCode](https://opencode.ai) 技能。自动扫描本地技能定义，将描述翻译为中文，跟踪使用情况，并通过可搜索、可筛选的浏览器界面呈现所有技能。

## 功能

- **自动发现** — 读取 skills 目录下所有 `SKILL.md` 并解析 YAML 前置元数据
- **中文翻译** — 通过 LLM 批量翻译技能描述（含缓存）
- **使用统计** — 独立于遥测设置的本地使用日志
- **搜索与筛选** — 按名称/描述实时搜索、分类标签、按使用次数或名称排序
- **详情面板** — 点击技能卡片查看完整信息并复制触发命令
- **一键复制** — 复制 `/skill-name` 到剪贴板，可直接触发技能
- **自动刷新** — 每 5 分钟自动刷新，手动刷新含加载反馈
- **深色/浅色模式** — 跟随系统偏好
- **零外部依赖** — 所有 CSS/JS 内联，Google Fonts 从 CDN 加载

## 使用方法

```bash
# 1. 生成仪表盘
bun run scripts/generate.ts

# 2. 启动服务
bun run scripts/serve.ts

# 3. 浏览器打开
open http://localhost:4173
```

或使用 OpenCode 斜杠命令：`/skill-board`

## 分类规则

| 分类 | 匹配规则 |
|------|----------|
| 测试 | playwright\*, qa, test\*, browser |
| 文档 | docx, pdf, pptx, document-\*, make-pdf |
| 开发工具 | python-\*, git\*, ship, review, \*-dev |
| AI/规划 | claude, plan-\*, gbrain, office-hours |
| 设计 | design-\*, browse |
| 运维 | cso, health, benchmark, canary, freeze, guard |
| 其他 | 其余所有 |
