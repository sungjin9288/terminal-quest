# Playtest Runbook

Use the isolated playtest profile when validating onboarding, quest readability, fatigue, and first-hour retention.

Frontend-specific scenarios and observation prompts are in `docs/frontend-playtest-checklist.md`.

## Commands

```bash
npm run playtest:setup
npm run playtest:start
npm run playtest:report
npm run playtest:reset
```

## What Each Command Does

- `npm run playtest:setup`
  - Creates `playtest-data/active/`
  - Seeds recommended runtime settings
  - Keeps normal `saves/`, `telemetry/`, and `logs/` untouched
- `npm run playtest:start`
  - Builds the current project
  - Launches the browser frontend server with isolated save/settings/telemetry/log directories
  - Serves the dashboard at `http://localhost:4310`
  - Creates a timestamped note template in `playtest-data/active/notes/`
- `npm run playtest:start:terminal`
  - Builds the current project
  - Launches the legacy terminal client with the same isolated playtest profile
- `npm run frontend:playtest`
  - Builds the current project
  - Launches the browser frontend server with the same isolated playtest profile
  - Serves the dashboard at `http://localhost:4310`
  - Creates a timestamped note template in `playtest-data/active/notes/`
- `npm run playtest:report`
  - Summarizes captured telemetry and current save slots from the active playtest workspace
- `npm run playtest:reset`
  - Removes all isolated playtest data

## Active Directories

The playtest profile writes only to:

- `playtest-data/active/saves/`
- `playtest-data/active/settings/`
- `playtest-data/active/telemetry/`
- `playtest-data/active/logs/`
- `playtest-data/active/notes/`

## Default Playtest Profile

The seeded runtime settings are:

- Text speed: `normal`
- Continue prompt mode: `streamlined`
- Auto pace: `balanced`
- Key hints: `on`
- Context hints: `on`
- Telemetry: `on` (local only, non-PII)

## Recommended Session Flow

1. Run `npm run playtest:setup` once before the first tester.
2. Run `npm run playtest:start` for the standard browser session.
3. Use `npm run playtest:start:terminal` only when you explicitly want to compare against the legacy CLI flow.
4. Follow the scenario order in `docs/frontend-playtest-checklist.md`:
   - Blind first run
   - Resume and preview
   - Short session stop and return
5. Record observations in the generated note file under `playtest-data/active/notes/`.
6. After the session, run `npm run playtest:report`.
7. Run `npm run playtest:reset` only when you want a fully clean environment.
