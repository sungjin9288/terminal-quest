# Live Balance Cadence

## Goal
Operate a predictable balancing loop with traceable patch notes after each content or economy change.

## Cadence
- Weekly: run balance validations and generate patch notes snapshot.
- Hotfix: rerun immediately after economy/playtime/quest reward changes, including AI contract reward changes.
- Release candidate: always regenerate patch notes before `npm run release:check`.

## Command
```bash
npm run balance:notes
npm run validate:ai-contracts
npm run validate:playtime:extended
npm run ai:insights:dry
npm run ai:backlog:dry
```

This command:
1. Builds the project.
2. Runs quest/economy/AI-contract/playtime validation scripts.
3. Generates markdown notes at:
   - `docs/patch-notes/YYYY-MM-DD.md`
   - `docs/patch-notes/latest.md`
4. Prints an AI ops preview from local telemetry:
   - `docs/ai-insights/YYYY-MM-DD.md` on non-dry runs
   - `docs/ai-insights/latest.md` on non-dry runs
5. Prints an AI backlog draft from telemetry + playtest notes:
   - `docs/ai-backlog/YYYY-MM-DD.md` on non-dry runs
   - `docs/ai-backlog/latest.md` on non-dry runs

## Review Checklist
- Confirm quest count, branch roots, and multi-objective count stay above targets.
- Confirm first clear average remains above the 30-hour target.
- Confirm extended full-completion target (44-50h) remains within range via `validate:playtime:extended`.
- Confirm per-act economy snapshots preserve expected progression.
- Confirm AI contract scenarios stay under repeatable reward guardrails via `validate:ai-contracts`.
- Review AI insight findings for recommendation dismiss spikes, recovery/death overlap, and repeated route-scan pivots.
- Review AI backlog draft priorities and pick one `P0` plus one `P1` item for the next patch or playtest.
- If warning count increases, add mitigation in the same patch note entry.
