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
    directorMode: 'off' | 'light' | 'full';
    narrativeMode: 'off' | 'light' | 'full';
    currentIntent: null | {
      id: string;
      kind: string;
      title: string;
      reason: string;
      tone: string;
      confidence: number;
      recommendedAction: string | null;
      recommendedLocationId: string | null;
      lines: string[];
    };
    narrativeCue: null | {
      speaker: string;
      title: string;
      summary: string;
      beats: string[];
      tone: string;
    };
    encounterDirector?: null | {
      mode: 'steady' | 'recovery' | 'variety' | 'pressure';
      encounterChance: number;
      preferredEventId: string | null;
      reason: string;
      challengeContext?: {
        tier: number;
        streak: number;
        modifierId: string | null;
        modifierName: string | null;
      } | null;
      fatigueSnapshot: {
        repeatActionCount: number;
        consecutiveCombats: number;
        consecutiveNonProgressLoops: number;
      };
    };
    recentMoments: Array<{
      type: string;
      label: string;
      timestamp: number;
    }>;
  };
  ops?: null | {
    telemetryEvents: number;
    playtestNotes: number;
    topFinding: string | null;
    topObservation: null | {
      severity: 'P0' | 'P1' | 'P2';
      text: string;
    };
    topBacklog: null | {
      priority: 'P0' | 'P1' | 'P2';
      title: string;
      theme: string;
    };
    backlogCounts: {
      P0: number;
      P1: number;
      P2: number;
    };
    findings: string[];
    observations: Array<{
      severity: 'P0' | 'P1' | 'P2';
      text: string;
      noteLabel: string;
      section: string;
      tags: string[];
    }>;
    backlog: Array<{
      id: string;
      priority: 'P0' | 'P1' | 'P2';
      theme: string;
      title: string;
      rationale: string;
      evidence: string[];
      suggestedActions: string[];
    }>;
    linearDrafts: Array<{
      id: string;
      priority: 'P0' | 'P1' | 'P2';
      theme: string;
      title: string;
      labels: string[];
      summary: string;
      exportStatus: 'draft' | 'exported' | 'updated' | 'closed';
      issueIdentifier: string | null;
      issueUrl: string | null;
      lastExportedAtIso: string | null;
      linearStateName: string | null;
      linearStateType: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | 'unknown';
      lastSyncedAtIso: string | null;
      lifecycleStatus: 'draft' | 'sync-needed' | 'live' | 'closed' | 'shipped';
      staleSync: boolean;
      impactTrend: 'improved' | 'flat' | 'regressed' | 'unknown';
      impactSummary: string | null;
    }>;
    nextCommand: {
      label: string;
      command: string;
      reason: string;
      tone: 'recommended' | 'warning' | 'success';
    } | null;
    doctor?: null | {
      status: 'ok' | 'warn' | 'fail';
      summaryPresent: boolean;
      freshnessLabel: string;
      reasons: string[];
      recommendedCommand: string | null;
      opsStatus: null | {
        id: string;
        label: string;
        tone: 'recommended' | 'warning' | 'success';
        actionRequired: boolean;
        summary: string;
      };
    };
    status?: null | {
      id: string;
      label: string;
      tone: 'recommended' | 'warning' | 'success';
      actionRequired: boolean;
      summary: string;
    };
    latestCycleFollowUp?: null | {
      label: string;
      command: string;
      reason: string;
      tone: 'recommended' | 'warning' | 'success';
    };
    latestCycle?: null | {
      generatedAtIso: string;
      mode: 'dry-run' | 'artifact' | 'apply-linear';
      overallPass: boolean;
      stepsPassed: number;
      stepsTotal: number;
      stale: boolean;
      ageHours: number | null;
      failedSteps: Array<{
        label: string;
        status: number;
        outputFileName: string;
      }>;
      reportJsonPath: string;
      bundleDir: string | null;
      nextCommand: string | null;
    };
    recentSignals: Array<{
      isoTime: string;
      eventType: string;
      summary: string;
    }>;
    recommendationDismissRate: number | null;
    encounterDecisionCount: number;
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
    opsExportFilterId: string;
    opsImpactFilterId: string;
  };
  renderAchievements: (snapshot: FrontendSnapshot) => string;
  renderFeed: (snapshot: FrontendSnapshot) => string;
  renderDockedFeed: (snapshot: FrontendSnapshot) => string;
  renderSidebarHud: (snapshot: FrontendSnapshot) => string;
  renderWorkspaceTabs: (snapshot: FrontendSnapshot) => string;
  renderRewardHorizon: (snapshot: FrontendSnapshot) => string;
  renderMarket: (snapshot: FrontendSnapshot) => string;
  renderOpsWorkspace: (snapshot: FrontendSnapshot) => string;
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
  getFetchCalls(): unknown[][];
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
      achievementTotal: 10
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
      totalCount: 10,
      latestUnlocked: null,
      entries: []
    },
    achievementTracking: {
      mode: 'auto',
      current: null,
      history: []
    },
    achievementPerks: {
      summary: [],
      inventorySizeBonus: 0,
      shopDiscountPercent: 0,
      unlockedShopTiers: []
    },
    ai: {
      directorMode: 'full',
      narrativeMode: 'light',
      currentIntent: null,
      narrativeCue: null,
      encounterDirector: null,
      recentMoments: []
    },
    ops: null,
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
  renderMarket,
  renderOpsWorkspace,
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
    },
    getFetchCalls() {
      return fetchStub.mock.calls;
    }
  });
}

