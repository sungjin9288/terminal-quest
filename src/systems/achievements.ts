import {
  AchievementDefinition,
  AchievementPerkState,
  AchievementRewardGrant,
  AchievementStatisticCountKey,
  AchievementState,
  AchievementTrackingHistoryEntry,
  AchievementTrackingHistoryType,
  AchievementTrackingMode,
  AchievementTrackingState,
  AchievementView,
  RunSummary,
  type AchievementProgress,
  type AchievementRewardShopTierUnlock,
  type AchievementUnlockState
} from '../types/achievement.js';
import { GameState } from '../types/game.js';
import { ACHIEVEMENT_CATALOG } from '../data/achievements.js';
import { addItem } from './inventory.js';
import { getItemById } from '../data/items.js';
import { getShop } from './shop.js';

export interface AchievementSummary {
  unlockedCount: number;
  totalCount: number;
  latestUnlocked: AchievementView | null;
  recentUnlocked: AchievementView[];
  entries: AchievementView[];
}

export interface AchievementEvaluationResult {
  newlyUnlocked: AchievementView[];
  rewardGrants: AchievementRewardGrant[];
  unlockedCount: number;
  totalCount: number;
}

export interface AchievementTrackingChangeResult {
  previous: AchievementView | null;
  current: AchievementView | null;
  history: AchievementTrackingHistoryEntry[];
}

interface AchievementTrackingOptions {
  now?: number;
  recordHistory?: boolean;
  cause?: string;
}

const ACHIEVEMENT_TRACKING_HISTORY_LIMIT = 12;
const ACHIEVEMENT_SHOP_DISCOUNT_CAP = 20;
const BASE_INVENTORY_SIZE = 20;

function createCountProgress(current: number, target: number): AchievementProgress {
  return {
    current: Math.max(0, Math.floor(current)),
    target: Math.max(1, Math.floor(target))
  };
}

function createBooleanProgress(value: boolean): AchievementProgress {
  return {
    current: value ? 1 : 0,
    target: 1
  };
}

function getBossDefeatCount(gameState: GameState): number {
  return gameState.statistics.bossesDefeated.length;
}

function getStatisticCount(gameState: GameState, stat: AchievementStatisticCountKey): number {
  const value = gameState.statistics[stat];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0;
}

function getStatisticFlag(gameState: GameState, stat: 'endgameChallengeUnlocked'): boolean {
  return gameState.statistics[stat] === true;
}

function isFlawlessCurrentRun(gameState: GameState): boolean {
  const runSummary = ensureRunSummary(gameState);
  return runSummary.activeLocationId !== null &&
    runSummary.damageTaken === 0 &&
    runSummary.bossesDefeated.length > 0;
}

function getRuleProgress(
  definition: AchievementDefinition,
  gameState: GameState
): AchievementProgress {
  switch (definition.rule.kind) {
    case 'stat_at_least':
      return createCountProgress(
        getStatisticCount(gameState, definition.rule.stat),
        definition.rule.target
      );
    case 'boss_count_at_least':
      return createCountProgress(getBossDefeatCount(gameState), definition.rule.target);
    case 'statistics_flag_true':
      return createBooleanProgress(getStatisticFlag(gameState, definition.rule.stat));
    case 'flag_true':
      return createBooleanProgress(Boolean(gameState.flags[definition.rule.flag]));
    case 'run_flawless_boss_clear':
      return createBooleanProgress(isFlawlessCurrentRun(gameState));
    default:
      return createBooleanProgress(false);
  }
}

function isDefinitionUnlocked(
  definition: AchievementDefinition,
  gameState: GameState
): boolean {
  switch (definition.rule.kind) {
    case 'stat_at_least':
      return getStatisticCount(gameState, definition.rule.stat) >= definition.rule.target;
    case 'boss_count_at_least':
      return getBossDefeatCount(gameState) >= definition.rule.target;
    case 'statistics_flag_true':
      return getStatisticFlag(gameState, definition.rule.stat);
    case 'flag_true':
      return Boolean(gameState.flags[definition.rule.flag]);
    case 'run_flawless_boss_clear':
      return isFlawlessCurrentRun(gameState);
    default:
      return false;
  }
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = ACHIEVEMENT_CATALOG;

export const TOTAL_ACHIEVEMENT_COUNT = ACHIEVEMENT_DEFINITIONS.length;

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function normalizeDiscountPercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(ACHIEVEMENT_SHOP_DISCOUNT_CAP, Math.floor(value)))
    : 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  return Array.from(new Set(normalized));
}

