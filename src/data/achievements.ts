import { type AchievementDefinition } from '../types/achievement.js';

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: 'first_turn_in',
    title: '첫 정산',
    description: '퀘스트 보상을 처음으로 정산합니다.',
    category: 'quest',
    accent: 'quest',
    rule: {
      kind: 'stat_at_least',
      stat: 'questsCompleted',
      target: 1
    },
    reward: {
      gold: 30,
      items: [
        { itemId: 'save-token', quantity: 1 }
      ]
    }
  },
  {
    id: 'field_buyer',
    title: '현장 조달',
    description: '상점과 여관에 누적 250골드를 사용합니다.',
    category: 'economy',
    accent: 'reward',
    rule: {
      kind: 'stat_at_least',
      stat: 'goldSpent',
      target: 250
    },
    reward: {
      gold: 90,
      shopDiscountPercent: 8
    }
  },
  {
    id: 'frontier_scout',
    title: '전선 개척',
    description: '서로 다른 지역 4곳을 해금합니다.',
    category: 'exploration',
    accent: 'unlock',
    rule: {
      kind: 'stat_at_least',
      stat: 'locationsDiscovered',
      target: 4
    },
    reward: {
      inventorySlots: 2,
      items: [
        { itemId: 'save-token', quantity: 1 }
      ]
    }
  },
  {
    id: 'boss_shutdown',
    title: '오염원 차단',
    description: '보스를 처음으로 격파합니다.',
    category: 'boss',
    accent: 'boss',
    rule: {
      kind: 'boss_count_at_least',
      target: 1
    },
    reward: {
      skillPoints: 1
    }
  },
  {
    id: 'act_one_stabilized',
    title: '1막 안정화',
    description: 'Act 1을 완료해 다음 전선을 엽니다.',
    category: 'act',
    accent: 'act',
    rule: {
      kind: 'flag_true',
      flag: 'act-complete-1'
    },
    reward: {
      gold: 180,
      unlockShopTiers: [
        { shopId: 'armor-code', tierKey: 'level20' }
      ],
      items: [
        { itemId: 'save-token', quantity: 2 }
      ]
    }
  },
  {
    id: 'flawless_clear',
    title: '무결점 클리어',
    description: '현재 원정에서 피해 없이 보스를 격파합니다.',
    category: 'challenge',
    accent: 'clear',
    rule: {
      kind: 'run_flawless_boss_clear'
    },
    reward: {
      skillPoints: 1,
      items: [
        { itemId: 'health-potion', quantity: 2 }
      ]
    }
  },
  {
    id: 'supply_runner',
    title: '보급선 확보',
    description: '아이템을 누적 20개 수집합니다.',
    category: 'economy',
    accent: 'reward',
    rule: {
      kind: 'stat_at_least',
      stat: 'itemsCollected',
      target: 20
    },
    reward: {
      inventorySlots: 4
    }
  },
  {
    id: 'seasonal_contractor',
    title: '시즌 대응반',
    description: '시즌 한정 의뢰를 한 번 완료합니다.',
    category: 'quest',
    accent: 'quest',
    rule: {
      kind: 'flag_true',
      flag: 'seasonal-quest-completed'
    },
    reward: {
      items: [
        { itemId: 'save-token', quantity: 1 }
      ],
      unlockShopTiers: [
        { shopId: 'buffer-potions', tierKey: 'level15' }
      ]
    }
  },
  {
    id: 'frontline_veteran',
    title: '전선 베테랑',
    description: '서로 다른 보스를 3번 격파합니다.',
    category: 'boss',
    accent: 'boss',
    rule: {
      kind: 'boss_count_at_least',
      target: 3
    },
    reward: {
      skillPoints: 1,
      unlockShopTiers: [
        { shopId: 'armor-code', tierKey: 'level25' }
      ]
    }
  },
  {
    id: 'endgame_signal',
    title: '심층 신호 감지',
    description: '엔드게임 도전을 해금합니다.',
    category: 'challenge',
    accent: 'clear',
    rule: {
      kind: 'statistics_flag_true',
      stat: 'endgameChallengeUnlocked'
    },
    reward: {
      shopDiscountPercent: 5,
      unlockShopTiers: [
        { shopId: 'binary-weapons', tierKey: 'level25' }
      ]
    }
  }
] as const;
