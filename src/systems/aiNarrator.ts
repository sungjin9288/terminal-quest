import { getLocationById } from '../data/locations.js';
import { type AiIntent, type AiNarrativeCue, type AiMomentType } from '../types/ai.js';
import { GameState } from '../types/game.js';
import { buildAiContext, type AiContext } from './aiContext.js';
import { syncAiState } from './aiDirector.js';
import { getRecentAiMoments } from './aiMemory.js';

export interface AiNarrativeVoiceLine {
  speaker: string;
  text: string;
}

function formatLocationName(locationIdOrName: string): string {
  const rawName = getLocationById(locationIdOrName)?.name ?? locationIdOrName;
  return rawName.replace(/\s*\([^()]+\)\s*$/, '').trim();
}

function getNarratorSpeaker(
  eventType: string | undefined,
  context: AiContext,
  intent: AiIntent | null
): string {
  if (eventType === 'boss-victory' || intent?.kind === 'boss-approach') {
    return context.isTown ? '전선 브리퍼' : '현장 기록관';
  }

  if (eventType === 'quest-accepted' || eventType === 'quest-completed') {
    return '동행 기록관';
  }

  if (eventType === 'purchase' || intent?.recommendedAction === 'shop') {
    return '보급 브리퍼';
  }

  if (eventType === 'defeat' || eventType === 'rest') {
    return '복구 브리퍼';
  }

  return context.isTown ? '동행 기록관' : '현장 기록관';
}

function getIntentFollowUp(context: AiContext, intent: AiIntent | null): string {
  if (!intent) {
    return context.isTown
      ? '게시판과 정비 동선을 짧게 묶으면 세션 흐름이 다시 살아납니다.'
      : '탐험을 한 장면 더 밀되 위험하면 즉시 후퇴해 손실을 막으세요.';
  }

  switch (intent.kind) {
    case 'quest-turn-in':
      return context.isTown
        ? '이제 게시판 정산만 끝내면 다음 루프가 바로 열립니다.'
        : '마을 복귀 후 보상 회수까지 한 번에 묶는 편이 좋습니다.';
    case 'quest-objective': {
      const destinationName = intent.recommendedLocationId
        ? formatLocationName(intent.recommendedLocationId)
        : null;
      return destinationName
        ? `${destinationName} 쪽으로 바로 이어가면 장면이 끊기지 않습니다.`
        : '현재 목표를 한 단계만 더 밀어도 세션 중심선이 유지됩니다.';
    }
    case 'boss-approach':
      return context.bossProgress?.ready
        ? '다음 교전이 결전선입니다. 자원만 정리되면 바로 들어가도 됩니다.'
        : `${context.bossProgress?.remainingSteps ?? 0}회만 더 밀면 보스 조우 구간입니다.`;
    case 'frontier':
      return intent.recommendedLocationId
        ? `${formatLocationName(intent.recommendedLocationId)} 진입을 다음 분기점으로 잡으세요.`
        : '다음 공략 지점을 먼저 열어 두는 편이 수익이 좋습니다.';
    case 'inventory-pressure':
      return '정리 후 이동까지 붙여 두면 다음 드랍 손실을 줄일 수 있습니다.';
    case 'new-quest':
      return '새 의뢰 하나만 잡아도 이번 세션의 맥락이 바로 고정됩니다.';
    case 'achievement-track':
      return context.trackedAchievement
        ? `추적 업적 ${context.trackedAchievement.title}도 같은 루프에서 함께 전진합니다.`
        : '이 흐름이면 추적 업적도 자연스럽게 같이 올라갑니다.';
    case 'steady-progress':
    default:
      return context.isTown
        ? '정비와 저장 중 하나까지 묶으면 깔끔하게 세션을 닫을 수 있습니다.'
        : '탐험 한 장면과 정비 한 번을 짝지어 리듬을 유지하세요.';
  }
}

