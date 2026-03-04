# Prompt Priority Policy

## Effective Date
- Effective from: March 4, 2026

## Objective
Define a single standard for `pressEnterToContinue(priority)` so gameplay pacing is consistent across all flows and release builds.

## Priority Levels

| Priority | Purpose | Streamlined Mode Behavior | Classic Mode Behavior |
|---|---|---|---|
| `normal` | Low-risk informational progress updates | Auto-continue with short delay | Enter required |
| `important` | Decision/result checkpoints players should clearly see | Auto-continue with longer delay | Enter required |
| `critical` | Errors or high-risk moments requiring explicit acknowledgment | Enter required | Enter required |

## Delay Model (Streamlined Mode)

- Base delay by auto-pace preset:
  - `snappy`: `140ms`
  - `balanced`: `260ms`
  - `cinematic`: `460ms`
- Text speed multiplier:
  - `slow`: `1.35`
  - `normal`: `1.00`
  - `fast`: `0.72`
- Priority multiplier:
  - `normal`: `1.00`
  - `important`: `1.65`
- Final clamp: `90ms` to `1200ms`

Reference implementation: `src/ui/display.ts`

## Flow Mapping Standard

- Combat:
  - Turn-to-turn quick summary: `normal`
  - Victory/defeat/escape results, reward/level-up confirmation: `important`
- Save/Load:
  - Save success/failure, load success/failure, delete result: `important`
- Travel:
  - Locked destination warning, arrival checkpoint: `important`
- Quest/Progression:
  - Boss clear, act clear, challenge streak/end, major reward summary: `important`
- Runtime safety:
  - Unexpected runtime error fallback prompt: `critical`
- Death flow:
  - Death/game-over/respawn checkpoints: `critical`

## Engineering Rules

- Always pass an explicit priority when the checkpoint is progression-critical or risk-bearing.
- Use `critical` for cases where user acknowledgment is required before state transition or recovery.
- Keep lightweight ambient updates in `normal`; avoid overusing `important`.
- When adding a new major user flow, include prompt-priority review in PR checklist.

## QA Checklist

- `npm run validate:prompt-priority`
- `npm test -- --runInBand tests/continuePromptBehavior.test.ts`
- `npm test -- --runInBand`
- `npm run release:check`
- Manual smoke:
  - Verify `streamlined + snappy` feels fast without skipping critical acknowledgments.
  - Verify `classic` still requires Enter for all checkpoints.
