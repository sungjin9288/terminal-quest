import { getLocationById } from '../data/locations.js';
import {
  AiIntent,
  AiRecommendationAction,
  AiState
} from '../types/ai.js';
import { GameState } from '../types/game.js';
import { ensureAchievementTrackingState } from './achievements.js';
import { buildAiContext, type AiContext } from './aiContext.js';

const AI_MEMORY_LIMIT = 8;

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildIntent(
  now: number,
  intent: Omit<AiIntent, 'createdAt' | 'confidence'> & { confidence?: number }
): AiIntent {
  return {
    createdAt: now,
    confidence: clampConfidence(intent.confidence ?? 0.75),
    ...intent,
    lines: intent.lines.slice(0, 3)
  };
}

function appendTrackingLine(context: AiContext, lines: string[]): string[] {
  const tracked = context.trackedAchievement;
  if (!tracked) {
    return lines;
  }

  const trackingLine = `업적 추적: ${tracked.title} ${tracked.progressLabel}`;
  if (lines.some(line => line.includes(tracked.title))) {
    return lines;
  }

  return [...lines, trackingLine].slice(0, 3);
}

function resolveTownAction(
  context: AiContext,
  primaryAction: AiRecommendationAction | null,
  hasQuestLine: boolean
): AiRecommendationAction {
  if (context.hpRatio <= 0.45) {
    return context.canAffordInnRest ? 'inn' : 'explore';
  }

  if (context.inventoryRatio >= 0.9) {
    return 'shop';
  }

  if (primaryAction === 'quest' && !hasQuestLine) {
    return 'explore';
  }

  return primaryAction ?? (hasQuestLine ? 'quest' : 'explore');
}

function resolveDungeonAction(
  context: AiContext,
  primaryAction: AiRecommendationAction | null
): AiRecommendationAction {
  if (context.hpRatio <= 0.4 || context.mpRatio <= 0.3) {
    return 'rest';
  }

  return primaryAction ?? 'explore';
}

function buildAchievementIntent(context: AiContext, now: number): AiIntent | null {
  const tracked = context.trackedAchievement;
  if (!tracked) {
    return null;
  }

  const actionByCategory: Record<string, AiRecommendationAction> = {
    quest: context.isTown ? 'quest' : 'travel',
    economy: context.isTown ? 'shop' : 'travel',
    exploration: 'travel',
    boss: context.isTown ? 'travel' : 'explore',
    act: context.isTown ? 'quest' : 'travel',
    challenge: context.isTown ? 'travel' : 'explore'
  };

  const recommendedAction = context.isTown
    ? resolveTownAction(context, actionByCategory[tracked.category] ?? 'travel', true)
    : resolveDungeonAction(context, actionByCategory[tracked.category] ?? 'explore');

  return buildIntent(now, {
    id: `achievement-track:${tracked.id}`,
    kind: 'achievement-track',
    title: tracked.title,
    reason: `${tracked.description} (${tracked.progressLabel})`,
    tone: tracked.progressPercent >= 75 ? 'success' : 'info',
    recommendedAction,
    recommendedLocationId: context.recommendedTravelDestinationId,
    lines: [
      `${tracked.description} (${tracked.progressLabel})`,
      context.recommendedTravelDestinationId
        ? `추천 목적지: ${getLocationById(context.recommendedTravelDestinationId)?.name ?? context.recommendedTravelDestinationId}`
        : '현재 루프에서 이어서 달성할 수 있는 목표입니다.'
    ],
    targetAchievementId: tracked.id,
    confidence: tracked.progressPercent >= 75 ? 0.76 : 0.62
  });
}

