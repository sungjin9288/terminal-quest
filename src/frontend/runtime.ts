import {
  CharacterClass,
  GameMode,
  GameState,
  Monster,
  MonsterInstance,
  Quest
} from '../types/index.js';
import { SaveType, type SaveSlotMetadata } from '../types/save.js';
import { type AchievementTrackingMode } from '../types/achievement.js';
import { type AiDirectorMode, type AiNarrativeMode } from '../types/ai.js';
import { createNewGameState } from '../systems/newGameState.js';
import {
  clearAchievementTracking,
  closeRunSummary,
  ensureAchievementPerkState,
  ensureAchievementTrackingState,
  evaluateAchievements,
  formatAchievementRewardMessage,
  formatAchievementTrackingMessage,
  formatAchievementUnlockMessage,
  getAchievementPerkSummary,
  getAchievementById,
  getAchievementSummary,
  getTrackedAchievement,
  recordRunBossDefeat,
  recordRunDamageTaken,
  recordRunGoldEarned,
  recordRunGoldSpent,
  recordRunItemsCollected,
  recordRunQuestCompleted,
  resetRunSummary,
  setAchievementTrackingMode,
  syncAchievementTrackingState,
  trackAchievement
} from '../systems/achievements.js';
import { ensureAiState, syncAiState } from '../systems/aiDirector.js';
import { recordAiMoment } from '../systems/aiMemory.js';
import {
  buildAiNarrativeCue,
  buildAiNarrativeVoiceLine
} from '../systems/aiNarrator.js';
import {
  formatFirstClearRewardPreview,
  getAdventureFocusSummary,
  getLocationBossProgress,
  getRecommendedTravelDestination
} from '../systems/adventureFocus.js';
import {
  getActiveQuests,
  getAvailableQuests,
  getCompletedQuests,
  getCompletableQuests,
  acceptQuest,
  completeQuest,
  ensureQuestState,
  updateQuestProgressOnCollect,
  updateQuestProgressOnExplore,
  updateQuestProgressOnKill,
  updateQuestProgressOnTalk,
  type QuestProgressUpdate
} from '../systems/quest.js';
import {
  getQuestCategoryPresentation,
  getQuestEstimatedTimeLabel,
  getQuestSessionLabel,
  groupQuestsByCategory
} from '../systems/questPresentation.js';
import { getQuestTrackerSummary } from '../systems/questTracker.js';
import { runDungeonEvent } from '../systems/dungeonEvents.js';
import {
  getActSummary,
  getConnectedLocations,
  getLocationById,
  getLocationDisplayName,
  getLocationMonsters,
  getLocationsByAct,
  isLocationUnlocked,
  isTownLocation
} from '../data/locations.js';
import { getItemById } from '../data/items.js';
import { getSampleMonsters } from '../data/monsters.js';
import { canAffordCost, getInnRestCost } from '../systems/economy.js';
import {
  getShop,
  getShopInventory,
  getUnlockedShopTiersForShop,
  updateAffordability,
  buyItem
} from '../systems/shop.js';
import {
  calculateRewards,
  createMonsterInstance,
  determineTurnOrder,
  monsterAI,
  monsterAttack,
  playerAttack,
  playerDefend,
  attemptEscape
} from '../systems/combat.js';
import { getAvailableSkills, useSkill } from '../systems/skills.js';
import {
  getOrganizedInventory,
  useItem as useInventoryItem
} from '../systems/inventory.js';
import { calculateMonsterExp, gainExp, getLevelProgress } from '../systems/leveling.js';
import {
  applyActClearRewards,
  applyLocationFirstClearRewards
} from '../systems/locationRewards.js';
import {
  canSaveAtLocation,
  getSaveTokenCount,
  useSaveToken
} from '../systems/savePoint.js';
import {
  getSaveDirectoryPath,
  listSaves,
  loadGame as loadSaveGame,
  saveGame as writeSaveGame
} from '../systems/save.js';
import { migrateLoadedGameState } from '../systems/gameStateMigration.js';
import { refreshSeasonalEventState } from '../systems/seasonalEvents.js';
import {
  getPresentationDisplayName,
  getPresentationItemCopy,
  getPresentationLocationDescription,
  getPresentationShopGreeting,
  getPresentationSkillCopy
} from './presentationText.js';
import { trackTelemetryEvent } from '../systems/telemetry.js';
import {
  type FeedVoiceLine,
  getActClearVoiceLine,
  getBoardVisitVoiceLine,
  getBattleStartVoiceLine,
  getBattleVictoryVoiceLine,
  getDefeatVoiceLine,
  getEnemyInitiativeVoiceLine,
  getInnRestVoiceLine,
  getMarketVisitVoiceLine,
  getNewGameVoiceLine,
  getPurchaseVoiceLine,
  getQuestAcceptVoiceLine,
  getQuestCompleteVoiceLine,
  getTravelArrivalVoiceLine
} from './feedVoices.js';

export type FrontendScene = 'landing' | 'town' | 'dungeon' | 'combat';
export type FeedTone = 'info' | 'success' | 'warning' | 'error';
export type FeedCategory = 'combat' | 'quest' | 'reward' | 'travel' | 'hub' | 'system';

export interface FeedEntry {
  id: number;
  tone: FeedTone;
  category: FeedCategory;
  speaker?: string;
  text: string;
  timestamp: number;
}

export interface FrontendRuntimeDependencies {
  random?: () => number;
  now?: () => number;
}

export interface FrontendBattleState {
  monster: MonsterInstance;
  monsterId: string;
  monsterName: string;
  isBoss: boolean;
  turnNumber: number;
  playerTurn: boolean;
  playerDefending: boolean;
}

export interface FrontendSession {
  gameState: GameState | null;
  battle: FrontendBattleState | null;
  feed: FeedEntry[];
  nextFeedId: number;
  random: () => number;
  now: () => number;
  lastShownAiIntentId: string | null;
}

export type FrontendAction =
  | {
      type: 'new-game';
      name: string;
      characterClass: CharacterClass;
      gameMode: GameMode;
    }
  | {
      type: 'load-game';
      slotNumber: number;
      loadIntent?: 'achievement-chase';
      loadAchievementTitle?: string;
      loadAchievementProgress?: string;
    }
  | {
      type: 'save-game';
      slotNumber: number;
    }
  | {
      type: 'set-achievement-tracking-mode';
      mode: AchievementTrackingMode;
    }
  | {
      type: 'track-achievement';
      achievementId: string;
      mode?: AchievementTrackingMode;
    }
  | {
      type: 'clear-achievement-tracking';
    }
  | {
      type: 'visit-board';
    }
  | {
      type: 'visit-market';
    }
  | {
      type: 'accept-quest';
      questId: string;
    }
  | {
      type: 'complete-quest';
      questId: string;
    }
  | {
      type: 'travel';
      destinationId: string;
    }
  | {
      type: 'town-explore';
    }
  | {
      type: 'inn-rest';
    }
  | {
      type: 'buy-item';
      shopId: string;
      itemId: string;
    }
  | {
      type: 'dungeon-explore';
    }
  | {
      type: 'dungeon-rest';
    }
  | {
      type: 'battle-attack';
    }
  | {
      type: 'battle-defend';
    }
  | {
      type: 'battle-escape';
    }
  | {
      type: 'battle-skill';
      skillId: string;
    }
  | {
      type: 'battle-item';
      itemId: string;
    }
  | {
      type: 'ai-feedback';
      feedback: 'follow' | 'dismiss';
      intentId?: string;
      source?: string;
    };

interface SerializedQuest {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  status: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  estimatedTimeLabel: string;
  sessionLabel: string;
  narrative: Quest['narrative'];
  objectives: Array<{
    description: string;
    currentAmount: number;
    requiredAmount: number;
    completed: boolean;
  }>;
  rewards: {
    exp: number;
    gold: number;
    items: string[];
  };
}

