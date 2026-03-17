# Release Smoke Checklist

## Scope
This checklist is required for every release candidate before distribution.

## Build And Validation
- [ ] `npm run release:smoke` completes and generates `releases/smoke-reports/release-smoke-<timestamp>.md`.
- [ ] `npm run release:smoke` generates `releases/smoke-reports/release-smoke-latest.json` with `overallPass: true`.
- [ ] `npm run release:smoke:latest` shows the current latest smoke result without rerunning packaging steps.
- [ ] `npm run release:doctor` summarizes the current smoke/sign-off readiness from persisted latest snapshots.
- [ ] `npm run release:doctor` writes `releases/smoke-reports/release-doctor-latest.json` and `.md` plus a timestamped snapshot.
- [ ] `npm run release:doctor:latest` shows the current persisted doctor snapshot without recomputing release state.
- [ ] `npm run release:status` summarizes persisted smoke/doctor/sign-off readiness in one view without rerunning release checks.
- [ ] `npm run release:check` passes without failures.
- [ ] AI/ops 상태까지 포함한 후보 검증이 필요하면 `npm run release:check:ops` passes without failures.
- [ ] AI/ops 상태까지 포함한 smoke 검증이 필요하면 `npm run release:smoke:ops` completes and records `opsDoctorGate: true`.
  - [ ] `releases/smoke-reports/release-smoke-latest.json` contains `opsDoctor.status`, `opsDoctor.recommendedCommand`, and the primary failure reason.
  - [ ] `npm run release:smoke:latest:json` exposes the same latest snapshot for automation without rerunning smoke.
- [ ] `npm run release:doctor:strict` can be used as a preflight gate when pending sign-off or stale/mismatched release state should fail automation immediately.
- [ ] `npm run release:doctor:latest:json` exposes the persisted doctor snapshot for automation without recomputing it.
- [ ] `npm run release:status:json` exposes the combined persisted release status for automation without parsing individual latest files.
- [ ] `npm run release:package:dry` completes and shows expected version.
- [ ] `npm run release:package` produces:
  - [ ] `releases/v<version>/`
  - [ ] `releases/terminal-quest-v<version>.tar.gz` (or `.zip` on Windows)
  - [ ] `releases/terminal-quest-v<version>.tar.gz.sha256` (or `.zip.sha256` on Windows)
- [ ] `npm run verify:release-artifacts` passes.

## Runtime Smoke
- [ ] `npm run verify:runtime-smoke` passes.
- [ ] `npm run verify:package-launch` passes.
- [ ] `releases/smoke-reports/runtime-smoke-latest.json` is generated and all scenario statuses are `passed: true`.
- [ ] Launch game from package: `node dist/index.js`
- [ ] Start new game and reach first combat encounter.
- [ ] Save in town and reload successfully.
- [ ] Complete one quest and verify reward application.
- [ ] Defeat one boss and verify progression unlock.
- [ ] Toggle `진행 템포`, `자동 진행 속도`, `추천 가이드` in settings and confirm behavior changes.
- [ ] Verify runtime error/death checkpoints still require explicit Enter acknowledgment.

## Data And Migration
- [ ] `npm run verify:save-migration` passes.
- [ ] Legacy save fixture loads without runtime crash.
- [ ] Quest history and statistics fields are normalized on load.

## Release Docs
- [ ] `CHANGELOG.md` contains current version entry.
- [ ] `docs/paid-release-roadmap.md` reflects current phase status.
- [ ] `docs/support-policy.md` is up to date.
- [ ] `docs/prompt-priority-policy.md` is up to date.

## Sign-Off
- [ ] `releases/smoke-reports/release-signoff-latest.json` is generated.
- [ ] Optional one-shot for solo release flow: `npm run release:signoff:all -- --by "<name>" --notes "<optional>"`.
- [ ] QA sign-off (`npm run release:signoff -- --role qa --by "<name>" --notes "<optional>"`)
- [ ] Engineering sign-off (`npm run release:signoff -- --role engineering --by "<name>" --notes "<optional>"`)
- [ ] Release manager sign-off (`npm run release:signoff -- --role release-manager --by "<name>" --notes "<optional>"`)
- [ ] Final candidate gate passes: `npm run release:candidate` (smoke + version/commit/branch/reportPath aligned sign-off enforcement)
- [ ] AI/ops strict candidate gate가 필요하면 `npm run release:candidate:ops` passes with the same sign-off requirements plus `Ops doctor` strict gate.
