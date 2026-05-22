# skill-board

[English](./README.md)

一个用于 OpenCode Skills 的可视化仪表盘。它会扫描本地 `SKILL.md`，生成中文描述，统计技能使用频率，并帮助你快速理解和调用技能。

## 为什么需要 skill-board

- 所有已安装技能一屏查看
- 通过中文描述和使用示例快速理解技能用途
- 按真实调用次数排序，优先看到高频技能
- 一键复制触发命令，立即调用

## 功能特性

- 自动扫描 `~/.config/opencode/skills/*/SKILL.md`
- 解析 YAML frontmatter（`name`、`description`）
- 批量翻译技能描述并缓存
- 合并遥测日志与本地日志统计使用频率
- 实时搜索 + 分类筛选 + 排序
- 详情面板展示触发命令与提示词示例
- 每 5 分钟自动刷新
- 跟随系统深色/浅色模式

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

## 运行要求

- macOS 或 Linux
- [Bun](https://bun.sh/)
- OpenCode 技能运行环境

## 路线图

- 支持通过配置文件自定义分类规则
- 支持多语言界面
- 提升每个技能示例提示词的质量
- 支持导出仪表盘快照

## License

MIT