export interface FrontendSnapshot {
  scene: FrontendScene;
  hasGame: boolean;
  activeSaveDirectory: string;
  saves: SaveSlotMetadata[];
  feed: FeedEntry[];
  player?: {
    name: string;
    class: CharacterClass;
    level: number;
    experience: number;
    experienceToNextLevel: number;
    experienceRemaining: number;
    experienceProgressPercent: number;
    gold: number;
    skillPoints: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    inventoryCount: number;
    saveTokenCount: number;
    achievementCount: number;
    achievementTotal: number;
  };
  location?: {
    id: string;
    name: string;
    description: string;
    isTown: boolean;
    recommendedDestinationId: string | null;
    bossProgress?: {
      text: string;
      bossName: string;
      current: number;
      target: number;
      remaining: number;
      ready: boolean;
    };
    firstClearRewardPreview: string | null;
  };
  focus?: {
    title: string;
    tone: string;
    lines: string[];
  } | null;
  tracker?: {
    questName: string;
    status: string;
    objectiveDescription: string;
    progress: string;
    currentAmount: number;
    requiredAmount: number;
    progressPercent: number;
  } | null;
  questBoard?: {
    available: Array<{
      category: string;
      label: string;
      icon: string;
      quests: SerializedQuest[];
    }>;
    active: Array<{
      category: string;
      label: string;
      icon: string;
      quests: SerializedQuest[];
    }>;
    completable: SerializedQuest[];
    completedCount: number;
  };
  travel?: {
    currentLocationId: string;
    destinations: Array<{
      id: string;
      name: string;
      act?: number;
      unlocked: boolean;
      cleared: boolean;
      recommended: boolean;
      connected: boolean;
      description: string;
      firstClearRewardPreview: string | null;
    }>;
  };
  shops?: Array<{
    id: string;
    name: string;
    ownerName: string;
    icon: string;
    greeting: string;
    inventory: Array<{
      id: string;
      name: string;
      icon: string;
      rarity: string;
      level: number;
      price: number;
      canAfford: boolean;
      meetsLevelReq: boolean;
      description: string;
    }>;
  }>;
  inventory?: Array<{
    itemId: string;
    name: string;
    icon: string;
    quantity: number;
    type: string;
  }>;
  battle?: {
    monsterName: string;
    monsterIcon: string;
    monsterLevel: number;
    monsterHp: number;
    monsterMaxHp: number;
    isBoss: boolean;
    turnNumber: number;
    playerTurn: boolean;
    skills: Array<{
      id: string;
      name: string;
      mpCost: number;
      description: string;
      usable: boolean;
    }>;
    items: Array<{
      itemId: string;
      name: string;
      icon: string;
      quantity: number;
    }>;
  } | null;
  saveStatus?: {
    canSave: boolean;
    reason: string;
    requiresToken: boolean;
  };
  achievements?: {
    unlockedCount: number;
    totalCount: number;
    latestUnlocked: {
      id: string;
      title: string;
      description: string;
      accent: string;
      unlockedAt?: number;
    } | null;
    entries: Array<{
      id: string;
      title: string;
      description: string;
      rewardPreview?: string;
      category: string;
      accent: string;
      unlocked: boolean;
      unlockedAt?: number;
      current: number;
      target: number;
      progressPercent: number;
    }>;
  };
  achievementTracking?: {
    mode: AchievementTrackingMode;
    current: {
      id: string;
      title: string;
      description: string;
      category: string;
      accent: string;
      current: number;
      target: number;
      progressPercent: number;
    } | null;
    history: Array<{
      timestamp: number;
      type: string;
      message: string;
      achievementId?: string;
      achievementTitle?: string;
      progress?: string;
      mode?: AchievementTrackingMode;
      cause?: string;
    }>;
  };
  achievementPerks?: {
    summary: string[];
    inventorySizeBonus: number;
    shopDiscountPercent: number;
    unlockedShopTiers: Array<{
      shopId: string;
      tierKey: string;
      label: string;
    }>;
  };
  ai?: {
    directorMode: AiDirectorMode;
    narrativeMode: AiNarrativeMode;
    currentIntent: {
      id: string;
      kind: string;
      title: string;
      reason: string;
      tone: string;
      confidence: number;
      recommendedAction: string | null;
      recommendedLocationId: string | null;
      lines: string[];
    } | null;
    narrativeCue: {
      speaker: string;
      title: string;
      summary: string;
      beats: string[];
      tone: string;
    } | null;
    recentMoments: Array<{
      type: string;
      label: string;
      timestamp: number;
    }>;
  };
}

const MAX_FEED_ENTRIES = 40;

function createEmptySession(dependencies: FrontendRuntimeDependencies = {}): FrontendSession {
  return {
    gameState: null,
    battle: null,
    feed: [],
    nextFeedId: 1,
    random: dependencies.random ?? Math.random,
    now: dependencies.now ?? Date.now,
    lastShownAiIntentId: null
  };
}

export function createFrontendSession(
  dependencies: FrontendRuntimeDependencies = {}
): FrontendSession {
  return createEmptySession(dependencies);
}

function getScene(session: FrontendSession): FrontendScene {
  if (!session.gameState) {
    return 'landing';
  }
  if (session.battle) {
    return 'combat';
  }
  return isTownLocation(session.gameState.player.currentLocation) ? 'town' : 'dungeon';
}

function appendFeed(
  session: FrontendSession,
  tone: FeedTone,
  text: string,
  speaker?: string,
  category: FeedCategory = 'system'
): void {
  session.feed.unshift({
    id: session.nextFeedId,
    tone,
    category,
    speaker,
    text,
    timestamp: session.now()
  });
  session.nextFeedId += 1;
  if (session.feed.length > MAX_FEED_ENTRIES) {
    session.feed.length = MAX_FEED_ENTRIES;
  }
}

function appendVoiceFeed(
  session: FrontendSession,
  tone: FeedTone,
  line: FeedVoiceLine | null,
  category: FeedCategory = 'system'
): void {
  if (!line) {
    return;
  }

  appendFeed(session, tone, line.text, line.speaker, category);
}

function appendAiNarrativeVoiceFeed(
  session: FrontendSession,
  tone: FeedTone,
  event: {
    type: import('../types/ai.js').AiMomentType;
    label: string;
  },
  category: FeedCategory = 'system',
  options: { record?: boolean } = {}
): void {
  if (!session.gameState) {
    return;
  }

  if (options.record !== false) {
    recordAiMoment(session.gameState, {
      ...event,
      timestamp: session.now()
    });
  }

  const line = buildAiNarrativeVoiceLine(session.gameState, event, session.now());
  appendVoiceFeed(session, tone, line, category);
}

function applyAchievementUnlocks(session: FrontendSession): void {
  if (!session.gameState) {
    return;
  }

  const achievementResult = evaluateAchievements(session.gameState, session.now());
  for (const achievement of achievementResult.newlyUnlocked) {
    recordAiMoment(session.gameState, {
      type: 'achievement-unlocked',
      label: `업적 해금: ${achievement.title}`,
      timestamp: session.now()
    });
    appendFeed(session, 'success', formatAchievementUnlockMessage(achievement), undefined, 'reward');
  }
  for (const rewardGrant of achievementResult.rewardGrants) {
    appendFeed(session, 'success', formatAchievementRewardMessage(rewardGrant), undefined, 'reward');
  }

  if (achievementResult.newlyUnlocked.length > 0) {
    const [firstAchievement] = achievementResult.newlyUnlocked;
    const label = achievementResult.newlyUnlocked.length > 1
      ? `업적 해금: ${firstAchievement.title} 외 ${achievementResult.newlyUnlocked.length - 1}개`
      : `업적 해금: ${firstAchievement.title}`;
    appendAiNarrativeVoiceFeed(
      session,
      'success',
      {
        type: 'achievement-unlocked',
        label
      },
      'reward',
      { record: false }
    );
  }
}

function getAchievementTrackingCause(
  action: FrontendAction
): string | undefined {
  switch (action.type) {
    case 'set-achievement-tracking-mode':
      return '추적 설정';
    case 'track-achievement':
      return '업적 선택';
    case 'clear-achievement-tracking':
      return '추적 해제';
    case 'complete-quest':
      return '퀘스트 정산';
    case 'buy-item':
      return '상점 구매';
    case 'inn-rest':
      return '여관 휴식';
    case 'travel':
      return '이동';
    case 'town-explore':
    case 'dungeon-explore':
      return '탐색';
    case 'battle-attack':
    case 'battle-defend':
    case 'battle-escape':
    case 'battle-skill':
    case 'battle-item':
      return '전투';
    default:
      return undefined;
  }
}

