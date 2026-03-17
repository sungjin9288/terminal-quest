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
  - [x] 30+ hour first clear playtime
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

## Phase 5: Long-Form Campaign Expansion (Completed)
- [x] First clear target: 30h+ without pacing fatigue
- [x] Full completion target: 44-50h with post-clear depth
- [x] Extended playtime profile and guardrails (`npm run validate:playtime:extended`)
- [x] Branch density expansion (branch roots 6+)
- [x] Side-quest share expansion (20%+ within first clear estimate)
- [x] Post-clear curated route content to reduce repeatable grind share

Latest snapshot (2026-03-06):
- First clear average: 32.59h (`1955.6분`)
- Extended full completion average: 44.62h (`2677분`)
- Branch roots: `9`
- Side-quest share: `32.9%`
- Repeatable share: `9.1%`

Exit criteria:
- `validate:playtime` passes with the 30h first-clear target.
- `validate:playtime:extended` passes.
- Internal runbooks confirm no single loop dominates playtime (>45% repeatable share).

## Phase 6: Internal AI Layer (In Progress)
- [x] Session Director AI
  - [x] Shared intent engine for browser/terminal recommendations
  - [x] Recommendation follow/dismiss telemetry
  - [x] AI intent summary in save metadata and resume surfaces
- [x] Narrative Companion AI (Initial)
  - [x] Context-aware voice/feed selection
  - [x] Short-term moment memory for payoff lines
- [x] Contract Composer AI (Initial)
  - [x] Template-driven dynamic contracts
  - [x] Adaptive contract sloting by session window and recovery pressure
  - [x] Accept/complete telemetry metadata
  - [x] Balance guardrail integration
- [x] Encounter Director AI
  - [x] Tension pacing across combat and dungeon events
  - [x] Endgame-specific pressure rules
- [ ] Ops Analyst AI
  - [x] Telemetry-to-insight reporting
  - [x] Playtest observation prioritization
  - [x] AI backlog draft generation
  - [x] Linear-ready issue draft export
  - [x] Linear export plan and state tracking

Reference:
- `docs/internal-ai-roadmap.md`

