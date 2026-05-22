# skill-board

[English](./README.md)

一个更产品化的 OpenCode Skills 仪表盘。它会扫描本地 `SKILL.md`、翻译描述、统计技能使用频率，并帮助团队快速找到和调用正确的技能。

## 预览

> 下次运行后可补充截图：

- `docs/screenshots/dashboard-overview.png`（卡片总览）
- `docs/screenshots/dashboard-detail.png`（技能详情面板）

```markdown
![仪表盘总览](docs/screenshots/dashboard-overview.png)
![技能详情面板](docs/screenshots/dashboard-detail.png)
```

## 为什么需要 skill-board

- **发现更快**：所有已安装技能一屏可见
- **理解更快**：中文描述 + 使用示例
- **优先更准**：按真实使用频率排序
- **调用更快**：一键复制 `/skill-name`

## 功能特性

- 自动扫描 `~/.config/opencode/skills/*/SKILL.md`
- 解析 frontmatter 中的 `name` 与 `description`
- LLM 翻译管线 + 本地缓存（`data/translations.json`）
- 合并遥测日志与本地日志统计使用频率
- 搜索 / 分类 / 排序一体化交互
- 详情面板展示触发命令 + 提示词示例
- 本地 API（`POST /api/use`）记录调用意图
- 5 分钟自动刷新 + 手动刷新反馈
- 跟随系统深色/浅色主题

## 项目结构

```text
skill-board/
  SKILL.md                 # OpenCode 技能定义
  scripts/
    generate.ts            # 扫描/翻译/分类/生成
    serve.ts               # 本地静态服务 + /api/use 记录
  data/
    translations.json      # 翻译缓存
    skill-data.json        # 生成后的技能数据
    dashboard.html         # 生成后的仪表盘页面
    usage-log.jsonl        # 本地使用日志
```

## 安装

### 环境要求

- macOS 或 Linux
- [Bun](https://bun.sh/)
- OpenCode 技能运行环境

### 本地准备

```bash
git clone https://github.com/martinldh/skill-board.git
cd skill-board
```

## 快速开始

### 1）生成仪表盘数据和页面

```bash
bun run scripts/generate.ts
```

### 2）启动本地服务

```bash
bun run scripts/serve.ts
```

### 3）打开仪表盘

```bash
open http://localhost:4173
```

## 产品工作流

1. 扫描技能元数据
2. 翻译描述（优先缓存）
3. 合并使用信号
4. 生成静态仪表盘产物
5. 本地服务并交互使用

## 在 OpenCode 中使用

直接输入：

```text
/skill-board
```

该技能会自动执行：

1. 重新生成仪表盘
2. 启动/重启本地服务
3. 打开浏览器页面
4. 将 Chrome 窗口切到前台

## 常见使用场景

- 团队新成员快速熟悉可用技能
- 每周梳理低价值或重复技能
- 快速定位 QA / 文档 / 发布类能力
- 识别高频技能并重点优化

## 分类规则

| 分类 | 匹配规则 |
| --- | --- |
| 测试 | `playwright*`、`qa`、`test*`、`browse` |
| 文档 | `docx`、`pdf`、`pptx`、`document-*`、`make-pdf` |
| 开发工具 | `python-*`、`git*`、`ship`、`review`、`*-dev` |
| AI/规划 | `claude`、`plan-*`、`gbrain`、`office-hours` |
| 设计 | `design-*`、`browse` |
| 运维 | `cso`、`health`、`benchmark`、`canary`、`freeze`、`guard` |
| 其他 | 其余所有 |

## FAQ

### 我改了 SKILL.md，但看板没变化？

先重新生成：

```bash
bun run scripts/generate.ts
```

然后刷新浏览器，或者点击看板的刷新按钮。

### 为什么使用次数是 0？

`skill-board` 会合并两类日志：

- `~/.gstack/analytics/skill-usage.jsonl`
- `data/usage-log.jsonl`

即使遥测关闭，本地日志也会继续记录。

### 不用 OpenCode 能运行吗？

可以。直接用 Bun 运行 `generate.ts` 和 `serve.ts` 即可。

## 故障排查

### 4173 端口被占用

```bash
kill $(lsof -ti:4173) 2>/dev/null || true
```

### 找不到 `bun` 命令

先安装 Bun：https://bun.sh

### 浏览器没有自动切到前台

手动执行：

```bash
osascript -e 'tell application "Google Chrome" to activate'
```

## 路线图

- 支持通过配置文件自定义分类规则
- 支持多语言界面
- 提升每个技能示例提示词的质量
- 支持导出仪表盘快照

## 贡献

欢迎提交 Issue 和 PR。建议流程：

1. Fork 仓库
2. 新建功能分支
3. 本地运行验证
4. 提交 PR，并附前后对比截图

## License

MIT