function appendAchievementTrackingFeed(
  session: FrontendSession,
  action: FrontendAction
): void {
  if (!session.gameState) {
    return;
  }

  const now = session.now();
  const cause = getAchievementTrackingCause(action);
  const trackingResult = (() => {
    switch (action.type) {
      case 'set-achievement-tracking-mode':
        return setAchievementTrackingMode(session.gameState, action.mode, {
          now,
          recordHistory: true,
          cause
        });
      case 'track-achievement':
        return trackAchievement(session.gameState, action.achievementId, {
          mode: action.mode ?? 'pinned',
          now,
          recordHistory: true,
          cause
        });
      case 'clear-achievement-tracking':
        return clearAchievementTracking(session.gameState, {
          now,
          recordHistory: true,
          cause
        });
      case 'load-game':
        return syncAchievementTrackingState(session.gameState, {
          now,
          recordHistory: false
        });
      case 'save-game':
        return {
          previous: getAchievementById(session.gameState, ensureAchievementTrackingState(session.gameState).achievementId),
          current: getTrackedAchievement(session.gameState),
          history: []
        };
      default:
        return syncAchievementTrackingState(session.gameState, {
          now,
          recordHistory: true,
          cause
        });
    }
  })();

  for (const entry of trackingResult.history) {
    const tone: FeedTone = entry.type === 'completed'
      ? 'success'
      : entry.type === 'cleared'
        ? 'warning'
        : 'info';
    const category: FeedCategory = entry.type === 'completed' || entry.type === 'switched' || entry.type === 'tracked'
      ? 'reward'
      : 'system';

    appendFeed(session, tone, formatAchievementTrackingMessage(entry), undefined, category);
  }
}

function getPresentedItemName(itemId: string): string {
  const item = getItemById(itemId);
  if (!item) {
    return itemId;
  }

  return getPresentationItemCopy({
    itemId: item.id,
    rawName: item.name,
    itemType: item.type,
    rarity: item.rarity,
    level: item.requiredLevel,
    fallbackDescription: item.description
  }).name;
}

function buildShopRewardOptions(gameState: GameState, shopId: string): {
  discountPercent: number;
  extraUnlockedTiers: string[];
} {
  const perkState = ensureAchievementPerkState(gameState);
  return {
    discountPercent: perkState.shopDiscountPercent,
    extraUnlockedTiers: getUnlockedShopTiersForShop(perkState.unlockedShopTiers, shopId)
  };
}

function requireGameState(session: FrontendSession): GameState {
  if (!session.gameState) {
    throw new Error('활성 게임이 없습니다.');
  }

  return session.gameState;
}

function getCompletedActs(gameState: GameState): number[] {
  return Object.entries(gameState.flags)
    .filter(([key, value]) => value && key.startsWith('act-complete-'))
    .map(([key]) => Number(key.replace('act-complete-', '')))
    .filter(act => Number.isInteger(act) && act > 0)
    .sort((a, b) => a - b);
}

function syncUnlockedConnections(gameState: GameState): void {
  const location = getLocationById(gameState.player.currentLocation);
  if (!location || !('connections' in location)) {
    return;
  }

  const completedActs = getCompletedActs(gameState);
  for (const destinationId of location.connections) {
    const unlocked = isLocationUnlocked(
      destinationId,
      gameState.statistics.bossesDefeated,
      completedActs,
      gameState.player.completedQuests
    );

    if (unlocked && !gameState.player.unlockedLocations.includes(destinationId)) {
      gameState.player.unlockedLocations.push(destinationId);
      gameState.statistics.locationsDiscovered += 1;
    }
  }
}

function applyQuestProgressFeed(
  session: FrontendSession,
  updates: QuestProgressUpdate[]
): void {
  const announcedReadyQuests = new Set<string>();

  for (const update of updates) {
    appendFeed(
      session,
      'info',
      `[퀘스트] ${update.questName}: ${update.objectiveDescription} ` +
        `(${update.currentAmount}/${update.requiredAmount})`,
      undefined,
      'quest'
    );

    if (update.questReadyToComplete && !announcedReadyQuests.has(update.questId)) {
      appendFeed(
        session,
        'success',
        `[퀘스트] ${update.questName} 보상을 받을 수 있습니다.`,
        undefined,
        'reward'
      );
      announcedReadyQuests.add(update.questId);
    }
  }
}

function getActionFeedCategory(actionType: FrontendAction['type']): FeedCategory {
  switch (actionType) {
    case 'visit-board':
    case 'accept-quest':
    case 'complete-quest':
      return 'quest';
    case 'travel':
    case 'dungeon-explore':
    case 'dungeon-rest':
      return 'travel';
    case 'visit-market':
    case 'buy-item':
    case 'inn-rest':
    case 'town-explore':
      return 'hub';
    case 'battle-attack':
    case 'battle-defend':
    case 'battle-escape':
    case 'battle-skill':
    case 'battle-item':
      return 'combat';
    case 'new-game':
      return 'hub';
    case 'save-game':
    case 'load-game':
    case 'set-achievement-tracking-mode':
    case 'track-achievement':
    case 'clear-achievement-tracking':
    default:
      return 'system';
  }
}

function applyCollectQuestUpdates(
  session: FrontendSession,
  itemIds: string[]
): void {
  const gameState = requireGameState(session);
  const itemCounts = new Map<string, number>();
  for (const itemId of itemIds) {
    itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
  }

  for (const [itemId, count] of itemCounts.entries()) {
    const updates = updateQuestProgressOnCollect(gameState, itemId, count);
    if (updates.length > 0) {
      applyQuestProgressFeed(session, updates);
    }
  }
}

function serializeQuest(quest: Quest): SerializedQuest {
  const category = getQuestCategoryPresentation(quest);
  return {
    id: quest.id,
    name: quest.name,
    description: quest.description,
    requiredLevel: quest.requiredLevel,
    status: quest.status,
    category: category.category,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    estimatedTimeLabel: getQuestEstimatedTimeLabel(quest),
    sessionLabel: getQuestSessionLabel(quest),
    narrative: quest.narrative,
    objectives: quest.objectives.map(objective => ({
      description: objective.description,
      currentAmount: objective.currentAmount,
      requiredAmount: objective.requiredAmount,
      completed: objective.completed
    })),
    rewards: {
      exp: quest.rewards.exp,
      gold: quest.rewards.gold,
      items: quest.rewards.items
        .map(itemId => getItemById(itemId)?.name ?? itemId)
    }
  };
}

function serializeQuestGroups(quests: Quest[]): Array<{
  category: string;
  label: string;
  icon: string;
  quests: SerializedQuest[];
}> {
  return groupQuestsByCategory(quests).map(group => ({
    category: group.category,
    label: group.label,
    icon: group.icon,
    quests: group.quests.map(serializeQuest)
  }));
}