function isAchievementTrackingMode(value: unknown): value is AchievementTrackingMode {
  return value === 'auto' || value === 'pinned';
}

function isAchievementTrackingHistoryType(value: unknown): value is AchievementTrackingHistoryType {
  return value === 'tracked' ||
    value === 'switched' ||
    value === 'completed' ||
    value === 'cleared' ||
    value === 'mode';
}

function normalizeAchievementTrackingHistoryEntry(value: unknown): AchievementTrackingHistoryEntry | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (message.length === 0) {
    return null;
  }

  const achievementId = typeof raw.achievementId === 'string' && raw.achievementId.trim().length > 0
    ? raw.achievementId.trim()
    : undefined;
  const achievementTitle = typeof raw.achievementTitle === 'string' && raw.achievementTitle.trim().length > 0
    ? raw.achievementTitle.trim()
    : undefined;
  const progress = typeof raw.progress === 'string' && raw.progress.trim().length > 0
    ? raw.progress.trim()
    : undefined;
  const cause = typeof raw.cause === 'string' && raw.cause.trim().length > 0
    ? raw.cause.trim()
    : undefined;

  return {
    timestamp: normalizeTimestamp(raw.timestamp, Date.now()),
    type: isAchievementTrackingHistoryType(raw.type) ? raw.type : 'tracked',
    message,
    achievementId,
    achievementTitle,
    progress,
    mode: isAchievementTrackingMode(raw.mode) ? raw.mode : undefined,
    cause
  };
}

function normalizeAchievementUnlockState(
  value: unknown,
  fallbackTimestamp: number
): AchievementUnlockState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    unlockedAt: normalizeTimestamp(raw.unlockedAt, fallbackTimestamp),
    rewardGrantedAt: typeof raw.rewardGrantedAt === 'number' && Number.isFinite(raw.rewardGrantedAt)
      ? raw.rewardGrantedAt
      : undefined
  };
}

export function createAchievementState(): AchievementState {
  return {
    unlocked: {}
  };
}

export function createAchievementPerkState(): AchievementPerkState {
  return {
    inventorySizeBonus: 0,
    shopDiscountPercent: 0,
    unlockedShopTiers: []
  };
}

export function createAchievementTrackingState(
  now: number = Date.now()
): AchievementTrackingState {
  return {
    mode: 'auto',
    achievementId: null,
    updatedAt: now,
    history: []
  };
}

export function ensureAchievementPerkState(gameState: GameState): AchievementPerkState {
  const legacyGameState = gameState as GameState & { achievementPerks?: unknown };
  if (typeof legacyGameState.achievementPerks !== 'object' || legacyGameState.achievementPerks === null) {
    gameState.achievementPerks = createAchievementPerkState();
  } else {
    const raw = legacyGameState.achievementPerks as unknown as Record<string, unknown>;
    gameState.achievementPerks = {
      inventorySizeBonus: normalizeCount(raw.inventorySizeBonus),
      shopDiscountPercent: normalizeDiscountPercent(raw.shopDiscountPercent),
      unlockedShopTiers: normalizeStringArray(raw.unlockedShopTiers)
    };
  }

  gameState.player.maxInventorySize = Math.max(
    gameState.player.maxInventorySize,
    BASE_INVENTORY_SIZE + gameState.achievementPerks.inventorySizeBonus
  );

  return gameState.achievementPerks;
}

export function createRunSummary(
  now: number = Date.now(),
  activeLocationId: string | null = null
): RunSummary {
  return {
    startedAt: now,
    updatedAt: now,
    activeLocationId,
    damageTaken: 0,
    goldEarned: 0,
    goldSpent: 0,
    questsCompleted: 0,
    itemsCollected: 0,
    bossesDefeated: []
  };
}

export function ensureAchievementState(gameState: GameState): AchievementState {
  const now = Date.now();
  const legacyGameState = gameState as GameState & { achievements?: unknown };
  if (typeof legacyGameState.achievements !== 'object' || legacyGameState.achievements === null) {
    gameState.achievements = createAchievementState();
    return gameState.achievements;
  }

  const rawState = legacyGameState.achievements as unknown as Record<string, unknown>;
  const rawUnlocked = typeof rawState.unlocked === 'object' && rawState.unlocked !== null
    ? rawState.unlocked as Record<string, unknown>
    : {};

  const unlocked: Record<string, AchievementUnlockState> = {};
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const normalized = normalizeAchievementUnlockState(rawUnlocked[definition.id], now);
    if (normalized) {
      unlocked[definition.id] = normalized;
    }
  }

  const normalizedState = legacyGameState.achievements as AchievementState & Record<string, unknown>;
  normalizedState.unlocked = unlocked;
  gameState.achievements = normalizedState;
  return normalizedState;
}