function buildCueSummary(
  latestMoment: { type: string; label: string } | null,
  context: AiContext,
  intent: AiIntent | null
): string {
  const followUp = getIntentFollowUp(context, intent);

  switch (latestMoment?.type) {
    case 'quest-accepted':
      return `${latestMoment.label}가 이번 세션의 중심선입니다. ${followUp}`;
    case 'quest-completed':
      return `${latestMoment.label} 정산이 끝났습니다. ${followUp}`;
    case 'travel':
      return `${latestMoment.label} 이후 장면이 전환됐습니다. ${followUp}`;
    case 'rest':
      return `${latestMoment.label} 직후라 전환 여유가 있습니다. ${followUp}`;
    case 'purchase':
      return `${latestMoment.label} 확보로 전투 여유가 커졌습니다. ${followUp}`;
    case 'boss-victory':
      return `${latestMoment.label} 이후 전선이 열렸습니다. ${followUp}`;
    case 'defeat':
      return `${latestMoment.label}는 재정렬 구간입니다. ${followUp}`;
    case 'achievement-unlocked':
      return `${latestMoment.label}. ${followUp}`;
    case 'new-game':
      return `${latestMoment.label}부터 첫 장면을 여는 중입니다. ${followUp}`;
    default:
      return intent?.reason
        ? `${intent.reason} ${followUp}`
        : followUp;
  }
}

function getCueTitle(latestMoment: { type: string } | null, intent: AiIntent | null): string {
  switch (latestMoment?.type) {
    case 'quest-accepted':
      return '장면 고정';
    case 'quest-completed':
      return '정산 이후';
    case 'travel':
      return '장면 전환';
    case 'rest':
      return '정비 직후';
    case 'purchase':
      return '보급 확보';
    case 'boss-victory':
      return '전선 반전';
    case 'defeat':
      return '복귀 브리프';
    case 'achievement-unlocked':
      return '성과 회고';
    case 'new-game':
      return '첫 장면';
    default:
      return intent ? `${intent.title} 브리프` : 'Companion Note';
  }
}

export function buildAiNarrativeCue(
  gameState: GameState,
  now: number = Date.now()
): AiNarrativeCue | null {
  const aiState = syncAiState(gameState, now);
  if (aiState.narrativeMode === 'off') {
    return null;
  }

  const moments = getRecentAiMoments(gameState, aiState.narrativeMode === 'full' ? 4 : 3);
  const latestMoment = moments[0] ?? null;
  const intent = aiState.currentIntent;
  if (!latestMoment && !intent) {
    return null;
  }

  const context = buildAiContext(gameState);
  return {
    speaker: getNarratorSpeaker(latestMoment?.type, context, intent),
    title: getCueTitle(latestMoment, intent),
    summary: buildCueSummary(latestMoment, context, intent),
    beats: moments.map(moment => moment.label),
    tone: intent?.tone ?? 'info'
  };
}

export function buildAiNarrativeVoiceLine(
  gameState: GameState,
  event: {
    type: AiMomentType;
    label: string;
  },
  now: number = Date.now()
): AiNarrativeVoiceLine | null {
  const aiState = syncAiState(gameState, now);
  if (aiState.narrativeMode === 'off') {
    return null;
  }

  const context = buildAiContext(gameState);
  const speaker = getNarratorSpeaker(event.type, context, aiState.currentIntent);
  const followUp = getIntentFollowUp(context, aiState.currentIntent);

  switch (event.type) {
    case 'new-game':
      return {
        speaker,
        text: `${event.label}부터 천천히 가면 됩니다. 첫 의뢰 하나와 짧은 이동 하나만 묶어도 흐름이 잡힙니다.`
      };
    case 'quest-accepted':
      return {
        speaker,
        text: `${event.label}가 이번 세션의 기준 장면입니다. ${followUp}`
      };
    case 'quest-completed':
      return {
        speaker,
        text: `${event.label} 정산 완료. ${followUp}`
      };
    case 'travel':
      return {
        speaker,
        text: `${event.label} 진입 확인. ${followUp}`
      };
    case 'rest':
      return {
        speaker,
        text: `${event.label} 직후입니다. ${followUp}`
      };
    case 'purchase':
      return {
        speaker,
        text: `${event.label} 확보. ${followUp}`
      };
    case 'boss-victory':
      return {
        speaker,
        text: `${event.label}. ${followUp}`
      };
    case 'defeat':
      return {
        speaker,
        text: `${event.label}. ${followUp}`
      };
    case 'achievement-unlocked':
      return {
        speaker,
        text: `${event.label}. ${followUp}`
      };
    default:
      return null;
  }
}
