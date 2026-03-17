import { getFrontierLocation } from './aiContext.js';
import {
  getAiContractTemplates,
  type AiContractTemplateId
} from '../data/contractTemplates.js';
import { getLocationById, type GameLocation } from '../data/locations.js';
import { getSampleMonsters } from '../data/monsters.js';
import { getRecentAiMoments } from './aiMemory.js';
import {
  type AiContractMetadata,
  type AiContractSessionWindow,
  Quest,
  QuestCategory,
  QuestFatigueClass,
  QuestObjectiveType,
  QuestStatus,
  type GameState
} from '../types/game.js';

const AI_CONTRACT_IDS = new Set(
  getAiContractTemplates().map(template => template.questId)
);
const AI_CONTRACT_TEMPLATE_BY_ID = new Map(
  getAiContractTemplates().map(template => [template.id, template] as const)
);

function getAiContractTemplate(templateId: AiContractTemplateId) {
  const template = AI_CONTRACT_TEMPLATE_BY_ID.get(templateId);
  if (!template) {
    throw new Error(`Unknown AI contract template: ${templateId}`);
  }
  return template;
}

function formatDisplayName(value: string): string {
  return value.replace(/\s*\([^()]+\)\s*$/, '').trim();
}

function resolveContractLocation(gameState: GameState): GameLocation | null {
  const frontier = getFrontierLocation(gameState);
  if (frontier) {
    return frontier;
  }

  const currentLocation = getLocationById(gameState.player.currentLocation);
  if (
    currentLocation &&
    'boss' in currentLocation &&
    !gameState.statistics.bossesDefeated.includes(currentLocation.boss)
  ) {
    return currentLocation;
  }

  return null;
}

function getPrimaryMonsterName(monsterId: string): string {
  const monster = getSampleMonsters()[monsterId];
  return monster ? formatDisplayName(monster.name) : monsterId;
}

function buildQuestObjective(
  description: string,
  type: QuestObjectiveType,
  targetId: string,
  requiredAmount: number
): Quest['objectives'][number] {
  return {
    description,
    type,
    targetId,
    requiredAmount,
    currentAmount: 0,
    completed: false
  };
}

function buildRewardBundle(
  gameState: GameState,
  location: GameLocation,
  contractId: string
): Quest['rewards'] {
  const baseExp = 70 + (location.act * 45) + (gameState.player.level * 8);
  const baseGold = 60 + (location.act * 35) + (gameState.player.level * 6);

  if (contractId === 'frontier-recon') {
    return {
      exp: baseExp,
      gold: baseGold,
      items: [location.act >= 3 ? 'mana-potion' : 'health-potion']
    };
  }

  if (contractId === 'frontier-recovery') {
    return {
      exp: Math.max(55, baseExp - 10),
      gold: Math.max(45, baseGold - 5),
      items: ['health-potion', location.act >= 3 ? 'mana-potion' : 'antidote']
    };
  }

  if (contractId === 'frontier-supply') {
    return {
      exp: Math.max(65, baseExp),
      gold: baseGold + 10,
      items: [location.act >= 3 ? 'mana-potion' : 'health-potion', 'antidote']
    };
  }

  return {
    exp: baseExp + 30,
    gold: baseGold + 25,
    items: [location.act >= 2 ? 'antidote' : 'health-potion']
  };
}

function getSessionWindow(gameState: GameState): AiContractSessionWindow {
  const playMinutes = Math.max(0, gameState.statistics.totalPlayTime) / 60;
  if (playMinutes >= 35) {
    return 'extended';
  }
  if (playMinutes >= 12) {
    return 'mid';
  }
  return 'opening';
}

function getSessionWindowLabel(sessionWindow: AiContractSessionWindow): string {
  switch (sessionWindow) {
    case 'extended':
      return '장기 세션';
    case 'mid':
      return '중반 세션';
    case 'opening':
    default:
      return '오프닝 세션';
  }
}