export function ensureAchievementTrackingState(gameState: GameState): AchievementTrackingState {
  const now = Date.now();
  const legacyGameState = gameState as GameState & { achievementTracking?: unknown };
  if (typeof legacyGameState.achievementTracking !== 'object' || legacyGameState.achievementTracking === null) {
    gameState.achievementTracking = createAchievementTrackingState(now);
    return gameState.achievementTracking;
  }

  const rawState = legacyGameState.achievementTracking as unknown as Record<string, unknown>;
  const rawHistory = Array.isArray(rawState.history) ? rawState.history : [];

  gameState.achievementTracking = {
    mode: isAchievementTrackingMode(rawState.mode) ? rawState.mode : 'auto',
    achievementId: typeof rawState.achievementId === 'string' && rawState.achievementId.trim().length > 0
      ? rawState.achievementId.trim()
      : null,
    updatedAt: normalizeTimestamp(rawState.updatedAt, now),
    history: rawHistory
      .map(normalizeAchievementTrackingHistoryEntry)
      .filter((entry): entry is AchievementTrackingHistoryEntry => entry !== null)
      .slice(0, ACHIEVEMENT_TRACKING_HISTORY_LIMIT)
  };

  return gameState.achievementTracking;
}

export function ensureRunSummary(gameState: GameState): RunSummary {
  const now = Date.now();
  const legacyGameState = gameState as GameState & { runSummary?: unknown };
  if (typeof legacyGameState.runSummary !== 'object' || legacyGameState.runSummary === null) {
    gameState.runSummary = createRunSummary(now);
    return gameState.runSummary;
  }

  const raw = legacyGameState.runSummary as unknown as Record<string, unknown>;
  gameState.runSummary = {
    startedAt: normalizeTimestamp(raw.startedAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
    activeLocationId: typeof raw.activeLocationId === 'string' && raw.activeLocationId.trim().length > 0
      ? raw.activeLocationId.trim()
      : null,
    damageTaken: normalizeCount(raw.damageTaken),
    goldEarned: normalizeCount(raw.goldEarned),
    goldSpent: normalizeCount(raw.goldSpent),
    questsCompleted: normalizeCount(raw.questsCompleted),
    itemsCollected: normalizeCount(raw.itemsCollected),
    bossesDefeated: normalizeStringArray(raw.bossesDefeated)
  };

  return gameState.runSummary;
}

export function resetRunSummary(
  gameState: GameState,
  activeLocationId: string | null = null,
  now: number = Date.now()
): RunSummary {
  gameState.runSummary = createRunSummary(now, activeLocationId);
  return gameState.runSummary;
}

export function closeRunSummary(gameState: GameState, now: number = Date.now()): RunSummary {
  const runSummary = ensureRunSummary(gameState);
  runSummary.activeLocationId = null;
  runSummary.updatedAt = now;
  return runSummary;
}

function addRunSummaryValue(
  gameState: GameState,
  key: 'damageTaken' | 'goldEarned' | 'goldSpent' | 'questsCompleted' | 'itemsCollected',
  amount: number,
  now: number = Date.now()
): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const runSummary = ensureRunSummary(gameState);
  runSummary[key] += Math.floor(amount);
  runSummary.updatedAt = now;
}

export function recordRunDamageTaken(
  gameState: GameState,
  amount: number,
  now: number = Date.now()
): void {
  addRunSummaryValue(gameState, 'damageTaken', amount, now);
}

export function recordRunGoldEarned(
  gameState: GameState,
  amount: number,
  now: number = Date.now()
): void {
  addRunSummaryValue(gameState, 'goldEarned', amount, now);
}

export function recordRunGoldSpent(
  gameState: GameState,
  amount: number,
  now: number = Date.now()
): void {
  addRunSummaryValue(gameState, 'goldSpent', amount, now);
}

export function recordRunQuestCompleted(
  gameState: GameState,
  amount: number = 1,
  now: number = Date.now()
): void {
  addRunSummaryValue(gameState, 'questsCompleted', amount, now);
}

export function recordRunItemsCollected(
  gameState: GameState,
  amount: number,
  now: number = Date.now()
): void {
  addRunSummaryValue(gameState, 'itemsCollected', amount, now);
}

