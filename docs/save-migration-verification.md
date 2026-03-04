# Save Migration Verification

## Last Verified
- Date: March 4, 2026
- Verified against: runtime schema `1.0.0`

## Verification Command
```bash
npm run verify:save-migration
```

## Covered Cases
- Legacy save fixture load and migration.
- Malformed legacy quest history sanitization.
- Load-flow migration through menu/runtime path.

## Expected Pass Criteria
- `tests/saveMigration.e2e.test.ts` passes.
- `tests/loadGame.e2e.test.ts` passes.
- Migrated state includes normalized quest history and endgame challenge fields.

## Failure Response
- Block release candidate.
- Open `P0` issue if save corruption or load-blocking behavior is detected.
- Patch and rerun verification before proceeding.