function buildPrimaryIntent(context: AiContext, now: number): AiIntent {
  const questFocus = context.questFocus;
  const currentLocation = getLocationById(context.currentLocationId);
  const currentLocationName = currentLocation?.name ?? context.currentLocationId;

  if (questFocus?.readyToTurnIn) {
    const recommendedLocationId = context.isTown ? null : 'bit-town';
    return buildIntent(now, {
      id: `quest-turn-in:${questFocus.quest.id}`,
      kind: 'quest-turn-in',
      title: '완료 직전',
      reason: context.isTown
        ? `${questFocus.quest.name} 보상을 게시판에서 수령하세요.`
        : `${questFocus.quest.name} 완료. 마을로 돌아가 보상을 수령하세요.`,
      tone: 'success',
      recommendedAction: context.isTown
        ? resolveTownAction(context, 'quest', true)
        : resolveDungeonAction(context, 'travel'),
      recommendedLocationId,
      lines: appendTrackingLine(context, [
        context.isTown
          ? `${questFocus.quest.name} 보상을 게시판에서 수령하세요.`
          : `${questFocus.quest.name} 완료. 마을로 돌아가 보상을 수령하세요.`,
        !context.isTown ? '추천 목적지: 비트 타운' : '게시판 정산 후 다음 진행 루트를 다시 열 수 있습니다.'
      ]),
      targetQuestId: questFocus.quest.id,
      confidence: 0.96
    });
  }

  if (context.bossProgress) {
    return buildIntent(now, {
      id: `boss-approach:${context.bossProgress.bossId}`,
      kind: 'boss-approach',
      title: context.bossProgress.ready ? '보스 경보' : '보스 추적',
      reason: context.bossProgress.ready
        ? `${context.bossProgress.bossName}이(가) 출현할 수 있습니다. 다음 전투를 준비하세요.`
        : `${context.bossProgress.bossName} 조우까지 탐색 ${context.bossProgress.remainingSteps}회 남았습니다.`,
      tone: context.bossProgress.ready ? 'warning' : 'info',
      recommendedAction: resolveDungeonAction(context, 'explore'),
      recommendedLocationId: null,
      lines: appendTrackingLine(context, [
        context.bossProgress.ready
          ? `${context.bossProgress.bossName}이(가) 출현할 수 있습니다. 다음 전투를 준비하세요.`
          : `${context.bossProgress.bossName} 조우까지 탐색 ${context.bossProgress.remainingSteps}회 남음 (${context.bossProgress.stepsTaken}/${context.bossProgress.stepsRequired})`,
        context.frontierRewardPreview ?? '자원 상태를 정비한 뒤 탐색을 이어가세요.'
      ]),
      confidence: context.bossProgress.ready ? 0.93 : 0.86
    });
  }

  if (questFocus) {
    const needsTravel = Boolean(
      questFocus.destinationId &&
      questFocus.destinationId !== context.currentLocationId
    );
    const recommendedAction = context.isTown
      ? resolveTownAction(context, needsTravel ? 'travel' : 'quest', true)
      : resolveDungeonAction(context, needsTravel ? 'travel' : 'explore');
    const destinationName = questFocus.destinationId
      ? getLocationById(questFocus.destinationId)?.name ?? questFocus.destinationId
      : null;

    return buildIntent(now, {
      id: `quest-objective:${questFocus.quest.id}`,
      kind: 'quest-objective',
      title: '다음 목표',
      reason: `${questFocus.quest.name}: ${questFocus.objective.description}`,
      tone: 'info',
      recommendedAction,
      recommendedLocationId: needsTravel ? questFocus.destinationId : null,
      lines: appendTrackingLine(context, [
        `${questFocus.quest.name}: ${questFocus.objective.description}`,
        needsTravel && destinationName
          ? `추천 목적지: ${destinationName}`
          : context.isTown && context.availableQuestCount > 0
            ? `추가 수락 가능 퀘스트 ${context.availableQuestCount}개`
            : `${currentLocationName}에서 바로 진척을 만들 수 있습니다.`
      ]),
      targetQuestId: questFocus.quest.id,
      confidence: 0.88
    });
  }

  if (context.isTown && context.inventoryRatio >= 0.9) {
    return buildIntent(now, {
      id: 'inventory-pressure:town',
      kind: 'inventory-pressure',
      title: '정비 필요',
      reason: '인벤토리가 거의 가득 찼습니다. 상점에서 정리해 드랍 손실을 막으세요.',
      tone: 'warning',
      recommendedAction: resolveTownAction(context, 'shop', false),
      recommendedLocationId: null,
      lines: appendTrackingLine(context, [
        '인벤토리가 거의 가득 찼습니다. 상점에서 정리해 드랍 손실을 막으세요.',
        '장비와 소모품을 정리한 뒤 다음 전선으로 나가는 편이 안전합니다.'
      ]),
      confidence: 0.82
    });
  }

  if (context.isTown && context.availableQuestCount > 0) {
    return buildIntent(now, {
      id: 'new-quest:town',
      kind: 'new-quest',
      title: '새 퀘스트',
      reason: `게시판에서 다음 의뢰 ${context.availableQuestCount}개를 확인하세요.`,
      tone: 'info',
      recommendedAction: resolveTownAction(context, 'quest', true),
      recommendedLocationId: 'bit-town',
      lines: appendTrackingLine(context, [
        `수락 가능 퀘스트 ${context.availableQuestCount}개가 있습니다.`,
        '게시판에서 다음 진행 루트를 확보하세요.'
      ]),
      confidence: 0.78
    });
  }

  if (context.frontier) {
    const readinessText = context.frontierLevelFit === 'under'
      ? '조금 위험하지만 다음 진척을 위해 공략해야 하는'
      : context.frontierLevelFit === 'over'
        ? '가볍게 정리하면서 보상을 챙길 수 있는'
        : '지금 공략하기 좋은';

    return buildIntent(now, {
      id: `frontier:${context.frontier.id}`,
      kind: 'frontier',
      title: '다음 공략',
      reason: `${context.frontier.name}은(는) ${readinessText} 지역입니다.`,
      tone: context.frontierLevelFit === 'under' ? 'warning' : 'info',
      recommendedAction: context.isTown
        ? resolveTownAction(context, 'travel', false)
        : resolveDungeonAction(context, 'travel'),
      recommendedLocationId: context.frontier.id,
      lines: appendTrackingLine(context, [
        `${context.frontier.name}은(는) ${readinessText} 지역입니다.`,
        context.frontierRewardPreview
          ? `첫 클리어 보상: ${context.frontierRewardPreview}`
          : `예상 플레이 시간: ${context.frontier.targetPlaytime}`
      ]),
      confidence: context.frontierLevelFit === 'under' ? 0.74 : 0.81
    });
  }

  const achievementIntent = buildAchievementIntent(context, now);
  if (achievementIntent) {
    return achievementIntent;
  }

  const recommendedAction = context.isTown
    ? resolveTownAction(context, null, context.availableQuestCount > 0)
    : resolveDungeonAction(context, null);

  return buildIntent(now, {
    id: `steady-progress:${context.currentLocationId}`,
    kind: 'steady-progress',
    title: '세션 유지',
    reason: context.isTown
      ? `${currentLocationName}에서 다음 준비를 이어가세요.`
      : `${currentLocationName} 탐험을 이어가며 다음 전투를 준비하세요.`,
    tone: 'info',
    recommendedAction,
    recommendedLocationId: context.recommendedTravelDestinationId,
    lines: appendTrackingLine(context, [
      context.isTown
        ? '퀘스트 확인 → 정비 → 저장 순서로 다음 구간을 준비하세요.'
        : '탐험 2~3회마다 상태를 점검하고, 위험하면 즉시 이동해 손실을 줄이세요.'
    ]),
    confidence: 0.55
  });
}