export function recordRunBossDefeat(
  gameState: GameState,
  bossId: string,
  now: number = Date.now()
): void {
  const normalizedBossId = bossId.trim();
  if (normalizedBossId.length === 0) {
    return;
  }

  const runSummary = ensureRunSummary(gameState);
  if (!runSummary.bossesDefeated.includes(normalizedBossId)) {
    runSummary.bossesDefeated.push(normalizedBossId);
  }
  runSummary.updatedAt = now;
}

function buildAchievementView(
  definition: AchievementDefinition,
  unlockedState: AchievementUnlockState | undefined,
  gameState: GameState
): AchievementView {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    accent: definition.accent,
    unlocked: Boolean(unlockedState),
    unlockedAt: unlockedState?.unlockedAt,
    rewardPreview: formatAchievementRewardPreview(definition),
    progress: getRuleProgress(definition, gameState)
  };
}

function formatAchievementProgress(view: Pick<AchievementView, 'progress'>): string {
  return `${view.progress.current}/${view.progress.target}`;
}

function buildShopTierToken(unlock: AchievementRewardShopTierUnlock): string {
  return `${unlock.shopId}:${unlock.tierKey}`;
}

function formatShopName(shopId: string): string {
  const shop = getShop(shopId);
  if (!shop) {
    return shopId;
  }

  return shop.name.replace(/\s+\([^)]*\)\s*$/, '');
}

function formatShopTierLabel(tierKey: string): string {
  if (tierKey === 'always') {
    return '상시 진열';
  }

  const match = tierKey.match(/^level(\d+)$/);
  if (!match) {
    return tierKey;
  }

  return `Lv${match[1]} 진열`;
}

function formatShopTierUnlock(unlock: AchievementRewardShopTierUnlock): string {
  return `${formatShopName(unlock.shopId)} ${formatShopTierLabel(unlock.tierKey)} 해금`;
}

export function getAchievementPerkSummary(gameState: GameState): string[] {
  const perkState = ensureAchievementPerkState(gameState);
  const summary: string[] = [];

  if (perkState.inventorySizeBonus > 0) {
    summary.push(`가방 +${perkState.inventorySizeBonus}칸`);
  }

  if (perkState.shopDiscountPercent > 0) {
    summary.push(`상점 할인 ${perkState.shopDiscountPercent}%`);
  }

  if (perkState.unlockedShopTiers.length > 0) {
    summary.push(`특수 진열 ${perkState.unlockedShopTiers.length}개`);
  }

  return summary;
}

function getTrackingCausePrefix(cause?: string): string {
  return cause ? `${cause} 후 ` : '';
}

function appendAchievementTrackingHistory(
  trackingState: AchievementTrackingState,
  entry: AchievementTrackingHistoryEntry
): void {
  trackingState.history.unshift(entry);
  if (trackingState.history.length > ACHIEVEMENT_TRACKING_HISTORY_LIMIT) {
    trackingState.history.length = ACHIEVEMENT_TRACKING_HISTORY_LIMIT;
  }
}

function createAchievementTrackingHistoryEntry(
  type: AchievementTrackingHistoryType,
  achievement: AchievementView | null,
  now: number,
  mode?: AchievementTrackingMode,
  cause?: string
): AchievementTrackingHistoryEntry {
  const progress = achievement ? formatAchievementProgress(achievement) : undefined;
  const causePrefix = getTrackingCausePrefix(cause);
  const modeLabel = mode === 'pinned' ? '핀 고정' : '자동 전환';
  const achievementLabel = achievement
    ? `${achievement.title}${progress ? ` ${progress}` : ''}`
    : null;

  const message = (() => {
    switch (type) {
      case 'mode':
        return `${causePrefix}추적 모드 변경: ${modeLabel}`;
      case 'tracked':
        return achievementLabel
          ? `${causePrefix}${mode === 'pinned' ? '추적 고정' : '추적 시작'}: ${achievementLabel}`
          : `${causePrefix}${mode === 'pinned' ? '추적 고정' : '추적 시작'}`;
      case 'switched':
        return achievementLabel
          ? `${causePrefix}${mode === 'pinned' ? '추적 변경' : '자동 전환'}: ${achievementLabel}`
          : `${causePrefix}${mode === 'pinned' ? '추적 변경' : '자동 전환'}`;
      case 'completed':
        return achievementLabel
          ? `${causePrefix}추적 완료: ${achievementLabel}`
          : `${causePrefix}추적 완료`;
      case 'cleared':
      default:
        return `${causePrefix}추적 해제`;
    }
  })();

  return {
    timestamp: now,
    type,
    message,
    achievementId: achievement?.id,
    achievementTitle: achievement?.title,
    progress,
    mode,
    cause
  };
}

