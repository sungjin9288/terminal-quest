# Balance Patch Notes - 2026-03-04

Generated at: 2026-03-04T01:45:06.762Z

## Snapshot
- Quests: 37
- Branch roots: 5
- Multi-objective quests: 28
- First clear average: 819.1분 (13.65시간)
- Economy per act:
- Act 1 | Lv 1-12 | combatGold=57.52 | innCost=38 | questAvg=176.67 | progressionItems=26 | medianPrice=120
- Act 2 | Lv 12-22 | combatGold=156 | innCost=82 | questAvg=558.18 | progressionItems=6 | medianPrice=1500
- Act 3 | Lv 22-28 | combatGold=225 | innCost=114 | questAvg=860 | progressionItems=7 | medianPrice=2600
- Act 4 | Lv 28-30 | combatGold=261 | innCost=130 | questAvg=905 | progressionItems=6 | medianPrice=3900
- Validation warnings: quest=0, economy=0, playtime=0

## Validation Commands
- `node scripts/validate-quest-balance.js`
- `node scripts/validate-economy-balance.js`
- `node scripts/validate-playtime-balance.js`

## Raw Outputs
### Quest Balance
```text
Quest balance validation passed.
- quests: 37
- branch roots: 5
- multi-objective quests: 28
- referenced monsters: 146
- referenced items: 123
- referenced locations: 13
```

### Economy Balance
```text
Economy balance metrics:
- Act 1 | Lv 1-12 | combatGold=57.52 | innCost=38 | questAvg=176.67 | progressionItems=26 | medianPrice=120
- Act 2 | Lv 12-22 | combatGold=156 | innCost=82 | questAvg=558.18 | progressionItems=6 | medianPrice=1500
- Act 3 | Lv 22-28 | combatGold=225 | innCost=114 | questAvg=860 | progressionItems=7 | medianPrice=2600
- Act 4 | Lv 28-30 | combatGold=261 | innCost=130 | questAvg=905 | progressionItems=6 | medianPrice=3900
Economy balance validation passed.
```

### Playtime Balance
```text
Playtime balance metrics:
- campaign: 205-265분
- mainQuest: 196.7-337.3분
- recommendedSideQuest: 80-170.2분
- branchExploration: 25-45분
- retryOverhead: 72-132분
- travelOverhead: 40-70분
- firstClearTotal: 618.7-1019.5분
- firstClearAverage=819.1분 (13.65시간)
- target=720분 (12시간)
- branchRoots=5
Playtime balance validation passed.
```
