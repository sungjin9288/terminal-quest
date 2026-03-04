# Seasonal Events

## Overview
Terminal Quest applies one seasonal event at a time based on the current month.

- Spring (3-5): `spring-memory-festival`
- Summer (6-8): `summer-overclock-rush`
- Autumn (9-11): `autumn-harvest-hunt`
- Winter (12-2): `winter-hardening-drive`

Seasonal events affect:
1. Encounter scaling (monster stats, EXP, gold, drop chances)
2. Quest turn-in bonuses (extra EXP/gold)
3. Deterministic cycle reward item on quest completion cadence
4. Seasonal repeatable quest availability

## Seasonal Repeatable Quests
- `spring-memory-festival-sweep`
- `summer-overclock-rush-suppression`
- `autumn-harvest-hunt-pipeline`
- `winter-hardening-drive-frontline`

Rules:
- Requires `final-purge` completion.
- Only appears during matching seasonal event.
- Resets to `not-started` after completion for re-accept.