export function compareAchievementViewsByPriority(left: AchievementView, right: AchievementView): number {
  if (left.unlocked !== right.unlocked) {
    return left.unlocked ? 1 : -1;
  }

  if (!left.unlocked && !right.unlocked) {
    const leftPercent = left.progress.target > 0
      ? (left.progress.current / left.progress.target) * 100
      : 0;
    const rightPercent = right.progress.target > 0
      ? (right.progress.current / right.progress.target) * 100
      : 0;

    if (leftPercent !== rightPercent) {
      return rightPercent - leftPercent;
    }

    const leftRemaining = Math.max(0, left.progress.target - left.progress.current);
    const rightRemaining = Math.max(0, right.progress.target - right.progress.current);
    if (leftRemaining !== rightRemaining) {
      return leftRemaining - rightRemaining;
    }
  }

  if (left.unlocked && right.unlocked) {
    const leftUnlockedAt = left.unlockedAt ?? 0;
    const rightUnlockedAt = right.unlockedAt ?? 0;
    if (leftUnlockedAt !== rightUnlockedAt) {
      return rightUnlockedAt - leftUnlockedAt;
    }
  }

  return left.title.localeCompare(right.title, 'ko-KR');
}

export function getAchievementById(
  gameState: GameState,
  achievementId: string | null | undefined
): AchievementView | null {
  if (!achievementId) {
    return null;
  }

  return getAchievementSummary(gameState).entries.find(entry => entry.id === achievementId) ?? null;
}

export function getNextAchievement(gameState: GameState): AchievementView | null {
  return getAchievementSummary(gameState).entries
    .filter(entry => !entry.unlocked)
    .sort(compareAchievementViewsByPriority)[0] ?? null;
}

export function getSuggestedTrackedAchievement(gameState: GameState): AchievementView | null {
  const candidate = getNextAchievement(gameState);
  if (!candidate) {
    return null;
  }

  const remaining = Math.max(0, candidate.progress.target - candidate.progress.current);
  const progressPercent = candidate.progress.target > 0
    ? (candidate.progress.current / candidate.progress.target) * 100
    : 0;

  return progressPercent >= 75 || remaining <= 1
    ? candidate
    : null;
}

export function getTrackedAchievement(gameState: GameState): AchievementView | null {
  const trackingState = ensureAchievementTrackingState(gameState);
  const trackedAchievement = getAchievementById(gameState, trackingState.achievementId);

  return trackedAchievement && !trackedAchievement.unlocked
    ? trackedAchievement
    : null;
}

export function syncAchievementTrackingState(
  gameState: GameState,
  options: AchievementTrackingOptions = {}
): AchievementTrackingChangeResult {
  const now = options.now ?? Date.now();
  const recordHistory = options.recordHistory ?? false;
  const trackingState = ensureAchievementTrackingState(gameState);
  const previous = getAchievementById(gameState, trackingState.achievementId);
  const history: AchievementTrackingHistoryEntry[] = [];

  const pushHistory = (
    type: AchievementTrackingHistoryType,
    achievement: AchievementView | null,
    mode: AchievementTrackingMode = trackingState.mode
  ): void => {
    if (!recordHistory) {
      return;
    }

    const entry = createAchievementTrackingHistoryEntry(type, achievement, now, mode, options.cause);
    appendAchievementTrackingHistory(trackingState, entry);
    history.push(entry);
  };

  if (trackingState.mode === 'pinned') {
    if (previous?.unlocked || (trackingState.achievementId && !previous)) {
      if (previous?.unlocked) {
        pushHistory('completed', previous);
      } else {
        pushHistory('cleared', null);
      }
      trackingState.achievementId = null;
      trackingState.updatedAt = now;
    }

    return {
      previous,
      current: getAchievementById(gameState, trackingState.achievementId),
      history
    };
  }

  const suggested = getSuggestedTrackedAchievement(gameState);
  const previousId = trackingState.achievementId;
  const suggestedId = suggested?.id ?? null;

  if (previous?.unlocked) {
    pushHistory('completed', previous);
  }

  if (previousId !== suggestedId) {
    if (suggested) {
      pushHistory(previous ? 'switched' : 'tracked', suggested);
    } else if (previousId && !previous?.unlocked) {
      pushHistory('cleared', null);
    }
    trackingState.achievementId = suggestedId;
    trackingState.updatedAt = now;
  }

  return {
    previous,
    current: suggested,
    history
  };
}