function summarizeInventory(gameState: GameState): FrontendSnapshot['inventory'] {
  const byItem = new Map<string, number>();
  for (const itemId of gameState.player.inventory) {
    byItem.set(itemId, (byItem.get(itemId) ?? 0) + 1);
  }

  return Array.from(byItem.entries())
    .map(([itemId, quantity]) => {
      const item = getItemById(itemId);
      const presentation = getPresentationItemCopy({
        itemId,
        rawName: item?.name ?? itemId,
        itemType: item?.type
      });
      return {
        itemId,
        quantity,
        name: presentation.name,
        icon: item?.icon ?? '📦',
        type: item?.type ?? 'unknown'
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function summarizeBattleItems(gameState: GameState): NonNullable<FrontendSnapshot['battle']>['items'] {
  return getOrganizedInventory(gameState.player)
    .filter(slot => slot.item.type === 'consumable')
    .map(slot => {
      const presentation = getPresentationItemCopy({
        itemId: slot.itemId,
        rawName: slot.item.name,
        itemType: slot.item.type
      });
      return {
        itemId: slot.itemId,
        name: presentation.name,
        icon: slot.item.icon,
        quantity: slot.quantity
      };
    });
}

function summarizeBattleSkills(gameState: GameState): NonNullable<FrontendSnapshot['battle']>['skills'] {
  return getAvailableSkills(gameState.player).map(skill => {
    const presentation = getPresentationSkillCopy(skill.id, skill.name, skill.description);
    return {
      id: skill.id,
      name: presentation.name,
      mpCost: skill.manaCost,
      description: presentation.description,
      usable: gameState.player.stats.mp >= skill.manaCost
    };
  });
}

function selectEncounterMonster(gameState: GameState, random: () => number): Monster {
  const monsters = getSampleMonsters();
  const locationId = gameState.player.currentLocation;
  const currentLocation = getLocationById(locationId);
  const locationBossId =
    currentLocation && 'boss' in currentLocation
      ? currentLocation.boss
      : null;
  const shouldSpawnBoss = Boolean(
    locationBossId &&
      !gameState.statistics.bossesDefeated.includes(locationBossId) &&
      gameState.position.stepsTaken >= 10
  );

  if (shouldSpawnBoss && locationBossId && monsters[locationBossId]) {
    return monsters[locationBossId];
  }

  const locationMonsterIds = getLocationMonsters(locationId);
  if (locationMonsterIds.length > 0) {
    const pool = locationMonsterIds
      .map(monsterId => monsters[monsterId])
      .filter((monster): monster is Monster => Boolean(monster));
    if (pool.length > 0) {
      const index = Math.floor(random() * pool.length);
      return pool[index];
    }
  }

  const fallback = Object.values(monsters)
    .filter(monster => !monster.isBoss)
    .sort((a, b) => a.level - b.level)[0];
  if (!fallback) {
    throw new Error('전투에 사용할 몬스터를 찾지 못했습니다.');
  }
  return fallback;
}

function startBattle(session: FrontendSession, monster: Monster): void {
  const gameState = requireGameState(session);
  const monsterInstance = createMonsterInstance(monster);
  const playerStarts = determineTurnOrder(
    gameState.player.stats.speed,
    monster.stats.speed
  ) !== 'monster';

  session.battle = {
    monster: monsterInstance,
    monsterId: monster.id,
    monsterName: monster.name,
    isBoss: monster.isBoss,
    turnNumber: 1,
    playerTurn: playerStarts,
    playerDefending: false
  };

  appendFeed(session, 'warning', `${monster.name}이(가) 전투를 걸어왔습니다.`, undefined, 'combat');
  appendVoiceFeed(
    session,
    monster.isBoss ? 'warning' : 'info',
    getBattleStartVoiceLine(gameState.player.currentLocation, monster),
    'combat'
  );

  if (!playerStarts) {
    appendFeed(session, 'info', `${monster.name}이(가) 선공을 가져갑니다.`, undefined, 'combat');
    appendVoiceFeed(
      session,
      'warning',
      getEnemyInitiativeVoiceLine(gameState.player.currentLocation, monster),
      'combat'
    );
    processEnemyTurn(session);
  }
}

function processEnemyTurn(session: FrontendSession): void {
  const gameState = requireGameState(session);
  const battle = session.battle;
  if (!battle) {
    return;
  }

  if (monsterAI(battle.monster) !== 'attack') {
    battle.playerTurn = true;
    return;
  }

  let result = monsterAttack(battle.monster, gameState.player);
  if (battle.playerDefending && result.damage) {
    const reducedDamage = Math.floor(result.damage * 0.5);
    const refund = result.damage - reducedDamage;
    result = {
      ...result,
      damage: reducedDamage,
      message: `${result.message} (방어로 피해 감소)`
    };
    gameState.player.stats.hp = Math.min(
      gameState.player.stats.maxHp,
      gameState.player.stats.hp + refund
    );
  }

  battle.playerDefending = false;
  appendFeed(
    session,
    result.targetDefeated ? 'error' : 'warning',
    result.message,
    undefined,
    'combat'
  );

  if (result.targetDefeated) {
    handlePlayerDefeat(session);
    return;
  }

  gameState.statistics.totalDamageTaken += result.damage ?? 0;
  recordRunDamageTaken(gameState, result.damage ?? 0, session.now());

  battle.turnNumber += 1;
  battle.playerTurn = true;
}

function finalizeBossProgress(session: FrontendSession, bossId: string): void {
  const gameState = requireGameState(session);
  if (!gameState.statistics.bossesDefeated.includes(bossId)) {
    gameState.statistics.bossesDefeated.push(bossId);
    recordRunBossDefeat(gameState, bossId, session.now());
    appendFeed(session, 'success', `보스 ${bossId} 격파.`, undefined, 'combat');
  }

  const currentLocation = getLocationById(gameState.player.currentLocation);
  if (!currentLocation || !('act' in currentLocation)) {
    syncUnlockedConnections(gameState);
    return;
  }

  if (session.battle) {
    appendVoiceFeed(
      session,
      'success',
      getBattleVictoryVoiceLine(currentLocation.id, session.battle.monster),
      'combat'
    );
  }
  appendAiNarrativeVoiceFeed(
    session,
    'success',
    {
      type: 'boss-victory',
      label: `${currentLocation.name} 오염원 차단`
    },
    'reward'
  );

  const locationRewardFlag = `location-clear-reward-${currentLocation.id}`;
  if (!gameState.flags[locationRewardFlag]) {
    gameState.flags[locationRewardFlag] = true;
    const rewardSummary = applyLocationFirstClearRewards(
      gameState.player,
      currentLocation.rewards.firstClear
    );

    if (rewardSummary.goldGained > 0) {
      gameState.statistics.goldEarned += rewardSummary.goldGained;
      recordRunGoldEarned(gameState, rewardSummary.goldGained, session.now());
      appendFeed(session, 'success', `${currentLocation.name} 첫 클리어 골드 +${rewardSummary.goldGained}`, undefined, 'reward');
    }
    if (rewardSummary.expGained > 0) {
      appendFeed(session, 'success', `${currentLocation.name} 첫 클리어 EXP +${rewardSummary.expGained}`, undefined, 'reward');
    }
    if (rewardSummary.rewardSkillPointsGained > 0) {
      appendFeed(
        session,
        'success',
        `보너스 스킬 포인트 +${rewardSummary.rewardSkillPointsGained}`,
        undefined,
        'reward'
      );
    }
    if (rewardSummary.itemsAdded.length > 0) {
      recordRunItemsCollected(gameState, rewardSummary.itemsAdded.length, session.now());
      const itemNames = rewardSummary.itemsAdded.map(getPresentedItemName);
      appendFeed(session, 'success', `첫 클리어 보상: ${itemNames.join(', ')}`, undefined, 'reward');
      applyCollectQuestUpdates(session, rewardSummary.itemsAdded);
      gameState.statistics.itemsCollected += rewardSummary.itemsAdded.length;
    }
    if (rewardSummary.itemsFailed.length > 0) {
      appendFeed(session, 'warning', '인벤토리가 가득 차 일부 첫 클리어 보상을 놓쳤습니다.', undefined, 'reward');
    }
    gameState.statistics.highestLevel = Math.max(
      gameState.statistics.highestLevel,
      rewardSummary.newLevel
    );
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
      appendFeed(session, 'success', `Act ${act} 클리어. 다음 전선이 열렸습니다.`, undefined, 'reward');
      appendVoiceFeed(session, 'success', getActClearVoiceLine(act), 'reward');

      const actSummary = getActSummary(act);
      const actReward = applyActClearRewards(gameState.player, actSummary?.clearRewards);
      if (actReward.rewardSkillPointsGained > 0) {
        appendFeed(session, 'success', `Act 보너스 스킬 포인트 +${actReward.rewardSkillPointsGained}`, undefined, 'reward');
      }
      if (actReward.saveTokensAdded > 0) {
        gameState.statistics.itemsCollected += actReward.saveTokensAdded;
        recordRunItemsCollected(gameState, actReward.saveTokensAdded, session.now());
        appendFeed(session, 'success', `Act 보너스 세이브 토큰 +${actReward.saveTokensAdded}`, undefined, 'reward');
        applyCollectQuestUpdates(
          session,
          Array.from({ length: actReward.saveTokensAdded }, () => 'save-token')
        );
      }
      if (actReward.saveTokensFailed > 0) {
        appendFeed(session, 'warning', '세이브 토큰 보상 일부를 획득하지 못했습니다.', undefined, 'reward');
      }
      for (const locationId of actSummary?.clearRewards?.unlocks ?? []) {
        if (!gameState.player.unlockedLocations.includes(locationId)) {
          gameState.player.unlockedLocations.push(locationId);
          gameState.statistics.locationsDiscovered += 1;
          appendFeed(session, 'success', `신규 해금 지역: ${getLocationDisplayName(locationId)}`, undefined, 'reward');
        }
      }
    }
  }

  syncUnlockedConnections(gameState);
}

function finalizeVictory(session: FrontendSession): void {
  const gameState = requireGameState(session);
  const battle = session.battle;
  if (!battle) {
    return;
  }
  const victoryLocationId = gameState.player.currentLocation;

  const rewards = calculateRewards(battle.monster, gameState.player);
  gameState.player.gold += rewards.gold;
  gameState.statistics.goldEarned += rewards.gold;
  recordRunGoldEarned(gameState, rewards.gold, session.now());
  appendFeed(session, 'success', `${battle.monsterName} 처치. 골드 +${rewards.gold}`, undefined, 'combat');
  if (!battle.isBoss) {
    appendVoiceFeed(session, 'info', getBattleVictoryVoiceLine(victoryLocationId, battle.monster), 'combat');
  }

  const addedItems: string[] = [];
  const failedItems: string[] = [];
  for (const itemId of rewards.items) {
    if (gameState.player.inventory.length < gameState.player.maxInventorySize) {
      gameState.player.inventory.push(itemId);
      addedItems.push(itemId);
      gameState.statistics.itemsCollected += 1;
    } else {
      failedItems.push(itemId);
    }
  }

  if (addedItems.length > 0) {
    recordRunItemsCollected(gameState, addedItems.length, session.now());
    const itemNames = addedItems.map(getPresentedItemName);
    appendFeed(session, 'success', `전리품: ${itemNames.join(', ')}`, undefined, 'reward');
    applyCollectQuestUpdates(session, addedItems);
  }
  if (failedItems.length > 0) {
    appendFeed(session, 'warning', '인벤토리가 가득 차 일부 전리품을 획득하지 못했습니다.', undefined, 'reward');
  }

  const expAmount = calculateMonsterExp(
    battle.monster.level,
    gameState.player.level,
    battle.isBoss,
    Boolean(battle.monster.prefix)
  );
  const levelUpResult = gainExp(gameState.player, expAmount);
  appendFeed(session, 'success', `경험치 +${expAmount}`, undefined, 'reward');
  if (levelUpResult.leveledUp) {
    appendFeed(
      session,
      'success',
      `레벨 업: Lv ${levelUpResult.oldLevel} -> Lv ${levelUpResult.newLevel}`,
      undefined,
      'reward'
    );
  }

  gameState.player.enemiesDefeated += 1;
  gameState.statistics.enemiesDefeated[battle.monsterId] =
    (gameState.statistics.enemiesDefeated[battle.monsterId] ?? 0) + 1;
  gameState.statistics.highestLevel = Math.max(
    gameState.statistics.highestLevel,
    gameState.player.level
  );

  const killUpdates = updateQuestProgressOnKill(gameState, battle.monsterId, 1);
  if (killUpdates.length > 0) {
    applyQuestProgressFeed(session, killUpdates);
  }

  if (battle.isBoss) {
    finalizeBossProgress(session, battle.monsterId);
  }

  session.battle = null;
}

function handlePlayerDefeat(session: FrontendSession): void {
  const gameState = requireGameState(session);
  const defeatLocationId = gameState.player.currentLocation;
  session.battle = null;

  const goldLoss = Math.floor(gameState.player.gold * 0.1);
  gameState.player.gold = Math.max(0, gameState.player.gold - goldLoss);
  gameState.player.stats.hp = gameState.player.stats.maxHp;
  gameState.player.stats.mp = gameState.player.stats.maxMp;
  gameState.player.currentLocation = 'bit-town';
  gameState.position.locationId = 'bit-town';
  gameState.position.stepsTaken = 0;
  gameState.player.deaths += 1;
  gameState.statistics.deaths += 1;
  closeRunSummary(gameState, session.now());

  appendFeed(session, 'error', `패배했습니다. ${goldLoss} 골드를 잃고 비트 타운으로 후퇴합니다.`, undefined, 'combat');
  appendVoiceFeed(session, 'warning', getDefeatVoiceLine(defeatLocationId), 'combat');
  appendAiNarrativeVoiceFeed(
    session,
    'warning',
    {
      type: 'defeat',
      label: '비트 타운 후퇴'
    },
    'combat'
  );
}

function travelTo(session: FrontendSession, destinationId: string): void {
  const gameState = requireGameState(session);
  const previousLocationId = gameState.player.currentLocation;
  const completedActs = getCompletedActs(gameState);
  const unlocked =
    gameState.player.unlockedLocations.includes(destinationId) ||
    isLocationUnlocked(
      destinationId,
      gameState.statistics.bossesDefeated,
      completedActs,
      gameState.player.completedQuests
    );

  if (!unlocked) {
    throw new Error('이 지역은 아직 해금되지 않았습니다.');
  }

  gameState.player.currentLocation = destinationId;
  gameState.position.locationId = destinationId;
  gameState.position.stepsTaken = 0;

  if (isTownLocation(destinationId)) {
    closeRunSummary(gameState, session.now());
  } else if (destinationId !== previousLocationId) {
    resetRunSummary(gameState, destinationId, session.now());
  }

  if (!gameState.player.unlockedLocations.includes(destinationId)) {
    gameState.player.unlockedLocations.push(destinationId);
    gameState.statistics.locationsDiscovered += 1;
  }

  appendFeed(session, 'success', `${getLocationDisplayName(destinationId)}에 도착했습니다.`, undefined, 'travel');
  appendVoiceFeed(session, 'info', getTravelArrivalVoiceLine(destinationId), 'travel');
  appendAiNarrativeVoiceFeed(
    session,
    'info',
    {
      type: 'travel',
      label: `${getPresentationDisplayName(getLocationDisplayName(destinationId))} 진입`
    },
    'travel'
  );
  const questUpdates = updateQuestProgressOnExplore(gameState, destinationId);
  if (questUpdates.length > 0) {
    applyQuestProgressFeed(session, questUpdates);
  }
}

function visitBoard(session: FrontendSession): void {
  const gameState = requireGameState(session);
  appendFeed(session, 'info', '퀘스트 게시판에서 최신 의뢰를 확인합니다.', undefined, 'quest');
  const updates = updateQuestProgressOnTalk(gameState, 'quest-board');
  if (updates.length > 0) {
    applyQuestProgressFeed(session, updates);
  }
  appendVoiceFeed(session, 'info', getBoardVisitVoiceLine(getAvailableQuests(gameState).length), 'quest');
}

function visitMarket(session: FrontendSession): void {
  const gameState = requireGameState(session);
  appendFeed(session, 'info', '상점 거리를 둘러보며 상인 네트워크를 확인합니다.', undefined, 'hub');
  const updates = updateQuestProgressOnTalk(gameState, 'merchant');
  if (updates.length > 0) {
    applyQuestProgressFeed(session, updates);
  }
  appendVoiceFeed(session, 'info', getMarketVisitVoiceLine(), 'hub');
}

function restAtInn(session: FrontendSession): void {
  const gameState = requireGameState(session);
  const cost = getInnRestCost(gameState.player.level);
  if (!canAffordCost(gameState.player.gold, cost)) {
    throw new Error(`여관 비용 ${cost} 골드가 부족합니다.`);
  }

  gameState.player.gold -= cost;
  gameState.statistics.goldSpent += cost;
  recordRunGoldSpent(gameState, cost, session.now());
  gameState.player.stats.hp = gameState.player.stats.maxHp;
  gameState.player.stats.mp = gameState.player.stats.maxMp;
  appendFeed(session, 'success', `여관에서 휴식했습니다. HP/MP 완전 회복 (-${cost} 골드)`, undefined, 'hub');

  const updates = updateQuestProgressOnTalk(gameState, 'innkeeper');
  if (updates.length > 0) {
    applyQuestProgressFeed(session, updates);
  }
  appendVoiceFeed(session, 'info', getInnRestVoiceLine(), 'hub');
  appendAiNarrativeVoiceFeed(
    session,
    'info',
    {
      type: 'rest',
      label: '여관 정비 완료'
    },
    'hub'
  );
}

function exploreTown(session: FrontendSession): void {
  const gameState = requireGameState(session);
  const roll = session.random();
  if (roll < 0.3) {
    const goldFound = Math.floor(session.random() * 20) + 5;
    gameState.player.gold += goldFound;
    gameState.statistics.goldEarned += goldFound;
    recordRunGoldEarned(gameState, goldFound, session.now());
    appendFeed(session, 'success', `마을 골목에서 ${goldFound} 골드를 발견했습니다.`, undefined, 'hub');
    return;
  }

  appendFeed(session, 'info', '마을을 둘러봤지만 특별한 일은 없었습니다.', undefined, 'hub');
}

function exploreDungeon(session: FrontendSession): void {
  const gameState = requireGameState(session);
  gameState.position.locationId = gameState.player.currentLocation;
  gameState.position.stepsTaken += 1;

  if (session.random() < 0.6) {
    const monster = selectEncounterMonster(gameState, session.random);
    startBattle(session, monster);
    return;
  }

  const eventResult = runDungeonEvent(gameState, session.random);
  for (const message of eventResult.messages) {
    appendFeed(session, message.tone, message.text, undefined, 'travel');
  }
}

function restInDungeon(session: FrontendSession): void {
  const gameState = requireGameState(session);
  if (gameState.player.stats.hp < gameState.player.stats.maxHp * 0.5) {
    appendFeed(session, 'warning', '상처가 심합니다. 안전한 곳에서 쉬는 편이 낫습니다.', undefined, 'travel');
    return;
  }

  const hpRestore = Math.floor(gameState.player.stats.maxHp * 0.3);
  const mpRestore = Math.floor(gameState.player.stats.maxMp * 0.2);
  gameState.player.stats.hp = Math.min(
    gameState.player.stats.maxHp,
    gameState.player.stats.hp + hpRestore
  );
  gameState.player.stats.mp = Math.min(
    gameState.player.stats.maxMp,
    gameState.player.stats.mp + mpRestore
  );
  appendFeed(session, 'success', `짧은 휴식. HP +${hpRestore}, MP +${mpRestore}`, undefined, 'travel');
}

function saveToSlot(session: FrontendSession, slotNumber: number): void {
  const gameState = requireGameState(session);
  const canSave = canSaveAtLocation(
    gameState.player.currentLocation,
    session.battle !== null,
    getSaveTokenCount(gameState.player) > 0
  );

  if (!canSave.canSave) {
    throw new Error(canSave.reason);
  }

  let saveType = isTownLocation(gameState.player.currentLocation)
    ? SaveType.Auto
    : SaveType.Manual;

  if (canSave.requiresToken) {
    if (!useSaveToken(gameState.player)) {
      throw new Error('세이브 토큰이 부족합니다.');
    }
    saveType = SaveType.Emergency;
  }

  const result = writeSaveGame(gameState, slotNumber, saveType);
  if (!result.success) {
    throw new Error(result.message);
  }

  appendFeed(session, 'success', result.message, undefined, 'system');
}

function loadFromSlot(session: FrontendSession, slotNumber: number): void {
  const result = loadSaveGame(slotNumber);
  if (!result.success || !result.gameState) {
    throw new Error(result.message);
  }

  migrateLoadedGameState(
    result.gameState,
    result.saveSchemaVersion ?? result.gameState.gameVersion
  );
  ensureQuestState(result.gameState);
  refreshSeasonalEventState(result.gameState);
  syncAchievementTrackingState(result.gameState, { now: session.now(), recordHistory: false });
  session.gameState = result.gameState;
  session.battle = null;
  appendFeed(session, 'success', `슬롯 ${slotNumber} 저장 데이터를 불러왔습니다.`, undefined, 'system');
}

function buyShopItemAction(
  session: FrontendSession,
  shopId: string,
  itemId: string
): void {
  const gameState = requireGameState(session);
  const shop = getShop(shopId);
  if (!shop) {
    throw new Error('상점을 찾을 수 없습니다.');
  }

  const shopRewardOptions = buildShopRewardOptions(gameState, shopId);
  const result = buyItem(gameState.player, itemId, shopId, 1, {
    discountPercent: shopRewardOptions.discountPercent
  });
  if (!result.success) {
    throw new Error(result.message);
  }

  gameState.statistics.goldSpent += result.cost ?? 0;
  recordRunGoldSpent(gameState, result.cost ?? 0, session.now());
  recordRunItemsCollected(gameState, 1, session.now());
  const itemName = getPresentedItemName(itemId);
  appendFeed(
    session,
    'success',
    `${getPresentationDisplayName(shop.ownerName)}에게서 ${itemName} 구매 (-${result.cost ?? 0} 골드)`,
    undefined,
    'hub'
  );
  appendVoiceFeed(session, 'info', getPurchaseVoiceLine(shopId), 'hub');
  appendAiNarrativeVoiceFeed(
    session,
    'info',
    {
      type: 'purchase',
      label: `${itemName} 확보`
    },
    'hub'
  );
  applyCollectQuestUpdates(session, [itemId]);
}

function performBattleAction(
  session: FrontendSession,
  action:
    | Extract<FrontendAction, { type: 'battle-attack' }>
    | Extract<FrontendAction, { type: 'battle-defend' }>
    | Extract<FrontendAction, { type: 'battle-escape' }>
    | Extract<FrontendAction, { type: 'battle-skill' }>
    | Extract<FrontendAction, { type: 'battle-item' }>
): void {
  const gameState = requireGameState(session);
  const battle = session.battle;
  if (!battle) {
    throw new Error('진행 중인 전투가 없습니다.');
  }
  if (!battle.playerTurn) {
    throw new Error('아직 플레이어 턴이 아닙니다.');
  }

  if (action.type === 'battle-attack') {
    const result = playerAttack(gameState.player, battle.monster, false);
    gameState.statistics.totalDamageDealt += result.damage ?? 0;
    appendFeed(session, result.targetDefeated ? 'success' : 'info', result.message, undefined, 'combat');
    if (result.targetDefeated) {
      finalizeVictory(session);
      return;
    }
  } else if (action.type === 'battle-defend') {
    const result = playerDefend(gameState.player);
    appendFeed(session, 'info', result.message, undefined, 'combat');
    battle.playerDefending = true;
  } else if (action.type === 'battle-escape') {
    const result = attemptEscape(gameState.player, battle.monster, battle.isBoss);
    appendFeed(session, result.success ? 'success' : 'warning', result.message, undefined, 'combat');
    if (result.success) {
      session.battle = null;
      return;
    }
  } else if (action.type === 'battle-skill') {
    const result = useSkill(gameState.player, battle.monster, action.skillId);
    gameState.statistics.totalDamageDealt += result.damage ?? 0;
    appendFeed(session, result.success ? 'info' : 'warning', result.message, undefined, 'combat');
    if (!result.success) {
      return;
    }
    if (result.targetDefeated) {
      finalizeVictory(session);
      return;
    }
  } else if (action.type === 'battle-item') {
    const result = useInventoryItem(gameState.player, action.itemId);
    appendFeed(session, result.success ? 'success' : 'warning', result.message, undefined, 'combat');
    if (!result.success) {
      return;
    }
  }

  if (!session.battle) {
    return;
  }

  session.battle.playerTurn = false;
  processEnemyTurn(session);
}

export function performFrontendAction(
  session: FrontendSession,
  action: FrontendAction
): FrontendSnapshot {
  let actionSucceeded = false;

  try {
    switch (action.type) {
      case 'new-game':
        session.gameState = createNewGameState(
          action.name,
          action.characterClass,
          action.gameMode
        );
        session.battle = null;
        refreshSeasonalEventState(session.gameState);
        appendFeed(
          session,
          'success',
          `${action.name}, 비트 타운에 도착했습니다. 첫 의뢰를 확인해 보세요.`,
          undefined,
          'hub'
        );
        appendFeed(session, 'info', '브라우저 프론트엔드 버전으로 여정이 시작됩니다.', undefined, 'system');
        appendVoiceFeed(session, 'info', getNewGameVoiceLine(), 'hub');
        appendAiNarrativeVoiceFeed(
          session,
          'info',
          {
            type: 'new-game',
            label: '비트 타운 도착'
          },
          'hub'
        );
        actionSucceeded = true;
        break;

      case 'load-game':
        loadFromSlot(session, action.slotNumber);
        actionSucceeded = true;
        break;

      case 'save-game':
        saveToSlot(session, action.slotNumber);
        actionSucceeded = true;
        break;

      case 'set-achievement-tracking-mode':
        if (action.mode !== 'auto' && action.mode !== 'pinned') {
          throw new Error('지원하지 않는 업적 추적 모드입니다.');
        }
        requireGameState(session);
        actionSucceeded = true;
        break;

      case 'track-achievement':
        if (action.mode && action.mode !== 'auto' && action.mode !== 'pinned') {
          throw new Error('지원하지 않는 업적 추적 모드입니다.');
        }
        if (typeof action.achievementId !== 'string' || action.achievementId.trim().length === 0) {
          throw new Error('추적할 업적을 선택해야 합니다.');
        }
        requireGameState(session);
        actionSucceeded = true;
        break;

      case 'clear-achievement-tracking':
        requireGameState(session);
        actionSucceeded = true;
        break;

      case 'visit-board':
        visitBoard(session);
        actionSucceeded = true;
        break;

      case 'visit-market':
        visitMarket(session);
        actionSucceeded = true;
        break;

      case 'accept-quest': {
        const gameState = requireGameState(session);
        const result = acceptQuest(gameState, action.questId);
        if (!result.success) {
          throw new Error(result.message);
        }
        appendFeed(session, 'success', result.message, undefined, 'quest');
        appendVoiceFeed(session, 'info', getQuestAcceptVoiceLine(result.quest ?? gameState.quests[action.questId]), 'quest');
        appendAiNarrativeVoiceFeed(
          session,
          'info',
          {
            type: 'quest-accepted',
            label: (result.quest ?? gameState.quests[action.questId]).name
          },
          'quest'
        );
        actionSucceeded = true;
        break;
      }

      case 'complete-quest': {
        const gameState = requireGameState(session);
        const result = completeQuest(gameState, action.questId);
        if (!result.success) {
          throw new Error(result.message);
        }
        recordRunGoldEarned(gameState, result.goldGained, session.now());
        recordRunQuestCompleted(gameState, 1, session.now());
        appendFeed(session, 'success', result.message, undefined, 'quest');
        appendFeed(session, 'success', `보상: EXP +${result.expGained}, GOLD +${result.goldGained}`, undefined, 'reward');
        if (result.itemsAdded.length > 0) {
          recordRunItemsCollected(gameState, result.itemsAdded.length, session.now());
          const names = result.itemsAdded.map(getPresentedItemName);
          appendFeed(session, 'success', `획득 아이템: ${names.join(', ')}`, undefined, 'reward');
          applyCollectQuestUpdates(session, result.itemsAdded);
        }
        if (result.itemsFailed.length > 0) {
          appendFeed(session, 'warning', '인벤토리가 가득 차 일부 보상을 획득하지 못했습니다.', undefined, 'reward');
        }
        if (result.unlockedLocations.length > 0) {
          appendFeed(
            session,
            'success',
            `신규 지역 해금: ${result.unlockedLocations.map(getLocationDisplayName).join(', ')}`,
            undefined,
            'reward'
          );
        }
        appendVoiceFeed(session, 'success', getQuestCompleteVoiceLine(result.quest ?? gameState.quests[action.questId]), 'quest');
        appendAiNarrativeVoiceFeed(
          session,
          'success',
          {
            type: 'quest-completed',
            label: (result.quest ?? gameState.quests[action.questId]).name
          },
          'quest'
        );
        actionSucceeded = true;
        break;
      }

      case 'travel':
        travelTo(session, action.destinationId);
        actionSucceeded = true;
        break;

      case 'town-explore':
        exploreTown(session);
        actionSucceeded = true;
        break;

      case 'inn-rest':
        restAtInn(session);
        actionSucceeded = true;
        break;

      case 'buy-item':
        buyShopItemAction(session, action.shopId, action.itemId);
        actionSucceeded = true;
        break;

      case 'dungeon-explore':
        exploreDungeon(session);
        actionSucceeded = true;
        break;

      case 'dungeon-rest':
        restInDungeon(session);
        actionSucceeded = true;
        break;

      case 'battle-attack':
      case 'battle-defend':
      case 'battle-escape':
      case 'battle-skill':
      case 'battle-item':
        performBattleAction(session, action);
        actionSucceeded = true;
        break;

      case 'ai-feedback':
        requireGameState(session);
        trackAiFeedback(session, action);
        actionSucceeded = true;
        break;
    }
  } catch (error) {
    appendFeed(
      session,
      'error',
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      undefined,
      getActionFeedCategory(action.type)
    );
  }

  if (actionSucceeded && action.type !== 'ai-feedback') {
    applyAchievementUnlocks(session);
    appendAchievementTrackingFeed(session, action);
  }

  return getFrontendSnapshot(session);
}

function buildBattleSnapshot(
  session: FrontendSession
): FrontendSnapshot['battle'] {
  if (!session.battle || !session.gameState) {
    return null;
  }

  return {
    monsterName: session.battle.monsterName,
    monsterIcon: session.battle.monster.icon,
    monsterLevel: session.battle.monster.level,
    monsterHp: session.battle.monster.currentHp,
    monsterMaxHp: session.battle.monster.stats.maxHp,
    isBoss: session.battle.isBoss,
    turnNumber: session.battle.turnNumber,
    playerTurn: session.battle.playerTurn,
    skills: summarizeBattleSkills(session.gameState),
    items: summarizeBattleItems(session.gameState)
  };
}

function buildTravelSnapshot(
  gameState: GameState
): FrontendSnapshot['travel'] {
  const recommendedDestinationId = getRecommendedTravelDestination(gameState);
  const completedActs = getCompletedActs(gameState);

  return {
    currentLocationId: gameState.player.currentLocation,
    destinations: getConnectedLocations(gameState.player.currentLocation).map(location => {
      const unlocked =
        gameState.player.unlockedLocations.includes(location.id) ||
        isLocationUnlocked(
          location.id,
          gameState.statistics.bossesDefeated,
          completedActs,
          gameState.player.completedQuests
        );
      const cleared = 'boss' in location
        ? gameState.statistics.bossesDefeated.includes(location.boss)
        : false;
      return {
        id: location.id,
        name: getPresentationDisplayName(location.name),
        act: 'act' in location ? location.act : undefined,
        unlocked,
        cleared,
        recommended: recommendedDestinationId === location.id,
        connected: true,
        description: getPresentationLocationDescription(location.id, location.description),
        firstClearRewardPreview: formatFirstClearRewardPreview(location.id)
      };
    })
  };
}

function buildShopSnapshot(gameState: GameState): FrontendSnapshot['shops'] {
  return ['binary-weapons', 'armor-code', 'buffer-potions']
    .map(shopId => {
      const shop = getShop(shopId);
      if (!shop) {
        return null;
      }
      return {
        id: shop.id,
        name: getPresentationDisplayName(shop.name),
        ownerName: getPresentationDisplayName(shop.ownerName),
        icon: shop.icon,
        greeting: getPresentationShopGreeting(shop.id, shop.greeting),
        inventory: updateAffordability(
          getShopInventory(shopId, gameState.player.level, buildShopRewardOptions(gameState, shopId)),
          gameState.player.gold
        ).map(entry => {
          const presentation = getPresentationItemCopy({
            itemId: entry.item.id,
            rawName: entry.item.name,
            itemType: entry.item.type,
            rarity: entry.item.rarity,
            level: entry.requiredLevel,
            fallbackDescription: entry.item.description
          });
          return {
            id: entry.item.id,
            name: presentation.name,
            icon: entry.item.icon,
            rarity: entry.item.rarity,
            level: entry.requiredLevel,
            price: entry.buyPrice,
            canAfford: entry.canAfford,
            meetsLevelReq: entry.meetsLevelReq,
            description: presentation.description
          };
        })
      };
    })
    .filter((shop): shop is NonNullable<typeof shop> => Boolean(shop));
}

function buildSaveStatus(
  session: FrontendSession
): FrontendSnapshot['saveStatus'] {
  if (!session.gameState) {
    return undefined;
  }

  return canSaveAtLocation(
    session.gameState.player.currentLocation,
    session.battle !== null,
    getSaveTokenCount(session.gameState.player) > 0
  );
}

function buildAchievementSnapshot(
  gameState: GameState
): FrontendSnapshot['achievements'] {
  const summary = getAchievementSummary(gameState);

  return {
    unlockedCount: summary.unlockedCount,
    totalCount: summary.totalCount,
    latestUnlocked: summary.latestUnlocked
      ? {
          id: summary.latestUnlocked.id,
          title: summary.latestUnlocked.title,
          description: summary.latestUnlocked.description,
          accent: summary.latestUnlocked.accent,
          unlockedAt: summary.latestUnlocked.unlockedAt
        }
      : null,
    entries: summary.entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      rewardPreview: entry.rewardPreview,
      category: entry.category,
      accent: entry.accent,
      unlocked: entry.unlocked,
      unlockedAt: entry.unlockedAt,
      current: entry.progress.current,
      target: entry.progress.target,
      progressPercent: entry.progress.target > 0
        ? Math.max(0, Math.min(100, Math.round((entry.progress.current / entry.progress.target) * 100)))
        : 0
    }))
  };
}

