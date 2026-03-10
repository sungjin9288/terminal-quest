import { readFileSync } from 'fs';
import { join } from 'path';

type SkillCopy = {
  name: string;
  description: string;
};

type ItemPresentationInput = {
  itemId: string;
  rawName: string;
  itemType?: string;
  rarity?: string;
  level?: number;
  fallbackDescription?: string;
};

const CLASS_LABELS: Record<string, string> = {
  Warrior: '워리어',
  Mage: '메이지',
  Rogue: '로그',
  Cleric: '클레릭',
  Ranger: '레인저'
};

const LOCATION_DESCRIPTIONS: Record<string, string> = {
  'bit-town': '복구 인력과 상인, 휴식 시설이 모여 있는 안전 허브입니다. 다음 작전을 정비하고 보급을 갖추는 중심 거점입니다.',
  'memory-forest': '부서진 기억 조각이 반딧불처럼 떠다니는 외곽 숲입니다. 오래된 데이터가 나무에 스며 있고 오염 개체가 그림자 사이를 맴돕니다.',
  'cache-cave': '임시 데이터가 응결된 수정 동굴입니다. 밝게 빛나는 캐시 결정이 길을 비추지만, 오래 머물수록 오염이 짙어집니다.',
  'bit-plains': '0과 1의 바람이 교차하는 넓은 평원입니다. 시야는 트이지만 기동성 높은 개체가 전초선을 끊임없이 흔듭니다.',
  'registry-dungeon': '시스템 레지스트리로 세워진 다층 던전입니다. 더 깊은 층으로 내려갈수록 권한과 복구의 열쇠가 잠겨 있습니다.',
  'swap-swamp': '메모리 스왑이 뒤엉켜 지형이 가라앉고 떠오르는 늪지입니다. 방심하면 발밑부터 전선이 무너집니다.',
  'thread-forest': '실행 스레드가 덩굴처럼 얽힌 숲입니다. 동기화가 어긋난 개체들이 충돌과 지연을 만들어 냅니다.',
  'stack-mountains': '쌓인 호출 기록이 봉우리처럼 솟은 산맥입니다. 높이 오를수록 과부하와 재귀 흔적이 짙어집니다.',
  'heap-cave': '메모리가 동적으로 할당되고 무너지는 변칙 동굴입니다. 구조가 끊임없이 바뀌어 오래 버틸수록 판단력이 시험됩니다.',
  'network-realm': '데이터 패킷이 오가는 네트워크 전장입니다. 여러 계층의 통신 규칙이 길 자체를 방어선으로 바꿔 둡니다.',
  'kernel-fortress': '시스템 코어를 지키기 위해 구축된 중무장 요새입니다. 외벽과 내부실, 핵심 구역이 차례로 침투자를 걸러 냅니다.',
  'root-directory': '모든 데이터의 근원과 오래된 기록이 쌓여 있는 심층 구역입니다. 여기서부터는 시스템의 뿌리와 직접 맞닿습니다.',
  'corruption-core': '모든 오류와 오염이 응축된 최종 전장입니다. 후퇴도 완충도 허락되지 않는 결전 구역입니다.'
};

const SKILL_COPY: Record<string, SkillCopy> = {
  'power-strike': {
    name: '파워 스트라이크',
    description: '무게를 실은 일격으로 적 하나를 강하게 내려칩니다.'
  },
  'shield-breaker': {
    name: '실드 브레이커',
    description: '적의 방어선을 깨뜨리며 강한 압박을 가하는 돌파기입니다.'
  },
  'arcane-bolt': {
    name: '아케인 볼트',
    description: '응축한 마력을 한 점에 모아 적에게 쏘아 보냅니다.'
  },
  'chain-lightning': {
    name: '체인 라이트닝',
    description: '불안정한 번개를 방출해 적을 강하게 관통합니다.'
  },
  'shadow-stab': {
    name: '섀도 스탭',
    description: '약점을 노려 빠르게 찌르며 치명타 기회를 끌어올립니다.'
  },
  'execution-slash': {
    name: '익스큐션 슬래시',
    description: '마무리 각을 잡았을 때 위력을 발휘하는 암살 일격입니다.'
  },
  'minor-heal': {
    name: '마이너 힐',
    description: '성스러운 힘으로 자신의 체력을 안정적으로 회복합니다.'
  },
  'holy-light': {
    name: '홀리 라이트',
    description: '강한 성광으로 큰 상처를 빠르게 봉합합니다.'
  },
  'precision-shot': {
    name: '프리시전 샷',
    description: '적의 빈틈을 겨냥해 정확하게 꽂아 넣는 사격입니다.'
  },
  'piercing-arrow': {
    name: '피어싱 애로우',
    description: '단단한 방호를 뚫고 지나가는 관통 화살을 발사합니다.'
  }
};

const SHOP_GREETING_COPY: Record<string, string> = {
  'binary-weapons': '전선에 나가기 전에 손에 맞는 무기부터 맞추시죠. 오늘 필요한 화력을 함께 보겠습니다.',
  'armor-code': '오래 버틸수록 이깁니다. 현재 작전에 맞는 방호 장비를 골라 보세요.',
  'buffer-potions': '보급품은 항상 한 박자 먼저 챙기세요. 회복과 버프가 전선을 붙들어 줍니다.'
};

