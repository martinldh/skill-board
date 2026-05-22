---
name: skill-board
description: >
  Scan all local OpenCode skills, translate descriptions to Chinese via LLM,
  and generate an interactive HTML dashboard with search, category filters,
  usage-frequency sorting, detail panels with one-click trigger copying, and
  auto-refresh. Display via opencode's built-in browser (headless Chromium).
  Use when asked to "show skill dashboard", "list all skills", "skill board",
  "skills overview", "查看技能面板", "技能看板", or "dashboard of skills".
---

## Prerequisites

```bash
SKILL_DIR="$HOME/.config/opencode/skills/skill-board"
BROWSE="$HOME/.config/opencode/skills/gstack/browse/dist/browse"
[ -x "$BROWSE" ] && echo "BROWSE_READY" || echo "BROWSE_MISSING"
command -v bun &>/dev/null && echo "BUN_READY" || echo "BUN_MISSING"
```

If either is MISSING, tell the user and stop.

## Steps (execute all when invoked)

1. Kill old server: `kill $(lsof -ti:4173) 2>/dev/null || true`
2. Generate dashboard: `bun run "$SKILL_DIR/scripts/generate.ts"`
3. Start server:
   ```bash
   nohup bun run "$SKILL_DIR/scripts/serve.ts" > /tmp/skill-board-server.log 2>&1 &
   sleep 2
   ```
4. Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173` (expect 200)
5. Open in browser: `"$BROWSE" goto http://localhost:4173`
6. Bring Chrome to front so the user sees the window:
   ```bash
   osascript -e 'tell application "Google Chrome" to activate'
   ```
7. Report DONE — the dashboard is visible and Chrome is brought to front.