describe('Frontend achievement workspace actions', () => {
  it('should render click-through achievement cards with route copy', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 0,
        totalCount: 10,
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
        totalCount: 10,
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

  it('should surface active perk summaries in the achievement deck', async () => {
    const snapshot = createSnapshot({
      achievementPerks: {
        summary: ['가방 +6칸', '상점 할인 8%', '특수 진열 2개'],
        inventorySizeBonus: 6,
        shopDiscountPercent: 8,
        unlockedShopTiers: [
          {
            shopId: 'binary-weapons',
            tierKey: 'level25',
            label: 'binary-weapons:level25'
          },
          {
            shopId: 'armor-code',
            tierKey: 'level20',
            label: 'armor-code:level20'
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderAchievements(snapshot);

    expect(html).toContain('활성 특전');
    expect(html).toContain('가방 +6칸 / 상점 할인 8% / 특수 진열 2개');
  });

  it('should focus the quest workspace and completable lane for turn-in achievements', async () => {
    const snapshot = createSnapshot({
      achievements: {
        unlockedCount: 1,
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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

  it('should surface perk discount and unlocked stock summaries in the market workspace', async () => {
    const snapshot = createSnapshot({
      achievementPerks: {
        summary: ['상점 할인 8%', '특수 진열 1개'],
        inventorySizeBonus: 0,
        shopDiscountPercent: 8,
        unlockedShopTiers: [
          {
            shopId: 'binary-weapons',
            tierKey: 'level25',
            label: 'binary-weapons:level25'
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
    const frontend = await createFrontendHarness(snapshot);
    const html = frontend.renderMarket(snapshot);

    expect(html).toContain('상점 할인');
    expect(html).toContain('8%');
    expect(html).toContain('해금 진열');
    expect(html).toContain('1개');
  });

  it('should render an AI Director card with a follow target in the action rail', async () => {
    const snapshot = createSnapshot({
      ai: {
        directorMode: 'full',
        narrativeMode: 'light',
        currentIntent: {
          id: 'new-quest:town',
          kind: 'new-quest',
          title: '새 퀘스트',
          reason: '게시판에서 다음 의뢰 3개를 확인하세요.',
          tone: 'info',
          confidence: 0.78,
          recommendedAction: 'quest',
          recommendedLocationId: 'bit-town',
          lines: [
            '수락 가능 퀘스트 3개가 있습니다.',
            '게시판에서 다음 진행 루트를 확보하세요.'
          ]
        },
        narrativeCue: {
          speaker: '동행 기록관',
          title: '첫 장면',
          summary: '비트 타운 도착부터 천천히 가면 됩니다. 첫 의뢰 하나와 짧은 이동 하나만 묶어도 흐름이 잡힙니다.',
          beats: ['비트 타운 도착'],
          tone: 'info'
        },
        recentMoments: [
          {
            type: 'new-game',
            label: '비트 타운 도착',
            timestamp: 1700000000000
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderActionRail(snapshot);

    expect(html).toContain('AI Director');
    expect(html).toContain('게시판에서 다음 의뢰 3개를 확인하세요.');
    expect(html).toContain('퀘스트 작업공간 열기');
    expect(html).toContain('data-ai-follow-intent-id="new-quest:town"');
  });

  it('should render an Encounter Director card in the action rail for dungeon pacing', async () => {
    const snapshot = createSnapshot({
      scene: 'dungeon',
      location: {
        id: 'memory-forest',
        name: '메모리 숲',
        description: '반복 전투가 누적된 현장',
        isTown: false,
        recommendedDestinationId: null,
        firstClearRewardPreview: '구급 패치'
      },
      ai: {
        directorMode: 'full',
        narrativeMode: 'light',
        currentIntent: null,
        narrativeCue: null,
        encounterDirector: {
          mode: 'variety',
          encounterChance: 0.3,
          preferredEventId: 'route-scan',
          reason: '연속 동일 패턴을 끊기 위해 비전투 이벤트 비중을 올립니다.',
          challengeContext: {
            tier: 3,
            streak: 4,
            modifierId: 'berserker-protocol',
            modifierName: '광폭 프로토콜'
          },
          fatigueSnapshot: {
            repeatActionCount: 3,
            consecutiveCombats: 3,
            consecutiveNonProgressLoops: 3
          }
        },
        recentMoments: []
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderActionRail(snapshot);

    expect(html).toContain('Encounter Director');
    expect(html).toContain('패턴 전환 구간');
    expect(html).toContain('전투 30%');
    expect(html).toContain('우회 동선');
    expect(html).toContain('심연 T3');
    expect(html).toContain('광폭 프로토콜');
    expect(html).toContain('전투 연속 3');
  });

  it('should render a Companion Note card from AI narrative memory', async () => {
    const snapshot = createSnapshot({
      ai: {
        directorMode: 'full',
        narrativeMode: 'light',
        currentIntent: {
          id: 'quest-objective:forest-survey',
          kind: 'quest-objective',
          title: '다음 목표',
          reason: '숲 현장 조사: 메모리 숲 도착',
          tone: 'info',
          confidence: 0.88,
          recommendedAction: 'travel',
          recommendedLocationId: 'memory-forest',
          lines: [
            '숲 현장 조사: 메모리 숲 도착',
            '추천 목적지: 메모리 숲'
          ]
        },
        narrativeCue: {
          speaker: '동행 기록관',
          title: '장면 고정',
          summary: '숲 현장 조사가 이번 세션의 중심선입니다. 메모리 숲 쪽으로 바로 이어가면 장면이 끊기지 않습니다.',
          beats: ['숲 현장 조사', '비트 타운 도착'],
          tone: 'info'
        },
        recentMoments: [
          {
            type: 'quest-accepted',
            label: '숲 현장 조사',
            timestamp: 1700000001000
          },
          {
            type: 'new-game',
            label: '비트 타운 도착',
            timestamp: 1700000000000
          }
        ]
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderActionRail(snapshot);

    expect(html).toContain('Companion Note');
    expect(html).toContain('장면 고정');
    expect(html).toContain('숲 현장 조사');
    expect(html).toContain('비트 타운 도착');
  });

  it('should render an Encounter Director card in the sidebar HUD for dungeon pacing', async () => {
    const snapshot = createSnapshot({
      scene: 'dungeon',
      location: {
        id: 'memory-forest',
        name: '메모리 숲',
        description: '보스 접근 구간',
        isTown: false,
        recommendedDestinationId: null,
        firstClearRewardPreview: '구급 패치',
        bossProgress: {
          text: '보스 2 / 3',
          bossName: '트레이스 울프',
          current: 2,
          target: 3,
          remaining: 1,
          ready: false
        }
      },
      ai: {
        directorMode: 'full',
        narrativeMode: 'light',
        currentIntent: null,
        narrativeCue: null,
        encounterDirector: {
          mode: 'pressure',
          encounterChance: 0.72,
          preferredEventId: 'route-scan',
          reason: '트레이스 울프 접근 구간이라 긴장감을 높이되, 우회 동선이 나오면 결전선까지 빠르게 당깁니다.',
          challengeContext: {
            tier: 2,
            streak: 3,
            modifierId: 'arcane-overclock',
            modifierName: '아케인 오버클럭'
          },
          fatigueSnapshot: {
            repeatActionCount: 1,
            consecutiveCombats: 1,
            consecutiveNonProgressLoops: 1
          }
        },
        recentMoments: []
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const html = frontend.renderSidebarHud(snapshot);

    expect(html).toContain('Encounter Director');
    expect(html).toContain('전투 압박 구간');
    expect(html).toContain('압박 상승');
    expect(html).toContain('전투 72%');
    expect(html).toContain('심연 T2');
    expect(html).toContain('아케인 오버클럭');
  });

  it('should dismiss the AI Director card and report feedback telemetry', async () => {
    const snapshot = createSnapshot({
      ai: {
        directorMode: 'full',
        narrativeMode: 'light',
        currentIntent: {
          id: 'frontier:memory-forest',
          kind: 'frontier',
          title: '다음 공략',
          reason: '메모리 숲은 지금 공략하기 좋은 지역입니다.',
          tone: 'info',
          confidence: 0.81,
          recommendedAction: 'travel',
          recommendedLocationId: 'memory-forest',
          lines: [
            '메모리 숲은 지금 공략하기 좋은 지역입니다.',
            '첫 클리어 보상: EXP +500 / 골드 +300'
          ]
        },
        narrativeCue: null,
        encounterDirector: null,
        recentMoments: []
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    expect(frontend.getAppHtml()).toContain('AI Director');

    const handled = frontend.handleClientAction(new MockElement({
      clientAction: 'dismiss-ai-intent',
      aiIntentId: 'frontier:memory-forest',
      aiFeedbackSource: 'ai-card'
    }));

    await Promise.resolve();
    await Promise.resolve();

    expect(handled).toBe(true);
    expect(frontend.getAppHtml()).not.toContain('AI Director');

    const fetchCalls = frontend.getFetchCalls();
    const latestCall = fetchCalls[fetchCalls.length - 1];
    const latestOptions = (latestCall?.[1] ?? {}) as { body?: string };
    expect(latestCall?.[0]).toBe('/api/action');
    expect(String(latestOptions.body)).toContain('"type":"ai-feedback"');
    expect(String(latestOptions.body)).toContain('"feedback":"dismiss"');
    expect(String(latestOptions.body)).toContain('"intentId":"frontier:memory-forest"');
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
        totalCount: 10,
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
          achievementTotal: 10,
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
          achievementTotal: 10,
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
          achievementTotal: 10,
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
    expect(html).toContain('최고 해금 Slot 1 · 4 / 10');
    expect(html).toContain('data-load-intent="achievement-chase"');
    expect(html).toContain('data-load-achievement-title="전선 개척"');
    expect(html).toContain('data-load-achievement-progress="3/4"');
    expect(html).toContain('추적 슬롯 2');
    expect(html).toContain('Achievement Chase');
    expect(html).toContain('업적 추적 슬롯 이어하기');
    expect(html).toContain('업적 추적 이어하기');
    expect(html).toContain('업적 추적');
  });

  it('should surface active perks in landing continue cards and save slots', async () => {
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
          achievementTotal: 10,
          achievementPerkSummary: ['가방 +6칸', '상점 할인 8%'],
          nextAchievementTitle: '현장 조달',
          nextAchievementProgress: '120/250',
          nextAchievementHint: '상점과 여관에 누적 250골드를 사용합니다.'
        }
      ] as unknown[]
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const html = frontend.getAppHtml();

    expect(html).toContain('Active Perks');
    expect(html).toContain('가방 +6칸 / 상점 할인 8%');
    expect(html).toContain('현재 세이브에 누적된 업적 특전입니다.');
    expect(html).toContain('누적 업적 특전이 이 세이브에 적용되어 있습니다.');
  });

  it('should render AI Ops Pulse on landing when playtest ops data exists', async () => {
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      ops: {
        telemetryEvents: 12,
        playtestNotes: 2,
        topFinding: 'AI recommendation dismiss 비중이 높습니다. 노출 빈도 또는 카드 우선순위가 과한지 검토가 필요합니다.',
        topObservation: {
          severity: 'P0',
          text: 'Resume panel felt unclear and the AI recommendation was dismissed twice.'
        },
        topBacklog: {
          priority: 'P0',
          title: 'Resume clarity pass for AI-guided surfaces',
          theme: 'resume'
        },
        backlogCounts: {
          P0: 1,
          P1: 2,
          P2: 0
        },
        findings: [
          'AI recommendation dismiss 비중이 높습니다. 노출 빈도 또는 카드 우선순위가 과한지 검토가 필요합니다.'
        ],
        observations: [
          {
            severity: 'P0',
            text: 'Resume panel felt unclear and the AI recommendation was dismissed twice.',
            noteLabel: 'session-20260312-010000.md',
            section: 'Follow-ups',
            tags: ['resume', 'clarity']
          }
        ],
        backlog: [
          {
            id: 'playtest-resume-p0',
            priority: 'P0',
            theme: 'resume',
            title: 'Resume clarity pass for AI-guided surfaces',
            rationale: '재개 surface가 목표 이해를 놓치고 있습니다.',
            evidence: ['AI dismiss rate 50% (1/2)'],
            suggestedActions: ['Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.']
          }
        ],
        linearDrafts: [
          {
            id: 'linear-playtest-resume-p0',
            priority: 'P0',
            theme: 'resume',
            title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
            labels: ['ai-ops', 'p0', 'resume', 'ux'],
            summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
            exportStatus: 'draft',
            issueIdentifier: null,
            issueUrl: null,
            lastExportedAtIso: null,
            linearStateName: null,
            linearStateType: 'unknown',
            lastSyncedAtIso: null,
            lifecycleStatus: 'draft',
            staleSync: false,
            impactTrend: 'unknown',
            impactSummary: '효과 baseline이 아직 없습니다.'
          }
        ],
        nextCommand: {
          label: 'export 대상 점검',
          command: 'npm run ai:linear:export:dry',
          reason: '미수출 또는 갱신 필요 draft 1건이 있습니다.',
          tone: 'recommended'
        },
        doctor: {
          status: 'warn',
          summaryPresent: true,
          freshnessLabel: 'fresh · 4h',
          reasons: ['Ops status Export 대기: 미수출 또는 갱신 필요 draft 1건이 있습니다.'],
          recommendedCommand: 'npm run ai:linear:export:dry',
          opsStatus: {
            id: 'export-pending',
            label: 'Export 대기',
            tone: 'recommended',
            actionRequired: true,
            summary: '미수출 또는 갱신 필요 draft 1건이 있습니다.'
          }
        },
        status: {
          id: 'export-pending',
          label: 'Export 대기',
          tone: 'recommended',
          actionRequired: true,
          summary: '미수출 또는 갱신 필요 draft 1건이 있습니다.'
        },
        latestCycle: {
          generatedAtIso: '2026-03-16T05:21:10.000Z',
          mode: 'artifact',
          overallPass: true,
          stepsPassed: 6,
          stepsTotal: 6,
          stale: false,
          ageHours: 4,
          failedSteps: [],
          reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle/20260316-142110/playtest-report.json',
          bundleDir: '/tmp/terminal-quest-ai-ops-cycle/20260316-142110',
          nextCommand: 'npm run ai:backlog:dry'
        },
        recentSignals: [
          {
            isoTime: '2026-03-12T01:00:00.000Z',
            eventType: 'ai_recommendation_dismissed',
            summary: 'ai_recommendation_dismissed frontier:memory-forest via ai-card'
          }
        ],
        recommendationDismissRate: 0.5,
        encounterDecisionCount: 4
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const html = frontend.getAppHtml();

    expect(html).toContain('AI Ops Pulse');
    expect(html).toContain('플레이테스트 운영 프리뷰');
    expect(html).toContain('Doctor Verdict:');
    expect(html).toContain('WARN');
    expect(html).toContain('doctor command · npm run ai:linear:export:dry');
    expect(html).toContain('Ops Status:');
    expect(html).toContain('Export 대기');
    expect(html).toContain('Resume clarity pass for AI-guided surfaces');
    expect(html).toContain('Telemetry 12');
    expect(html).toContain('Last Cycle:');
    expect(html).toContain('PASS · 6/6');
    expect(html).toContain('npm run ai:backlog:dry');
    expect(html).toContain('Dismiss 50%');
    expect(html).toContain('Encounter 4');
  });

  it('should render an Ops workspace when playtest ops data exists', async () => {
    const recentSyncIso = new Date(Date.now()).toISOString();
    const snapshot = createSnapshot({
      ops: {
        telemetryEvents: 12,
        playtestNotes: 2,
        topFinding: 'AI recommendation dismiss 비중이 높습니다. 노출 빈도 또는 카드 우선순위가 과한지 검토가 필요합니다.',
        topObservation: {
          severity: 'P0',
          text: 'Resume panel felt unclear and the AI recommendation was dismissed twice.'
        },
        topBacklog: {
          priority: 'P0',
          title: 'Resume clarity pass for AI-guided surfaces',
          theme: 'resume'
        },
        backlogCounts: {
          P0: 1,
          P1: 1,
          P2: 0
        },
        findings: [
          'AI recommendation dismiss 비중이 높습니다. 노출 빈도 또는 카드 우선순위가 과한지 검토가 필요합니다.'
        ],
        observations: [
          {
            severity: 'P0',
            text: 'Resume panel felt unclear and the AI recommendation was dismissed twice.',
            noteLabel: 'session-20260312-010000.md',
            section: 'Follow-ups',
            tags: ['resume', 'clarity']
          }
        ],
        backlog: [
          {
            id: 'playtest-resume-p0',
            priority: 'P0',
            theme: 'resume',
            title: 'Resume clarity pass for AI-guided surfaces',
            rationale: '재개 surface가 목표 이해를 놓치고 있습니다.',
            evidence: ['AI dismiss rate 50% (1/2)'],
            suggestedActions: ['Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.']
          }
        ],
        linearDrafts: [
          {
            id: 'linear-playtest-resume-p0',
            priority: 'P0',
            theme: 'resume',
            title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
            labels: ['ai-ops', 'p0', 'resume', 'ux'],
            summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
            exportStatus: 'updated',
            issueIdentifier: 'SUN-101',
            issueUrl: 'https://linear.app/example/issue/SUN-101',
            lastExportedAtIso: '2026-03-12T05:00:00.000Z',
            linearStateName: 'In Progress',
            linearStateType: 'started',
            lastSyncedAtIso: recentSyncIso,
            lifecycleStatus: 'sync-needed',
            staleSync: false,
            impactTrend: 'improved',
            impactSummary: 'Dismiss 70% -> 30%'
          }
        ],
        nextCommand: {
          label: 'export 대상 점검',
          command: 'npm run ai:linear:export:dry',
          reason: '미수출 또는 갱신 필요 draft 1건이 있습니다.',
          tone: 'recommended'
        },
        doctor: {
          status: 'warn',
          summaryPresent: true,
          freshnessLabel: 'fresh · 4h',
          reasons: ['Ops status Export 대기: 미수출 또는 갱신 필요 draft 1건이 있습니다.'],
          recommendedCommand: 'npm run ai:linear:export:dry',
          opsStatus: {
            id: 'export-pending',
            label: 'Export 대기',
            tone: 'recommended',
            actionRequired: true,
            summary: '미수출 또는 갱신 필요 draft 1건이 있습니다.'
          }
        },
        status: {
          id: 'export-pending',
          label: 'Export 대기',
          tone: 'recommended',
          actionRequired: true,
          summary: '미수출 또는 갱신 필요 draft 1건이 있습니다.'
        },
        latestCycle: {
          generatedAtIso: '2026-03-16T05:21:10.000Z',
          mode: 'artifact',
          overallPass: true,
          stepsPassed: 6,
          stepsTotal: 6,
          stale: false,
          ageHours: 4,
          failedSteps: [],
          reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle/20260316-142110/playtest-report.json',
          bundleDir: '/tmp/terminal-quest-ai-ops-cycle/20260316-142110',
          nextCommand: 'npm run ai:backlog:dry'
        },
        recentSignals: [
          {
            isoTime: '2026-03-12T01:00:00.000Z',
            eventType: 'ai_recommendation_dismissed',
            summary: 'ai_recommendation_dismissed frontier:memory-forest via ai-card'
          }
        ],
        recommendationDismissRate: 0.5,
        encounterDecisionCount: 4
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const tabsHtml = frontend.renderWorkspaceTabs(snapshot);
    const opsHtml = frontend.renderOpsWorkspace(snapshot);

    expect(tabsHtml).toContain('>Ops<');
    expect(opsHtml).toContain('AI Ops Dashboard');
    expect(opsHtml).toContain('Ops Doctor');
    expect(opsHtml).toContain('WARN');
    expect(opsHtml).toContain('summary present · yes');
    expect(opsHtml).toContain('Ops Status');
    expect(opsHtml).toContain('action required · yes');
    expect(opsHtml).toContain('Export 대기');
    expect(opsHtml).toContain('Linear Drafts');
    expect(opsHtml).toContain('[AI Ops][P0] Resume clarity pass for AI-guided surfaces');
    expect(opsHtml).toContain('sync needed');
    expect(opsHtml).toContain('SUN-101');
    expect(opsHtml).toContain('In Progress (started)');
    expect(opsHtml).toContain('원격 issue 동기화 상태가 최신입니다.');
    expect(opsHtml).toContain('Dismiss 70% -&gt; 30%');
    expect(opsHtml).toContain('improved');
    expect(opsHtml).toContain('Next Command');
    expect(opsHtml).toContain('Latest Cycle');
    expect(opsHtml).toContain('PASS · artifact');
    expect(opsHtml).toContain('6 step 통과');
    expect(opsHtml).toContain('npm run ai:linear:export:dry');
    expect(opsHtml).toContain('npm run ai:backlog:dry');
    expect(opsHtml).toContain('Resume clarity pass for AI-guided surfaces');
    expect(opsHtml).toContain('session-20260312-010000.md');
    expect(opsHtml).toContain('ai_recommendation_dismissed');
  });

  it('should filter Ops drafts by export state and impact trend', async () => {
    const recentSyncIso = new Date(Date.now()).toISOString();
    const snapshot = createSnapshot({
      ops: {
        telemetryEvents: 16,
        playtestNotes: 2,
        topFinding: '최근 exported draft의 개선 추세를 점검하세요.',
        topObservation: null,
        topBacklog: {
          priority: 'P0',
          title: 'Resume clarity pass for AI-guided surfaces',
          theme: 'resume'
        },
        backlogCounts: {
          P0: 1,
          P1: 1,
          P2: 0
        },
        findings: [],
        observations: [],
        backlog: [],
        linearDrafts: [
          {
            id: 'linear-resume',
            priority: 'P0',
            theme: 'resume',
            title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
            labels: ['ai-ops', 'p0', 'resume', 'ux'],
            summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
            exportStatus: 'updated',
            issueIdentifier: 'SUN-101',
            issueUrl: 'https://linear.app/example/issue/SUN-101',
            lastExportedAtIso: '2026-03-12T05:00:00.000Z',
            linearStateName: 'In Progress',
            linearStateType: 'started',
            lastSyncedAtIso: recentSyncIso,
            lifecycleStatus: 'sync-needed',
            staleSync: false,
            impactTrend: 'regressed',
            impactSummary: 'Dismiss 30% -> 60%'
          },
          {
            id: 'linear-combat',
            priority: 'P1',
            theme: 'combat',
            title: '[AI Ops][P1] Inspect repeated route-scan pivots in frontier pacing',
            labels: ['ai-ops', 'p1', 'combat', 'pacing'],
            summary: '반복 전투가 몰리는 전선을 다시 조정합니다.',
            exportStatus: 'exported',
            issueIdentifier: 'SUN-102',
            issueUrl: 'https://linear.app/example/issue/SUN-102',
            lastExportedAtIso: '2026-03-12T05:05:00.000Z',
            linearStateName: 'Done',
            linearStateType: 'completed',
            lastSyncedAtIso: recentSyncIso,
            lifecycleStatus: 'shipped',
            staleSync: false,
            impactTrend: 'improved',
            impactSummary: 'Route-scan 4 -> 1 · Deaths 1 -> 0'
          }
        ],
        nextCommand: {
          label: 'export 대상 점검',
          command: 'npm run ai:linear:export:dry',
          reason: '미수출 또는 갱신 필요 draft 1건이 있습니다.',
          tone: 'recommended'
        },
        recentSignals: [],
        recommendationDismissRate: 0.6,
        encounterDecisionCount: 8
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    frontend.uiState.snapshot = snapshot;
    frontend.uiState.activeWorkspace = 'ops';

    frontend.handleUiAction({
      dataset: {
        uiAction: 'select-ops-export-filter',
        uiValue: 'pending'
      }
    });
    frontend.handleUiAction({
      dataset: {
        uiAction: 'select-ops-impact-filter',
        uiValue: 'regressed'
      }
    });

    const opsHtml = frontend.renderOpsWorkspace(snapshot);

    expect(frontend.uiState.opsExportFilterId).toBe('pending');
    expect(frontend.uiState.opsImpactFilterId).toBe('regressed');
    expect(opsHtml).toContain('Visible');
    expect(opsHtml).toContain('Dismiss 30% -&gt; 60%');
    expect(opsHtml).toContain('SUN-101');
    expect(opsHtml).not.toContain('SUN-102');
  });

  it('should surface shipped and stale-sync indicators in the ops workspace', async () => {
    const ops = {
      telemetryEvents: 18,
      playtestNotes: 1,
      topFinding: '완료된 이슈와 오래된 sync를 함께 확인하세요.',
      topObservation: null,
      topBacklog: {
        priority: 'P1',
        title: 'Inspect repeated route-scan pivots in frontier pacing',
        theme: 'combat'
      },
      backlogCounts: {
        P0: 0,
        P1: 1,
        P2: 0
      },
      findings: [],
      observations: [],
      backlog: [],
      linearDrafts: [
        {
          id: 'linear-combat',
          priority: 'P1',
          theme: 'combat',
          title: '[AI Ops][P1] Inspect repeated route-scan pivots in frontier pacing',
          labels: ['ai-ops', 'p1', 'combat', 'pacing'],
          summary: '반복 전투가 몰리는 전선을 다시 조정합니다.',
          exportStatus: 'closed',
          issueIdentifier: 'SUN-102',
          issueUrl: 'https://linear.app/example/issue/SUN-102',
          lastExportedAtIso: '2026-03-12T05:05:00.000Z',
          linearStateName: 'Done',
          linearStateType: 'completed',
          lastSyncedAtIso: '2026-03-01T05:20:00.000Z',
          lifecycleStatus: 'shipped',
          staleSync: true,
          impactTrend: 'improved',
          impactSummary: 'Route-scan 4 -> 1 · Deaths 1 -> 0'
        }
      ],
      nextCommand: {
        label: '원격 상태 재동기화',
        command: 'LINEAR_API_KEY=... npm run ai:linear:sync',
        reason: 'stale sync 1건이 있어 원격 상태를 다시 읽어야 합니다.',
        tone: 'warning'
      },
      recentSignals: [],
      recommendationDismissRate: 0.2,
      encounterDecisionCount: 6
    } satisfies NonNullable<FrontendSnapshot['ops']>;
    const snapshot = createSnapshot({
      ops
    });
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      ops: {
        ...ops
      }
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const landingHtml = frontend.getAppHtml();
    const opsHtml = frontend.renderOpsWorkspace(snapshot);

    expect(landingHtml).toContain('Shipped 1');
    expect(landingHtml).toContain('Stale 1');
    expect(landingHtml).toContain('LINEAR_API_KEY=... npm run ai:linear:sync');
    expect(opsHtml).toContain('shipped');
    expect(opsHtml).toContain('stale sync');
    expect(opsHtml).toContain('원격 상태 재동기화');
    expect(opsHtml).toContain('마지막 동기화가 오래됐습니다.');
  });

  it('should surface a latest-cycle follow-up command when the persisted cycle failed', async () => {
    const ops = {
      telemetryEvents: 9,
      playtestNotes: 1,
      topFinding: '최근 persisted cycle이 실패했습니다.',
      topObservation: null,
      topBacklog: {
        priority: 'P0',
        title: 'Re-run failed AI ops cycle after inspecting the snapshot',
        theme: 'ops'
      },
      backlogCounts: {
        P0: 1,
        P1: 0,
        P2: 0
      },
      findings: [],
      observations: [],
      backlog: [],
      linearDrafts: [],
      nextCommand: {
        label: 'backlog 생성',
        command: 'npm run ai:backlog:dry',
        reason: '아직 Linear draft가 없으므로 backlog 초안부터 생성합니다.',
        tone: 'recommended'
      },
      doctor: {
        status: 'fail',
        summaryPresent: true,
        freshnessLabel: 'stale · 30h',
        reasons: ['실패 단계: AI insights (status=1)'],
        recommendedCommand: 'npm run ai:ops:cycle:latest',
        opsStatus: {
          id: 'cycle-failed',
          label: 'Cycle 실패',
          tone: 'warning',
          actionRequired: true,
          summary: '가장 최근 persisted ops cycle이 실패했습니다.'
        }
      },
      status: {
        id: 'cycle-failed',
        label: 'Cycle 실패',
        tone: 'warning',
        actionRequired: true,
        summary: '가장 최근 persisted ops cycle이 실패했습니다.'
      },
      latestCycleFollowUp: {
        label: 'cycle 실패 조치',
        command: 'npm run ai:ops:cycle:latest',
        reason: '가장 최근 persisted cycle이 FAIL 상태입니다. snapshot command부터 다시 확인하세요.',
        tone: 'warning'
      },
      latestCycle: {
        generatedAtIso: '2026-03-16T05:30:00.000Z',
        mode: 'artifact',
        overallPass: false,
        stepsPassed: 1,
        stepsTotal: 2,
        stale: true,
        ageHours: 30,
        failedSteps: [
          {
            label: 'AI insights',
            status: 1,
            outputFileName: 'ai-insights.txt'
          }
        ],
        reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle/20260316-143000/playtest-report.json',
        bundleDir: '/tmp/terminal-quest-ai-ops-cycle/20260316-143000',
        nextCommand: 'npm run ai:ops:cycle:latest'
      },
      recentSignals: [],
      recommendationDismissRate: 0.1,
      encounterDecisionCount: 2
    } satisfies NonNullable<FrontendSnapshot['ops']>;
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      ops: {
        ...ops
      }
    });
    const snapshot = createSnapshot({
      ops
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const landingHtml = frontend.getAppHtml();
    const opsHtml = frontend.renderOpsWorkspace(snapshot);

    expect(landingHtml).toContain('Cycle FAIL');
    expect(landingHtml).toContain('Cycle 실패');
    expect(landingHtml).toContain('Doctor Verdict:');
    expect(landingHtml).toContain('AI insights (status=1)');
    expect(landingHtml).toContain('Failed Step:');
    expect(landingHtml).toContain('AI insights · status 1');
    expect(landingHtml).toContain('Cycle Follow-up:');
    expect(landingHtml).toContain('npm run ai:ops:cycle:latest');
    expect(opsHtml).toContain('Latest Cycle');
    expect(opsHtml).toContain('Ops Doctor');
    expect(opsHtml).toContain('summary present · yes');
    expect(opsHtml).toContain('Cycle 실패');
    expect(opsHtml).toContain('FAIL · artifact');
    expect(opsHtml).toContain('Failed Step');
    expect(opsHtml).toContain('failed step · AI insights · status 1');
    expect(opsHtml).toContain('playtest-report.json');
    expect(opsHtml).toContain('Cycle Follow-up:');
    expect(opsHtml).toContain('cycle 실패 조치');
    expect(opsHtml).toContain('npm run ai:ops:cycle:latest');
  });

  it('should warn when the latest persisted cycle is stale and suggest rerunning it', async () => {
    const ops = {
      telemetryEvents: 11,
      playtestNotes: 1,
      topFinding: '최근 persisted cycle이 오래됐습니다.',
      topObservation: null,
      topBacklog: {
        priority: 'P1',
        title: 'Refresh the persisted AI ops cycle before reviewing backlog',
        theme: 'ops'
      },
      backlogCounts: {
        P0: 0,
        P1: 1,
        P2: 0
      },
      findings: [],
      observations: [],
      backlog: [],
      linearDrafts: [],
      nextCommand: {
        label: 'backlog 생성',
        command: 'npm run ai:backlog:dry',
        reason: '아직 Linear draft가 없으므로 backlog 초안부터 생성합니다.',
        tone: 'recommended'
      },
      doctor: {
        status: 'warn',
        summaryPresent: true,
        freshnessLabel: 'stale · 30h',
        reasons: ['latest cycle이 stale 상태입니다 (stale · 30h).'],
        recommendedCommand: 'npm run ai:ops:cycle',
        opsStatus: {
          id: 'cycle-stale',
          label: 'Cycle stale',
          tone: 'warning',
          actionRequired: true,
          summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
        }
      },
      status: {
        id: 'cycle-stale',
        label: 'Cycle stale',
        tone: 'warning',
        actionRequired: true,
        summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
      },
      latestCycleFollowUp: {
        label: 'cycle 갱신',
        command: 'npm run ai:ops:cycle',
        reason: '마지막 persisted cycle이 30h 전에 생성되어 오래됐습니다. 최신 artifact를 다시 생성하세요.',
        tone: 'warning'
      },
      latestCycle: {
        generatedAtIso: '2026-03-15T00:00:00.000Z',
        mode: 'artifact',
        overallPass: true,
        stepsPassed: 6,
        stepsTotal: 6,
        stale: true,
        ageHours: 30,
        failedSteps: [],
        reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle/20260315-000000/playtest-report.json',
        bundleDir: '/tmp/terminal-quest-ai-ops-cycle/20260315-000000',
        nextCommand: 'npm run ai:linear:export:dry'
      },
      recentSignals: [],
      recommendationDismissRate: 0.1,
      encounterDecisionCount: 2
    } satisfies NonNullable<FrontendSnapshot['ops']>;
    const landingSnapshot = createSnapshot({
      scene: 'landing',
      hasGame: false,
      ops: {
        ...ops
      }
    });
    const snapshot = createSnapshot({
      ops
    });
    const frontend = await createFrontendHarness(landingSnapshot);

    const landingHtml = frontend.getAppHtml();
    const opsHtml = frontend.renderOpsWorkspace(snapshot);

    expect(landingHtml).toContain('Cycle Freshness:');
    expect(landingHtml).toContain('Doctor Verdict:');
    expect(landingHtml).toContain('stale · 30h');
    expect(landingHtml).toContain('Cycle stale');
    expect(landingHtml).toContain('cycle 갱신');
    expect(landingHtml).toContain('npm run ai:ops:cycle');
    expect(opsHtml).toContain('Cycle Freshness');
    expect(opsHtml).toContain('freshness · stale · 30h');
    expect(opsHtml).toContain('cycle 갱신');
    expect(opsHtml).toContain('npm run ai:ops:cycle');
  });

  it('should toast the recommended ops command when requested from the UI', async () => {
    const snapshot = createSnapshot({
      ops: {
        telemetryEvents: 12,
        playtestNotes: 2,
        topFinding: 'AI recommendation dismiss 비중이 높습니다.',
        topObservation: null,
        topBacklog: {
          priority: 'P0',
          title: 'Resume clarity pass for AI-guided surfaces',
          theme: 'resume'
        },
        backlogCounts: {
          P0: 1,
          P1: 0,
          P2: 0
        },
        findings: [],
        observations: [],
        backlog: [],
        linearDrafts: [
          {
            id: 'linear-playtest-resume-p0',
            priority: 'P0',
            theme: 'resume',
            title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
            labels: ['ai-ops', 'p0', 'resume', 'ux'],
            summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
            exportStatus: 'draft',
            issueIdentifier: null,
            issueUrl: null,
            lastExportedAtIso: null,
            linearStateName: null,
            linearStateType: 'unknown',
            lastSyncedAtIso: null,
            lifecycleStatus: 'draft',
            staleSync: false,
            impactTrend: 'unknown',
            impactSummary: '효과 baseline이 아직 없습니다.'
          }
        ],
        nextCommand: {
          label: 'export 대상 점검',
          command: 'npm run ai:linear:export:dry',
          reason: '미수출 또는 갱신 필요 draft 1건이 있습니다.',
          tone: 'recommended'
        },
        recentSignals: [],
        recommendationDismissRate: 0.5,
        encounterDecisionCount: 4
      }
    });
    const frontend = await createFrontendHarness(snapshot);

    const handled = frontend.handleClientAction({
      dataset: {
        clientAction: 'show-ops-command',
        command: 'npm run ai:linear:export:dry',
        commandReason: '미수출 또는 갱신 필요 draft 1건이 있습니다.'
      }
    });

    expect(handled).toBe(true);
    expect(frontend.getToastText()).toContain('npm run ai:linear:export:dry');
    expect(frontend.getToastText()).toContain('미수출 또는 갱신 필요 draft 1건이 있습니다.');
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
