import { getLocationById } from '../data/locations.js';
import { getShop } from '../systems/shop.js';
import { Monster, Quest, QuestCategory } from '../types/index.js';
import {
  getPresentationDisplayName,
  getPresentationShopGreeting
} from './presentationText.js';

export interface FeedVoiceLine {
  speaker: string;
  text: string;
}

const LOCATION_ARRIVAL_LINES: Record<string, FeedVoiceLine> = {
  'bit-town': {
    speaker: '도시 관제실',
    text: '복귀 확인했습니다. 보급과 보고를 정리한 뒤 다음 작전을 준비하세요.'
  },
  'memory-forest': {
    speaker: '현장 기록관',
    text: '숲의 공기가 아직 무겁습니다. 흔적을 놓치지 말고 천천히 전진하세요.'
  },
  'cache-cave': {
    speaker: '광맥 조사반',
    text: '결정 반응이 아직 살아 있습니다. 통로만 흔들리지 않게 잡아 주세요.'
  },
  'bit-plains': {
    speaker: '전초 관제관',
    text: '평원은 숨을 곳이 없습니다. 시야를 먼저 잡고 움직이십시오.'
  },
  'registry-dungeon': {
    speaker: '레지스트리 브리퍼',
    text: '여기부터는 정식 복구 권한선입니다. 실수 하나가 다음 층을 닫을 수 있습니다.'
  },
  'swap-swamp': {
    speaker: '보안 통제관',
    text: '늪지 흐름이 불안정합니다. 발밑보다 진입축부터 확인하세요.'
  },
  'thread-forest': {
    speaker: '복구 오퍼레이터',
    text: '흐름이 계속 엇갈립니다. 교착 지점만 끊어도 전선이 숨을 쉽니다.'
  },
  'stack-mountains': {
    speaker: '고지 정찰반',
    text: '산맥 과부하가 거세집니다. 올라갈수록 후퇴선도 같이 챙기세요.'
  },
  'heap-cave': {
    speaker: '침투 선도반',
    text: '구조가 계속 바뀝니다. 오래 멈추면 길이 먼저 사라집니다.'
  },
  'network-realm': {
    speaker: '네트워크 분석관',
    text: '통신 계층이 길을 숨기고 있습니다. 표식이 보일 때 바로 읽어 두세요.'
  },
  'kernel-fortress': {
    speaker: '공성 지휘관',
    text: '요새는 정면전보다 구조전입니다. 벽보다 패턴을 먼저 보십시오.'
  },
  'root-directory': {
    speaker: '침투 선도반',
    text: '이제는 시스템의 뿌리입니다. 남겨 둔 흔적도 적이 다시 쓰기 시작할 겁니다.'
  },
  'corruption-core': {
    speaker: '최종 공략 지휘관',
    text: '결전 구역 진입 확인. 여기서는 망설인 시간도 그대로 손실입니다.'
  }
};

const SHOP_PURCHASE_LINES: Record<string, string> = {
  'binary-weapons': '좋습니다. 손에 익히기만 하면 다음 교전에서 바로 힘을 낼 겁니다.',
  'armor-code': '결속만 잘 맞추면 이 장비가 오래 버텨 줄 겁니다.',
  'buffer-potions': '필요할 때 아끼지 말고 쓰세요. 보급은 쓰라고 있는 겁니다.'
};

const BATTLE_GUIDE_BY_LOCATION: Record<string, FeedVoiceLine> = {
  'memory-forest': {
    speaker: '숲 순찰대',
    text: '짧게 정리하고 계속 전진하십시오. 숲은 오래 멈춘 쪽부터 삼킵니다.'
  },
  'cache-cave': {
    speaker: '광맥 조사반',
    text: '통로가 흔들리기 전에 끝내 주세요. 전투가 길어질수록 낙반 반응이 심해집니다.'
  },
  'bit-plains': {
    speaker: '평원 감시대',
    text: '평원에서는 한 번 밀리면 추격이 길어집니다. 처음 템포를 놓치지 마세요.'
  },
  'registry-dungeon': {
    speaker: '레지스트리 브리퍼',
    text: '불필요한 소모전은 피하십시오. 깊이 내려갈수록 권한선이 더 날카로워집니다.'
  },
  'swap-swamp': {
    speaker: '보안 통제관',
    text: '늪지는 발이 묶이는 쪽이 집니다. 교전을 길게 끌지 마세요.'
  },
  'thread-forest': {
    speaker: '복구 오퍼레이터',
    text: '엇갈린 흐름에 말리지 말고 한 대상부터 빠르게 정리하세요.'
  },
  'stack-mountains': {
    speaker: '고지 정찰반',
    text: '고지에선 한 번 흔들리면 추락합니다. 방어보다 균형부터 유지하세요.'
  },
  'heap-cave': {
    speaker: '침투 선도반',
    text: '전장이 계속 바뀝니다. 지금 보이는 빈틈을 바로 쓰세요.'
  },
  'network-realm': {
    speaker: '네트워크 분석관',
    text: '패턴을 읽으면 길이 보입니다. 당황하지 말고 순서를 끊으세요.'
  },
  'kernel-fortress': {
    speaker: '공성 지휘관',
    text: '강한 적보다 질서가 더 무섭습니다. 흐름을 깨는 쪽이 이깁니다.'
  },
  'root-directory': {
    speaker: '침투 선도반',
    text: '여기선 적보다 흔적이 더 위험합니다. 한 번에 정리하고 나갑시다.'
  },
  'corruption-core': {
    speaker: '최종 공략 지휘관',
    text: '지금부터는 모든 선택이 결말에 닿습니다. 집중을 흩뜨리지 마세요.'
  }
};

