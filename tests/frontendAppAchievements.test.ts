import fs from 'fs';
import path from 'path';

type FrontendSnapshot = {
  scene: string;
  hasGame: boolean;
  activeSaveDirectory: string;
  saves: unknown[];
  feed: Array<{
    id: string;
    text: string;
    tone: string;
    category: string;
    timestamp: number;
    speaker?: string;
  }>;
  player: {
    name: string;
    class: string;
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
  location: {
    id: string;
    name: string;
    description: string;
    isTown: boolean;
    recommendedDestinationId: string | null;
    firstClearRewardPreview: string | null;
    bossProgress?: {
      text: string;
      bossName: string;
      current: number;
      target: number;
      remaining: number;
      ready: boolean;
    };
  };
  focus: null | {
    tone: string;
    title: string;
    lines: string[];
  };
  tracker: null | {
    questName: string;
    objectiveDescription: string;
    status: string;
    progress: string;
    currentAmount: number;
    requiredAmount: number;
    progressPercent: number;
  };
  questBoard: {
    available: Array<{ category: string; label: string; icon: string; quests: unknown[] }>;
    active: Array<{ category: string; label: string; icon: string; quests: unknown[] }>;
    completable: unknown[];
    completedCount: number;
  };
  travel: {
    currentLocationId: string;
    destinations: Array<{
      id: string;
      name: string;
      act?: number;
      unlocked: boolean;
      cleared: boolean;
      recommended: boolean;
      description: string;
      firstClearRewardPreview: string | null;
    }>;
  };
  shops: Array<{
    id: string;
    name: string;
    icon: string;
    ownerName: string;
    greeting: string;
    inventory: unknown[];
  }>;
  inventory: {
    total: number;
    equipmentCount: number;
    consumableCount: number;
    items: Array<{
      itemId: string;
      name: string;
      icon: string;
      type: string;
      quantity: number;
    }>;
  };
  battle?: undefined;
  saveStatus: {
    canSave: boolean;
    reason: string;
    requiresToken: boolean;
  };
  achievements: {
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
    mode: 'auto' | 'pinned';
    current: null | {
      id: string;
      title: string;
      description: string;
      category: string;
      accent: string;
      current: number;
      target: number;
      progressPercent: number;
    };
    history: Array<{
      timestamp: number;
      type: string;
      message: string;
      achievementId?: string;
      achievementTitle?: string;
      progress?: string;
      mode?: 'auto' | 'pinned';
      cause?: string;
    }>;
  };
};

type FrontendExports = {
  uiState: {
    snapshot: FrontendSnapshot | null;
    resumeBrief: {
      tone: string;
      badge: string;
      title: string;
      body: string;
      actionLabel?: string;
      detail: string;
    } | null;
    resumeRoute: {
      tone: string;
      title: string;
      summary: string;
      phase: string;
      achievementTitle?: string | null;
      achievementProgress?: string | null;
      contextLabel?: string | null;
      steps: Array<{
        id: string;
        order: string;
        tone: string;
        badge: string;
        title: string;
        body: string;
        eta?: string;
        target?: Record<string, string>;
      }>;
    } | null;
    resumePreviewStepId: string | null;
    activeWorkspace: string;
    questLane: string;
    questIndex: number;
    travelIndex: number;
    marketShopId?: string;
    marketIndex?: number;
    feedCategoryId: string;
    feedFilterId: string;
    feedIndex: number;
  };
  renderAchievements: (snapshot: FrontendSnapshot) => string;
  renderFeed: (snapshot: FrontendSnapshot) => string;
  renderDockedFeed: (snapshot: FrontendSnapshot) => string;
  renderSidebarHud: (snapshot: FrontendSnapshot) => string;
  renderWorkspaceTabs: (snapshot: FrontendSnapshot) => string;
  renderRewardHorizon: (snapshot: FrontendSnapshot) => string;
  renderSavePanel: (snapshot: FrontendSnapshot) => string;
  renderMomentumPanel: (snapshot: FrontendSnapshot) => string;
  renderSidebarAlerts: (snapshot: FrontendSnapshot) => string;
  renderActionRail: (snapshot: FrontendSnapshot) => string;
  handleUiAction: (target: { dataset: Record<string, string> }) => boolean;
  handleClientAction: (target: { dataset: Record<string, string> }) => boolean;
  getAchievementFocusDescriptor: (
    entry: FrontendSnapshot['achievements']['entries'][number],
    snapshot: FrontendSnapshot
  ) => {
      label: string;
      hint: string;
      workspace: string;
      questLane?: string;
      travelDestinationId?: string | null;
      shopId?: string | null;
      itemId?: string | null;
      feedCategory?: string;
  };
  getMomentumCards: (snapshot: FrontendSnapshot) => Array<{
    id: string;
    eyebrow: string;
    title: string;
    body: string;
    badge: string;
    progress?: number;
    target: Record<string, string>;
  }>;
  getRewardHorizonCards: (snapshot: FrontendSnapshot) => Array<{
    id: string;
    eyebrow: string;
    title: string;
    body: string;
    badge: string;
    progress?: number;
    target?: Record<string, string>;
  }>;
  getSidebarAlerts: (snapshot: FrontendSnapshot) => Array<{
    id: string;
    tone: string;
    eyebrow: string;
    title: string;
    body: string;
    badge: string;
    uiAction?: string;
    uiValue?: string;
  }>;
  performAction: (action: Record<string, unknown>) => Promise<void>;
  getSmartResumePlan: (snapshot: FrontendSnapshot) => {
    workspace: string;
    label: string;
    cue: string;
    questLane?: string;
    questIndex?: number;
    travelIndex?: number;
    feedCategory?: string;
  };
};

type FrontendHarness = FrontendExports & {
  setSnapshot(nextSnapshot: FrontendSnapshot): void;
  getAppHtml(): string;
  getToastText(): string;
};

class MockElement {
  dataset: Record<string, string>;

  constructor(dataset: Record<string, string> = {}) {
    this.dataset = dataset;
  }

  closest(): MockElement {
    return this;
  }
}

class MockHtmlFormElement extends MockElement {}

function createSnapshot(
  overrides: Partial<FrontendSnapshot> = {}
): FrontendSnapshot {
  return {
    scene: 'town',
    hasGame: true,
    activeSaveDirectory: '/tmp/terminal-quest',
    saves: [],
    feed: [],
    player: {
      name: 'BrowserHero',
      class: 'Warrior',
      level: 3,
      experience: 45,
      experienceToNextLevel: 100,
      experienceRemaining: 55,
      experienceProgressPercent: 45,
      gold: 180,
      skillPoints: 1,
      hp: 42,
      maxHp: 42,
      mp: 12,
      maxMp: 12,
      attack: 11,
      defense: 8,
      speed: 7,
      inventoryCount: 0,
      saveTokenCount: 1,
      achievementCount: 0,
      achievementTotal: 6
    },
    location: {
      id: 'bit-town',
      name: '비트 타운',
      description: '안전 허브',
      isTown: true,
      recommendedDestinationId: 'memory-forest',
      firstClearRewardPreview: '응급 키트'
    },
    focus: null,
    tracker: null,
    questBoard: {
      available: [],
      active: [],
      completable: [],
      completedCount: 0
    },
    travel: {
      currentLocationId: 'bit-town',
      destinations: [
        {
          id: 'training-yard',
          name: '훈련 마당',
          unlocked: true,
          cleared: true,
          recommended: false,
          description: '기초 전투 훈련 구역',
          firstClearRewardPreview: null
        },
        {
          id: 'memory-forest',
          name: '메모리 숲',
          act: 1,
          unlocked: true,
          cleared: false,
          recommended: true,
          description: '첫 원정 전선',
          firstClearRewardPreview: '구급 패치'
        }
      ]
    },
    shops: [
      {
        id: 'binary-weapons',
        name: '바이너리 무기상',
        icon: '⚔️',
        ownerName: '캐시',
        greeting: '무기 정비를 시작할 시간입니다.',
        inventory: []
      }
    ],
    inventory: {
      total: 0,
      equipmentCount: 0,
      consumableCount: 0,
      items: []
    },
    battle: undefined,
    saveStatus: {
      canSave: true,
      reason: '즉시 저장 가능',
      requiresToken: false
    },
    achievements: {
      unlockedCount: 0,
      totalCount: 6,
      latestUnlocked: null,
      entries: []
    },
    achievementTracking: {
      mode: 'auto',
      current: null,
      history: []
    },
    ...overrides
  };
}

async function createFrontendHarness(
  initialSnapshot: FrontendSnapshot = createSnapshot()
): Promise<FrontendHarness> {
  const source = fs.readFileSync(path.join(process.cwd(), 'frontend', 'app.js'), 'utf-8');
  const appNode = {
    innerHTML: '',
    textContent: '',
    dataset: {} as Record<string, string>,
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  };
  const statusNode = {
    innerHTML: '',
    textContent: '',
    dataset: {} as Record<string, string>,
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  };
  const toastNode = {
    innerHTML: '',
    textContent: '',
    dataset: {} as Record<string, string>,
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  };

  const documentStub = {
    body: {
      dataset: {} as Record<string, string>
    },
    querySelector(selector: string) {
      switch (selector) {
        case '#app':
          return appNode;
        case '#status-line':
          return statusNode;
        case '#toast':
          return toastNode;
        default:
          return null;
      }
    },
    addEventListener: jest.fn()
  };

  let currentSnapshot = initialSnapshot;
  const fetchStub = jest.fn(async () => ({
    ok: true,
    async json() {
      return currentSnapshot;
    }
  }));

  const runner = new Function(
    'document',
    'window',
    'fetch',
    'FormData',
    'Element',
    'HTMLFormElement',
    'Intl',
    'console',
    `${source}
return {
  uiState,
  renderAchievements,
  renderFeed,
  renderDockedFeed,
  renderSidebarHud,
  renderWorkspaceTabs,
  renderRewardHorizon,
  renderSavePanel,
  renderMomentumPanel,
  renderSidebarAlerts,
  renderActionRail,
  handleUiAction,
  handleClientAction,
  getAchievementFocusDescriptor,
  getRewardHorizonCards,
  getMomentumCards,
  getSidebarAlerts,
  performAction,
  getSmartResumePlan
};`
  ) as (
    document: typeof documentStub,
    window: {
      setTimeout: (...args: unknown[]) => unknown;
      clearTimeout: (...args: unknown[]) => void;
    },
    fetch: typeof fetchStub,
    FormData: new () => unknown,
    Element: typeof MockElement,
    HTMLFormElement: typeof MockHtmlFormElement,
    intl: typeof Intl,
    consoleObject: typeof console
  ) => FrontendExports;

  const exports = runner(
    documentStub,
    {
      setTimeout: () => 1,
      clearTimeout: () => undefined
    },
    fetchStub,
    class MockFormData {},
    MockElement,
    MockHtmlFormElement,
    Intl,
    console
  );

  await Promise.resolve();
  await Promise.resolve();

  return Object.assign(exports, {
    setSnapshot(nextSnapshot: FrontendSnapshot) {
      currentSnapshot = nextSnapshot;
    },
    getAppHtml() {
      return appNode.innerHTML;
    },
    getToastText() {
      return toastNode.textContent;
    }
  });
}

describe('Frontend achievement workspace actions', () => {
  it('should render click-through achievement cards with route copy', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 120,
            target: 250,
            progressPercent: 48
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderAchievements(snapshot);

    expect(html).toContain('data-ui-action="focus-achievement-target"');
    expect(html).toContain('바이너리 무기상 보기');
    expect(html).toContain('바이너리 무기상에서 다음 구매 후보를 확인');
  });

  it('should render tracking mode controls and pinned-card actions in the achievement deck', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 3,
            target: 4,
            progressPercent: 75
          },
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 120,
            target: 250,
            progressPercent: 48
          }
        ]
      },
      achievementTracking: {
        mode: 'pinned',
        current: {
          id: 'frontier_scout',
          title: '전선 개척',
          description: '서로 다른 지역 4곳을 해금합니다.',
          category: 'exploration',
          accent: 'unlock',
          current: 3,
          target: 4,
          progressPercent: 75
        },
        history: [
          {
            timestamp: 1730390400000,
            type: 'switched',
            message: '상점 구매 후 자동 전환: 전선 개척 3/4',
            achievementId: 'frontier_scout',
            achievementTitle: '전선 개척',
            progress: '3/4',
            mode: 'auto',
            cause: '상점 구매'
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderAchievements(snapshot);

    expect(html).toContain('추적 모드와 최근 전환 기록');
    expect(html).toContain('data-action="set-achievement-tracking-mode"');
    expect(html).toContain('data-tracking-mode="pinned"');
    expect(html).toContain('상점 구매 후 자동 전환: 전선 개척 3/4');
    expect(html).toContain('data-action="track-achievement"');
    expect(html).toContain('data-achievement-id="field_buyer"');
    expect(html).toContain('다음 후보 핀 고정');
    expect(html).toContain('data-action="clear-achievement-tracking"');
    expect(html).toContain('카드 선택 시 핀 고정');
  });

  it('should focus the quest workspace and completable lane for turn-in achievements', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 1,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'first_turn_in',
            title: '첫 정산',
            description: '퀘스트 보상을 처음으로 정산합니다.',
            category: 'quest',
            accent: 'quest',
            unlocked: true,
            unlockedAt: 1,
            current: 1,
            target: 1,
            progressPercent: 100
          }
        ]
      },
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.snapshot = snapshot;
    frontend.uiState.activeWorkspace = 'achievements';

    const handled = frontend.handleUiAction({
      dataset: {
        uiAction: 'focus-achievement-target',
        uiValue: 'first_turn_in'
      }
    });

    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('quests');
    expect(frontend.uiState.questLane).toBe('completable');
    expect(frontend.uiState.questIndex).toBe(0);
  });

  it('should focus the recommended travel destination for exploration achievements', async () => {
    const snapshot = createSnapshot({
      location: {
        id: 'bit-town',
        name: '비트 타운',
        description: '안전 허브',
        isTown: true,
        recommendedDestinationId: 'memory-forest',
        firstClearRewardPreview: '응급 키트'
      },
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 2,
            target: 4,
            progressPercent: 50
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.snapshot = snapshot;
    frontend.uiState.activeWorkspace = 'achievements';
    frontend.uiState.travelIndex = 0;

    const handled = frontend.handleUiAction({
      dataset: {
        uiAction: 'focus-achievement-target',
        uiValue: 'frontier_scout'
      }
    });

    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('travel');
    expect(frontend.uiState.travelIndex).toBe(1);
  });

  it('should focus the precise market item for economy achievements', async () => {
    const snapshot = createSnapshot({
      shops: [
        {
          id: 'binary-weapons',
          name: '바이너리 무기상',
          icon: '⚔️',
          ownerName: '캐시',
          greeting: '무기 정비를 시작할 시간입니다.',
          inventory: [
            {
              id: 'iron-sword',
              name: '강철 검',
              icon: '🗡️',
              description: '표준형 전투 검',
              rarity: '일반',
              level: 2,
              price: 120,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        },
        {
          id: 'aux-lab',
          name: '보조 장비 연구소',
          icon: '🧰',
          ownerName: '리나',
          greeting: '유틸 장비를 정비합니다.',
          inventory: [
            {
              id: 'field-kit',
              name: '현장 키트',
              icon: '🎒',
              description: '탐사 보조 장비',
              rarity: '고급',
              level: 2,
              price: 90,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        }
      ],
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 180,
            target: 250,
            progressPercent: 72
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.snapshot = snapshot;
    frontend.uiState.activeWorkspace = 'achievements';

    const descriptor = frontend.getAchievementFocusDescriptor(
      snapshot.achievements.entries[0],
      snapshot
    );
    const handled = frontend.handleUiAction({
      dataset: {
        uiAction: 'focus-achievement-target',
        uiValue: 'field_buyer'
      }
    });
    const html = frontend.getAppHtml();

    expect(descriptor).toMatchObject({
      workspace: 'market',
      shopId: 'binary-weapons',
      itemId: 'iron-sword'
    });
    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('market');
    expect(frontend.uiState.marketShopId).toBe('binary-weapons');
    expect(frontend.uiState.marketIndex).toBe(0);
    expect(html).toContain('강철 검');
    expect(html).toContain('업적 목표 카드');
    expect(html).toContain('업적 목표');
  });

  it('should route unlocked flawless clear achievements to the reward log', async () => {
    const snapshot = createSnapshot({
      scene: 'dungeon',
      location: {
        id: 'memory-forest',
        name: '메모리 숲',
        description: '첫 원정 전선',
        isTown: false,
        recommendedDestinationId: 'memory-forest',
        firstClearRewardPreview: '구급 패치',
        bossProgress: {
          text: '보스 진입 가능',
          bossName: '오염원',
          current: 10,
          target: 10,
          remaining: 0,
          ready: true
        }
      },
      achievements: {
        unlockedCount: 2,
        totalCount: 6,
        latestUnlocked: {
          id: 'flawless_clear',
          title: '무결점 클리어',
          description: '현재 원정에서 피해 없이 보스를 격파합니다.',
          accent: 'clear',
          unlockedAt: 42
        },
        entries: [
          {
            id: 'flawless_clear',
            title: '무결점 클리어',
            description: '현재 원정에서 피해 없이 보스를 격파합니다.',
            category: 'challenge',
            accent: 'clear',
            unlocked: true,
            unlockedAt: 42,
            current: 1,
            target: 1,
            progressPercent: 100
          }
        ]
      },
      feed: [
        {
          id: 'feed-1',
          text: '업적 해금: 무결점 클리어',
          tone: 'success',
          category: 'reward',
          timestamp: 42
        }
      ]
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.snapshot = snapshot;
    frontend.uiState.activeWorkspace = 'achievements';
    frontend.uiState.feedCategoryId = 'hub';
    frontend.uiState.feedFilterId = 'speaker:현장 기록관';
    frontend.uiState.feedIndex = 3;

    const descriptor = frontend.getAchievementFocusDescriptor(
      snapshot.achievements.entries[0],
      snapshot
    );
    const handled = frontend.handleUiAction({
      dataset: {
        uiAction: 'focus-achievement-target',
        uiValue: 'flawless_clear'
      }
    });

    expect(descriptor.workspace).toBe('feed');
    expect(descriptor.feedCategory).toBe('reward');
    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('feed');
    expect(frontend.uiState.feedCategoryId).toBe('reward');
    expect(frontend.uiState.feedFilterId).toBe('__all__');
    expect(frontend.uiState.feedIndex).toBe(0);
  });

  it('should surface the next locked achievement in the momentum panel', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 1,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 180,
            target: 250,
            progressPercent: 72
          },
          {
            id: 'first_turn_in',
            title: '첫 정산',
            description: '퀘스트 보상을 처음으로 정산합니다.',
            category: 'quest',
            accent: 'quest',
            unlocked: true,
            unlockedAt: 1,
            current: 1,
            target: 1,
            progressPercent: 100
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const cards = frontend.getMomentumCards(snapshot);
    const html = frontend.renderMomentumPanel(snapshot);
    const achievementCard = cards.find(card => card.id === 'achievement-progress');

    expect(achievementCard).toMatchObject({
      title: '현장 조달',
      badge: '180 / 250',
      target: {
        uiAction: 'focus-achievement-target',
        uiValue: 'field_buyer'
      }
    });
    expect(html).toContain('Next Unlock');
    expect(html).toContain('data-ui-action="focus-achievement-target"');
    expect(html).toContain('data-ui-value="field_buyer"');
  });

  it('should raise an approaching achievement in priority alerts', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 3,
            target: 4,
            progressPercent: 75
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const alerts = frontend.getSidebarAlerts(snapshot);
    const html = frontend.renderSidebarAlerts(snapshot);
    const achievementAlert = alerts.find(alert => alert.id === 'achievement:frontier_scout');

    expect(achievementAlert).toMatchObject({
      title: '전선 개척 임박',
      badge: '1회 남음',
      uiAction: 'focus-achievement-target',
      uiValue: 'frontier_scout'
    });
    expect(html).toContain('Achievement Radar');
    expect(html).toContain('data-ui-action="focus-achievement-target"');
    expect(html).toContain('data-ui-value="frontier_scout"');
  });
});

describe('Frontend smart resume routing', () => {
  it('should smart-route load-game into the completable quest lane instead of the save tab', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    expect(frontend.uiState.activeWorkspace).toBe('quests');
    expect(frontend.uiState.questLane).toBe('completable');
    expect(frontend.uiState.questIndex).toBe(0);
    expect(frontend.uiState.resumeBrief?.title).toBe('보상 정산부터 재개');
    expect(frontend.uiState.resumeBrief?.badge).toBe('보상 대기');
    expect(frontend.uiState.resumeBrief?.actionLabel).toBe('보상 대기 보기');
    expect(frontend.uiState.resumeRoute?.phase).toBe('inspect');
    expect(frontend.uiState.resumeRoute?.steps.map(step => step.order)).toEqual(['지금', '다음', '정리']);
    const actionRailHtml = frontend.renderActionRail(loadedSnapshot);
    const appHtml = frontend.getAppHtml();
    expect(actionRailHtml).toContain('Resume Route');
    expect(actionRailHtml).toContain('불러오기 직후 길잡이');
    expect(actionRailHtml).toContain('현재 단계');
    expect(appHtml).toContain('Resume Anchor');
    expect(appHtml).toContain('Resume Command');
    expect(appHtml).toContain('Resume Steps');
    expect(appHtml).toContain('현재 경로');
    expect(appHtml).toContain('정리 예정');
    expect(appHtml).toMatch(/data-resume-step-id="resume-route-stop"[\s\S]*workspace-route-detail pending">브리핑 정리 후 끊기</);
    expect(appHtml).toContain('Resume Target');
    expect(appHtml).toContain('Resume Note');
    expect(appHtml).toContain('Resume Action');
    expect(appHtml).toContain('완료 처리');
    expect(appHtml).toContain('지금 실행');
    expect(appHtml).toContain('보상 정산부터 재개');
  });

  it('should highlight the recommended travel card when travel is the smart resume target', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [],
        completedCount: 0
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const plan = frontend.getSmartResumePlan(loadedSnapshot);

    expect(plan.workspace).toBe('travel');
    expect(plan.travelIndex).toBe(1);
    expect(plan.cue).toContain('메모리 숲');

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    const appHtml = frontend.getAppHtml();
    expect(frontend.uiState.activeWorkspace).toBe('travel');
    expect(appHtml).toContain('Resume Command');
    expect(appHtml).toContain('Resume Steps');
    expect(appHtml).toContain('Resume Target');
    expect(appHtml).toContain('Resume Note');
    expect(appHtml).toContain('Resume Action');
    expect(appHtml).toContain('바로 이동');
    expect(appHtml).toContain('지금 실행');
    expect(appHtml).toContain('메모리 숲');
  });

  it('should surface a resume command for active quest routes without board accept actions', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      tracker: {
        questName: '메모리 숲 정찰',
        objectiveDescription: '메모리 숲으로 이동해 정찰을 시작하세요.',
        status: '진행 중',
        progress: '0 / 1',
        currentAmount: 0,
        requiredAmount: 1,
        progressPercent: 0
      },
      questBoard: {
        available: [],
        active: [
          {
            category: 'story',
            label: '메인 스토리',
            icon: '메인',
            quests: [
              {
                id: 'scout-memory-forest',
                name: '메모리 숲 정찰',
                description: '메모리 숲 전선의 첫 징후를 확인합니다.',
                requiredLevel: 1,
                estimatedTimeLabel: '4-6분',
                sessionLabel: '표준 세션',
                narrative: {
                  hook: '현장 기록관이 첫 전선 정찰을 요청했다.',
                  storyBeat: '숲 초입으로 이동해 전선 분위기를 읽어야 한다.',
                  featuredNpc: '현장 기록관'
                },
                objectives: [
                  {
                    description: '메모리 숲 진입',
                    currentAmount: 0,
                    requiredAmount: 1
                  }
                ],
                rewards: {
                  exp: 120,
                  gold: 80
                }
              }
            ]
          }
        ],
        completable: [],
        completedCount: 0
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    const appHtml = frontend.getAppHtml();
    expect(frontend.uiState.activeWorkspace).toBe('quests');
    expect(appHtml).toContain('Resume Command');
    expect(appHtml).toContain('Resume Steps');
    expect(appHtml).toContain('메모리 숲으로 이동');
    expect(appHtml).toContain('Resume Action');
    expect(appHtml).toContain('지금 실행');
  });

  it('should show a resume return card when viewing a detour workspace', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'return-to-board',
            name: '복귀 보고',
            description: '허브에서 보고를 마무리합니다.',
            requiredLevel: 1,
            estimatedTimeLabel: '2-3분',
            sessionLabel: '짧은 세션',
            narrative: {
              hook: '게시판 담당관이 즉시 복귀 보고를 요청했다.',
              storyBeat: '허브 게시판으로 돌아가 정산을 마쳐야 한다.',
              featuredNpc: '게시판 담당관'
            },
            objectives: [
              {
                description: '보고 완료',
                currentAmount: 1,
                requiredAmount: 1
              }
            ],
            rewards: {
              exp: 100,
              gold: 50
            }
          }
        ],
        completedCount: 0
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    frontend.uiState.activeWorkspace = 'market';
    frontend.handleClientAction(new MockElement({
      clientAction: 'dismiss-resume-brief'
    }));

    const appHtml = frontend.getAppHtml();
    expect(frontend.uiState.activeWorkspace).toBe('market');
    expect(appHtml).toContain('Resume Return');
    expect(appHtml).toContain('정리 예정');
    expect(appHtml).toMatch(/data-resume-step-id="resume-route-now"[\s\S]*workspace-route-detail current">보상 정산부터 재개</);
    expect(appHtml).toContain('Quests 탭으로 복귀');
    expect(appHtml).toContain('현재 경로로 복귀');
    expect(appHtml).toContain('보상 정산부터 재개');

    const handled = frontend.handleClientAction(new MockElement({
      clientAction: 'resume-step-focus',
      resumeStepId: 'resume-route-now'
    }));

    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('quests');
    expect(frontend.uiState.questLane).toBe('completable');
    expect(frontend.uiState.questIndex).toBe(0);
  });

  it('should surface a resume preview card when opening a pending step early', async () => {
    const previewSaves = [
      {
        slotNumber: 1,
        exists: true,
        savedAt: 1730390400000,
        playerName: 'BrowserHero',
        playerLevel: 3,
        locationName: '비트 타운',
        saveType: 'manual'
      }
    ] as unknown[];
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: previewSaves
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'preview-stop-step',
            name: '정산 마감',
            description: '허브에서 정산을 마무리합니다.',
            requiredLevel: 1,
            estimatedTimeLabel: '2-3분',
            sessionLabel: '짧은 세션',
            narrative: {
              hook: '게시판 담당관이 지금 바로 정산을 끝내라고 지시했다.',
              storyBeat: '보상을 수령한 뒤 저장 지점까지 정리하는 흐름이다.',
              featuredNpc: '게시판 담당관'
            },
            objectives: [
              {
                description: '정산 완료',
                currentAmount: 1,
                requiredAmount: 1
              }
            ],
            rewards: {
              exp: 120,
              gold: 60
            }
          }
        ],
        completedCount: 0
      },
      saves: previewSaves
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    const handled = frontend.handleClientAction(new MockElement({
      clientAction: 'resume-step-focus',
      resumeStepId: 'resume-route-stop'
    }));

    expect(handled).toBe(true);
    expect(frontend.uiState.activeWorkspace).toBe('save');
    expect(frontend.uiState.resumePreviewStepId).toBe('resume-route-stop');

    const previewHtml = frontend.getAppHtml();
    expect(previewHtml).toContain('Resume Preview');
    expect(previewHtml).toContain('Preview Command');
    expect(previewHtml).toContain('Preview Target');
    expect(previewHtml).toContain('Preview Note');
    expect(previewHtml).toContain('지금 실행 가능: 현재 조건에서 바로 이어갈 수 있습니다.');
    expect(previewHtml).toContain('실행 후: 이 단계 저장을 마치면 이번 재개 루트는 종료됩니다.');
    expect(previewHtml).toContain('정리 단계 미리 보기');
    expect(previewHtml).toContain('브리핑 정리 후 끊기');
    expect(previewHtml).toContain('미리 보기 상태입니다. 아래 버튼을 누르면 이 단계를 바로 실행합니다.');
    expect(previewHtml).toContain('이 단계 그대로 저장');
    expect(previewHtml).toContain('data-preview-action="true"');
    expect(previewHtml).toContain('현재 단계로 돌아가기');
    expect(previewHtml).toContain('미리 보기 닫기');
    expect(previewHtml).toMatch(/data-resume-step-id="resume-route-stop"[\s\S]*workspace-route-badge preview">미리 보기</);
    expect(previewHtml).toContain('workspace-route-strip-label">Resume Preview');
    expect(previewHtml).toContain('클릭하면 지금 단계로 복귀');

    const dismissed = frontend.handleClientAction(new MockElement({
      clientAction: 'dismiss-resume-preview'
    }));

    expect(dismissed).toBe(true);
    expect(frontend.uiState.resumePreviewStepId).toBeNull();
    expect(frontend.getAppHtml()).not.toContain('Resume Preview');
  });

  it('should show preview commit feedback after executing a preview action', async () => {
    const previewSaves = [
      {
        slotNumber: 1,
        exists: true,
        savedAt: 1730390400000,
        playerName: 'BrowserHero',
        playerLevel: 3,
        locationName: '비트 타운',
        saveType: 'manual'
      }
    ] as unknown[];
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: previewSaves
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'preview-stop-step',
            name: '정산 마감',
            description: '허브에서 정산을 마무리합니다.',
            requiredLevel: 1,
            estimatedTimeLabel: '2-3분',
            sessionLabel: '짧은 세션',
            narrative: {
              hook: '게시판 담당관이 지금 바로 정산을 끝내라고 지시했다.',
              storyBeat: '보상을 수령한 뒤 저장 지점까지 정리하는 흐름이다.',
              featuredNpc: '게시판 담당관'
            },
            objectives: [
              {
                description: '정산 완료',
                currentAmount: 1,
                requiredAmount: 1
              }
            ],
            rewards: {
              exp: 120,
              gold: 60
            }
          }
        ],
        completedCount: 0
      },
      saves: previewSaves
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    frontend.handleClientAction(new MockElement({
      clientAction: 'resume-step-focus',
      resumeStepId: 'resume-route-stop'
    }));

    await frontend.performAction({
      type: 'save-game',
      slotNumber: 1,
      previewAction: true
    });

    expect(frontend.getToastText()).toContain('미리 보기 실행 완료');
    expect(frontend.getToastText()).toContain('브리핑 정리 후 끊기');
    expect(frontend.getToastText()).toContain('이번 재개 루트는 종료되었습니다.');
    expect(frontend.uiState.resumeRoute).toBeNull();

    const appHtml = frontend.getAppHtml();
    expect(appHtml).toContain('Preview Commit');
    expect(appHtml).toContain('방금 실행됨 · 브리핑 정리 후 끊기');
    expect(appHtml).toContain('미리 보던 정리 단계를 실행했습니다. 이번 재개 루트는 종료되었습니다.');
    expect(appHtml).toContain('세션 마감 지점까지 반영됐습니다.');
    expect(appHtml).toContain('미리보기 실행');

    const dismissed = frontend.handleClientAction(new MockElement({
      clientAction: 'dismiss-preview-commit'
    }));

    expect(dismissed).toBe(true);
    expect(frontend.getAppHtml()).not.toContain('Preview Commit');
  });

  it('should offer a recovery action when a preview command is blocked', async () => {
    const previewSaves = [
      {
        slotNumber: 1,
        exists: true,
        savedAt: 1730390400000,
        playerName: 'BrowserHero',
        playerLevel: 3,
        locationName: '메모리 숲',
        saveType: 'manual'
      }
    ] as unknown[];
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: previewSaves
    });
    const loadedSnapshot = createSnapshot({
      scene: 'dungeon',
      location: {
        id: 'memory-forest',
        name: '메모리 숲',
        description: '전선 내부 구역',
        isTown: false,
        recommendedDestinationId: 'memory-forest',
        firstClearRewardPreview: '구급 패치'
      },
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'preview-stop-step',
            name: '정산 마감',
            description: '허브에서 정산을 마무리합니다.',
            requiredLevel: 1,
            estimatedTimeLabel: '2-3분',
            sessionLabel: '짧은 세션',
            narrative: {
              hook: '게시판 담당관이 보상 수령 후 복귀를 지시했다.',
              storyBeat: '현장 정리 후 저장 루트를 준비하는 흐름이다.',
              featuredNpc: '게시판 담당관'
            },
            objectives: [
              {
                description: '정산 완료',
                currentAmount: 1,
                requiredAmount: 1
              }
            ],
            rewards: {
              exp: 120,
              gold: 60
            }
          }
        ],
        completedCount: 0
      },
      saveStatus: {
        canSave: false,
        reason: '세이브 포인트가 필요합니다.',
        requiresToken: false
      },
      saves: previewSaves
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    frontend.handleClientAction(new MockElement({
      clientAction: 'resume-step-focus',
      resumeStepId: 'resume-route-stop'
    }));

    const previewHtml = frontend.getAppHtml();
    expect(previewHtml).toContain('Preview Command');
    expect(previewHtml).toContain('지금 실행 불가: 세이브 포인트가 필요합니다.');
    expect(previewHtml).toContain('이동 경로 보기');
    expect(previewHtml).toContain('이 단계 그대로 저장');
    expect(previewHtml).toMatch(/workspace-resume-command[\s\S]*지금 실행 불가: 세이브 포인트가 필요합니다\.[\s\S]*이동 경로 보기/);
  });

  it('should serialize market resume actions with item targeting metadata', async () => {
    const snapshot = createSnapshot({
      shops: [
        {
          id: 'binary-weapons',
          name: '바이너리 무기상',
          icon: '⚔️',
          ownerName: '캐시',
          greeting: '무기 정비를 시작할 시간입니다.',
          inventory: [
            {
              id: 'iron-sword',
              name: '강철 검',
              icon: '🗡️',
              description: '표준형 전투 검',
              rarity: '일반',
              level: 2,
              price: 120,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        }
      ]
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.activeWorkspace = 'market';
    frontend.uiState.resumeRoute = {
      tone: 'info',
      title: 'Resume Route',
      summary: '상점 정비 후 다음 전선으로 이어집니다.',
      phase: 'advance',
      steps: [
        {
          id: 'resume-route-now',
          order: '지금',
          tone: 'info',
          badge: '상점 진입',
          title: '시장 상황 확인',
          body: '먼저 상점 작업공간으로 이동합니다.',
          target: {
            workspace: 'market'
          },
          eta: '즉시'
        },
        {
          id: 'resume-route-next',
          order: '다음',
          tone: 'success',
          badge: '장비 보강',
          title: '강철 검 확보',
          body: '다음 교전 전에 주력 무기를 보강합니다.',
          target: {
            action: 'buy-item',
            shopId: 'binary-weapons',
            itemId: 'iron-sword'
          },
          eta: '2-3분'
        },
        {
          id: 'resume-route-stop',
          order: '정리',
          tone: 'recommended',
          badge: 'Stop Here',
          title: '정비 후 저장',
          body: '구매를 마치면 저장 탭으로 이동합니다.',
          target: {
            workspace: 'save'
          },
          eta: '1분'
        }
      ]
    };

    frontend.handleClientAction(new MockElement({
      clientAction: 'dismiss-resume-brief'
    }));

    const appHtml = frontend.getAppHtml();
    expect(appHtml).toContain('Resume Action');
    expect(appHtml).toContain('강철 검 바로 구매');
    expect(appHtml).toContain('바이너리 무기상에서 강철 검 확보를 우선해');
    expect(appHtml).toContain('data-shop-id="binary-weapons"');
    expect(appHtml).toContain('data-item-id="iron-sword"');
  });

  it('should prioritize an approaching achievement in the smart resume brief', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 240,
            target: 250,
            progressPercent: 96
          }
        ]
      },
      shops: [
        {
          id: 'binary-weapons',
          name: '바이너리 무기상',
          icon: '⚔️',
          ownerName: '캐시',
          greeting: '무기 정비를 시작할 시간입니다.',
          inventory: [
            {
              id: 'iron-sword',
              name: '강철 검',
              icon: '🗡️',
              description: '표준형 전투 검',
              rarity: '일반',
              level: 2,
              price: 120,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        },
        {
          id: 'aux-lab',
          name: '보조 장비 연구소',
          icon: '🧰',
          ownerName: '리나',
          greeting: '유틸 장비를 정비합니다.',
          inventory: [
            {
              id: 'field-kit',
              name: '현장 키트',
              icon: '🎒',
              description: '탐사 보조 장비',
              rarity: '고급',
              level: 2,
              price: 90,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        }
      ],
      questBoard: {
        available: [
          {
            category: 'story',
            label: '메인 의뢰',
            icon: '📜',
            quests: [
              {
                id: 'quest-2',
                name: '새 의뢰'
              }
            ]
          }
        ],
        active: [],
        completable: [],
        completedCount: 0
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });

    expect(frontend.uiState.activeWorkspace).toBe('market');
    expect(frontend.uiState.marketShopId).toBe('binary-weapons');
    expect(frontend.uiState.marketIndex).toBe(0);
    expect(frontend.uiState.resumeBrief?.title).toBe('현장 조달부터 재개');
    expect(frontend.uiState.resumeBrief?.badge).toBe('업적 임박');
    expect(frontend.uiState.resumeBrief?.body).toContain('현장 조달 업적이 거의 달성 상태입니다.');
    expect(frontend.uiState.resumeBrief?.detail).toBe('첫 확인: 바이너리 무기상 · 강철 검');
    const actionRailHtml = frontend.renderActionRail(loadedSnapshot);
    const appHtml = frontend.getAppHtml();
    expect(actionRailHtml).toContain('강철 검 확보');
    expect(actionRailHtml).toContain('현장 조달 업적 진척을 위해 바이너리 무기상에서 강철 검 확보를 우선합니다.');
    expect(actionRailHtml).toContain('data-action="buy-item"');
    expect(actionRailHtml).toContain('data-shop-id="binary-weapons"');
    expect(actionRailHtml).toContain('data-item-id="iron-sword"');
    expect(appHtml).toContain('첫 확인: 바이너리 무기상 · 강철 검');
  });

  it('should preserve achievement chase context after loading a tracked slot', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 2, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      },
      achievements: {
        unlockedCount: 1,
        totalCount: 6,
        latestUnlocked: {
          id: 'first_turn_in',
          title: '첫 정산',
          description: '첫 퀘스트를 마칩니다.',
          accent: 'reward',
          unlockedAt: 1730390400000
        },
        entries: [
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 3,
            target: 4,
            progressPercent: 75
          },
          {
            id: 'boss_shutdown',
            title: '보스 셧다운',
            description: '첫 보스를 쓰러뜨립니다.',
            category: 'boss',
            accent: 'boss',
            unlocked: false,
            current: 0,
            target: 1,
            progressPercent: 0
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 2,
      loadIntent: 'achievement-chase',
      loadAchievementTitle: '전선 개척',
      loadAchievementProgress: '3/4'
    });

    const actionRailHtml = frontend.renderActionRail(loadedSnapshot);
    const feedHtml = frontend.renderFeed(loadedSnapshot);
    const dockedFeedHtml = frontend.renderDockedFeed(loadedSnapshot);
    const sidebarHudHtml = frontend.renderSidebarHud(loadedSnapshot);
    const workspaceTabsHtml = frontend.renderWorkspaceTabs(loadedSnapshot);
    const rewardCards = frontend.getRewardHorizonCards(loadedSnapshot);
    const rewardHorizonHtml = frontend.renderRewardHorizon(loadedSnapshot);
    const savePanelHtml = frontend.renderSavePanel(loadedSnapshot);
    const momentumCards = frontend.getMomentumCards(loadedSnapshot);
    const momentumHtml = frontend.renderMomentumPanel(loadedSnapshot);
    const alerts = frontend.getSidebarAlerts(loadedSnapshot);
    const alertsHtml = frontend.renderSidebarAlerts(loadedSnapshot);
    frontend.uiState.activeWorkspace = 'achievements';
    const achievementsHtml = frontend.renderAchievements(loadedSnapshot);
    const appHtml = frontend.getAppHtml();
    const trackedRewardCard = rewardCards.find(card => card.id === 'achievement-chase-reward');
    const trackedMomentumCard = momentumCards.find(card => card.id === 'achievement-progress');
    const trackedAlert = alerts.find(alert => alert.id === 'achievement:frontier_scout');

    expect(frontend.uiState.resumeBrief?.badge).toBe('업적 추적');
    expect(frontend.uiState.resumeBrief?.title).toBe('전선 개척 추적 재개');
    expect(frontend.uiState.resumeBrief?.body).toContain('전선 개척 3/4 목표 기준으로 이어왔습니다.');
    expect(frontend.uiState.resumeRoute?.summary).toContain('전선 개척 3/4 목표 기준');
    expect(frontend.getToastText()).toBe('업적 추적 재개: 전선 개척 3/4');
    expect(trackedRewardCard).toMatchObject({
      eyebrow: 'Achievement Chase',
      title: '전선 개척',
      badge: '3 / 4',
      target: {
        uiAction: 'focus-achievement-target',
        uiValue: 'frontier_scout'
      }
    });
    expect(rewardHorizonHtml).toContain('Reward Horizon · 전선 개척 3/4');
    expect(rewardHorizonHtml).toContain('현재 추적 목표');
    expect(rewardHorizonHtml).toContain('data-ui-value="frontier_scout"');
    expect(savePanelHtml).toContain('Save Control · 전선 개척 3/4');
    expect(savePanelHtml).toContain('Session Wrap · 전선 개척 3/4');
    expect(savePanelHtml).toContain('Resume Cue · 전선 개척 3/4');
    expect(savePanelHtml).toContain('추적 대상');
    expect(savePanelHtml).toContain('전선 개척 3/4');
    expect(savePanelHtml).toContain('전선 개척 3/4 목표 기준');
    expect(feedHtml).toContain('Run Feed · 전선 개척 3/4');
    expect(feedHtml).toContain('Achievement Chase · 전선 개척 3/4');
    expect(feedHtml).toContain('추적 업적 열기');
    expect(feedHtml).toContain('추적 대상');
    expect(dockedFeedHtml).toContain('Recent Wins · 전선 개척 3/4');
    expect(dockedFeedHtml).toContain('Achievement Chase · 전선 개척 3/4');
    expect(dockedFeedHtml).toContain('data-ui-value="frontier_scout"');
    expect(sidebarHudHtml).toContain('Live Run · 전선 개척 3/4');
    expect(sidebarHudHtml).toContain('Achievement Chase · 전선 개척 3/4');
    expect(sidebarHudHtml).toContain('추적 경로 열기');
    expect(sidebarHudHtml).toContain('3 / 4');
    expect(workspaceTabsHtml).toContain('workspace-route-badge target">추적 업적');
    expect(workspaceTabsHtml).toContain('workspace-route-detail target">메모리 숲 보기');
    expect(workspaceTabsHtml).toContain('data-ui-action="focus-achievement-target"');
    expect(workspaceTabsHtml).toContain('data-ui-value="frontier_scout"');
    frontend.handleUiAction({
      dataset: {
        uiAction: 'focus-achievement-target',
        uiValue: 'frontier_scout'
      }
    });
    const focusedAppHtml = frontend.getAppHtml();
    expect(frontend.uiState.activeWorkspace).toBe('travel');
    expect(focusedAppHtml).toContain('Achievement Target · 전선 개척 3/4');
    expect(focusedAppHtml).toContain('메모리 숲 보기');
    expect(focusedAppHtml).toContain('현재 추적 업적 전선 개척 3/4 목표에 맞는 작업공간입니다.');
    expect(focusedAppHtml).toContain('업적 목표 카드');
    expect(focusedAppHtml).toContain('현재 추적 업적 전선 개척 3/4 목표 카드입니다.');
    expect(trackedMomentumCard).toMatchObject({
      eyebrow: 'Achievement Chase',
      title: '전선 개척',
      badge: '3 / 4',
      target: {
        uiAction: 'focus-achievement-target',
        uiValue: 'frontier_scout'
      }
    });
    expect(momentumHtml).toContain('Momentum · 전선 개척 3/4');
    expect(momentumHtml).toContain('Achievement Chase');
    expect(trackedAlert).toMatchObject({
      eyebrow: 'Achievement Chase',
      title: '전선 개척 추적',
      badge: '3 / 4',
      uiAction: 'focus-achievement-target',
      uiValue: 'frontier_scout'
    });
    expect(alertsHtml).toContain('Priority Intel · 전선 개척 3/4');
    expect(alertsHtml).toContain('Achievement Chase');
    expect(actionRailHtml).toContain('Session Plan · 전선 개척 3/4');
    expect(actionRailHtml).toContain('Next Move · 전선 개척 3/4');
    expect(actionRailHtml).toContain('Tempo Routes · 전선 개척 3/4');
    expect(achievementsHtml).toContain('추적 대상');
    expect(achievementsHtml).toContain('전선 개척 3/4');
    expect(achievementsHtml).toContain('data-tracked="true"');
    expect(achievementsHtml).toContain('업적 추적');
    expect(achievementsHtml.indexOf('data-ui-value="frontier_scout"')).toBeLessThan(
      achievementsHtml.indexOf('data-ui-value="boss_shutdown"')
    );
    expect(appHtml).toContain('Resume Anchor · 전선 개척 3/4');
    expect(appHtml).toContain('Resume Command · 전선 개척 3/4');
    expect(appHtml).toContain('Resume Steps · 전선 개척 3/4');
    expect(appHtml).toContain('Resume Target · 전선 개척 3/4');
    expect(appHtml).toContain('Resume Note · 전선 개척 3/4');
    expect(appHtml).toContain('Resume Action · 전선 개척 3/4');
  });

  it('should retarget achievement chase context after completing the tracked goal', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 2, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: false,
            current: 240,
            target: 250,
            progressPercent: 96
          },
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 3,
            target: 4,
            progressPercent: 75
          }
        ]
      },
      shops: [
        {
          id: 'binary-weapons',
          name: '바이너리 무기상',
          icon: '⚔️',
          ownerName: '캐시',
          greeting: '무기 정비를 시작할 시간입니다.',
          inventory: [
            {
              id: 'iron-sword',
              name: '강철 검',
              icon: '🗡️',
              description: '표준형 전투 검',
              rarity: '일반',
              level: 2,
              price: 120,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        }
      ]
    });
    const afterBuySnapshot = createSnapshot({
      achievements: {
        unlockedCount: 1,
        totalCount: 6,
        latestUnlocked: {
          id: 'field_buyer',
          title: '현장 조달',
          description: '상점과 여관에 누적 250골드를 사용합니다.',
          accent: 'reward',
          unlockedAt: 1730390400000
        },
        entries: [
          {
            id: 'field_buyer',
            title: '현장 조달',
            description: '상점과 여관에 누적 250골드를 사용합니다.',
            category: 'economy',
            accent: 'reward',
            unlocked: true,
            unlockedAt: 1730390400000,
            current: 250,
            target: 250,
            progressPercent: 100
          },
          {
            id: 'frontier_scout',
            title: '전선 개척',
            description: '서로 다른 지역 4곳을 해금합니다.',
            category: 'exploration',
            accent: 'unlock',
            unlocked: false,
            current: 3,
            target: 4,
            progressPercent: 75
          }
        ]
      },
      shops: [
        {
          id: 'binary-weapons',
          name: '바이너리 무기상',
          icon: '⚔️',
          ownerName: '캐시',
          greeting: '무기 정비를 시작할 시간입니다.',
          inventory: [
            {
              id: 'iron-sword',
              name: '강철 검',
              icon: '🗡️',
              description: '표준형 전투 검',
              rarity: '일반',
              level: 2,
              price: 120,
              canAfford: true,
              meetsLevelReq: true
            }
          ]
        }
      ]
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 2,
      loadIntent: 'achievement-chase',
      loadAchievementTitle: '현장 조달',
      loadAchievementProgress: '240/250'
    });

    frontend.setSnapshot(afterBuySnapshot);
    await frontend.performAction({
      type: 'buy-item',
      shopId: 'binary-weapons',
      itemId: 'iron-sword'
    });

    const actionRailHtml = frontend.renderActionRail(afterBuySnapshot);
    const appHtml = frontend.getAppHtml();

    expect(frontend.getToastText()).toContain('업적 추적 완료: 현장 조달');
    expect(frontend.getToastText()).toContain('다음 목표 전선 개척');
    expect(frontend.uiState.resumeRoute?.achievementTitle).toBe('전선 개척');
    expect(frontend.uiState.resumeRoute?.achievementProgress).toBe('3 / 4');
    expect(frontend.uiState.resumeRoute?.summary).toContain('전선 개척 3 / 4 목표 기준');
    expect(actionRailHtml).toContain('Next Move · 전선 개척 3 / 4');
    expect(appHtml).toContain('Resume Anchor · 전선 개척 3 / 4');
    expect(appHtml).toContain('Resume Return · 전선 개척 3 / 4');
  });

  it('should mark the quest lane selector for tracked quest achievements', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 2, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 0
      },
      achievements: {
        unlockedCount: 0,
        totalCount: 6,
        latestUnlocked: null,
        entries: [
          {
            id: 'first_turn_in',
            title: '첫 정산',
            description: '퀘스트 보상을 처음으로 정산합니다.',
            category: 'quest',
            accent: 'quest',
            unlocked: false,
            current: 0,
            target: 1,
            progressPercent: 0
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 2,
      loadIntent: 'achievement-chase',
      loadAchievementTitle: '첫 정산',
      loadAchievementProgress: '0/1'
    });

    const html = frontend.getAppHtml();

    expect(frontend.uiState.activeWorkspace).toBe('quests');
    expect(html).toContain('Resume Brief');
    expect(html).toContain('첫 정산 추적 재개');
    expect(html).toContain('segment-button active target');
    expect(html).toContain('업적 목표');
    expect(html).toContain('보상 대기');
  });

  it('should surface the next unlock summary in the landing continue card', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [
        {
          slotNumber: 2,
          exists: true,
          savedAt: 1730390400000,
          playerName: 'Archivist',
          playerLevel: 4,
          locationName: '비트 타운',
          achievementCount: 3,
          achievementTotal: 6,
          resumeTitle: '새 퀘스트',
          resumeHint: '게시판에서 다음 의뢰 2개를 확인하세요.',
          trackedAchievementTitle: '전선 개척',
          trackedAchievementProgress: '3/4',
          trackedAchievementHint: '서로 다른 지역 4곳을 해금합니다.',
          nextAchievementTitle: '전선 개척',
          nextAchievementProgress: '3/4',
          nextAchievementHint: '서로 다른 지역 4곳을 해금합니다.'
        }
      ] as unknown[]
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const html = frontend.getAppHtml();

    expect(html).toContain('최근 기록 바로 이어하기');
    expect(html).toContain('Next Unlock');
    expect(html).toContain('전선 개척');
    expect(html).toContain('3/4');
    expect(html).toContain('서로 다른 지역 4곳을 해금합니다.');
    expect(html).toContain('업적 추적');
    expect(html).toContain('data-load-achievement-title="전선 개척"');
    expect(html).toContain('data-load-achievement-progress="3/4"');
    expect(html).toContain('Achievement Chase');
    expect(html).not.toContain('업적 추적 슬롯 이어하기');
  });

  it('should highlight the closest next unlock in the landing achievement record card', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [
        {
          slotNumber: 1,
          exists: true,
          savedAt: 1730390400000,
          playerName: 'Archivist',
          playerLevel: 5,
          locationName: '비트 타운',
          achievementCount: 4,
          achievementTotal: 6,
          nextAchievementTitle: '현장 조달',
          nextAchievementProgress: '120/250',
          nextAchievementHint: '상점과 여관에 누적 250골드를 사용합니다.'
        },
        {
          slotNumber: 2,
          exists: true,
          savedAt: 1730304000000,
          playerName: 'Scout',
          playerLevel: 4,
          locationName: '메모리 숲',
          achievementCount: 3,
          achievementTotal: 6,
          trackedAchievementTitle: '전선 개척',
          trackedAchievementProgress: '3/4',
          trackedAchievementHint: '서로 다른 지역 4곳을 해금합니다.',
          nextAchievementTitle: '전선 개척',
          nextAchievementProgress: '3/4',
          nextAchievementHint: '서로 다른 지역 4곳을 해금합니다.'
        }
      ] as unknown[]
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const html = frontend.getAppHtml();

    expect(html).toContain('업적 기록');
    expect(html).toContain('추적 대상 Slot 2 · 전선 개척 3/4');
    expect(html).toContain('최고 해금 Slot 1 · 4 / 6');
    expect(html).toContain('data-load-intent="achievement-chase"');
    expect(html).toContain('data-load-achievement-title="전선 개척"');
    expect(html).toContain('data-load-achievement-progress="3/4"');
    expect(html).toContain('추적 슬롯 2');
    expect(html).toContain('Achievement Chase');
    expect(html).toContain('업적 추적 슬롯 이어하기');
    expect(html).toContain('업적 추적 이어하기');
    expect(html).toContain('업적 추적');
  });

  it('should clear the resume brief after the next non-load action', async () => {
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(loadedSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });
    expect(frontend.uiState.resumeBrief).not.toBeNull();

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'visit-board'
    });

    expect(frontend.uiState.resumeBrief).toBeNull();
    expect(frontend.uiState.resumeRoute).not.toBeNull();
    expect(frontend.uiState.resumeRoute?.phase).toBe('advance');
  });

  it('should move the resume route into wrap mode after a meaningful progression action', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const clearedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [],
        completedCount: 2
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });
    expect(frontend.uiState.resumeRoute).not.toBeNull();

    frontend.setSnapshot(clearedSnapshot);
    await frontend.performAction({
      type: 'complete-quest',
      questId: 'quest-1'
    });

    expect(frontend.uiState.resumeRoute?.phase).toBe('wrap');
    const actionRailHtml = frontend.renderActionRail(clearedSnapshot);
    const appHtml = frontend.getAppHtml();
    expect(actionRailHtml).toContain('진행 3 / 3');
    expect(actionRailHtml).toContain('완료');
    expect(appHtml).toContain('정리 단계');
    expect(appHtml).toContain('현재 경로');
  });

  it('should clear the resume route after saving at the suggested stop point', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });
    expect(frontend.uiState.resumeRoute).not.toBeNull();

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'save-game',
      slotNumber: 1
    });

    expect(frontend.uiState.resumeRoute).toBeNull();
  });

  it('should allow dismissing the persistent resume route manually', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });
    expect(frontend.uiState.resumeRoute).not.toBeNull();

    const handled = frontend.handleClientAction({
      dataset: {
        clientAction: 'dismiss-resume-route'
      }
    });

    expect(handled).toBe(true);
    expect(frontend.uiState.resumeRoute).toBeNull();
  });

  it('should advance the resume route after resume focus is used', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      saves: [{ slotNumber: 1, exists: true, savedAt: 1730390400000 }] as unknown[]
    });
    const loadedSnapshot = createSnapshot({
      questBoard: {
        available: [],
        active: [],
        completable: [
          {
            id: 'quest-1',
            name: '첫 정산 대상',
            rewards: {
              exp: 20,
              gold: 15,
              items: ['구급 패치']
            }
          }
        ],
        completedCount: 1
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    frontend.setSnapshot(loadedSnapshot);
    await frontend.performAction({
      type: 'load-game',
      slotNumber: 1
    });
    expect(frontend.uiState.resumeRoute?.phase).toBe('inspect');

    const handled = frontend.handleClientAction({
      dataset: {
        clientAction: 'resume-focus'
      }
    });

    expect(handled).toBe(true);
    expect(frontend.uiState.resumeBrief).toBeNull();
    expect(frontend.uiState.resumeRoute?.phase).toBe('advance');
  });
});
