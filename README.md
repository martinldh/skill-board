# skill-board

[中文说明](./README.zh-CN.md)

An interactive dashboard for OpenCode skills. It scans local `SKILL.md` files,
generates Chinese descriptions, tracks usage, and lets users quickly discover and
invoke skills from a visual board.

## Why skill-board

- Find all installed skills in one place
- Understand each skill quickly with translated descriptions and usage examples
- Sort by actual usage frequency
- Copy trigger commands in one click and call skills immediately

## Features

- Auto-scan skills from `~/.config/opencode/skills/*/SKILL.md`
- Parse YAML frontmatter (`name`, `description`)
- Batch translate descriptions to Chinese with cache
- Merge usage stats from telemetry log and local log
- Real-time search + category filters + sort options
- Detail panel with trigger command and example prompt
- Auto refresh every 5 minutes
- Dark/light theme based on system settings

## Project Structure

```text
skill-board/
  SKILL.md                 # Skill definition for OpenCode
  scripts/
    generate.ts            # Scan/translate/classify/generate
    serve.ts               # Local static server + /api/use logging
  data/
    translations.json      # Translation cache
    skill-data.json        # Generated skill data
    dashboard.html         # Generated dashboard
    usage-log.jsonl        # Local usage log
```

## Quick Start

### 1) Generate dashboard data and HTML

```bash
bun run scripts/generate.ts
```

### 2) Start local server

```bash
bun run scripts/serve.ts
```

### 3) Open dashboard

```bash
open http://localhost:4173
```

## Use in OpenCode

Trigger directly:

```text
/skill-board
```

The skill workflow will:

1. Regenerate dashboard
2. Start/restart local server
3. Open dashboard in browser
4. Bring Chrome to foreground

## Category Rules

| Category | Matches |
| --- | --- |
| Testing | `playwright*`, `qa`, `test*`, `browse` |
| Documentation | `docx`, `pdf`, `pptx`, `document-*`, `make-pdf` |
| Dev Tools | `python-*`, `git*`, `ship`, `review`, `*-dev` |
| AI/Planning | `claude`, `plan-*`, `gbrain`, `office-hours` |
| Design | `design-*`, `browse` |
| Operations | `cso`, `health`, `benchmark`, `canary`, `freeze`, `guard` |
| Other | everything else |

## Requirements

- macOS or Linux
- [Bun](https://bun.sh/)
- OpenCode skill environment

## Roadmap

- Custom category rules via config file
- Multi-language UI support
- Better per-skill example prompt generation
- Export dashboard snapshot

## License

MIT
