# Live Balance Cadence

## Goal
Operate a predictable balancing loop with traceable patch notes after each content or economy change.

## Cadence
- Weekly: run balance validations and generate patch notes snapshot.
- Hotfix: rerun immediately after economy/playtime/quest reward changes.
- Release candidate: always regenerate patch notes before `npm run release:check`.

## Command
```bash
npm run balance:notes
```

This command:
1. Builds the project.
2. Runs quest/economy/playtime validation scripts.
3. Generates markdown notes at:
   - `docs/patch-notes/YYYY-MM-DD.md`
   - `docs/patch-notes/latest.md`

## Review Checklist
- Confirm quest count, branch roots, and multi-objective count stay above targets.
- Confirm first clear average remains above the 12-hour target.
- Confirm per-act economy snapshots preserve expected progression.
- If warning count increases, add mitigation in the same patch note entry.
