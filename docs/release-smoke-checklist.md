# Release Smoke Checklist

## Scope
This checklist is required for every release candidate before distribution.

## Build And Validation
- [ ] `npm run release:smoke` completes and generates `releases/smoke-reports/release-smoke-<timestamp>.md`.
- [ ] `npm run release:smoke` generates `releases/smoke-reports/release-smoke-latest.json` with `overallPass: true`.
- [ ] `npm run release:check` passes without failures.
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