export function setAchievementTrackingMode(
  gameState: GameState,
  mode: AchievementTrackingMode,
  options: AchievementTrackingOptions = {}
): AchievementTrackingChangeResult {
  const now = options.now ?? Date.now();
  const trackingState = ensureAchievementTrackingState(gameState);
  const previous = getAchievementById(gameState, trackingState.achievementId);
  const history: AchievementTrackingHistoryEntry[] = [];

  const pushHistory = (type: AchievementTrackingHistoryType, achievement: AchievementView | null): void => {
    if (!options.recordHistory) {
      return;
    }

    const entry = createAchievementTrackingHistoryEntry(type, achievement, now, mode, options.cause);
    appendAchievementTrackingHistory(trackingState, entry);
    history.push(entry);
  };

  const modeChanged = trackingState.mode !== mode;
  trackingState.mode = mode;
  trackingState.updatedAt = now;

  if (modeChanged) {
    pushHistory('mode', null);
  }

  if (mode === 'pinned' && !trackingState.achievementId) {
    const seed = getSuggestedTrackedAchievement(gameState) ?? getNextAchievement(gameState);
    if (seed) {
      trackingState.achievementId = seed.id;
      trackingState.updatedAt = now;
      pushHistory('tracked', seed);
    }
  }

  if (mode === 'auto') {
    const syncResult = syncAchievementTrackingState(gameState, options);
    history.push(...syncResult.history);
    return {
      previous,
      current: syncResult.current,
      history
    };
  }

  return {
    previous,
    current: getAchievementById(gameState, trackingState.achievementId),
    history
  };
}

export function trackAchievement(
  gameState: GameState,
  achievementId: string,
  options: AchievementTrackingOptions & { mode?: AchievementTrackingMode } = {}
): AchievementTrackingChangeResult {
  const now = options.now ?? Date.now();
  const trackingState = ensureAchievementTrackingState(gameState);
  const previous = getAchievementById(gameState, trackingState.achievementId);
  const next = getAchievementById(gameState, achievementId);

  if (!next || next.unlocked) {
    return {
      previous,
      current: previous && !previous.unlocked ? previous : null,
      history: []
    };
  }

  const nextMode = options.mode ?? trackingState.mode;
  const history: AchievementTrackingHistoryEntry[] = [];
  const pushHistory = (type: AchievementTrackingHistoryType, achievement: AchievementView | null): void => {
    if (!options.recordHistory) {
      return;
    }

    const entry = createAchievementTrackingHistoryEntry(type, achievement, now, nextMode, options.cause);
    appendAchievementTrackingHistory(trackingState, entry);
    history.push(entry);
  };

  if (trackingState.mode !== nextMode) {
    trackingState.mode = nextMode;
    trackingState.updatedAt = now;
    pushHistory('mode', null);
  }

  if (trackingState.achievementId !== next.id) {
    trackingState.achievementId = next.id;
    trackingState.updatedAt = now;
    pushHistory(previous ? 'switched' : 'tracked', next);
  }

  return {
    previous,
    current: next,
    history
  };
}

export function clearAchievementTracking(
  gameState: GameState,
  options: AchievementTrackingOptions = {}
): AchievementTrackingChangeResult {
  const now = options.now ?? Date.now();
  const trackingState = ensureAchievementTrackingState(gameState);
  const previous = getAchievementById(gameState, trackingState.achievementId);
  const history: AchievementTrackingHistoryEntry[] = [];

  if (!trackingState.achievementId) {
    return {
      previous,
      current: null,
      history
    };
  }

  trackingState.achievementId = null;
  trackingState.updatedAt = now;

  if (options.recordHistory) {
    const entry = createAchievementTrackingHistoryEntry(
      'cleared',
      null,
      now,
      trackingState.mode,
      options.cause
    );
    appendAchievementTrackingHistory(trackingState, entry);
    history.push(entry);
  }

  return {
    previous,
    current: null,
    history
  };
}

