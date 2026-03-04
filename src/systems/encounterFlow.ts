import {
  GameState,
  Monster,
  MonsterType,
  MonsterRank,
  ElementType,
  AIBehavior,
  Player
} from '../types/index.js';
import { getSampleMonsters, getRandomMonster } from '../data/monsters.js';
import {
  getLocationMonsters,
  getLocationById,
  isLocationUnlocked,
  getLocationsByAct,
  getActSummary
} from '../data/locations.js';
import { getItemById } from '../data/items.js';
import { runBattle } from './battle.js';
import {
  applyActClearRewards,
  applyLocationFirstClearRewards
} from './locationRewards.js';
import {
  updateQuestProgressOnKill,
  updateQuestProgressOnCollect,
  type QuestProgressUpdate
} from './quest.js';
import { showQuestProgressUpdates } from './questUi.js';
import {
  FINAL_BOSS_ID,
  ensureEndgameChallengeState,
  unlockEndgameChallenge,
  getEndgameChallengeState,
  scaleMonsterForEndgame,
  applyEndgameChallengeVictory,
  resetEndgameChallengeStreak
} from './endgameChallenge.js';
import {
  getActiveSeasonalEvent,
  scaleMonsterForSeasonalEvent
} from './seasonalEvents.js';
import { trackTelemetryEvent } from './telemetry.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  showBox,
  pressEnterToContinue
} from '../ui/display.js';