function normalizeAiIntent(value: unknown): AiIntent | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.reason !== 'string') {
    return null;
  }

  return {
    id: raw.id,
    kind: typeof raw.kind === 'string' ? raw.kind as AiIntent['kind'] : 'steady-progress',
    title: raw.title,
    reason: raw.reason,
    tone: raw.tone === 'success' || raw.tone === 'warning' ? raw.tone : 'info',
    confidence: typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
      ? clampConfidence(raw.confidence)
      : 0.5,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now(),
    recommendedAction: typeof raw.recommendedAction === 'string'
      ? raw.recommendedAction as AiRecommendationAction
      : null,
    recommendedLocationId: typeof raw.recommendedLocationId === 'string'
      ? raw.recommendedLocationId
      : null,
    lines: Array.isArray(raw.lines)
      ? raw.lines.filter((line): line is string => typeof line === 'string').slice(0, 3)
      : [],
    targetQuestId: typeof raw.targetQuestId === 'string' ? raw.targetQuestId : undefined,
    targetAchievementId: typeof raw.targetAchievementId === 'string' ? raw.targetAchievementId : undefined
  };
}

export function createAiState(): AiState {
  return {
    directorMode: 'full',
    narrativeMode: 'light',
    currentIntent: null,
    fatigueSnapshot: {
      repeatActionCount: 0,
      consecutiveCombats: 0,
      consecutiveNonProgressLoops: 0
    },
    memory: {
      recentMoments: []
    }
  };
}