function getDirectiveLabel(directive: AiContractMetadata['directive']): string {
  switch (directive) {
    case 'recovery':
      return '회복 루트';
    case 'supply':
      return '보급 루트';
    case 'push':
    default:
      return '전선 압박';
  }
}

function buildAiContractMetadata(
  templateId: AiContractTemplateId,
  gameState: GameState,
  rationale: string,
  targetLabel: string,
  adaptive: boolean
): AiContractMetadata {
  const template = getAiContractTemplate(templateId);
  const sessionWindow = getSessionWindow(gameState);

  return {
    templateId,
    directive: template.directive,
    directiveLabel: getDirectiveLabel(template.directive),
    sessionWindow,
    sessionWindowLabel: getSessionWindowLabel(sessionWindow),
    rationale,
    targetLabel,
    adaptive
  };
}

function buildNarrative(
  chapterLabel: string,
  featuredNpc: string,
  storyBeat: string,
  hook: string,
  fatigueClass: QuestFatigueClass,
  npcLine: string
): Quest['narrative'] {
  return {
    category: QuestCategory.Contract,
    arcId: 'ai-contracts',
    arcTitle: '동행 계약',
    chapterLabel,
    featuredNpc,
    npcLine,
    storyBeat,
    hook,
    fatigueClass
  };
}