function buildAchievementTrackingSnapshot(
  gameState: GameState
): FrontendSnapshot['achievementTracking'] {
  const trackingState = ensureAchievementTrackingState(gameState);
  const trackedAchievement = getTrackedAchievement(gameState);

  return {
    mode: trackingState.mode,
    current: trackedAchievement
      ? {
          id: trackedAchievement.id,
          title: trackedAchievement.title,
          description: trackedAchievement.description,
          category: trackedAchievement.category,
          accent: trackedAchievement.accent,
          current: trackedAchievement.progress.current,
          target: trackedAchievement.progress.target,
          progressPercent: trackedAchievement.progress.target > 0
            ? Math.max(0, Math.min(100, Math.round((trackedAchievement.progress.current / trackedAchievement.progress.target) * 100)))
            : 0
        }
      : null,
    history: trackingState.history.map(entry => ({
      timestamp: entry.timestamp,
      type: entry.type,
      message: entry.message,
      achievementId: entry.achievementId,
      achievementTitle: entry.achievementTitle,
      progress: entry.progress,
      mode: entry.mode,
      cause: entry.cause
    }))
  };
}

function buildAchievementPerkSnapshot(
  gameState: GameState
): FrontendSnapshot['achievementPerks'] {
  const perkState = ensureAchievementPerkState(gameState);

  return {
    summary: getAchievementPerkSummary(gameState),
    inventorySizeBonus: perkState.inventorySizeBonus,
    shopDiscountPercent: perkState.shopDiscountPercent,
    unlockedShopTiers: perkState.unlockedShopTiers.map(entry => {
      const separatorIndex = entry.indexOf(':');
      const shopId = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry;
      const tierKey = separatorIndex >= 0 ? entry.slice(separatorIndex + 1) : '';
      return {
        shopId,
        tierKey,
        label: entry
      };
    })
  };
}