const BOSS_INTRO_BY_LOCATION: Record<string, FeedVoiceLine> = {
  'memory-forest': {
    speaker: '현장 기록관',
    text: '메모리 누수 반응이 한 지점으로 모였습니다. 여기서 숲의 오염원을 끊어야 합니다.'
  },
  'cache-cave': {
    speaker: '광맥 조사반',
    text: '결정 동굴의 핵심 수문장이 나타났습니다. 통로를 열 기회는 지금뿐입니다.'
  },
  'bit-plains': {
    speaker: '전초 관제관',
    text: '평원 지휘 개체가 전면에 나왔습니다. 저걸 끊어야 전초선이 버팁니다.'
  },
  'registry-dungeon': {
    speaker: '레지스트리 브리퍼',
    text: '권한 구획 핵심 개체 확인. 여기서 밀리면 복구 작전 전체가 닫힙니다.'
  },
  'swap-swamp': {
    speaker: '보안 통제관',
    text: '늪지 지배 개체가 모습을 드러냈습니다. 늪이 다시 가라앉기 전에 끝냅시다.'
  },
  'thread-forest': {
    speaker: '복구 오퍼레이터',
    text: '동기화 교란의 핵심입니다. 저 개체를 끊어야 숲의 흐름이 돌아옵니다.'
  },
  'stack-mountains': {
    speaker: '고지 정찰반',
    text: '산맥 과부하의 근원이 저기 있습니다. 고지선 전체가 이 한 판에 달렸습니다.'
  },
  'heap-cave': {
    speaker: '침투 선도반',
    text: '붕괴를 몰고 다니는 핵심 반응체입니다. 여기서 놓치면 아래층이 전부 무너집니다.'
  },
  'network-realm': {
    speaker: '네트워크 분석관',
    text: '통신 지배 노드 확인. 지금 끊으면 전면전의 흐름이 우리 쪽으로 옵니다.'
  },
  'kernel-fortress': {
    speaker: '공성 지휘관',
    text: '요새 핵심 통제자가 전면에 나왔습니다. 여기서 성문을 완전히 열어젖힙시다.'
  },
  'root-directory': {
    speaker: '권한 관리관',
    text: '루트 수문장이 직접 나왔습니다. 저 개체가 무너지면 최종 권한선이 열립니다.'
  },
  'corruption-core': {
    speaker: '최종 공략 지휘관',
    text: '코어 심장부 반응 확인. 지금 이 전투가 전체 작전의 마지막 문장입니다.'
  }
};