function getRecentMomentTypes(gameState: GameState): Set<string> {
  return new Set(getRecentAiMoments(gameState, 4).map(moment => moment.type));
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

function getInventoryRatio(gameState: GameState): number {
  return gameState.player.maxInventorySize > 0
    ? gameState.player.inventory.length / gameState.player.maxInventorySize
    : 0;
}

function shouldOfferRecoveryContract(gameState: GameState): boolean {
  const recentMomentTypes = getRecentMomentTypes(gameState);
  return getHpRatio(gameState) <= 0.55 ||
    getMpRatio(gameState) <= 0.35 ||
    recentMomentTypes.has('defeat') ||
    recentMomentTypes.has('rest');
}

function shouldOfferSupplyContract(gameState: GameState): boolean {
  const recentMomentTypes = getRecentMomentTypes(gameState);
  const sessionWindow = getSessionWindow(gameState);
  if (sessionWindow === 'extended') {
    return true;
  }

  if (sessionWindow !== 'mid') {
    return false;
  }

  return getInventoryRatio(gameState) >= 0.65 ||
    recentMomentTypes.has('purchase') ||
    recentMomentTypes.has('quest-completed');
}

function getReconRationale(gameState: GameState, locationName: string): string {
  switch (getSessionWindow(gameState)) {
    case 'extended':
      return `${locationName} 전선 확인만 끝내도 긴 세션을 무리 없이 마감할 다음 분기점이 생깁니다.`;
    case 'mid':
      return `${locationName} 진입선만 짚어도 남은 세션 결정을 훨씬 빠르게 할 수 있습니다.`;
    case 'opening':
    default:
      return `${locationName} 입구를 먼저 확인하면 초반 세션 기준선이 빠르게 고정됩니다.`;
  }
}

function buildReconContract(
  gameState: GameState,
  location: GameLocation
): Quest {
  const template = getAiContractTemplate('frontier-recon');
  const locationName = formatDisplayName(location.name);
  const suggestedAct = location.recommendedLevel[0];
  const npcLine = gameState.player.currentLocation === location.id
    ? `${locationName} 현장에 이미 들어와 있습니다. 출입선만 다시 읽고 정찰 보고를 정리해 주세요.`
    : `${locationName} 입구만 빠르게 읽어 오세요. 이번 세션의 다음 분기점을 확인하는 게 목적입니다.`;
  const rationale = getReconRationale(gameState, locationName);

  return {
    id: template.questId,
    name: `AI 계약: ${locationName} 전초 정찰`,
    description: `${locationName}에 직접 이동해 진입선과 현장 압력을 확인하고 복귀 보고를 올리세요.`,
    questGiver: '동행 계약실',
    requiredLevel: Math.max(1, suggestedAct),
    prerequisites: [],
    objectives: [
      buildQuestObjective(`${locationName} 진입 확인`, QuestObjectiveType.Explore, location.id, 1)
    ],
    rewards: buildRewardBundle(gameState, location, 'frontier-recon'),
    status: QuestStatus.NotStarted,
    isMainQuest: false,
    repeatable: true,
    aiContract: buildAiContractMetadata('frontier-recon', gameState, rationale, locationName, false),
    narrative: buildNarrative(
      template.chapterLabel,
      template.featuredNpc,
      `${locationName}의 현재 압력을 읽어 다음 세션 선택을 더 정확하게 만들기 위한 짧은 현장 계약입니다.`,
      `${locationName}까지 직접 닿아야 다음 계약도 정밀하게 짤 수 있습니다. 입구만 확인하고 돌아와 주세요.`,
      template.fatigueClass,
      npcLine
    )
  };
}

function buildCullContract(
  gameState: GameState,
  location: GameLocation
): Quest | null {
  const template = getAiContractTemplate('frontier-cull');
  const primaryMonsterId = location.monsters[0];
  if (!primaryMonsterId) {
    return null;
  }

  const locationName = formatDisplayName(location.name);
  const monsterName = getPrimaryMonsterName(primaryMonsterId);
  const killCount = Math.min(5, Math.max(2, location.act + 2));
  const rationale = `${locationName} 전선 압력이 안정적이라 짧은 교전 계약으로 바로 진척을 밀 수 있습니다.`;

  return {
    id: template.questId,
    name: `AI 계약: ${monsterName} 소탕`,
    description: `${locationName} 외곽의 ${monsterName} ${killCount}체를 정리해 진입 압력을 낮추세요.`,
    questGiver: '동행 계약실',
    requiredLevel: Math.max(1, location.recommendedLevel[0]),
    prerequisites: [],
    objectives: [
      buildQuestObjective(`${monsterName} ${killCount}체 정리`, QuestObjectiveType.Kill, primaryMonsterId, killCount)
    ],
    rewards: buildRewardBundle(gameState, location, 'frontier-cull'),
    status: QuestStatus.NotStarted,
    isMainQuest: false,
    repeatable: true,
    aiContract: buildAiContractMetadata('frontier-cull', gameState, rationale, locationName, true),
    narrative: buildNarrative(
      template.chapterLabel,
      template.featuredNpc,
      `${locationName}의 잔여 압력을 빠르게 줄여 다음 탐험 루프의 손실을 낮추는 현장 계약입니다.`,
      `${monsterName}만 먼저 줄여도 ${locationName}의 숨통이 틉니다. 짧게 치고 빠지는 계약으로 생각해 주세요.`,
      template.fatigueClass,
      `${monsterName} 쪽만 끊어도 ${locationName} 진입이 훨씬 매끄러워집니다. 오래 끌지 말고 필요한 수만 정리해 주세요.`
    )
  };
}

function buildRecoveryContract(
  gameState: GameState,
  location: GameLocation
): Quest {
  const template = getAiContractTemplate('frontier-recovery');
  const locationName = formatDisplayName(location.name);
  const rationale = `${locationName} 전선보다 회복 루트를 먼저 닫는 편이 현재 세션 손실을 줄입니다.`;

  return {
    id: template.questId,
    name: `AI 계약: ${locationName} 회복 루프`,
    description: `여관에서 정비 브리핑을 받고 ${locationName} 재진입 전 회복 루트를 닫으세요.`,
    questGiver: '동행 계약실',
    requiredLevel: Math.max(1, location.recommendedLevel[0]),
    prerequisites: [],
    objectives: [
      buildQuestObjective('여관 복구 브리핑 확인', QuestObjectiveType.Talk, 'innkeeper', 1)
    ],
    rewards: buildRewardBundle(gameState, location, 'frontier-recovery'),
    status: QuestStatus.NotStarted,
    isMainQuest: false,
    repeatable: true,
    aiContract: buildAiContractMetadata('frontier-recovery', gameState, rationale, locationName, true),
    narrative: buildNarrative(
      template.chapterLabel,
      template.featuredNpc,
      `${locationName} 재진입 전에 회복, 저장, 후속 이동 중 최소 한 축을 닫아 손실을 줄이는 재정렬 계약입니다.`,
      '지금은 한 번 더 밀기보다 회복 루프를 짧게 닫는 편이 수익입니다.',
      template.fatigueClass,
      '이번 슬롯은 회복 우선입니다. 여관 브리핑 한 번으로도 다음 루프 손실이 크게 줄어듭니다.'
    )
  };
}

function buildSupplyContract(
  gameState: GameState,
  location: GameLocation
): Quest {
  const template = getAiContractTemplate('frontier-supply');
  const locationName = formatDisplayName(location.name);
  const rationale = `${locationName} 전선에 다시 들어가기 전 보급선만 정리해도 장기 세션 효율이 살아납니다.`;

  return {
    id: template.questId,
    name: `AI 계약: ${locationName} 보급 재정렬`,
    description: `상점 네트워크를 확인해 ${locationName} 진입 전 보급 루트를 정리하세요.`,
    questGiver: '동행 계약실',
    requiredLevel: Math.max(1, location.recommendedLevel[0]),
    prerequisites: [],
    objectives: [
      buildQuestObjective('상점 보급 브리핑 확인', QuestObjectiveType.Talk, 'merchant', 1)
    ],
    rewards: buildRewardBundle(gameState, location, 'frontier-supply'),
    status: QuestStatus.NotStarted,
    isMainQuest: false,
    repeatable: true,
    aiContract: buildAiContractMetadata('frontier-supply', gameState, rationale, locationName, true),
    narrative: buildNarrative(
      template.chapterLabel,
      template.featuredNpc,
      `${locationName} 재진입 전에 소모품과 장비 상태를 짧게 정리해 긴 세션의 수익을 유지하는 보급 계약입니다.`,
      '지금은 큰 공략보다 보급선 정리가 다음 두세 장면의 안정성을 더 크게 바꿉니다.',
      template.fatigueClass,
      '한 번 상인 라인만 확인해도 다음 전선 루프가 훨씬 깔끔해집니다. 보급부터 정리합시다.'
    )
  };
}

function buildAdaptiveContract(gameState: GameState, location: GameLocation): Quest | null {
  if (shouldOfferRecoveryContract(gameState)) {
    return buildRecoveryContract(gameState, location);
  }

  if (shouldOfferSupplyContract(gameState)) {
    return buildSupplyContract(gameState, location);
  }

  return buildCullContract(gameState, location);
}

export function isAiContractQuestId(questId: string): boolean {
  return AI_CONTRACT_IDS.has(questId);
}

export function composeAiContracts(gameState: GameState): Quest[] {
  const location = resolveContractLocation(gameState);
  if (!location) {
    return [];
  }

  const contracts: Quest[] = [
    buildReconContract(gameState, location)
  ];
  const adaptiveContract = buildAdaptiveContract(gameState, location);
  if (adaptiveContract) {
    contracts.push(adaptiveContract);
  }

  return contracts;
}

export function refreshAiContracts(gameState: GameState): void {
  const composedContracts = composeAiContracts(gameState);
  const composedIds = new Set(composedContracts.map(contract => contract.id));

  for (const contractId of AI_CONTRACT_IDS) {
    if (composedIds.has(contractId)) {
      continue;
    }

    const existing = gameState.quests[contractId];
    if (!existing || existing.status === QuestStatus.Active) {
      continue;
    }
    delete gameState.quests[contractId];
  }

  for (const contract of composedContracts) {
    const existing = gameState.quests[contract.id];
    if (existing && existing.status === QuestStatus.Active) {
      continue;
    }

    gameState.quests[contract.id] = contract;
  }
}