Latest snapshot (2026-03-11):
- `GameState.aiState` is the shared AI intent SSOT for browser, terminal, and save metadata.
- Browser Action Rail now renders an `AI Director` card with follow/dismiss telemetry.
- Browser Action Rail now renders a `Companion Note` card backed by recent AI memory.
- Browser Action Rail and HUD now surface `Encounter Director` pacing cards with mode, combat chance, preferred event, and fatigue context.
- Endgame challenge runs now feed tier/streak/modifier context into Encounter Director, producing sharper pressure rules inside `corruption-space`.
- Browser/terminal dungeon explore now records `encounter_director_decision` telemetry, and `npm run ai:insights` generates a markdown ops summary from local telemetry.
- `npm run ai:insights` now also reads active playtest notes and emits prioritized observation bullets that line up with recommendation/encounter telemetry.
- `npm run ai:backlog:dry` now turns those findings into `P0/P1/P2` backlog drafts for the next playtest or patch pass.
- `npm run ai:linear:dry` now turns the same backlog into issue-ready markdown drafts that can be copied into Linear.
- `npm run ai:linear:export:dry` now reads `config/ai-ops-linear.json` and previews the real create/update plan for Linear, defaulting to `Sungjin-an` and `P0` scope.
- Successful `ai:linear:export` runs persist issue IDs and sync state in `docs/ai-linear-drafts/export-state.json`.
- Exported drafts now keep a telemetry baseline so the browser `Ops` tab can show `improved/flat/regressed` impact after later playtests.
- Browser `Ops` tabs now include export-state and impact-trend filters so operators can isolate pending or regressed drafts immediately.
- `npm run ai:linear:sync` now re-reads exported issues from Linear so remote `Done/In Progress/Canceled` state is reflected in local Ops status and filters.
- Browser `Ops` surfaces now distinguish `closed` from `shipped` and warn on `stale sync`, so operators can separate resolved issues from effect-confirmed wins.
- Landing `AI Ops Pulse` and the browser `Ops` workspace now surface a `Next Command` recommendation so operators can jump straight to `ai:linear:export:dry`, `ai:linear:sync`, or `ai:insights:dry` based on current draft state.
- `npm run playtest:report` now echoes the same `Next Command` guidance when a build artifact is present, keeping browser and terminal ops flows aligned.
- `npm run playtest:report:json` now carries telemetry/note path hints, and downstream `ai:insights`, `ai:backlog`, `ai:linear`, `ai:linear:export` scripts can reuse that payload through `--report-json`.
- `npm run ai:ops:cycle` now bundles `playtest report -> insights -> backlog -> linear preview/export/sync` into one local ops artifact run, with `ai:ops:cycle:apply` available for real Linear push/sync when credentials are present.
- `npm run ai:ops:cycle:latest` and `npm run playtest:report` now read the persisted latest cycle summary so terminal operators can inspect the last full ops run without rerunning the pipeline first.
- Landing `AI Ops Pulse` and the `Ops` workspace now surface a `Cycle Follow-up` command when the latest persisted ops cycle failed or diverged from the current ops recommendation.
- Persisted ops cycle summaries now expose failed step names in both terminal latest-cycle output and browser Ops surfaces, so operators can see the broken stage before rerunning the pipeline.
- Persisted ops cycle summaries now also expose freshness/staleness, and stale bundles surface a direct `cycle 갱신` rerun recommendation in both terminal and browser Ops surfaces.
- `playtest:report` and `playtest:report:json` now embed the same latest-cycle health block, so CLI review and downstream automation read the same freshness/failure/follow-up data.
- `playtest:report` and its JSON payload now also expose a normalized Ops status code/label, so automation can key off `Cycle 실패`, `Cycle stale`, or `Export 대기` without reparsing the full narrative output.
- `ai:ops:cycle` persisted summaries now snapshot the same normalized Ops status, so `latest` cycle artifacts preserve both the command recommendation and the machine-readable operating state.
- `ai:ops:cycle:latest:json` now exposes the persisted cycle snapshot as JSON, so external automation can read freshness, failed steps, and the stored Ops status without parsing CLI text.
- `ai:ops:doctor` now turns the persisted cycle snapshot into an `ok/warn/fail` operating gate with a recommended command, and `ai:ops:doctor:json` exposes the same verdict for CI or lightweight automation.
- `playtest:report`, its JSON payload, and the browser `AI Ops Pulse` / `Ops` dashboard now surface the same doctor verdict, so local operators and automation read one shared Ops health gate.
- `ai:ops:cycle` now persists standalone `doctor.json` / `doctor.md` artifacts alongside each bundle and `latest-doctor.*`, so operators can inspect the health gate directly from the cycle artifact directory.
- `ai:ops:doctor:strict` and `ai:ops:cycle:gate(:strict)` now promote the doctor verdict into an actual automation gate, so stale or action-required Ops states can fail CI/preflight runs without parsing report text.
- Release automation now has `release:check:ops`, `release:smoke:ops`, and `release:candidate:ops`, so paid-release preflight can opt into the same strict Ops doctor gate without changing the baseline release commands.
- `release:smoke:ops` now persists the normalized `opsDoctor` snapshot into smoke summaries, and `release:candidate:ops` failure output includes the doctor reason and next command instead of a bare `overallPass=false`.
- `release:smoke:latest` and `release:smoke:latest:json` now expose the persisted smoke summary directly, so operators and automation can inspect release readiness and `opsDoctor` state without rerunning the packaging flow.
- `release:doctor`, `release:doctor:json`, and `release:doctor:strict` now evaluate persisted smoke/sign-off state against the current checkout, so operators can see version/branch/commit mismatches and pending sign-offs before rerunning full release gates.
- `release:doctor` now also persists `release-doctor-latest.json/.md` plus timestamped snapshots in `releases/smoke-reports/`, so release readiness checks leave an auditable doctor trail similar to the ops-cycle artifacts.
- `release:status` and `release:status:json` now aggregate persisted smoke, doctor, and sign-off latest artifacts into one machine-readable candidate snapshot, so operators can inspect overall release state without cross-checking three separate reports.
- `release:status:strict` now promotes that persisted aggregate into a no-rerun automation gate, so CI or release handoff steps can fail fast on `pending` or `blocked` candidate state without recomputing smoke or doctor artifacts.
- Playtest browser landing now surfaces an `AI Ops Pulse` card so testers can see the current top finding and draft priority without leaving the frontend.
- Playtest browser sessions now expose an `Ops` workspace tab with backlog cards, Linear draft previews, export status, observation bullets, and recent AI signals.
- Terminal guidance now renders the same narrative cue as `동행 브리프`, with duplicate companion lines suppressed in browser feed.
- Quest boards now receive AI-composed `전초 정찰` plus adaptive `압력 제거/회복 루프/보급 재정렬` contracts from shared frontier state.
- Browser and terminal quest cards surface AI contract badges, session-window labels, and director rationale.
- Dungeon explore loops now use a shared Encounter Director that reduces repeated combat streaks, protects low-resource states, and sharpens boss-approach pacing.
- Save metadata stores `aiDirectorMode`, `aiIntentTitle`, and `aiIntentReason`.

Exit criteria:
- Browser and terminal clients consume the same AI intent SSOT.
- Playtests show improved resume comprehension and lower repeat-loop fatigue.
- AI-generated or AI-directed content stays within existing balance and save-safety guardrails.