const BOSS_VICTORY_BY_LOCATION: Record<string, FeedVoiceLine> = {
  'memory-forest': {
    speaker: '현장 기록관',
    text: '압력이 빠지고 있습니다. 이제 숲길은 우리 쪽 보급대도 지나갈 수 있겠습니다.'
  },
  'cache-cave': {
    speaker: '광맥 조사반',
    text: '좋습니다. 동굴 중심부가 안정됩니다. 조사반을 바로 투입하겠습니다.'
  },
  'bit-plains': {
    speaker: '전초 관제관',
    text: '평원 전초선이 살아났습니다. 이제 다음 병력을 안전하게 밀어 넣을 수 있습니다.'
  },
  'registry-dungeon': {
    speaker: '레지스트리 브리퍼',
    text: '권한선이 되살아납니다. 이제 다음 복구 루트를 공식적으로 밀 수 있습니다.'
  },
  'swap-swamp': {
    speaker: '보안 통제관',
    text: '늪지 보안선이 회복되고 있습니다. 이제 숨겨 둔 경로도 다시 읽힐 겁니다.'
  },
  'thread-forest': {
    speaker: '복구 오퍼레이터',
    text: '좋습니다. 숲의 흐름이 맞춰지기 시작했습니다. 구조 라인도 다시 움직이겠군요.'
  },
  'stack-mountains': {
    speaker: '고지 정찰반',
    text: '과부하가 꺾였습니다. 고지 감시선이 다시 정상 고도를 잡고 있습니다.'
  },
  'heap-cave': {
    speaker: '현장 격리팀',
    text: '붕괴 속도가 확실히 줄었습니다. 이제 격리선을 안쪽까지 밀 수 있겠습니다.'
  },
  'network-realm': {
    speaker: '네트워크 분석관',
    text: '통신 병목이 풀립니다. 후속 공격선이 한결 빠르게 연결될 겁니다.'
  },
  'kernel-fortress': {
    speaker: '공성 지휘관',
    text: '성문이 무너졌습니다. 이제 요새는 더는 우리를 막지 못합니다.'
  },
  'root-directory': {
    speaker: '권한 관리관',
    text: '루트 방벽이 열렸습니다. 이제 마지막 핵심 구역까지 손이 닿습니다.'
  },
  'corruption-core': {
    speaker: '최종 공략 지휘관',
    text: '끝났습니다. 코어 반응이 무너졌고 시스템 전체가 다시 숨을 쉽니다.'
  }
};

const ACT_CLEAR_LINES: Record<number, FeedVoiceLine> = {
  1: {
    speaker: '게시판 담당관',
    text: '기초 전선이 안정됐습니다. 이제 더 넓은 전장을 공식적으로 열 수 있습니다.'
  },
  2: {
    speaker: '레지스트리 브리퍼',
    text: '분기 정리가 끝났습니다. 다음 작전부터는 훨씬 깊은 층으로 들어가겠습니다.'
  },
  3: {
    speaker: '공격 오퍼레이터',
    text: '좋습니다. 후반 전선 진입 준비가 끝났습니다. 이제부터는 결전 구간입니다.'
  },
  4: {
    speaker: '최종 공략 지휘관',
    text: '핵심 공성선이 완전히 열렸습니다. 남은 건 최심부 정리뿐입니다.'
  }
};

function getLocationBattleGuide(locationId: string): FeedVoiceLine | null {
  if (BATTLE_GUIDE_BY_LOCATION[locationId]) {
    return BATTLE_GUIDE_BY_LOCATION[locationId];
  }

  const location = getLocationById(locationId);
  if (!location) {
    return null;
  }

  return {
    speaker: '현장 관제',
    text: `${getPresentationDisplayName(location.name)} 현장입니다. 짧은 교전으로 끝내고 계속 전진하세요.`
  };
}

export function getNewGameVoiceLine(): FeedVoiceLine {
  return {
    speaker: '게시판 담당관',
    text: '등록 절차는 열어 두었습니다. 첫 의뢰부터 차례대로 손에 익혀 보시죠.'
  };
}

export function getBoardVisitVoiceLine(availableQuestCount: number): FeedVoiceLine {
  return {
    speaker: '게시판 담당관',
    text:
      availableQuestCount > 0
        ? `지금 바로 처리할 의뢰가 ${availableQuestCount}건 올라와 있습니다. 브리핑 메모부터 보고 고르십시오.`
        : '지금은 신규 의뢰보다 진행 중인 전선 정리가 먼저입니다. 들고 있는 임무부터 마무리해 주세요.'
  };
}

export function getMarketVisitVoiceLine(shopId = 'binary-weapons'): FeedVoiceLine | null {
  const shop = getShop(shopId);
  if (!shop) {
    return null;
  }

  return {
    speaker: getPresentationDisplayName(shop.ownerName),
    text: getPresentationShopGreeting(shop.id, shop.greeting)
  };
}

export function getInnRestVoiceLine(): FeedVoiceLine {
  return {
    speaker: '여관 주인',
    text: '숨은 좀 돌아왔겠죠. 다음 출동 전엔 장비 끈부터 다시 조이고 나가세요.'
  };
}

export function getQuestAcceptVoiceLine(quest: Quest): FeedVoiceLine | null {
  const speaker = quest.narrative?.featuredNpc ?? quest.questGiver;
  const text = quest.narrative?.npcLine;
  if (!speaker || !text) {
    return null;
  }

  return {
    speaker,
    text
  };
}