function buildAiSnapshot(gameState: GameState): FrontendSnapshot['ai'] {
  const aiState = ensureAiState(gameState);
  const narrativeCue = buildAiNarrativeCue(gameState);

  return {
    directorMode: aiState.directorMode,
    narrativeMode: aiState.narrativeMode,
    currentIntent: aiState.currentIntent
      ? {
          id: aiState.currentIntent.id,
          kind: aiState.currentIntent.kind,
          title: aiState.currentIntent.title,
          reason: aiState.currentIntent.reason,
          tone: aiState.currentIntent.tone,
          confidence: aiState.currentIntent.confidence,
          recommendedAction: aiState.currentIntent.recommendedAction,
          recommendedLocationId: aiState.currentIntent.recommendedLocationId,
          lines: aiState.currentIntent.lines
        }
      : null,
    narrativeCue,
    recentMoments: aiState.memory.recentMoments.slice(0, 4).map(moment => ({
      type: moment.type,
      label: moment.label,
      timestamp: moment.timestamp
    }))
  };
}

function trackAiIntentShown(session: FrontendSession, gameState: GameState): void {
  const aiState = ensureAiState(gameState);
  const currentIntentId = aiState.currentIntent?.id ?? null;

  if (!currentIntentId) {
    session.lastShownAiIntentId = null;
    return;
  }

  if (session.lastShownAiIntentId === currentIntentId) {
    return;
  }

  trackTelemetryEvent('ai_recommendation_shown', gameState, {
    intentId: currentIntentId,
    intentKind: aiState.currentIntent?.kind ?? null,
    recommendedAction: aiState.currentIntent?.recommendedAction ?? null,
    recommendedLocationId: aiState.currentIntent?.recommendedLocationId ?? null
  });
  session.lastShownAiIntentId = currentIntentId;
}

