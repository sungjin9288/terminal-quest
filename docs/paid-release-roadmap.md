# Paid Release Roadmap

## Goal
Ship Terminal Quest as a paid product with clear quality gates for stability, progression depth, and player support readiness.

## Phase 1: Release Foundation (Current)
- [x] Test reliability baseline (full suite green in CI/local)
- [x] Data integrity and quest balance validation scripts
- [x] Crash report generation and fatal runtime reporting
- [x] Release readiness gate script (`npm run release:check`)

Exit criteria:
- Build, tests, and data validation pass in one command.
- Fatal runtime errors produce crash logs for postmortem debugging.

## Phase 2: Product Completeness
- [x] Minimum content depth target:
  - [x] 12+ hour first clear playtime
  - [x] 25+ meaningful quests with branching objectives
  - [x] Endgame loop (repeatable challenge, scaling rewards)
- [x] Economy balancing:
  - [x] Gold sinks and anti-inflation controls
  - [x] Item progression pacing by act
- [x] UX polish:
  - [x] Settings menu (text speed, color mode, key hints)
  - [x] Accessibility pass for color-only signals
  - [x] Prompt priority policy and pacing presets (`normal/important/critical`, auto-pace profiles)
  - [x] Context-aware recommendation guide (town/dungeon action hints)

Exit criteria:
- Internal playthrough confirms full campaign completion without blockers.
- Economy metrics remain within target ranges for 3 consecutive balancing runs.

## Phase 3: Commercial Readiness
- [x] Distribution:
  - [x] Single-command install/start experience
  - [x] Versioned release packaging and changelog
- [x] Policy and support:
  - [x] Refund policy and support contact
  - [x] Issue triage and patch SLAs
- [x] Quality operations:
  - [x] Smoke-test checklist for each release candidate
  - [x] Smoke-report automation (`npm run release:smoke`)
  - [x] Release candidate hard gate (`npm run release:candidate`)
  - [x] Sign-off tracking automation (`npm run release:signoff`)
  - [x] Package launch verification script (`npm run verify:package-launch`)
  - [x] Runtime smoke verification script (`npm run verify:runtime-smoke`)
  - [x] Release artifact integrity verification (`npm run verify:release-artifacts`)
  - [x] Save migration verification across previous versions

Exit criteria:
- Candidate release passes all checklists and migration tests.
- Support and patch processes are documented and tested at least once.

## Phase 4: Post-Launch Iteration
- [x] Telemetry-lite (opt-in, non-PII) for progression funnels
- [x] Retention updates
  - [x] New quests
  - [x] Endgame challenge modifiers
  - [x] Seasonal events
- [x] Live balancing cadence with patch notes

Exit criteria:
- Stable update cadence with measurable retention improvement.
