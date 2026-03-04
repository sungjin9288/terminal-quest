import {
  GameState,
  Monster
} from '../types/index.js';

const ENDGAME_TIER_CLEAR_STEP = 3;
const ENDGAME_MAX_TIER = 10;
const ENDGAME_STREAK_CAP = 20;

export const FINAL_BOSS_ID = 'corruption-core';
export const ENDGAME_CHALLENGE_LOCATION_ID = 'corruption-space';
const ENDGAME_REWARD_ITEM_ID = 'save-token';

export interface EndgameChallengeModifier {
  id: string;
  name: string;
  description: string;
  statMultiplier: number;
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  magicPowerMultiplier: number;
  magicDefenseMultiplier: number;
  speedMultiplier: number;
  critChanceBonus: number;
  rewardGoldMultiplier: number;
  rewardExpMultiplier: number;
  dropChanceBonus: number;
  bonusRewardEveryClears: number;
}

const ENDGAME_MODIFIER_ROTATION: readonly EndgameChallengeModifier[] = [
  {
    id: 'berserker-protocol',
    name: '광폭 프로토콜',
    description: '공격과 속도가 상승하지만 방어가 낮아집니다.',
    statMultiplier: 1.04,
    hpMultiplier: 1.0,
    attackMultiplier: 1.2,
    defenseMultiplier: 0.9,
    magicPowerMultiplier: 1.14,
    magicDefenseMultiplier: 0.92,
    speedMultiplier: 1.16,
    critChanceBonus: 6,
    rewardGoldMultiplier: 1.18,
    rewardExpMultiplier: 1.05,
    dropChanceBonus: 0.03,
    bonusRewardEveryClears: 5
  },
  {
    id: 'iron-bulwark',
    name: '철벽 격리막',
    description: '체력과 방어가 상승해 장기전이 되지만 보상이 증가합니다.',
    statMultiplier: 1.06,
    hpMultiplier: 1.26,
    attackMultiplier: 1.03,
    defenseMultiplier: 1.24,
    magicPowerMultiplier: 1.04,
    magicDefenseMultiplier: 1.2,
    speedMultiplier: 0.9,
    critChanceBonus: 2,
    rewardGoldMultiplier: 1.22,
    rewardExpMultiplier: 1.08,
    dropChanceBonus: 0.03,
    bonusRewardEveryClears: 6
  },
  {
    id: 'arcane-overclock',
    name: '아케인 오버클럭',
    description: '마법 화력이 폭증하고 치명타 위험이 증가합니다.',
    statMultiplier: 1.05,
    hpMultiplier: 0.95,
    attackMultiplier: 1.02,
    defenseMultiplier: 0.97,
    magicPowerMultiplier: 1.32,
    magicDefenseMultiplier: 1.14,
    speedMultiplier: 1.08,
    critChanceBonus: 10,
    rewardGoldMultiplier: 1.24,
    rewardExpMultiplier: 1.12,
    dropChanceBonus: 0.05,
    bonusRewardEveryClears: 4
  },
  {
    id: 'volatile-jackpot',
    name: '변동 잭팟',
    description: '적이 매우 위험해지지만 추가 보상 기대치가 크게 오릅니다.',
    statMultiplier: 1.08,
    hpMultiplier: 0.9,
    attackMultiplier: 1.16,
    defenseMultiplier: 0.86,
    magicPowerMultiplier: 1.12,
    magicDefenseMultiplier: 0.9,
    speedMultiplier: 1.12,
    critChanceBonus: 8,
    rewardGoldMultiplier: 1.34,
    rewardExpMultiplier: 1.06,
    dropChanceBonus: 0.08,
    bonusRewardEveryClears: 7
  }
];

export interface EndgameChallengeState {
  unlocked: boolean;
  active: boolean;
  tier: number;
  clears: number;
  streak: number;
  bestStreak: number;
  statMultiplier: number;
  goldMultiplier: number;
  expMultiplier: number;
  dropChanceBonus: number;
  modifier: EndgameChallengeModifier | null;
}

