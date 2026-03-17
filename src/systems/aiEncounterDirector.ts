import { type GameState } from '../types/index.js';
import {
  type AiEncounterDirectorPreview,
  type EncounterDirectorMode
} from '../types/ai.js';
import { ensureAiState } from './aiDirector.js';
import { getLocationBossProgress } from './aiContext.js';
import { type DungeonEventResult } from './dungeonEvents.js';
import {
  getEndgameChallengeState,
  type EndgameChallengeState
} from './endgameChallenge.js';

export type EncounterDirectorExploreOutcome = 'combat' | 'event';
export type EncounterDirectorResetCause = 'rest' | 'travel' | 'town';

export interface EncounterDirectorDecision extends AiEncounterDirectorPreview {
  outcome: EncounterDirectorExploreOutcome;
}

export function buildEncounterDirectorTelemetryPayload(
  decision: AiEncounterDirectorPreview | EncounterDirectorDecision,
  source: 'frontend-runtime' | 'terminal-runtime'
): Record<string, number | string | boolean | null> {
  const challengeContext = decision.challengeContext ?? null;
  return {
    source,
    mode: decision.mode,
    outcome: 'outcome' in decision ? decision.outcome : null,
    encounterChancePercent: Math.round(decision.encounterChance * 100),
    preferredEventId: decision.preferredEventId,
    repeatActionCount: decision.fatigueSnapshot.repeatActionCount,
    consecutiveCombats: decision.fatigueSnapshot.consecutiveCombats,
    consecutiveNonProgressLoops: decision.fatigueSnapshot.consecutiveNonProgressLoops,
    challengeActive: challengeContext !== null,
    challengeTier: challengeContext?.tier ?? null,
    challengeStreak: challengeContext?.streak ?? null,
    challengeModifierId: challengeContext?.modifierId ?? null
  };
}