function applyAchievementReward(
  gameState: GameState,
  definition: AchievementDefinition,
  unlockedAt: number,
  unlockState?: AchievementUnlockState
): AchievementRewardGrant {
  const reward = definition.reward ?? {};
  const itemsAdded: AchievementRewardGrant['itemsAdded'] = [];
  const itemsFailed: AchievementRewardGrant['itemsFailed'] = [];
  const unlockedShopTiers: AchievementRewardGrant['unlockedShopTiers'] = [];
  const perkState = ensureAchievementPerkState(gameState);

  const goldGranted = Math.max(0, reward.gold ?? 0);
  if (goldGranted > 0) {
    gameState.player.gold += goldGranted;
    gameState.statistics.goldEarned += goldGranted;
  }

  const skillPointsGranted = Math.max(0, reward.skillPoints ?? 0);
  if (skillPointsGranted > 0) {
    gameState.player.skillPoints += skillPointsGranted;
  }

  const inventorySlotsGranted = Math.max(0, reward.inventorySlots ?? 0);
  if (inventorySlotsGranted > 0) {
    perkState.inventorySizeBonus += inventorySlotsGranted;
    gameState.player.maxInventorySize += inventorySlotsGranted;
  }

  const requestedDiscount = Math.max(0, reward.shopDiscountPercent ?? 0);
  let shopDiscountPercentGranted = 0;
  if (requestedDiscount > 0) {
    const nextDiscount = Math.min(
      ACHIEVEMENT_SHOP_DISCOUNT_CAP,
      perkState.shopDiscountPercent + requestedDiscount
    );
    shopDiscountPercentGranted = nextDiscount - perkState.shopDiscountPercent;
    perkState.shopDiscountPercent = nextDiscount;
  }

  for (const itemReward of reward.items ?? []) {
    const quantity = Math.max(0, itemReward.quantity);
    if (quantity <= 0) {
      continue;
    }

    let addedCount = 0;
    for (let index = 0; index < quantity; index += 1) {
      const result = addItem(gameState.player, itemReward.itemId, 1);
      if (result.success) {
        addedCount += 1;
      } else {
        break;
      }
    }

    if (addedCount > 0) {
      itemsAdded.push({
        itemId: itemReward.itemId,
        quantity: addedCount
      });
      gameState.statistics.itemsCollected += addedCount;
    }

    if (addedCount < quantity) {
      itemsFailed.push({
        itemId: itemReward.itemId,
        quantity: quantity - addedCount
      });
    }
  }

  for (const shopTierUnlock of reward.unlockShopTiers ?? []) {
    const token = buildShopTierToken(shopTierUnlock);
    if (perkState.unlockedShopTiers.includes(token)) {
      continue;
    }

    perkState.unlockedShopTiers.push(token);
    unlockedShopTiers.push(shopTierUnlock);
  }

  if (unlockState) {
    unlockState.rewardGrantedAt = unlockedAt;
  } else {
    const currentUnlockState = ensureAchievementState(gameState).unlocked[definition.id];
    if (currentUnlockState) {
      currentUnlockState.rewardGrantedAt = unlockedAt;
    }
  }

  return {
    achievementId: definition.id,
    achievementTitle: definition.title,
    goldGranted,
    skillPointsGranted,
    itemsAdded,
    itemsFailed,
    inventorySlotsGranted,
    shopDiscountPercentGranted,
    unlockedShopTiers
  };
}

export function grantPendingAchievementRewards(
  gameState: GameState,
  now: number = Date.now()
): AchievementRewardGrant[] {
  const achievementState = ensureAchievementState(gameState);
  const rewardGrants: AchievementRewardGrant[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const unlockState = achievementState.unlocked[definition.id];
    if (!unlockState || unlockState.rewardGrantedAt) {
      continue;
    }

    rewardGrants.push(applyAchievementReward(gameState, definition, now, unlockState));
  }

  return rewardGrants;
}

export interface AchievementProgressionResult extends AchievementEvaluationResult {
  trackingHistory: AchievementTrackingHistoryEntry[];
}

export function progressAchievements(
  gameState: GameState,
  options: AchievementTrackingOptions = {}
): AchievementProgressionResult {
  const now = options.now ?? Date.now();
  const evaluation = evaluateAchievements(gameState, now);
  const tracking = syncAchievementTrackingState(gameState, {
    now,
    recordHistory: options.recordHistory,
    cause: options.cause
  });

  return {
    ...evaluation,
    trackingHistory: tracking.history
  };
}