export function ensureAiState(gameState: GameState): AiState {
  const legacyGameState = gameState as GameState & { aiState?: unknown };
  const fallback = createAiState();

  if (typeof legacyGameState.aiState !== 'object' || legacyGameState.aiState === null) {
    gameState.aiState = fallback;
    return gameState.aiState;
  }

  const raw = legacyGameState.aiState as unknown as Record<string, unknown>;
  const hasNormalizedShape =
    (raw.directorMode === 'off' || raw.directorMode === 'light' || raw.directorMode === 'full') &&
    (raw.narrativeMode === 'off' || raw.narrativeMode === 'light' || raw.narrativeMode === 'full') &&
    typeof raw.fatigueSnapshot === 'object' &&
    raw.fatigueSnapshot !== null &&
    typeof raw.memory === 'object' &&
    raw.memory !== null;
  if (hasNormalizedShape) {
    return raw as unknown as AiState;
  }

  const rawFatigue = typeof raw.fatigueSnapshot === 'object' && raw.fatigueSnapshot !== null
    ? raw.fatigueSnapshot as Record<string, unknown>
    : null;
  const rawMemory = typeof raw.memory === 'object' && raw.memory !== null
    ? raw.memory as Record<string, unknown>
    : null;
  gameState.aiState = {
    directorMode: raw.directorMode === 'off' || raw.directorMode === 'light' || raw.directorMode === 'full'
      ? raw.directorMode
      : fallback.directorMode,
    narrativeMode: raw.narrativeMode === 'off' || raw.narrativeMode === 'light' || raw.narrativeMode === 'full'
      ? raw.narrativeMode
      : fallback.narrativeMode,
    currentIntent: normalizeAiIntent(raw.currentIntent),
    fatigueSnapshot: {
      repeatActionCount: typeof rawFatigue?.repeatActionCount === 'number'
        ? Math.max(0, Math.floor(rawFatigue.repeatActionCount))
        : 0,
      consecutiveCombats: typeof rawFatigue?.consecutiveCombats === 'number'
        ? Math.max(0, Math.floor(rawFatigue.consecutiveCombats))
        : 0,
      consecutiveNonProgressLoops: typeof rawFatigue?.consecutiveNonProgressLoops === 'number'
        ? Math.max(0, Math.floor(rawFatigue.consecutiveNonProgressLoops))
        : 0
    },
    memory: {
      recentMoments: Array.isArray(rawMemory?.recentMoments)
        ? (rawMemory.recentMoments as unknown[])
          .filter((entry): entry is { type: string; label: string; timestamp: number } =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as Record<string, unknown>).type === 'string' &&
            typeof (entry as Record<string, unknown>).label === 'string' &&
            typeof (entry as Record<string, unknown>).timestamp === 'number'
          )
          .slice(0, AI_MEMORY_LIMIT)
        : []
    }
  };

  return gameState.aiState;
}

export function syncAiState(gameState: GameState, now: number = Date.now()): AiState {
  let aiState = ensureAiState(gameState);
  ensureAchievementTrackingState(gameState);

  if (aiState.directorMode === 'off') {
    aiState.currentIntent = null;
    return aiState;
  }

  const context = buildAiContext(gameState);
  aiState = ensureAiState(gameState);
  const nextIntent = buildPrimaryIntent(context, now);
  const previousIntent = aiState.currentIntent;

  if (
    previousIntent &&
    previousIntent.id === nextIntent.id &&
    previousIntent.reason === nextIntent.reason &&
    previousIntent.recommendedAction === nextIntent.recommendedAction &&
    previousIntent.recommendedLocationId === nextIntent.recommendedLocationId
  ) {
    nextIntent.createdAt = previousIntent.createdAt;
  }

  aiState.currentIntent = nextIntent;
  return aiState;
}

export function getAiIntent(gameState: GameState, now: number = Date.now()): AiIntent | null {
  return syncAiState(gameState, now).currentIntent;
}
