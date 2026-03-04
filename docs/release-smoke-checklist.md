# Release Smoke Checklist

## Scope
This checklist is required for every release candidate before distribution.

## Build And Validation
- [ ] `npm run release:check` passes without failures.
- [ ] `npm run release:package:dry` completes and shows expected version.
- [ ] `npm run release:package` produces:
  - [ ] `releases/v<version>/`
  - [ ] `releases/terminal-quest-v<version>.tar.gz` (or `.zip` on Windows)

## Runtime Smoke
- [ ] Launch game from package: `node dist/index.js`
- [ ] Start new game and reach first combat encounter.
- [ ] Save in town and reload successfully.
- [ ] Complete one quest and verify reward application.
- [ ] Defeat one boss and verify progression unlock.

## Data And Migration
- [ ] `npm run verify:save-migration` passes.
- [ ] Legacy save fixture loads without runtime crash.
- [ ] Quest history and statistics fields are normalized on load.

## Release Docs
- [ ] `CHANGELOG.md` contains current version entry.
- [ ] `docs/paid-release-roadmap.md` reflects current phase status.
- [ ] `docs/support-policy.md` is up to date.

## Sign-Off
- [ ] QA sign-off
- [ ] Engineering sign-off
- [ ] Release manager sign-off