function normalizeId(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function countItemInInventory(player: Player, itemId: string): number {
  return player.inventory.filter(id => id === itemId).length;
}

function formatMonsterName(monsterId: string): string {
  return monsterId
    .split('-')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function getCompletedActs(gameState: GameState): number[] {
  const acts = Object.entries(gameState.flags)
    .filter(([key, value]) => value && key.startsWith('act-complete-'))
    .map(([key]) => Number(key.replace('act-complete-', '')))
    .filter(act => Number.isInteger(act) && act > 0);

  return Array.from(new Set(acts)).sort((a, b) => a - b);
}

function createFallbackMonster(monsterId: string, level: number, isBoss: boolean): Monster {
  const clampedLevel = Math.max(1, level);
  const elementPool = [
    ElementType.Physical,
    ElementType.Fire,
    ElementType.Ice,
    ElementType.Lightning,
    ElementType.Poison,
    ElementType.Dark
  ];

  const hash = monsterId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const element = elementPool[hash % elementPool.length];

  const maxHp = isBoss ? 260 + clampedLevel * 30 : 45 + clampedLevel * 14;
  const attack = isBoss ? 18 + clampedLevel * 3 : 6 + clampedLevel * 2;
  const defense = isBoss ? 12 + clampedLevel * 2 : 4 + clampedLevel;
  const magicPower = isBoss ? 16 + clampedLevel * 2 : 4 + clampedLevel;
  const magicDefense = isBoss ? 10 + clampedLevel * 2 : 3 + clampedLevel;
  const speed = isBoss ? 8 + Math.floor(clampedLevel * 1.2) : 4 + clampedLevel;

  return {
    id: monsterId,
    name: formatMonsterName(monsterId),
    description: isBoss
      ? '강력한 기운이 감도는 지역의 지배자입니다.'
      : '데이터 이상으로 생성된 불안정한 생명체입니다.',
    type: isBoss ? MonsterType.Aberration : MonsterType.Construct,
    rank: isBoss ? MonsterRank.Boss : MonsterRank.Normal,
    level: clampedLevel,
    stats: {
      hp: maxHp,
      maxHp,
      mp: Math.floor(maxHp * 0.2),
      maxMp: Math.floor(maxHp * 0.2),
      attack,
      defense,
      magicPower,
      magicDefense,
      speed,
      critChance: isBoss ? 18 : 8,
      critDamage: isBoss ? 2.0 : 1.5,
      evasion: isBoss ? 10 : 5
    },
    element,
    resistances: {},
    skills: [],
    aiPattern: AIBehavior.Balanced,
    dropTable: {
      guaranteed: [],
      possible: [
        {
          itemId: 'health-potion',
          chance: isBoss ? 1.0 : 0.35,
          minQuantity: 1,
          maxQuantity: isBoss ? 3 : 1
        },
        {
          itemId: 'mana-potion',
          chance: isBoss ? 0.8 : 0.25,
          minQuantity: 1,
          maxQuantity: isBoss ? 2 : 1
        }
      ],
      rare: isBoss
        ? [
          {
            itemId: 'save-token',
            chance: 0.2,
            minQuantity: 1,
            maxQuantity: 1
          }
        ]
        : [],
      minGold: isBoss ? clampedLevel * 25 : clampedLevel * 6,
      maxGold: isBoss ? clampedLevel * 45 : clampedLevel * 12
    },
    expReward: isBoss ? clampedLevel * 110 : clampedLevel * 18,
    statusEffects: [],
    icon: isBoss ? '👑' : '👾',
    canBeStunned: !isBoss,
    canBePoisoned: !isBoss,
    isBoss,
    spawnWeight: isBoss ? 0 : 5
  };
}

function syncUnlockedConnections(gameState: GameState): void {
  const location = getLocationById(gameState.player.currentLocation);
  if (!location || !('connections' in location)) return;

  const completedActs = getCompletedActs(gameState);

  for (const destination of location.connections) {
    const unlocked = isLocationUnlocked(
      destination,
      gameState.statistics.bossesDefeated,
      completedActs,
      gameState.player.completedQuests
    );

    if (unlocked && !gameState.player.unlockedLocations.includes(destination)) {
      gameState.player.unlockedLocations.push(destination);
      gameState.statistics.locationsDiscovered++;
    }
  }
}

async function applyBossProgress(gameState: GameState, bossId: string): Promise<void> {
  let hasProgressMessage = false;

  if (!gameState.statistics.bossesDefeated.includes(bossId)) {
    gameState.statistics.bossesDefeated.push(bossId);
    showMessage(`보스 ${formatMonsterName(bossId)} 격파!`, 'success');
    trackTelemetryEvent('boss_defeated', gameState, { bossId });
    hasProgressMessage = true;
  }

  if (bossId === FINAL_BOSS_ID && unlockEndgameChallenge(gameState)) {
    showMessage(
      '엔드게임 도전 해금! 코럽션 공간에서 반복 도전을 시작할 수 있습니다.',
      'success'
    );
    trackTelemetryEvent('endgame_challenge_unlocked', gameState, {
      source: 'final-boss'
    });
    hasProgressMessage = true;
  }

  const currentLocation = getLocationById(gameState.player.currentLocation);
  if (!currentLocation || !('act' in currentLocation)) {
    syncUnlockedConnections(gameState);
    if (hasProgressMessage) {
      await pressEnterToContinue('important');
    }
    return;
  }

  const locationRewardFlag = `location-clear-reward-${currentLocation.id}`;
  if (!gameState.flags[locationRewardFlag]) {
    const locationReward = applyLocationFirstClearRewards(
      gameState.player,
      currentLocation.rewards.firstClear
    );
    gameState.flags[locationRewardFlag] = true;

    const hasLocationReward =
      locationReward.expGained > 0 ||
      locationReward.goldGained > 0 ||
      locationReward.rewardSkillPointsGained > 0 ||
      locationReward.itemsAdded.length > 0 ||
      locationReward.itemsFailed.length > 0;

    if (hasLocationReward) {
      showMessage(`${currentLocation.name} 첫 클리어 보상 획득!`, 'success');

      if (locationReward.expGained > 0) {
        showMessage(`보너스 경험치 +${locationReward.expGained}`, 'info');
      }
      if (locationReward.goldGained > 0) {
        showMessage(`보너스 골드 +${locationReward.goldGained}`, 'info');
        gameState.statistics.goldEarned += locationReward.goldGained;
      }
      if (locationReward.rewardSkillPointsGained > 0) {
        showMessage(`스킬 포인트 +${locationReward.rewardSkillPointsGained}`, 'info');
      }
      if (locationReward.itemsAdded.length > 0) {
        gameState.statistics.itemsCollected += locationReward.itemsAdded.length;
        const addedItems = locationReward.itemsAdded.map(itemId => getItemById(itemId)?.name ?? itemId);
        showMessage(`아이템 획득: ${addedItems.join(', ')}`, 'info');

        const itemCounts = new Map<string, number>();
        for (const itemId of locationReward.itemsAdded) {
          itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
        }
        for (const [itemId, count] of itemCounts) {
          const questUpdates = updateQuestProgressOnCollect(gameState, itemId, count);
          if (questUpdates.length > 0) {
            showQuestProgressUpdates(gameState, questUpdates);
          }
        }
      }
      if (locationReward.leveledUp) {
        gameState.statistics.highestLevel = Math.max(
          gameState.statistics.highestLevel,
          locationReward.newLevel
        );
        showMessage(
          `레벨 상승! Lv ${locationReward.oldLevel} -> Lv ${locationReward.newLevel}` +
          ` (레벨업 SP +${locationReward.levelUpSkillPointsGained})`,
          'success'
        );
      }
      if (locationReward.itemsFailed.length > 0) {
        const failedItems = locationReward.itemsFailed.map(itemId => getItemById(itemId)?.name ?? itemId);
        showMessage(
          `인벤토리가 가득 차 보상 일부를 획득하지 못했습니다: ${failedItems.join(', ')}`,
          'warning'
        );
      }

      hasProgressMessage = true;
    }
  }

  const act = currentLocation.act;
  const actLocations = getLocationsByAct(act);
  const isActComplete = actLocations.every(location =>
    gameState.statistics.bossesDefeated.includes(location.boss)
  );

  if (isActComplete) {
    const actFlag = `act-complete-${act}`;
    if (!gameState.flags[actFlag]) {
      gameState.flags[actFlag] = true;
      showMessage(`Act ${act} 클리어! 새로운 지역이 해금되었습니다.`, 'success');
      trackTelemetryEvent('act_completed', gameState, { act });
      hasProgressMessage = true;

      const actSummary = getActSummary(act);
      const actReward = applyActClearRewards(gameState.player, actSummary?.clearRewards);
      const unlockedLocations = actSummary?.clearRewards?.unlocks ?? [];
      let hasNewUnlock = false;

      if (actReward.rewardSkillPointsGained > 0) {
        showMessage(`Act 클리어 보너스: 스킬 포인트 +${actReward.rewardSkillPointsGained}`, 'success');
      }
      if (actReward.saveTokensAdded > 0) {
        gameState.statistics.itemsCollected += actReward.saveTokensAdded;
        showMessage(`Act 클리어 보너스: 세이브 토큰 +${actReward.saveTokensAdded}`, 'success');
        const questUpdates = updateQuestProgressOnCollect(gameState, 'save-token', actReward.saveTokensAdded);
        if (questUpdates.length > 0) {
          showQuestProgressUpdates(gameState, questUpdates);
        }
      }
      if (actReward.saveTokensFailed > 0) {
        showMessage(`인벤토리 가득 참: 세이브 토큰 ${actReward.saveTokensFailed}개 미획득`, 'warning');
      }
      if (unlockedLocations.length > 0) {
        const newlyUnlocked: string[] = [];
        for (const locationId of unlockedLocations) {
          if (!gameState.player.unlockedLocations.includes(locationId)) {
            gameState.player.unlockedLocations.push(locationId);
            gameState.statistics.locationsDiscovered++;
            newlyUnlocked.push(locationId);
          }
        }

        if (newlyUnlocked.length > 0) {
          showMessage(`Act 클리어 보너스: 신규 지역 해금 (${newlyUnlocked.join(', ')})`, 'success');
          hasNewUnlock = true;
        }
      }

      if (
        actReward.rewardSkillPointsGained > 0 ||
        actReward.saveTokensAdded > 0 ||
        actReward.saveTokensFailed > 0 ||
        hasNewUnlock
      ) {
        hasProgressMessage = true;
      }
    }
  }

  syncUnlockedConnections(gameState);

  if (hasProgressMessage) {
    await pressEnterToContinue('important');
  }
}

export async function runEncounter(gameState: GameState): Promise<'victory' | 'defeat' | 'escape'> {
  const monsters = getSampleMonsters();
  const locationId = gameState.player.currentLocation;
  ensureEndgameChallengeState(gameState);
  const challengeState = getEndgameChallengeState(gameState, locationId);
  const seasonalEvent = getActiveSeasonalEvent(gameState);
  const locationMonsters = getLocationMonsters(locationId);
  const currentLocation = getLocationById(locationId);
  const locationBossId =
    currentLocation && 'boss' in currentLocation
      ? currentLocation.boss
      : null;

  const playerLevel = gameState.player.level;
  const minLevel = Math.max(1, playerLevel - 1);
  const maxLevel = playerLevel + 2;

  let monster: Monster | null = null;

  const shouldSpawnLocationBoss = Boolean(
    locationBossId &&
    !gameState.statistics.bossesDefeated.includes(locationBossId) &&
    gameState.position.stepsTaken >= 10
  );

  if (shouldSpawnLocationBoss && locationBossId) {
    monster = monsters[locationBossId] ?? createFallbackMonster(locationBossId, maxLevel + 2, true);
  }

  if (locationMonsters.length > 0) {
    const locationMonsterIds = locationMonsters.map(normalizeId);
    const existingMonsters = locationMonsterIds
      .map(monsterId => monsters[monsterId])
      .filter((candidate): candidate is Monster => Boolean(candidate));

    if (existingMonsters.length > 0 && !monster) {
      monster = existingMonsters[Math.floor(Math.random() * existingMonsters.length)];
    } else if (!monster) {
      const fallbackMonsterId =
        locationMonsterIds[Math.floor(Math.random() * locationMonsterIds.length)];
      const fallbackLevel =
        Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
      monster = createFallbackMonster(fallbackMonsterId, fallbackLevel, false);
    }
  }

  if (!monster) {
    monster = getRandomMonster(monsters, minLevel, maxLevel);
  }

  if (monster && seasonalEvent) {
    monster = scaleMonsterForSeasonalEvent(monster, seasonalEvent);
  }

  if (monster && challengeState.active) {
    monster = scaleMonsterForEndgame(monster, challengeState);
  }

  if (!monster) {
    showMessage('아무것도 나타나지 않았습니다...', 'info');
    gameState.player.gold += 10;
    gameState.statistics.goldEarned += 10;
    showMessage('10 골드를 발견했습니다!', 'success');
    return 'victory';
  }

  clearScreen();
  await showTitle();

  if (seasonalEvent) {
    showMessage(
      `시즌 이벤트 활성: ${seasonalEvent.name} (${seasonalEvent.description})`,
      'info'
    );
  }

  if (challengeState.active) {
    showMessage(
      `심연 도전 T${challengeState.tier} 시작 ` +
      `(전투력 x${challengeState.statMultiplier.toFixed(2)}, ` +
      `골드 x${challengeState.goldMultiplier.toFixed(2)}, ` +
      `EXP x${challengeState.expMultiplier.toFixed(2)})`,
      'warning'
    );
    if (challengeState.modifier) {
      showMessage(
        `활성 모디파이어: ${challengeState.modifier.name} - ${challengeState.modifier.description}`,
        'info'
      );
    }
  }

  showBox(
    `${monster.name}이(가) 나타났다!\n\n${monster.description}`,
    '전투!'
  );

  await pressEnterToContinue('important');

  const inventorySnapshotBeforeBattle = new Map<string, number>();
  for (const itemId of gameState.player.inventory) {
    inventorySnapshotBeforeBattle.set(
      itemId,
      (inventorySnapshotBeforeBattle.get(itemId) ?? 0) + 1
    );
  }
  const battleResult = await runBattle(gameState.player, monster);

  if (battleResult.won) {
    gameState.statistics.enemiesDefeated[monster.id] =
      (gameState.statistics.enemiesDefeated[monster.id] || 0) + 1;
    gameState.statistics.highestLevel = Math.max(
      gameState.statistics.highestLevel,
      gameState.player.level
    );

    if (battleResult.rewards) {
      gameState.statistics.goldEarned += battleResult.rewards.gold;
    }

    const questUpdates: QuestProgressUpdate[] = [];
    let hasChallengeProgressMessage = false;
    questUpdates.push(...updateQuestProgressOnKill(gameState, monster.id, 1));

    if (battleResult.rewards?.items.length) {
      let collectedRewardItems = 0;
      const uniqueRewardItems = Array.from(new Set(battleResult.rewards.items));
      for (const itemId of uniqueRewardItems) {
        const before = inventorySnapshotBeforeBattle.get(itemId) ?? 0;
        const after = countItemInInventory(gameState.player, itemId);
        const gained = Math.max(0, after - before);
        if (gained > 0) {
          collectedRewardItems += gained;
          questUpdates.push(...updateQuestProgressOnCollect(gameState, itemId, gained));
        }
      }
      gameState.statistics.itemsCollected += collectedRewardItems;
    }

    if (challengeState.active) {
      const challengeProgress = applyEndgameChallengeVictory(gameState, challengeState);
      if (challengeProgress) {
        trackTelemetryEvent('endgame_challenge_cleared', gameState, {
          tier: challengeProgress.newTier,
          clears: challengeProgress.clears,
          streak: challengeProgress.streak,
          modifierId: challengeState.modifier?.id ?? 'none',
          seasonalEventId: seasonalEvent?.id ?? 'none'
        });
        showMessage(
          `심연 도전 진행: ${challengeProgress.streak}연승 / 누적 ${challengeProgress.clears}회`,
          'info'
        );
        hasChallengeProgressMessage = true;

        if (challengeProgress.tierIncreased) {
          showMessage(
            `심연 도전 Tier 상승! T${challengeProgress.previousTier} -> T${challengeProgress.newTier}`,
            'success'
          );
        }

        if (challengeProgress.modifierBonusTriggered && challengeState.modifier) {
          showMessage(
            `모디파이어 보너스 발동! (${challengeState.modifier.name}) 추가 보상 지급`,
            'success'
          );
        }

        if (challengeProgress.grantedItems.length > 0) {
          gameState.statistics.itemsCollected += challengeProgress.grantedItems.length;
          const grantedItemNames = challengeProgress.grantedItems
            .map(itemId => getItemById(itemId)?.name ?? itemId);
          showMessage(`심연 도전 추가 보상: ${grantedItemNames.join(', ')}`, 'success');

          const itemCounts = new Map<string, number>();
          for (const itemId of challengeProgress.grantedItems) {
            itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
          }
          for (const [itemId, count] of itemCounts) {
            questUpdates.push(...updateQuestProgressOnCollect(gameState, itemId, count));
          }
        }

        if (challengeProgress.failedItems.length > 0) {
          const failedItemNames = challengeProgress.failedItems
            .map(itemId => getItemById(itemId)?.name ?? itemId);
          showMessage(
            `인벤토리가 가득 차 추가 보상을 획득하지 못했습니다: ${failedItemNames.join(', ')}`,
            'warning'
          );
        }
      }
    }

    const hasQuestProgress = questUpdates.length > 0;
    if (hasQuestProgress) {
      showQuestProgressUpdates(gameState, questUpdates);
    }

    if (locationBossId && monster.isBoss && monster.id === locationBossId) {
      await applyBossProgress(gameState, locationBossId);
    } else if (hasQuestProgress || hasChallengeProgressMessage) {
      await pressEnterToContinue('important');
    }

    return 'victory';
  } else if (battleResult.escaped) {
    const previousStreak = resetEndgameChallengeStreak(gameState, challengeState);
    if (previousStreak > 0) {
      showMessage(`심연 도전 연승 종료 (${previousStreak}연승)`, 'warning');
      await pressEnterToContinue('important');
    }
    return 'escape';
  } else {
    const previousStreak = resetEndgameChallengeStreak(gameState, challengeState);
    if (previousStreak > 0) {
      showMessage(`심연 도전 연승 종료 (${previousStreak}연승)`, 'warning');
      await pressEnterToContinue('important');
    }
    return 'defeat';
  }
}