export interface EndgameChallengeProgress {
  tierIncreased: boolean;
  previousTier: number;
  newTier: number;
  clears: number;
  streak: number;
  bestStreak: number;
  grantedItems: string[];
  failedItems: string[];
  modifierBonusTriggered: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function calculateTier(clears: number): number {
  return clamp(
    Math.floor(clears / ENDGAME_TIER_CLEAR_STEP) + 1,
    1,
    ENDGAME_MAX_TIER
  );
}

function calculateBaseStatMultiplier(tier: number, streak: number): number {
  const streakBonus = Math.min(streak, ENDGAME_STREAK_CAP) * 0.01;
  return 1 + tier * 0.12 + streakBonus;
}

function calculateBaseGoldMultiplier(tier: number, streak: number): number {
  const streakBonus = Math.min(streak, ENDGAME_STREAK_CAP) * 0.02;
  return 1 + tier * 0.22 + streakBonus;
}

function calculateModifierRotationIndex(tier: number, clears: number, streak: number): number {
  const rotationSeed = tier * 7 + clears * 3 + streak;
  return rotationSeed % ENDGAME_MODIFIER_ROTATION.length;
}

function getEndgameModifierForProgress(
  tier: number,
  clears: number,
  streak: number
): EndgameChallengeModifier {
  const modifierIndex = calculateModifierRotationIndex(tier, clears, streak);
  return ENDGAME_MODIFIER_ROTATION[modifierIndex];
}

export function listEndgameChallengeModifiers(): readonly EndgameChallengeModifier[] {
  return ENDGAME_MODIFIER_ROTATION;
}

export function ensureEndgameChallengeState(gameState: GameState): void {
  const statistics = gameState.statistics;
  const unlockedFromBossDefeat = statistics.bossesDefeated.includes(FINAL_BOSS_ID);
  const unlocked =
    typeof statistics.endgameChallengeUnlocked === 'boolean'
      ? statistics.endgameChallengeUnlocked || unlockedFromBossDefeat
      : unlockedFromBossDefeat;

  const clears = sanitizeNonNegativeInt(statistics.endgameChallengeClears);
  const streak = sanitizeNonNegativeInt(statistics.endgameChallengeCurrentStreak);
  const bestStreak = Math.max(
    sanitizeNonNegativeInt(statistics.endgameChallengeBestStreak),
    streak
  );

  statistics.endgameChallengeUnlocked = unlocked;
  statistics.endgameChallengeClears = clears;
  statistics.endgameChallengeCurrentStreak = streak;
  statistics.endgameChallengeBestStreak = bestStreak;
  statistics.endgameChallengeTier = unlocked ? calculateTier(clears) : 0;
}

export function unlockEndgameChallenge(gameState: GameState): boolean {
  ensureEndgameChallengeState(gameState);

  if (gameState.statistics.endgameChallengeUnlocked) {
    return false;
  }

  gameState.statistics.endgameChallengeUnlocked = true;
  const clears = sanitizeNonNegativeInt(gameState.statistics.endgameChallengeClears);
  gameState.statistics.endgameChallengeTier = calculateTier(clears);

  return true;
}

export function getEndgameChallengeState(
  gameState: GameState,
  locationId: string
): EndgameChallengeState {
  ensureEndgameChallengeState(gameState);

  const statistics = gameState.statistics;
  const unlocked = statistics.endgameChallengeUnlocked === true;
  const active = unlocked && locationId === ENDGAME_CHALLENGE_LOCATION_ID;
  const tier = unlocked
    ? Math.max(1, sanitizeNonNegativeInt(statistics.endgameChallengeTier))
    : 0;
  const clears = sanitizeNonNegativeInt(statistics.endgameChallengeClears);
  const streak = sanitizeNonNegativeInt(statistics.endgameChallengeCurrentStreak);
  const bestStreak = sanitizeNonNegativeInt(statistics.endgameChallengeBestStreak);
  const modifier = active ? getEndgameModifierForProgress(tier, clears, streak) : null;
  const baseStatMultiplier = active ? calculateBaseStatMultiplier(tier, streak) : 1;
  const baseGoldMultiplier = active ? calculateBaseGoldMultiplier(tier, streak) : 1;

  return {
    unlocked,
    active,
    tier,
    clears,
    streak,
    bestStreak,
    statMultiplier: baseStatMultiplier * (modifier?.statMultiplier ?? 1),
    goldMultiplier: baseGoldMultiplier * (modifier?.rewardGoldMultiplier ?? 1),
    expMultiplier: modifier?.rewardExpMultiplier ?? 1,
    dropChanceBonus: modifier?.dropChanceBonus ?? 0,
    modifier
  };
}

export function scaleMonsterForEndgame(
  monster: Monster,
  challengeState: EndgameChallengeState
): Monster {
  if (!challengeState.active) {
    return monster;
  }

  const modifier = challengeState.modifier;
  const levelBoost = challengeState.tier + Math.floor(challengeState.streak / 2);
  const statMultiplier = challengeState.statMultiplier;
  const hpMultiplier = modifier?.hpMultiplier ?? 1;
  const speedMultiplier =
    (1 + (statMultiplier - 1) * 0.65) * (modifier?.speedMultiplier ?? 1);

  const scaledMaxHp = Math.max(
    1,
    Math.floor(monster.stats.maxHp * statMultiplier * hpMultiplier)
  );
  const scaledMaxMp = Math.max(
    1,
    Math.floor(monster.stats.maxMp * statMultiplier * hpMultiplier)
  );
  const hpRatio = monster.stats.maxHp > 0 ? monster.stats.hp / monster.stats.maxHp : 1;
  const mpRatio = monster.stats.maxMp > 0 ? monster.stats.mp / monster.stats.maxMp : 1;

  const scaledMinGold = Math.max(
    monster.dropTable.minGold + challengeState.tier * 10,
    Math.floor(monster.dropTable.minGold * challengeState.goldMultiplier)
  );
  const scaledMaxGold = Math.max(
    scaledMinGold,
    Math.floor(monster.dropTable.maxGold * challengeState.goldMultiplier)
  );

  const possibleChanceBonus = Math.min(
    0.35,
    challengeState.tier * 0.02 + challengeState.dropChanceBonus
  );
  const rareChanceBonus = Math.min(
    0.25,
    challengeState.tier * 0.015 + challengeState.dropChanceBonus * 0.8
  );
  const critChanceBonus = Math.min(
    24,
    challengeState.tier * 2 +
    Math.floor(challengeState.streak / 3) +
    (modifier?.critChanceBonus ?? 0)
  );

  return {
    ...monster,
    name: `[심연 T${challengeState.tier}] ${monster.name}`,
    level: monster.level + levelBoost,
    stats: {
      ...monster.stats,
      hp: Math.max(1, Math.min(scaledMaxHp, Math.floor(scaledMaxHp * hpRatio))),
      maxHp: scaledMaxHp,
      mp: Math.max(1, Math.min(scaledMaxMp, Math.floor(scaledMaxMp * mpRatio))),
      maxMp: scaledMaxMp,
      attack: Math.max(
        1,
        Math.floor(
          monster.stats.attack *
          statMultiplier *
          (modifier?.attackMultiplier ?? 1)
        )
      ),
      defense: Math.max(
        1,
        Math.floor(
          monster.stats.defense *
          statMultiplier *
          (modifier?.defenseMultiplier ?? 1)
        )
      ),
      magicPower: Math.max(
        1,
        Math.floor(
          monster.stats.magicPower *
          statMultiplier *
          (modifier?.magicPowerMultiplier ?? 1)
        )
      ),
      magicDefense: Math.max(
        1,
        Math.floor(
          monster.stats.magicDefense *
          statMultiplier *
          (modifier?.magicDefenseMultiplier ?? 1)
        )
      ),
      speed: Math.max(1, Math.floor(monster.stats.speed * speedMultiplier)),
      critChance: clamp(monster.stats.critChance + critChanceBonus, 0, 100),
      critDamage: monster.stats.critDamage
    },
    expReward: Math.max(
      monster.expReward,
      Math.floor(
        monster.expReward *
        (1 + challengeState.tier * 0.14) *
        challengeState.expMultiplier
      )
    ),
    dropTable: {
      ...monster.dropTable,
      possible: monster.dropTable.possible.map(drop => ({
        ...drop,
        chance: clamp(drop.chance + possibleChanceBonus, 0, 1)
      })),
      rare: monster.dropTable.rare.map(drop => ({
        ...drop,
        chance: clamp(drop.chance + rareChanceBonus, 0, 1)
      })),
      minGold: scaledMinGold,
      maxGold: scaledMaxGold
    }
  };
}

export function applyEndgameChallengeVictory(
  gameState: GameState,
  challengeState: EndgameChallengeState
): EndgameChallengeProgress | null {
  if (!challengeState.active) {
    return null;
  }

  ensureEndgameChallengeState(gameState);

  const statistics = gameState.statistics;
  const previousTier = Math.max(1, sanitizeNonNegativeInt(statistics.endgameChallengeTier));
  const clears = sanitizeNonNegativeInt(statistics.endgameChallengeClears) + 1;
  const streak = sanitizeNonNegativeInt(statistics.endgameChallengeCurrentStreak) + 1;
  const bestStreak = Math.max(
    sanitizeNonNegativeInt(statistics.endgameChallengeBestStreak),
    streak
  );
  const newTier = calculateTier(clears);

  statistics.endgameChallengeClears = clears;
  statistics.endgameChallengeCurrentStreak = streak;
  statistics.endgameChallengeBestStreak = bestStreak;
  statistics.endgameChallengeTier = newTier;

  let bonusRewardCount = 0;
  if (clears % 2 === 0) {
    bonusRewardCount += 1;
  }
  if (newTier > previousTier) {
    bonusRewardCount += 1;
  }

  let modifierBonusTriggered = false;
  const bonusCycle = challengeState.modifier?.bonusRewardEveryClears ?? 0;
  if (bonusCycle > 0 && clears % bonusCycle === 0) {
    bonusRewardCount += 1;
    modifierBonusTriggered = true;
  }

  const grantedItems: string[] = [];
  const failedItems: string[] = [];

  for (let index = 0; index < bonusRewardCount; index++) {
    if (gameState.player.inventory.length < gameState.player.maxInventorySize) {
      gameState.player.inventory.push(ENDGAME_REWARD_ITEM_ID);
      grantedItems.push(ENDGAME_REWARD_ITEM_ID);
    } else {
      failedItems.push(ENDGAME_REWARD_ITEM_ID);
    }
  }

  return {
    tierIncreased: newTier > previousTier,
    previousTier,
    newTier,
    clears,
    streak,
    bestStreak,
    grantedItems,
    failedItems,
    modifierBonusTriggered
  };
}

export function resetEndgameChallengeStreak(
  gameState: GameState,
  challengeState: EndgameChallengeState
): number {
  if (!challengeState.active) {
    return 0;
  }

  ensureEndgameChallengeState(gameState);

  const previousStreak = sanitizeNonNegativeInt(gameState.statistics.endgameChallengeCurrentStreak);
  gameState.statistics.endgameChallengeCurrentStreak = 0;

  return previousStreak;
}