export function getQuestCompleteVoiceLine(quest: Quest): FeedVoiceLine | null {
  const speaker = quest.narrative?.featuredNpc ?? quest.questGiver;
  if (!speaker) {
    return null;
  }

  switch (quest.narrative?.category) {
    case QuestCategory.MainStory:
      return {
        speaker,
        text: '좋습니다. 이 결과는 바로 다음 전선 준비에 반영하겠습니다. 잠시만 숨을 고르고 다시 움직입시다.'
      };
    case QuestCategory.CharacterStory:
      return {
        speaker,
        text: '수고했습니다. 이 연결선은 제가 이어 두겠습니다. 다음에 흔들리면 바로 다시 부르죠.'
      };
    case QuestCategory.Seasonal:
      return {
        speaker,
        text: quest.repeatable
          ? '이 구간은 다시 열어 두겠습니다. 필요하면 바로 같은 의뢰를 다시 받아도 됩니다.'
          : '이 정도면 이번 시즌 구간은 안전합니다. 남은 정리는 현장팀이 이어받겠습니다.'
      };
    case QuestCategory.Contract:
    default:
      return {
        speaker,
        text: '확인했습니다. 현장 기록을 마감하고 보급선에 바로 반영하겠습니다.'
      };
  }
}

export function getTravelArrivalVoiceLine(locationId: string): FeedVoiceLine | null {
  if (LOCATION_ARRIVAL_LINES[locationId]) {
    return LOCATION_ARRIVAL_LINES[locationId];
  }

  const location = getLocationById(locationId);
  if (!location) {
    return null;
  }

  return {
    speaker: '현장 관제',
    text: `${getPresentationDisplayName(location.name)} 진입 확인. 전황을 읽으면서 천천히 전진하세요.`
  };
}

export function getPurchaseVoiceLine(shopId: string): FeedVoiceLine | null {
  const shop = getShop(shopId);
  if (!shop) {
    return null;
  }

  return {
    speaker: getPresentationDisplayName(shop.ownerName),
    text: SHOP_PURCHASE_LINES[shopId] ?? shop.buyMessage
  };
}

export function getBattleStartVoiceLine(locationId: string, monster: Monster): FeedVoiceLine | null {
  if (monster.isBoss) {
    return BOSS_INTRO_BY_LOCATION[locationId] ?? {
      speaker: '현장 관제',
      text: '강한 반응체가 전면에 나타났습니다. 여기서 밀리면 다음 단계가 닫힙니다.'
    };
  }

  return getLocationBattleGuide(locationId);
}

export function getEnemyInitiativeVoiceLine(locationId: string, monster: Monster): FeedVoiceLine | null {
  if (!monster.isBoss) {
    return null;
  }

  return {
    speaker: (BOSS_INTRO_BY_LOCATION[locationId] ?? getLocationBattleGuide(locationId) ?? { speaker: '현장 관제', text: '' }).speaker,
    text: '적이 먼저 움직입니다. 첫 충격만 버티면 흐름을 되찾을 수 있습니다.'
  };
}

export function getBattleVictoryVoiceLine(locationId: string, monster: Monster): FeedVoiceLine | null {
  if (monster.isBoss) {
    return BOSS_VICTORY_BY_LOCATION[locationId] ?? {
      speaker: '현장 관제',
      text: '핵심 반응이 꺾였습니다. 여기서부터 전선이 우리 쪽으로 기웁니다.'
    };
  }

  const location = getLocationById(locationId);
  if (!location) {
    return null;
  }

  return {
    speaker: (getLocationBattleGuide(locationId) ?? { speaker: '현장 관제', text: '' }).speaker,
    text: `${getPresentationDisplayName(location.name)} 전선이 잠시 숨을 고릅니다. 이 틈에 진형을 정리하세요.`
  };
}

export function getActClearVoiceLine(act: number): FeedVoiceLine | null {
  return ACT_CLEAR_LINES[act] ?? null;
}

export function getDefeatVoiceLine(locationId: string): FeedVoiceLine | null {
  const location = getLocationById(locationId);
  if (!location) {
    return {
      speaker: '도시 의무반',
      text: '목숨 붙어 돌아온 것만으로도 충분합니다. 다시 설 수 있게 먼저 숨부터 고르세요.'
    };
  }

  return {
    speaker: '도시 의무반',
    text: `${getPresentationDisplayName(location.name)}에서 큰 충격을 받았습니다. 복귀선은 열어 두었으니 정비 후 다시 나가면 됩니다.`
  };
}