function trackAiFeedback(session: FrontendSession, action: Extract<FrontendAction, { type: 'ai-feedback' }>): void {
  const gameState = requireGameState(session);
  const aiState = ensureAiState(gameState);
  const currentIntent = aiState.currentIntent;
  const intentId = action.intentId ?? currentIntent?.id ?? null;
  if (!intentId) {
    return;
  }

  trackTelemetryEvent(
    action.feedback === 'dismiss' ? 'ai_recommendation_dismissed' : 'ai_recommendation_followed',
    gameState,
    {
      intentId,
      currentIntentId: currentIntent?.id ?? null,
      currentIntentKind: currentIntent?.kind ?? null,
      source: action.source ?? null,
      intentMatchesCurrent: currentIntent?.id === intentId
    }
  );
}

export function getFrontendSnapshot(session: FrontendSession): FrontendSnapshot {
  if (!session.gameState) {
    return {
      scene: 'landing',
      hasGame: false,
      activeSaveDirectory: getSaveDirectoryPath(),
      saves: listSaves(),
      feed: session.feed
    };
  }

  const gameState = session.gameState;
  syncAchievementTrackingState(gameState, { recordHistory: false });
  syncAiState(gameState, session.now());
  trackAiIntentShown(session, gameState);
  const location = getLocationById(gameState.player.currentLocation);
  const adventureFocus = getAdventureFocusSummary(gameState);
  const tracker = getQuestTrackerSummary(gameState);
  const bossProgress = getLocationBossProgress(gameState);
  const achievementSummary = getAchievementSummary(gameState);
  const bossProgressText =
    adventureFocus?.lines.find(line => line.includes('남음') || line.includes('보스')) ?? null;

  return {
    scene: getScene(session),
    hasGame: true,
    activeSaveDirectory: getSaveDirectoryPath(),
    saves: listSaves(),
    feed: session.feed,
    player: {
      name: gameState.player.name,
      class: gameState.player.class,
      level: gameState.player.level,
      experience: gameState.player.experience,
      experienceToNextLevel: gameState.player.experienceToNextLevel,
      experienceRemaining: Math.max(
        0,
        gameState.player.experienceToNextLevel - gameState.player.experience
      ),
      experienceProgressPercent: getLevelProgress(gameState.player),
      gold: gameState.player.gold,
      skillPoints: gameState.player.skillPoints,
      hp: gameState.player.stats.hp,
      maxHp: gameState.player.stats.maxHp,
      mp: gameState.player.stats.mp,
      maxMp: gameState.player.stats.maxMp,
      attack: gameState.player.stats.attack,
      defense: gameState.player.stats.defense,
      speed: gameState.player.stats.speed,
      inventoryCount: gameState.player.inventory.length,
      saveTokenCount: getSaveTokenCount(gameState.player),
      achievementCount: achievementSummary.unlockedCount,
      achievementTotal: achievementSummary.totalCount
    },
    location: location
      ? {
          id: location.id,
          name: getPresentationDisplayName(location.name),
          description: getPresentationLocationDescription(location.id, location.description),
          isTown: isTownLocation(location.id),
          recommendedDestinationId: getRecommendedTravelDestination(gameState),
          bossProgress: bossProgressText && bossProgress
            ? {
                text: bossProgressText,
                bossName: bossProgress.bossName,
                current: bossProgress.stepsTaken,
                target: bossProgress.stepsRequired,
                remaining: bossProgress.remainingSteps,
                ready: bossProgress.ready
              }
            : undefined,
          firstClearRewardPreview: formatFirstClearRewardPreview(location.id)
        }
      : undefined,
    focus: adventureFocus
      ? {
          title: adventureFocus.title,
          tone: adventureFocus.tone,
          lines: adventureFocus.lines
        }
      : null,
    tracker: tracker
      ? {
          questName: tracker.questName,
          status: tracker.status,
          objectiveDescription: tracker.objectiveDescription,
          progress: `${tracker.currentAmount}/${tracker.requiredAmount}`,
          currentAmount: tracker.currentAmount,
          requiredAmount: tracker.requiredAmount,
          progressPercent: tracker.requiredAmount > 0
            ? Math.max(
                0,
                Math.min(100, Math.round((tracker.currentAmount / tracker.requiredAmount) * 100))
              )
            : 0
        }
      : null,
    questBoard: {
      available: serializeQuestGroups(getAvailableQuests(gameState)),
      active: serializeQuestGroups(getActiveQuests(gameState)),
      completable: getCompletableQuests(gameState).map(serializeQuest),
      completedCount: getCompletedQuests(gameState).length
    },
    travel: buildTravelSnapshot(gameState),
    shops: buildShopSnapshot(gameState),
    inventory: summarizeInventory(gameState),
    battle: buildBattleSnapshot(session),
    saveStatus: buildSaveStatus(session),
    achievements: buildAchievementSnapshot(gameState),
    achievementTracking: buildAchievementTrackingSnapshot(gameState),
    achievementPerks: buildAchievementPerkSnapshot(gameState),
    ai: buildAiSnapshot(gameState)
  };
}