const ITEM_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'health-potion': '현장에서 즉시 체력을 복구하는 기본 회복약입니다.',
  'mana-potion': '집중력이 흔들릴 때 마력을 다시 끌어올리는 기본 마력약입니다.',
  'memory-fragment-small': '작은 기억 파편을 정제한 회복 자원입니다. 급한 회복에 적합합니다.',
  'memory-fragment-medium': '중형 기억 파편을 안정화한 회복 자원입니다. 중반 전선 유지에 유용합니다.',
  'memory-fragment-large': '대형 기억 파편에서 뽑아낸 고효율 회복 자원입니다.',
  antidote: '독성과 상태 이상을 정리해 전열을 다시 세우는 응급 해독제입니다.',
  'overclock-drink': '짧은 시간 공격 템포를 끌어올리는 전투용 자극제입니다.',
  'defense-shell': '잠시 방어막을 둘러 생존력을 보강하는 현장 보호제입니다.',
  'mega-health-potion': '체력을 크게 복구하는 중급 회복약입니다.',
  'mega-mana-potion': '마력을 크게 복구하는 중급 마력약입니다.',
  'ultra-health-potion': '장기전 직전에 아껴 두기 좋은 고급 체력 회복약입니다.',
  'ultra-mana-potion': '고위험 구간에서 화력을 유지하게 돕는 고급 마력 회복약입니다.',
  'quantum-tonic': '체력과 마력을 한 번에 끌어올려 결전 구간을 버티게 하는 특수 조합제입니다.',
  'stability-draught': '상태 이상과 누적 피로를 정리해 전투 리듬을 되찾게 하는 안정화 약제입니다.',
  'save-token': '비상 상황에서 기록 지점을 대신해 주는 긴급 저장 토큰입니다.'
};

let itemNameCache: Map<string, string> | null = null;

function stripTrailingVariant(text: string): string {
  return text.replace(/\s*\([^)]*\)\s*$/u, '').trim();
}

function collectNamedEntries(node: unknown, bucket: Map<string, string>): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectNamedEntries(item, bucket);
    }
    return;
  }

  if (!node || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;
  if (typeof record.id === 'string' && typeof record.name === 'string') {
    bucket.set(record.id, stripTrailingVariant(record.name));
  }

  for (const value of Object.values(record)) {
    collectNamedEntries(value, bucket);
  }
}

function getItemNameCache(): Map<string, string> {
  if (itemNameCache) {
    return itemNameCache;
  }

  const bucket = new Map<string, string>();
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'items.json'), 'utf-8');
    collectNamedEntries(JSON.parse(raw), bucket);
  } catch {
    // Ignore optional presentation data load failures and use runtime fallbacks.
  }

  itemNameCache = bucket;
  return bucket;
}

function getRarityLabel(rarity?: string): string {
  switch ((rarity ?? '').toLowerCase()) {
    case 'common':
      return '기본';
    case 'uncommon':
      return '개량';
    case 'rare':
      return '정예';
    case 'epic':
      return '특급';
    case 'legendary':
      return '전설';
    default:
      return '현장';
  }
}

function getItemTypeLabel(itemType?: string): string {
  switch ((itemType ?? '').toLowerCase()) {
    case 'weapon':
      return '전투 장비';
    case 'armor':
      return '방호 장비';
    case 'consumable':
      return '보급 소모품';
    case 'material':
      return '연구 자재';
    case 'accessory':
      return '보조 장비';
    default:
      return '현장 장비';
  }
}

export function getPresentationClassLabel(characterClass: string): string {
  return CLASS_LABELS[characterClass] ?? characterClass;
}

export function getPresentationDisplayName(rawName: string): string {
  return stripTrailingVariant(rawName);
}

export function getPresentationLocationDescription(locationId: string, fallback: string): string {
  return LOCATION_DESCRIPTIONS[locationId] ?? fallback;
}

export function getPresentationShopGreeting(shopId: string, fallback: string): string {
  return SHOP_GREETING_COPY[shopId] ?? fallback;
}

export function getPresentationSkillCopy(skillId: string, fallbackName: string, fallbackDescription: string): SkillCopy {
  return SKILL_COPY[skillId] ?? {
    name: fallbackName,
    description: fallbackDescription
  };
}

export function getPresentationItemCopy(input: ItemPresentationInput): { name: string; description: string } {
  const itemName = getItemNameCache().get(input.itemId) ?? stripTrailingVariant(input.rawName);
  const description =
    ITEM_DESCRIPTION_OVERRIDES[input.itemId] ??
    `${getRarityLabel(input.rarity)} 등급의 ${getItemTypeLabel(input.itemType)}입니다. ${
      input.level ? `권장 레벨 ${input.level} 전후 전력 정비에 적합합니다.` : '현장 운용에 맞춰 준비된 장비입니다.'
    }`;

  return {
    name: itemName,
    description: description || input.fallbackDescription || ''
  };
}