export function coerceEncounterDirectorEventId(
  preferredEventId: string | null
): DungeonEventResult['id'] | null {
  switch (preferredEventId) {
    case 'supply-cache':
    case 'maintenance-niche':
    case 'memory-echo':
    case 'route-scan':
      return preferredEventId;
    default:
      return null;
  }
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getHpRatio(gameState: GameState): number {
  return gameState.player.stats.maxHp > 0
    ? gameState.player.stats.hp / gameState.player.stats.maxHp
    : 1;
}

function getMpRatio(gameState: GameState): number {
  return gameState.player.stats.maxMp > 0
    ? gameState.player.stats.mp / gameState.player.stats.maxMp
    : 1;
}

function buildPreview(
  mode: EncounterDirectorMode,
  encounterChance: number,
  preferredEventId: DungeonEventResult['id'] | null,
  reason: string,
  gameState: GameState,
  challengeState: EndgameChallengeState | null = null
): AiEncounterDirectorPreview {
  const fatigue = ensureAiState(gameState).fatigueSnapshot;
  return {
    mode,
    encounterChance: clampProbability(encounterChance),
    preferredEventId,
    reason,
    fatigueSnapshot: {
      repeatActionCount: fatigue.repeatActionCount,
      consecutiveCombats: fatigue.consecutiveCombats,
      consecutiveNonProgressLoops: fatigue.consecutiveNonProgressLoops
    },
    challengeContext: challengeState?.active
      ? {
          tier: challengeState.tier,
          streak: challengeState.streak,
          modifierId: challengeState.modifier?.id ?? null,
          modifierName: challengeState.modifier?.name ?? null
        }
      : null
  };
}

function getBaselineDecision(gameState: GameState): AiEncounterDirectorPreview {
  return {
    mode: 'steady',
    encounterChance: 0.6,
    preferredEventId: null,
    reason: '현재 전선 압력은 기본 탐험 리듬에 가깝습니다.',
    fatigueSnapshot: {
      ...ensureAiState(gameState).fatigueSnapshot
    },
    challengeContext: null
  };
}

function getEndgamePressureBias(challengeState: EndgameChallengeState): number {
  const modifierId = challengeState.modifier?.id ?? null;

  switch (modifierId) {
    case 'volatile-jackpot':
      return 0.08;
    case 'berserker-protocol':
      return 0.06;
    case 'arcane-overclock':
      return 0.05;
    case 'iron-bulwark':
      return -0.02;
    default:
      return 0;
  }
}

function getEndgameRoutePreference(
  challengeState: EndgameChallengeState
): DungeonEventResult['id'] | null {
  return challengeState.modifier?.id === 'iron-bulwark'
    ? 'route-scan'
    : null;
}

export function getEncounterDirectorPreview(gameState: GameState): AiEncounterDirectorPreview {
  const aiState = ensureAiState(gameState);
  const fatigue = aiState.fatigueSnapshot;
  const hpRatio = getHpRatio(gameState);
  const mpRatio = getMpRatio(gameState);
  const bossProgress = getLocationBossProgress(gameState);
  const challengeState = getEndgameChallengeState(gameState, gameState.player.currentLocation);
  let preview = getBaselineDecision(gameState);

  if (challengeState.active) {
    const tierPressureBonus = Math.min(0.12, challengeState.tier * 0.02);
    const streakPressureBonus = Math.min(0.08, challengeState.streak * 0.015);
    const basePressure = clampProbability(
      0.68 +
      tierPressureBonus +
      streakPressureBonus +
      getEndgamePressureBias(challengeState)
    );
    const modifierName = challengeState.modifier?.name ?? '심연 프로토콜';
    const challengeLabel = `심연 T${challengeState.tier} · ${modifierName}`;

    if (hpRatio <= 0.32 || mpRatio <= 0.18) {
      return buildPreview(
        'recovery',
        Math.max(0.34, basePressure - 0.28),
        'maintenance-niche',
        `${challengeLabel} 구간이라 압박은 유지하지만 자원이 붕괴 직전이라 유지보수 포켓을 우선합니다.`,
        gameState,
        challengeState
      );
    }

    if (bossProgress?.ready) {
      return buildPreview(
        'pressure',
        1,
        null,
        `${challengeLabel} 결전선이 열렸습니다. 일반 던전보다 더 날카로운 압박으로 즉시 전투를 강제합니다.`,
        gameState,
        challengeState
      );
    }

    if (
      fatigue.consecutiveCombats >= 2 ||
      fatigue.repeatActionCount >= 3 ||
      fatigue.consecutiveNonProgressLoops >= 3
    ) {
      return buildPreview(
        'variety',
        Math.max(0.46, basePressure - 0.18),
        'route-scan',
        `${challengeLabel}에서 연속 전투 피로가 누적돼, 완전한 해소 대신 우회 동선으로 압박만 재배치합니다.`,
        gameState,
        challengeState
      );
    }

    if (bossProgress && bossProgress.remainingSteps <= 2) {
      return buildPreview(
        'pressure',
        Math.min(0.96, basePressure + 0.08),
        getEndgameRoutePreference(challengeState),
        `${challengeLabel} 접근 구간입니다. ${modifierName} 패턴을 읽기 위해 전투 압박을 더 높입니다.`,
        gameState,
        challengeState
      );
    }

    return buildPreview(
      'pressure',
      basePressure,
      getEndgameRoutePreference(challengeState),
      `${challengeLabel} 활성. 일반 전선보다 전투 압박을 높여 패턴 해석과 자원 결정을 시험합니다.`,
      gameState,
      challengeState
    );
  }

  if (bossProgress?.ready) {
    preview = buildPreview(
      'pressure',
      1,
      null,
      `${bossProgress.bossName} 결전선이 열렸습니다. 다음 탐험은 전투 압박을 우선합니다.`,
      gameState
    );
  } else if (hpRatio <= 0.45 || mpRatio <= 0.3) {
    preview = buildPreview(
      'recovery',
      0.22,
      'maintenance-niche',
      '자원이 크게 흔들려 유지보수 포켓이나 회복 이벤트를 우선합니다.',
      gameState
    );
  } else if (
    fatigue.consecutiveCombats >= 2 ||
    fatigue.repeatActionCount >= 3 ||
    fatigue.consecutiveNonProgressLoops >= 3
  ) {
    preview = buildPreview(
      'variety',
      bossProgress && bossProgress.remainingSteps <= 2 ? 0.34 : 0.3,
      bossProgress && bossProgress.remainingSteps <= 2
        ? 'route-scan'
        : 'memory-echo',
      bossProgress && bossProgress.remainingSteps <= 2
        ? '연속 전투 피로가 높아 결전 직전까지는 우회 동선 확보를 우선합니다.'
        : '연속 동일 패턴을 끊기 위해 비전투 이벤트 비중을 올립니다.',
      gameState
    );
  } else if (bossProgress && bossProgress.remainingSteps <= 2 && hpRatio >= 0.7 && mpRatio >= 0.55) {
    preview = buildPreview(
      'pressure',
      0.72,
      'route-scan',
      `${bossProgress.bossName} 접근 구간이라 긴장감을 높이되, 우회 동선이 나오면 결전선까지 빠르게 당깁니다.`,
      gameState
    );
  }

  return preview;
}

export function decideDungeonExploreOutcome(
  gameState: GameState,
  random: () => number = Math.random
): EncounterDirectorDecision {
  const decision = getEncounterDirectorPreview(gameState);
  const roll = random();
  return {
    ...decision,
    outcome: roll < decision.encounterChance ? 'combat' : 'event'
  };
}

export function recordEncounterDirectorExploreOutcome(
  gameState: GameState,
  outcome:
    | { outcome: 'combat' }
    | { outcome: 'event'; eventId: DungeonEventResult['id'] }
): void {
  const aiState = ensureAiState(gameState);
  const fatigue = aiState.fatigueSnapshot;

  if (outcome.outcome === 'combat') {
    fatigue.consecutiveCombats += 1;
    fatigue.repeatActionCount += 1;
    fatigue.consecutiveNonProgressLoops += 1;
    return;
  }

  fatigue.consecutiveCombats = 0;

  if (outcome.eventId === 'route-scan') {
    fatigue.repeatActionCount = 0;
    fatigue.consecutiveNonProgressLoops = 0;
    return;
  }

  if (outcome.eventId === 'maintenance-niche') {
    fatigue.repeatActionCount = 0;
    fatigue.consecutiveNonProgressLoops = 0;
    return;
  }

  fatigue.repeatActionCount += 1;
  fatigue.consecutiveNonProgressLoops += 1;
}

export function resetEncounterDirectorFatigue(
  gameState: GameState,
  _cause: EncounterDirectorResetCause
): void {
  const fatigue = ensureAiState(gameState).fatigueSnapshot;
  fatigue.repeatActionCount = 0;
  fatigue.consecutiveCombats = 0;
  fatigue.consecutiveNonProgressLoops = 0;
}