export function evaluateAchievements(
  gameState: GameState,
  now: number = Date.now()
): AchievementEvaluationResult {
  const achievementState = ensureAchievementState(gameState);
  ensureAchievementTrackingState(gameState);
  ensureAchievementPerkState(gameState);
  ensureRunSummary(gameState);

  const newlyUnlocked: AchievementView[] = [];
  const rewardGrants: AchievementRewardGrant[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (achievementState.unlocked[definition.id]) {
      continue;
    }

    if (!isDefinitionUnlocked(definition, gameState)) {
      continue;
    }

    const unlockState = achievementState.unlocked[definition.id] = {
      unlockedAt: now
    };
    rewardGrants.push(applyAchievementReward(gameState, definition, now, unlockState));
    newlyUnlocked.push(buildAchievementView(definition, unlockState, gameState));
  }

  return {
    newlyUnlocked,
    rewardGrants,
    unlockedCount: Object.keys(achievementState.unlocked).length,
    totalCount: TOTAL_ACHIEVEMENT_COUNT
  };
}

export function getAchievementSummary(gameState: GameState): AchievementSummary {
  const achievementState = ensureAchievementState(gameState);
  ensureAchievementPerkState(gameState);
  ensureRunSummary(gameState);

  const entries = ACHIEVEMENT_DEFINITIONS.map(definition =>
    buildAchievementView(definition, achievementState.unlocked[definition.id], gameState)
  );

  const recentUnlocked = entries
    .filter(entry => entry.unlocked)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));

  return {
    unlockedCount: recentUnlocked.length,
    totalCount: TOTAL_ACHIEVEMENT_COUNT,
    latestUnlocked: recentUnlocked[0] ?? null,
    recentUnlocked: recentUnlocked.slice(0, 3),
    entries
  };
}

export function formatAchievementUnlockMessage(
  achievement: Pick<AchievementView, 'title'>
): string {
  return `업적 해금: ${achievement.title}`;
}

export function formatAchievementTrackingMessage(
  entry: AchievementTrackingHistoryEntry
): string {
  return `[업적 추적] ${entry.message}`;
}

export function getAchievementTrackingTone(
  entry: AchievementTrackingHistoryEntry
): 'info' | 'success' | 'warning' {
  if (entry.type === 'completed') {
    return 'success';
  }

  if (entry.type === 'cleared') {
    return 'warning';
  }

  return 'info';
}

export function formatAchievementRewardPreview(
  achievement: Pick<AchievementDefinition, 'reward'>
): string | undefined {
  const reward = achievement.reward;
  if (!reward) {
    return undefined;
  }

  const parts: string[] = [];
  if (reward.gold && reward.gold > 0) {
    parts.push(`골드 +${reward.gold}`);
  }
  if (reward.skillPoints && reward.skillPoints > 0) {
    parts.push(`SP +${reward.skillPoints}`);
  }
  if (reward.inventorySlots && reward.inventorySlots > 0) {
    parts.push(`가방 +${reward.inventorySlots}칸`);
  }
  if (reward.shopDiscountPercent && reward.shopDiscountPercent > 0) {
    parts.push(`상점 할인 ${reward.shopDiscountPercent}%`);
  }
  for (const item of reward.items ?? []) {
    const itemName = getItemById(item.itemId)?.name ?? item.itemId;
    parts.push(`${itemName} x${item.quantity}`);
  }
  for (const unlock of reward.unlockShopTiers ?? []) {
    parts.push(formatShopTierUnlock(unlock));
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function formatAchievementRewardMessage(
  rewardGrant: AchievementRewardGrant
): string {
  const parts: string[] = [];

  if (rewardGrant.goldGranted > 0) {
    parts.push(`골드 +${rewardGrant.goldGranted}`);
  }

  if (rewardGrant.skillPointsGranted > 0) {
    parts.push(`SP +${rewardGrant.skillPointsGranted}`);
  }

  if (rewardGrant.inventorySlotsGranted > 0) {
    parts.push(`가방 +${rewardGrant.inventorySlotsGranted}칸`);
  }

  if (rewardGrant.shopDiscountPercentGranted > 0) {
    parts.push(`상점 할인 ${rewardGrant.shopDiscountPercentGranted}%`);
  }

  for (const item of rewardGrant.itemsAdded) {
    const itemName = getItemById(item.itemId)?.name ?? item.itemId;
    parts.push(`${itemName} x${item.quantity}`);
  }

  for (const unlock of rewardGrant.unlockedShopTiers) {
    parts.push(formatShopTierUnlock(unlock));
  }

  if (parts.length === 0) {
    return `업적 보상 적용: ${rewardGrant.achievementTitle}`;
  }

  return `업적 보상: ${rewardGrant.achievementTitle} · ${parts.join(', ')}`;
}
