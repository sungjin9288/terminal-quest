const CLASS_OPTIONS = [
  { value: 'Warrior', label: '워리어', icon: '🛡️', summary: '버티면서 밀어붙이는 전면 돌파형' },
  { value: 'Mage', label: '메이지', icon: '✨', summary: '고MP 기반의 순간 화력과 유틸' },
  { value: 'Rogue', label: '로그', icon: '🗡️', summary: '빠른 턴과 치명타로 리듬을 잡는 암살형' },
  { value: 'Cleric', label: '클레릭', icon: '⛨', summary: '회복과 안정성 중심의 지구전 운영' },
  { value: 'Ranger', label: '레인저', icon: '🏹', summary: '균형 잡힌 딜과 템포 조절이 강점' }
];

const MODE_OPTIONS = [
  { value: 'story', label: '스토리', risk: '가벼운 페널티', summary: '서사와 탐험에 집중하는 완만한 곡선' },
  { value: 'adventure', label: '어드벤처', risk: '표준 페널티', summary: '처음 플레이하기 좋은 기본 밸런스' },
  { value: 'challenge', label: '챌린지', risk: '높은 페널티', summary: '자원 운영과 루트 판단이 중요' },
  { value: 'hardcore', label: '하드코어', risk: '영구 사망', summary: '최종 숙련자를 위한 극단 모드' }
];

const CLASS_LABELS = Object.fromEntries(
  CLASS_OPTIONS.map(option => [option.value, option.label])
);

const TONE_LABELS = {
  info: '정보',
  success: '획득',
  warning: '주의',
  error: '오류'
};

const FEED_CATEGORY_ALL = '__all__';
const FEED_FILTER_ALL = '__all__';
const FEED_FILTER_SYSTEM = '__system__';
const FEED_CATEGORY_LABELS = {
  combat: '전투',
  quest: '퀘스트',
  reward: '보상',
  travel: '이동/탐색',
  hub: '허브',
  system: '시스템'
};
const ACHIEVEMENT_CATEGORY_ALL = '__all__';
const ACHIEVEMENT_CATEGORY_ORDER = [
  'quest',
  'economy',
  'exploration',
  'boss',
  'act',
  'challenge'
];
const ACHIEVEMENT_SORT_OPTIONS = [
  { id: 'focus', label: '추적 우선', summary: '미해금/근접순' },
  { id: 'recent', label: '최근 해금', summary: '최신 해금순' },
  { id: 'title', label: '이름순', summary: '가나다순' }
];
const PACE_OPTIONS = [
  { id: 'push', label: '밀기', summary: '진행 우선' },
  { id: 'steady', label: '안정', summary: '피로 완화' },
  { id: 'story', label: '서사', summary: '브리핑 우선' }
];
const SESSION_WINDOW_OPTIONS = [
  { id: 'micro', label: '10분', summary: '아주 짧게', minutes: 10 },
  { id: 'short', label: '20분', summary: '가볍게 한 세션', minutes: 20 },
  { id: 'standard', label: '40분', summary: '표준 플레이', minutes: 40 },
  { id: 'long', label: '60분+', summary: '길게 몰입', minutes: 999 }
];

const appRoot = document.querySelector('#app');
const statusLine = document.querySelector('#status-line');
const toast = document.querySelector('#toast');

const uiState = {
  snapshot: null,
  busy: false,
  toastTimer: null,
  resumeBrief: null,
  resumeRoute: null,
  resumePreviewStepId: null,
  previewCommit: null,
  achievementFocusId: null,
  activeWorkspace: 'quests',
  travelIndex: 0,
  questLane: 'available',
  questIndex: 0,
  marketShopId: 'binary-weapons',
  marketIndex: 0,
  inventoryIndex: 0,
  feedIndex: 0,
  feedCategoryId: FEED_CATEGORY_ALL,
  feedFilterId: FEED_FILTER_ALL,
  achievementCategoryId: ACHIEVEMENT_CATEGORY_ALL,
  achievementSortId: ACHIEVEMENT_SORT_OPTIONS[0].id,
  paceMode: 'steady',
  sessionWindowId: 'short'
};

function isAchievementChaseIntent(loadContext) {
  return loadContext === 'achievement-chase' || loadContext?.intent === 'achievement-chase';
}

function getAchievementChaseTitle(loadContext, fallbackTitle = null) {
  if (!isAchievementChaseIntent(loadContext)) {
    return fallbackTitle;
  }

  return loadContext?.achievementTitle ?? fallbackTitle;
}

function getAchievementChaseLabel(loadContext, fallbackTitle = null) {
  const title = getAchievementChaseTitle(loadContext, fallbackTitle);
  if (!title) {
    return null;
  }

  return loadContext?.achievementProgress
    ? `${title} ${loadContext.achievementProgress}`
    : title;
}

function getAchievementChaseBody(body, loadContext, fallbackTitle = null) {
  const label = getAchievementChaseLabel(loadContext, fallbackTitle);
  return label
    ? `${label} 목표 기준으로 이어왔습니다. ${body}`
    : `업적 추적 슬롯에서 이어왔습니다. ${body}`;
}

function getAchievementTrackingProgress(entry) {
  if (!entry) {
    return null;
  }

  return entry.target > 1
    ? `${formatNumber(entry.current)} / ${formatNumber(entry.target)}`
    : `${formatNumber(entry.progressPercent)}%`;
}

function buildTrackedAchievementDescriptorFromEntry(entry) {
  if (!entry) {
    return null;
  }

  const progress = getAchievementTrackingProgress(entry);
  return {
    title: entry.title,
    progress,
    label: progress ? `${entry.title} ${progress}` : entry.title,
    entry
  };
}

function getSnapshotTrackedAchievementDescriptor(snapshot) {
  return buildTrackedAchievementDescriptorFromEntry(snapshot?.achievementTracking?.current ?? null);
}

function getAchievementTrackingMode(snapshot) {
  return snapshot?.achievementTracking?.mode ?? 'auto';
}

function getAchievementTrackingHistory(snapshot) {
  return snapshot?.achievementTracking?.history ?? [];
}

function getAchievementDescriptorByTitle(snapshot, title) {
  if (!title) {
    return null;
  }

  const entry = snapshot.achievements?.entries?.find(candidate => candidate.title === title) ?? null;
  return buildTrackedAchievementDescriptorFromEntry(entry);
}

function findTrackedAchievementEntry(snapshot, descriptor) {
  if (!snapshot?.achievements?.entries?.length || !descriptor) {
    return null;
  }

  if (descriptor.entry?.id) {
    return snapshot.achievements.entries.find(candidate => candidate.id === descriptor.entry.id) ?? null;
  }

  if (descriptor.title) {
    return snapshot.achievements.entries.find(candidate => candidate.title === descriptor.title) ?? null;
  }

  return null;
}

function getTrackedAchievementDescriptor(snapshot) {
  const snapshotDescriptor = getSnapshotTrackedAchievementDescriptor(snapshot);
  if (snapshotDescriptor) {
    return snapshotDescriptor;
  }

  const title = uiState.resumeRoute?.achievementTitle ?? null;
  if (title) {
    const progress = uiState.resumeRoute?.achievementProgress ?? null;
    const entry = snapshot.achievements?.entries?.find(candidate => candidate.title === title) ?? null;

    return {
      title,
      progress,
      label: progress ? `${title} ${progress}` : title,
      entry
    };
  }

  if (!uiState.achievementFocusId) {
    return null;
  }

  const entry = snapshot.achievements?.entries?.find(candidate => candidate.id === uiState.achievementFocusId) ?? null;
  return buildTrackedAchievementDescriptorFromEntry(entry);
}

function getSnapshotTrackingLoadContext(snapshot) {
  const trackedAchievement = getSnapshotTrackedAchievementDescriptor(snapshot);
  if (!trackedAchievement) {
    return null;
  }

  return {
    intent: 'achievement-chase',
    achievementTitle: trackedAchievement.title,
    achievementProgress: trackedAchievement.progress
  };
}

function getResumeToastMessage(plan, loadContext = null) {
  if (!plan?.cue) {
    return '';
  }

  const chaseLabel = getAchievementChaseLabel(loadContext, plan.achievementTitle ?? null);
  if (isAchievementChaseIntent(loadContext)) {
    return chaseLabel
      ? `업적 추적 재개: ${chaseLabel}`
      : '업적 추적 재개';
  }

  return `스마트 재개: ${plan.cue}`;
}

const WORKSPACE_META = {
  combat: { label: 'Combat', hint: '현재 전투를 한 화면에서 조작합니다.' },
  quests: { label: 'Quests', hint: '에피소드, 진행도, 보상 수령을 관리합니다.' },
  travel: { label: 'Travel', hint: '추천 이동과 첫 클리어 보상을 읽고 이동합니다.' },
  market: { label: 'Market', hint: '상점 재고를 비교하고 바로 구매합니다.' },
  inventory: { label: 'Pack', hint: '보유 장비와 소모품을 빠르게 훑습니다.' },
  achievements: { label: 'Achievements', hint: '해금 기록과 남은 업적 진행률을 확인합니다.' },
  save: { label: 'Save', hint: '세이브 상태를 확인하고 즉시 저장/불러오기 합니다.' },
  feed: { label: 'Log', hint: '최근 진행 로그를 집중해서 확인합니다.' }
};

function getAvailableWorkspaces(snapshot) {
  if (!snapshot?.hasGame) {
    return [];
  }

  return [
    ...(snapshot.battle ? ['combat'] : []),
    'quests',
    'travel',
    'market',
    'inventory',
    'achievements',
    'save',
    'feed'
  ];
}

function getDefaultWorkspace(snapshot) {
  if (!snapshot?.hasGame) {
    return 'landing';
  }

  if (snapshot.scene === 'combat') {
    return 'combat';
  }

  const hasQuestPrompt =
    (snapshot.questBoard?.completable.length ?? 0) > 0 ||
    (snapshot.questBoard?.available.some(group => group.quests.length > 0) ?? false);

  if (hasQuestPrompt) {
    return 'quests';
  }

  return snapshot.location?.isTown ? 'travel' : 'travel';
}

function normalizeWorkspace(snapshot, candidate) {
  const fallback = getDefaultWorkspace(snapshot);
  if (!snapshot?.hasGame) {
    return fallback;
  }

  const allowed = getAvailableWorkspaces(snapshot);
  if (snapshot.scene === 'combat' && candidate !== 'combat' && candidate !== 'feed') {
    return 'combat';
  }

  return allowed.includes(candidate) ? candidate : fallback;
}

function getWorkspaceForAction(actionType, snapshot, currentWorkspace) {
  const preferred = (() => {
    switch (actionType) {
      case 'visit-board':
      case 'accept-quest':
      case 'complete-quest':
        return 'quests';
      case 'visit-market':
      case 'buy-item':
        return 'market';
      case 'travel':
        return 'travel';
      case 'save-game':
      case 'load-game':
        return 'save';
      case 'battle-attack':
      case 'battle-defend':
      case 'battle-escape':
      case 'battle-skill':
      case 'battle-item':
        return 'combat';
      case 'dungeon-explore':
        return snapshot.scene === 'combat' ? 'combat' : 'travel';
      case 'town-explore':
      case 'inn-rest':
      case 'dungeon-rest':
        return 'feed';
      case 'new-game':
        return null;
      default:
        return currentWorkspace;
    }
  })();

  return normalizeWorkspace(snapshot, preferred ?? currentWorkspace);
}

function getSmartResumePlan(snapshot) {
  const fallbackWorkspace = getDefaultWorkspace(snapshot);
  const fallbackPlan = {
    workspace: fallbackWorkspace,
    label: WORKSPACE_META[fallbackWorkspace]?.label ?? fallbackWorkspace,
    cue: WORKSPACE_META[fallbackWorkspace]?.hint ?? ''
  };

  if (!snapshot?.hasGame) {
    return fallbackPlan;
  }

  if (snapshot.scene === 'combat' || snapshot.battle) {
    return {
      workspace: 'combat',
      label: WORKSPACE_META.combat.label,
      cue: snapshot.battle?.isBoss
        ? '보스전이 이어집니다. 전투 작업공간부터 여세요.'
        : '진행 중인 교전을 바로 이어갑니다.'
    };
  }

  if ((snapshot.questBoard?.completable.length ?? 0) > 0) {
    return {
      workspace: 'quests',
      label: WORKSPACE_META.quests.label,
      cue: '보상 대기 퀘스트를 먼저 정산합니다.',
      questLane: 'completable',
      questIndex: 0
    };
  }

  const activeQuestEntries = snapshot.questBoard?.active.flatMap(group => group.quests) ?? [];
  if (snapshot.tracker && activeQuestEntries.length > 0) {
    return {
      workspace: 'quests',
      label: WORKSPACE_META.quests.label,
      cue: `${snapshot.tracker.questName} 진행을 이어갑니다.`,
      questLane: 'active',
      questIndex: 0
    };
  }

  const approachingAchievement = getApproachingAchievement(snapshot);
  if (approachingAchievement) {
    const focus = getAchievementFocusDescriptor(approachingAchievement, snapshot);
    const resumePlan = {
      workspace: focus.workspace,
      label: WORKSPACE_META[focus.workspace]?.label ?? focus.workspace,
      cue: `${approachingAchievement.title} 업적이 거의 달성 상태입니다. ${focus.hint}`,
      achievementTitle: approachingAchievement.title
    };

    if (focus.questLane) {
      resumePlan.questLane = focus.questLane;
      resumePlan.questIndex = 0;
    }

    if (focus.feedCategory) {
      resumePlan.feedCategory = focus.feedCategory;
    }

    if (focus.travelDestinationId) {
      const destinations = snapshot.travel?.destinations ?? [];
      const travelIndex = destinations.findIndex(destination => destination.id === focus.travelDestinationId);
      resumePlan.travelIndex = travelIndex >= 0 ? travelIndex : 0;
    }

    if (focus.shopId) {
      resumePlan.shopId = focus.shopId;
      resumePlan.itemId = focus.itemId ?? null;
    }

    return resumePlan;
  }

  if (
    snapshot.location?.isTown &&
    (snapshot.questBoard?.available.some(group => group.quests.length > 0) ?? false)
  ) {
    return {
      workspace: 'quests',
      label: WORKSPACE_META.quests.label,
      cue: '허브에 열린 새 의뢰부터 확인합니다.',
      questLane: 'available',
      questIndex: 0
    };
  }

  const recommendedDestination = getRecommendedTravelDestination(snapshot);
  if (recommendedDestination) {
    const destinations = snapshot.travel?.destinations ?? [];
    const travelIndex = destinations.findIndex(destination => destination.id === recommendedDestination.id);

    return {
      workspace: 'travel',
      label: WORKSPACE_META.travel.label,
      cue: `${recommendedDestination.name} 쪽이 다음 진척에 가장 가깝습니다.`,
      travelIndex: travelIndex >= 0 ? travelIndex : 0
    };
  }

  const rewardEntry = (snapshot.feed ?? []).find(entry => entry.category === 'reward');
  if (rewardEntry) {
    return {
      workspace: 'feed',
      label: WORKSPACE_META.feed.label,
      cue: '최근 보상 로그부터 확인합니다.',
      feedCategory: 'reward'
    };
  }

  return fallbackPlan;
}

function applySmartResumePlan(snapshot) {
  const plan = getSmartResumePlan(snapshot);

  uiState.resumePreviewStepId = null;
  uiState.activeWorkspace = normalizeWorkspace(snapshot, plan.workspace);
  uiState.feedIndex = 0;

  if (plan.questLane) {
    uiState.questLane = plan.questLane;
    uiState.questIndex = plan.questIndex ?? 0;
  }

  if (typeof plan.travelIndex === 'number') {
    uiState.travelIndex = clampIndex(
      plan.travelIndex,
      snapshot.travel?.destinations?.length ?? 0
    );
  }

  if (plan.workspace === 'market') {
    focusMarketRoute(snapshot, plan.shopId ?? null, plan.itemId ?? null);
  }

  if (plan.feedCategory) {
    applyFeedCategoryFocus(plan.feedCategory);
  } else {
    uiState.feedCategoryId = FEED_CATEGORY_ALL;
    uiState.feedFilterId = FEED_FILTER_ALL;
  }

  return plan;
}

function getResumeBriefModel(snapshot, plan, loadContext = null) {
  if (!snapshot?.hasGame || !plan) {
    return null;
  }

  const isAchievementChase = isAchievementChaseIntent(loadContext);
  const chaseTitle = getAchievementChaseTitle(loadContext, plan.achievementTitle ?? null);
  const marketTarget = plan.workspace === 'market'
    ? getMarketTargetSummary(snapshot, plan.shopId ?? null, plan.itemId ?? null)
    : null;

  if (plan.workspace === 'combat') {
    const brief = {
      tone: 'warning',
      badge: '전투 복귀',
      title: '전투 상황부터 확인',
      body: plan.cue,
      actionLabel: '전투 패널 고정',
      detail: snapshot.battle?.isBoss
        ? '첫 확인: 보스 패턴과 현재 턴 우선'
        : '첫 확인: 현재 턴과 자원 상태 우선'
    };
    return isAchievementChase
      ? {
          ...brief,
          badge: '업적 추적',
          title: chaseTitle ? `${chaseTitle} 추적 재개` : brief.title,
          body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
        }
      : brief;
  }

  if (plan.workspace === 'quests') {
    const laneLabel = plan.questLane === 'completable'
      ? '보상 대기'
      : plan.questLane === 'active'
        ? '진행 중'
        : '새 의뢰';
    const laneQuest = plan.questLane === 'completable'
      ? snapshot.questBoard?.completable?.[0]
      : plan.questLane === 'active'
        ? snapshot.questBoard?.active?.flatMap(group => group.quests)?.[0]
        : snapshot.questBoard?.available?.flatMap(group => group.quests)?.[0];
    const brief = {
      tone: plan.questLane === 'completable' ? 'success' : 'info',
      badge: laneLabel,
      title: plan.questLane === 'completable'
        ? '보상 정산부터 재개'
        : plan.questLane === 'active'
          ? '추적 퀘스트부터 재개'
          : '새 의뢰 확인부터 재개',
      body: plan.cue,
      actionLabel: `${laneLabel} 보기`,
      detail: laneQuest?.name
        ? `첫 확인: ${laneQuest.name}`
        : `첫 확인: ${laneLabel} 카드`
    };
    return isAchievementChase
      ? {
          ...brief,
          tone: brief.tone === 'warning' ? 'warning' : 'success',
          badge: '업적 추적',
          title: chaseTitle ? `${chaseTitle} 추적 재개` : brief.title,
          body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
        }
      : brief;
  }

  if (plan.achievementTitle) {
    const destination = plan.workspace === 'travel'
      ? getRecommendedTravelDestination(snapshot)
      : null;
    const brief = {
      tone: 'success',
      badge: isAchievementChase ? '업적 추적' : '업적 임박',
      title: isAchievementChase ? `${plan.achievementTitle} 추적 재개` : `${plan.achievementTitle}부터 재개`,
      body: plan.cue,
      detail: plan.workspace === 'market'
        ? marketTarget?.detail ?? '첫 확인: 상점 탭 재고 비교'
        : plan.workspace === 'travel'
          ? destination?.name
            ? `첫 확인: ${destination.name} 카드`
            : '첫 확인: 추천 이동 카드'
          : plan.workspace === 'feed'
          ? '첫 확인: 최근 업적/보상 로그'
          : '첫 확인: 업적 관련 작업공간'
    };
    return isAchievementChase
      ? {
          ...brief,
          body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
        }
      : brief;
  }

  if (plan.workspace === 'travel') {
    const destination = getRecommendedTravelDestination(snapshot);
    const brief = {
      tone: 'info',
      badge: '추천 이동',
      title: '다음 전선부터 재개',
      body: plan.cue,
      actionLabel: '추천 이동 카드 보기',
      detail: destination?.name
        ? `첫 확인: ${destination.name} 카드`
        : '첫 확인: 추천 이동 카드'
    };
    return isAchievementChase
      ? {
          ...brief,
          tone: 'success',
          badge: '업적 추적',
          title: chaseTitle ? `${chaseTitle} 추적 재개` : brief.title,
          body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
        }
      : brief;
  }

  if (plan.workspace === 'feed') {
    const rewardEntry = (snapshot.feed ?? []).find(entry => entry.category === 'reward');
    const brief = {
      tone: 'success',
      badge: '보상 로그',
      title: '최근 보상부터 재개',
      body: plan.cue,
      actionLabel: '보상 로그 보기',
      detail: rewardEntry?.text
        ? `첫 확인: ${rewardEntry.text}`
        : '첫 확인: 최근 보상 로그'
    };
    return isAchievementChase
      ? {
          ...brief,
          badge: '업적 추적',
          title: chaseTitle ? `${chaseTitle} 추적 재개` : brief.title,
          body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
        }
      : brief;
  }

  const brief = {
    tone: 'info',
    badge: isAchievementChase ? '업적 추적' : plan.label,
    title: `${plan.label}부터 재개`,
    body: plan.cue,
    actionLabel: `${plan.label} 보기`,
    detail: '첫 확인: 현재 작업공간 요약'
  };
  return isAchievementChase
    ? {
        ...brief,
        tone: 'success',
        title: chaseTitle ? `${chaseTitle} 추적 재개` : brief.title,
        body: getAchievementChaseBody(brief.body, loadContext, plan.achievementTitle ?? null)
      }
    : brief;
}

function getResumeRouteModel(snapshot, plan, loadContext = null) {
  if (!snapshot?.hasGame || !plan) {
    return null;
  }

  const brief = getResumeBriefModel(snapshot, plan, loadContext);
  const primaryAction = getPrimaryActionDescriptor(snapshot);
  const stopStep = buildSessionStopDescriptor(snapshot, primaryAction ? [primaryAction] : []);
  const sessionWindow = getSessionWindowMeta();
  const chaseLabel = getAchievementChaseLabel(loadContext, plan.achievementTitle ?? null);
  const plannedAchievement = plan.achievementTitle
    ? getAchievementDescriptorByTitle(snapshot, plan.achievementTitle)
    : null;
  const routeAchievementTitle = isAchievementChaseIntent(loadContext)
    ? getAchievementChaseTitle(loadContext, plan.achievementTitle ?? null)
    : plan.achievementTitle ?? null;
  const routeAchievementProgress = isAchievementChaseIntent(loadContext)
    ? loadContext?.achievementProgress ?? null
    : plannedAchievement?.progress ?? null;
  const routeContextLabel = isAchievementChaseIntent(loadContext)
    ? chaseLabel
    : routeAchievementTitle
      ? routeAchievementProgress
        ? `${routeAchievementTitle} ${routeAchievementProgress}`
        : routeAchievementTitle
      : null;
  const steps = [
    {
      id: 'resume-route-now',
      order: '지금',
      tone: brief?.tone ?? 'info',
      badge: brief?.badge ?? plan.label,
      title: brief?.title ?? `${plan.label}부터 재개`,
      body: brief?.detail
        ? `${brief.body} ${brief.detail}`
        : brief?.body ?? plan.cue,
      target: {
        clientAction: 'resume-focus'
      },
      eta: '즉시'
    }
  ];

  if (primaryAction) {
    steps.push({
      id: 'resume-route-next',
      order: '다음',
      tone: primaryAction.tone,
      badge: primaryAction.badge,
      title: primaryAction.title,
      body: primaryAction.body,
      target: primaryAction.target,
      eta: primaryAction.eta ?? getEstimatedTimeLabel(snapshot, primaryAction)
    });
  }

  steps.push({
    id: 'resume-route-stop',
    order: '정리',
    tone: stopStep.tone,
    badge: stopStep.badge,
    title: stopStep.title,
    body: stopStep.body,
    target: stopStep.target,
    eta: stopStep.eta
  });

  return {
    tone: brief?.tone ?? 'info',
    title: 'Resume Route',
    contextLabel: routeContextLabel,
    achievementTitle: routeAchievementTitle,
    achievementProgress: routeAchievementProgress,
    summary: routeContextLabel
      ? `${routeContextLabel} 목표 기준으로 ${sessionWindow.label} 세션에서 다시 감을 잡기 쉬운 순서입니다.`
      : `${sessionWindow.label} 세션 기준으로 다시 감을 잡기 쉬운 순서입니다.`,
    phase: 'inspect',
    steps
  };
}

function renderAchievementChaseLoadAttributes(slot, isTrackedLoad = false) {
  const title = getSaveSlotTrackedAchievementTitle(slot);
  const progress = getSaveSlotTrackedAchievementProgress(slot);
  if (!isTrackedLoad || !title) {
    return '';
  }

  return `
        data-load-intent="achievement-chase"
        data-load-achievement-title="${escapeHtml(title)}"
        ${progress ? `data-load-achievement-progress="${escapeHtml(progress)}"` : ''}
  `;
}

function getResumeRouteStepViews(resumeRoute, phaseOverride = null) {
  if (!resumeRoute) {
    return [];
  }

  const phase = phaseOverride ?? resumeRoute.phase;
  const phaseIndex = phase === 'wrap'
    ? 2
    : phase === 'advance'
      ? 1
      : 0;

  return resumeRoute.steps.map((step, index) => ({
    ...step,
    status: index < phaseIndex
      ? 'complete'
      : index === phaseIndex
        ? 'current'
        : 'pending'
  }));
}

function getPreviewExecutionOutcome(snapshot) {
  const previewState = getResumePreviewState(snapshot);
  if (!previewState || previewState.previewWorkspace !== uiState.activeWorkspace || !uiState.resumeRoute) {
    return null;
  }

  const actionOptions = getResumeTargetActionOptions(snapshot, uiState.activeWorkspace);
  if (!actionOptions?.target) {
    return null;
  }

  const target = actionOptions.target;
  if (target.action === 'save-game') {
    return {
      label: '실행 후',
      summary: '이 단계 저장을 마치면 이번 재개 루트는 종료됩니다.'
    };
  }

  const nextPhase = target.action && isResumeRouteCommitAction(target.action)
    ? 'wrap'
    : 'advance';
  const nextStepViews = getResumeRouteStepViews(uiState.resumeRoute, nextPhase);
  const nextCurrentStep = nextStepViews.find(step => step.status === 'current') ?? null;
  if (!nextCurrentStep) {
    return {
      label: '실행 후',
      summary: '이 미리보기 단계가 현재 경로로 전환됩니다.'
    };
  }

  const nextWorkspace = getWorkspaceForResumeTarget(nextCurrentStep.target, snapshot);
  const nextWorkspaceLabel = nextWorkspace === uiState.activeWorkspace
    ? '현재 탭'
    : WORKSPACE_META[nextWorkspace]?.label ?? '다음 작업공간';
  const becomesCurrent = nextCurrentStep.id === previewState.previewStep.id;

  return {
    label: '실행 후',
    summary: becomesCurrent
      ? `미리 보던 ${previewState.previewStep.order} 단계가 현재 경로가 됩니다. ${nextWorkspaceLabel}에서 ${nextCurrentStep.title}를 이어갑니다.`
      : `${nextCurrentStep.order} 단계로 전환됩니다. ${nextWorkspaceLabel}에서 ${nextCurrentStep.title}를 이어갑니다.`
  };
}

function buildPreviewCommitDescriptor(previewContext, snapshot, activeWorkspace, nextResumeRoute) {
  if (!previewContext) {
    return null;
  }

  const previewStep = previewContext.previewState.previewStep;
  const previewWorkspace = previewContext.previewState.previewWorkspace;
  const nextStepViews = getResumeRouteStepViews(nextResumeRoute);
  const nextCurrentStep = nextStepViews.find(step => step.status === 'current') ?? null;
  const nextWorkspace = nextCurrentStep
    ? getWorkspaceForResumeTarget(nextCurrentStep.target, snapshot)
    : activeWorkspace;
  const workspaceLabel = WORKSPACE_META[activeWorkspace]?.label ?? activeWorkspace;
  const endsRoute = !nextResumeRoute;
  const summary = endsRoute
    ? `미리 보던 ${previewStep.order} 단계를 실행했습니다. 이번 재개 루트는 종료되었습니다.`
    : nextCurrentStep?.id === previewStep.id
      ? `미리 보던 ${previewStep.order} 단계가 현재 경로가 됐습니다. ${workspaceLabel}에서 그대로 이어가면 됩니다.`
      : nextCurrentStep
        ? `미리 보던 ${previewStep.order} 단계를 실행했습니다. 현재 경로는 ${nextCurrentStep.order} 단계로 넘어갔습니다.`
        : `미리 보던 ${previewStep.order} 단계를 실행했습니다.`;

  return {
    tone: endsRoute ? 'success' : previewStep.tone,
    workspace: activeWorkspace,
    title: previewStep.title,
    summary,
    detail: endsRoute
      ? '세션 마감 지점까지 반영됐습니다.'
      : nextCurrentStep
        ? `${WORKSPACE_META[nextWorkspace]?.label ?? nextWorkspace} · 다음 현재 단계 ${nextCurrentStep.title}`
        : `${workspaceLabel}에서 다음 현재 단계를 확인하세요.`
  };
}

function getPreviewCommitToast(previewCommit) {
  if (!previewCommit) {
    return '';
  }

  return `미리 보기 실행 완료: ${previewCommit.title} · ${previewCommit.summary}`;
}

function renderPreviewCommitMarker() {
  if (!uiState.previewCommit || uiState.previewCommit.workspace !== uiState.activeWorkspace) {
    return '';
  }

  return `
    <article class="workspace-preview-commit" data-tone="${escapeHtml(uiState.previewCommit.tone)}">
      <div class="workspace-preview-commit-copy">
        <p class="eyebrow">Preview Commit</p>
        <strong class="workspace-preview-commit-title">방금 실행됨 · ${escapeHtml(uiState.previewCommit.title)}</strong>
        <p class="workspace-preview-commit-note">${escapeHtml(uiState.previewCommit.summary)}</p>
        <p class="workspace-preview-commit-detail">${escapeHtml(uiState.previewCommit.detail)}</p>
      </div>
      <div class="workspace-preview-commit-meta">
        ${renderBadge('미리보기 실행', uiState.previewCommit.tone === 'success' ? 'success' : 'recommended')}
        <button class="ghost-button inline-button" type="button" data-client-action="dismiss-preview-commit">닫기</button>
      </div>
    </article>
  `;
}

function getWorkspaceForResumeTarget(target, snapshot) {
  if (!target) {
    return null;
  }

  if (target.workspace) {
    return normalizeWorkspace(snapshot, target.workspace);
  }

  if (target.clientAction === 'focus-feed') {
    return 'feed';
  }

  if (target.clientAction === 'resume-focus') {
    return normalizeWorkspace(snapshot, getSmartResumePlan(snapshot).workspace);
  }

  switch (target.action) {
    case 'visit-board':
    case 'accept-quest':
    case 'complete-quest':
      return 'quests';
    case 'visit-market':
    case 'buy-item':
      return 'market';
    case 'travel':
    case 'dungeon-explore':
    case 'town-explore':
    case 'dungeon-rest':
    case 'inn-rest':
      return 'travel';
    case 'save-game':
    case 'load-game':
      return 'save';
    case 'battle-attack':
    case 'battle-defend':
    case 'battle-skill':
    case 'battle-item':
    case 'battle-escape':
      return 'combat';
    default:
      return null;
  }
}

function getResumeWorkspaceState(snapshot) {
  if (!uiState.resumeRoute) {
    return null;
  }

  const stepViews = getResumeRouteStepViews(uiState.resumeRoute);
  const currentStep = stepViews.find(step => step.status === 'current') ?? stepViews[0] ?? null;
  const completedCount = stepViews.filter(step => step.status === 'complete').length;
  const currentWorkspace = currentStep
    ? getWorkspaceForResumeTarget(currentStep.target, snapshot)
    : null;
  const completedWorkspaces = new Set(
    stepViews
      .filter(step => step.status === 'complete')
      .map(step => getWorkspaceForResumeTarget(step.target, snapshot))
      .filter(Boolean)
  );

  return {
    stepViews,
    currentStep,
    completedCount,
    contextLabel: uiState.resumeRoute.contextLabel ?? null,
    currentWorkspace,
    completedWorkspaces
  };
}

function getResumePreviewState(snapshot) {
  const routeState = getResumeWorkspaceState(snapshot);
  if (!routeState?.currentStep || !uiState.resumePreviewStepId) {
    return null;
  }

  const previewStep = routeState.stepViews.find(step => step.id === uiState.resumePreviewStepId) ?? null;
  if (!previewStep || previewStep.id === routeState.currentStep.id) {
    return null;
  }

  const previewWorkspace = getWorkspaceForResumeTarget(previewStep.target, snapshot);
  if (!previewWorkspace || previewWorkspace !== uiState.activeWorkspace) {
    return null;
  }

  return {
    routeState,
    previewStep,
    previewWorkspace
  };
}

function isResumeTargetWorkspace(snapshot, workspaceId) {
  return getResumeWorkspaceState(snapshot)?.currentWorkspace === workspaceId;
}

function isResumePreviewWorkspace(snapshot, workspaceId) {
  return getResumePreviewState(snapshot)?.previewWorkspace === workspaceId;
}

function renderResumeTargetBadge() {
  return renderBadge(
    uiState.resumeRoute?.contextLabel
      ? `Resume Target · ${uiState.resumeRoute.contextLabel}`
      : 'Resume Target',
    'recommended'
  );
}

function renderResumePreviewBadge() {
  return renderBadge(
    uiState.resumeRoute?.contextLabel
      ? `Preview Target · ${uiState.resumeRoute.contextLabel}`
      : 'Preview Target'
  );
}

function getResumeTargetStep(snapshot, workspaceId) {
  const routeState = getResumeWorkspaceState(snapshot);
  if (!routeState || routeState.currentWorkspace !== workspaceId) {
    return null;
  }

  return routeState.currentStep ?? null;
}

function getResumePreviewStep(snapshot, workspaceId) {
  const previewState = getResumePreviewState(snapshot);
  if (!previewState || previewState.previewWorkspace !== workspaceId) {
    return null;
  }

  return previewState.previewStep;
}

function renderResumeTargetCallout(snapshot, workspaceId, options = {}) {
  const step = getResumeTargetStep(snapshot, workspaceId);
  if (!step) {
    return '';
  }

  const actionOptions = options.actionLabel
    ? options
    : getResumeTargetActionOptions(snapshot, workspaceId) ?? {};
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <div class="resume-target-callout">
      <p class="eyebrow">${escapeHtml(contextLabel ? `Resume Note · ${contextLabel}` : 'Resume Note')}</p>
      <strong class="resume-target-callout-title">${escapeHtml(step.title)}</strong>
      <p class="resume-target-callout-copy">${escapeHtml(step.body)}</p>
      ${actionOptions.actionLabel
        ? `
          <div class="resume-target-callout-actions">
            <span class="resume-target-action-label">${escapeHtml(contextLabel ? `Resume Action · ${contextLabel}` : 'Resume Action')}</span>
            <button
              class="inline-button"
              type="button"
              ${buildInteractionAttributes(actionOptions.target)}
              ${actionOptions.disabled ? 'disabled' : ''}
            >
              ${escapeHtml(actionOptions.actionLabel)}
            </button>
          </div>
        `
        : ''}
    </div>
  `;
}

function renderResumePreviewCallout(snapshot, workspaceId) {
  const step = getResumePreviewStep(snapshot, workspaceId);
  const routeState = getResumeWorkspaceState(snapshot);
  if (!step || !routeState?.currentStep) {
    return '';
  }

  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <div class="preview-target-callout">
      <p class="eyebrow">${escapeHtml(contextLabel ? `Preview Note · ${contextLabel}` : 'Preview Note')}</p>
      <strong class="preview-target-callout-title">${escapeHtml(step.title)}</strong>
      <p class="preview-target-callout-copy">
        ${escapeHtml(`지금은 ${step.order} 단계를 미리 보고 있습니다. 현재 경로는 ${routeState.currentStep.order} 단계에 그대로 유지됩니다.`)}
      </p>
      <div class="preview-target-callout-actions">
        <span class="preview-target-action-label">${escapeHtml(contextLabel ? `Preview Action · ${contextLabel}` : 'Preview Action')}</span>
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes({
            clientAction: 'resume-step-focus',
            resumeStepId: routeState.currentStep.id
          })}
        >
          현재 단계로 복귀
        </button>
        <button class="ghost-button inline-button" type="button" data-client-action="dismiss-resume-preview">미리 보기 닫기</button>
      </div>
    </div>
  `;
}

function getPreviewActionLabel(actionLabel) {
  const normalizedLabel = typeof actionLabel === 'string'
    ? actionLabel.replace(/^바로\s+/, '').trim()
    : '';
  return normalizedLabel ? `이 단계 그대로 ${normalizedLabel}` : '';
}

function renderPreviewActionNote() {
  return '<p class="preview-action-note">미리 보기 상태입니다. 아래 버튼을 누르면 이 단계를 바로 실행합니다.</p>';
}

function getResumeActionAvailability(actionOptions) {
  if (!actionOptions) {
    return null;
  }

  if (actionOptions.disabled) {
    return {
      tone: 'warning',
      label: '지금 실행 불가',
      detail: actionOptions.disabledReason ?? '현재 조건에서는 이 단계를 바로 실행할 수 없습니다.'
    };
  }

  return {
    tone: 'success',
    label: '지금 실행 가능',
    detail: '현재 조건에서 바로 이어갈 수 있습니다.'
  };
}

function getResumeActionRecoveryLabel(actionOptions) {
  return actionOptions?.recovery?.label ?? null;
}

function renderResumeRecoveryAction(actionOptions) {
  const recoveryLabel = getResumeActionRecoveryLabel(actionOptions);
  if (!actionOptions?.disabled || !recoveryLabel || !actionOptions.recovery?.target) {
    return '';
  }

  return `
    <button
      class="ghost-button inline-button"
      type="button"
      ${buildInteractionAttributes(actionOptions.recovery.target)}
    >
      ${escapeHtml(recoveryLabel)}
    </button>
  `;
}

function getPreviewCommitContext(snapshot, action) {
  if (!action?.previewAction || !snapshot?.hasGame) {
    return null;
  }

  const previewState = getResumePreviewState(snapshot);
  if (!previewState || previewState.previewWorkspace !== uiState.activeWorkspace) {
    return null;
  }

  const actionOptions = getResumeTargetActionOptions(snapshot, uiState.activeWorkspace);
  if (!actionOptions?.target) {
    return null;
  }

  return {
    previewState,
    actionOptions
  };
}

function getResumeTargetActionOptions(snapshot, workspaceId) {
  if (!snapshot?.hasGame) {
    return null;
  }

  const isTown = Boolean(snapshot.location?.isTown);
  const isCombat = snapshot.scene === 'combat';

  switch (workspaceId) {
    case 'travel': {
      const { activeDestination } = getTravelDeckState(snapshot);
      if (!activeDestination) {
        return null;
      }

      return {
        actionLabel: '바로 이동',
        summary: `${activeDestination.name} 쪽으로 바로 출발해 전개를 이어갑니다.`,
        target: {
          action: 'travel',
          destinationId: activeDestination.id
        },
        disabled: !activeDestination.unlocked || isCombat,
        disabledReason: isCombat
          ? '전투 중에는 이동을 바로 실행할 수 없습니다.'
          : !activeDestination.unlocked
            ? '아직 잠긴 지역이라 바로 이동할 수 없습니다.'
            : null,
        recovery: isCombat
          ? {
              label: '전투로 복귀',
              target: {
                workspace: 'combat'
              }
            }
          : !activeDestination.unlocked
            ? {
                label: '해금 경로 보기',
                target: {
                  workspace: 'travel'
                }
              }
            : null
      };
    }
    case 'quests': {
      const { activeLane, activeEntry } = getQuestDeckState(snapshot);
      const activeQuest = activeEntry?.quest ?? null;
      if (!activeLane || !activeQuest) {
        return null;
      }

      if (activeLane.id === 'available') {
        return {
          actionLabel: '수락',
          summary: `${activeQuest.name ?? '선택 의뢰'}를 수락해 현재 세션 목표를 고정합니다.`,
          target: {
            action: 'accept-quest',
            questId: activeQuest.id ?? ''
          },
          disabled: !isTown || isCombat,
          disabledReason: isCombat
            ? '전투 중에는 의뢰를 수락할 수 없습니다.'
            : !isTown
              ? '허브에서만 의뢰를 수락할 수 있습니다.'
              : null,
          recovery: isCombat
            ? {
                label: '전투로 복귀',
                target: {
                  workspace: 'combat'
                }
              }
            : !isTown
              ? {
                  label: '이동 경로 보기',
                  target: {
                    workspace: 'travel'
                  }
                }
              : null
        };
      }

      if (activeLane.id === 'completable') {
        return {
          actionLabel: '완료 처리',
          summary: `${activeQuest.name ?? '보상 대기 퀘스트'} 보상을 정산해 성장 보상을 회수합니다.`,
          target: {
            action: 'complete-quest',
            questId: activeQuest.id ?? ''
          },
          disabled: !isTown || isCombat,
          disabledReason: isCombat
            ? '전투 중에는 퀘스트 정산을 실행할 수 없습니다.'
            : !isTown
              ? '허브에서만 퀘스트 정산을 할 수 있습니다.'
              : null,
          recovery: isCombat
            ? {
                label: '전투로 복귀',
                target: {
                  workspace: 'combat'
                }
              }
            : !isTown
              ? {
                  label: '이동 경로 보기',
                  target: {
                    workspace: 'travel'
                  }
                }
              : null
        };
      }

      const primaryAction = getPrimaryActionDescriptor(snapshot);
      if (!primaryAction?.target) {
        return null;
      }

      return {
        actionLabel: primaryAction.title,
        summary: primaryAction.body,
        target: primaryAction.target,
        disabled: false,
        disabledReason: null,
        recovery: null
      };
    }
    case 'combat': {
      const battle = snapshot.battle;
      const primaryAction = getPrimaryActionDescriptor(snapshot);
      if (!battle || !primaryAction?.target?.action) {
        return null;
      }

      return {
        actionLabel: primaryAction.title,
        summary: primaryAction.body,
        target: primaryAction.target,
        disabled: !battle.playerTurn,
        disabledReason: !battle.playerTurn
          ? '적 행동이 끝나야 이 전투 명령을 바로 실행할 수 있습니다.'
          : null,
        recovery: !battle.playerTurn
          ? {
              label: '전투 패널 유지',
              target: {
                workspace: 'combat'
              }
            }
          : null
      };
    }
    case 'market': {
      const { activeShop, activeItem } = getMarketDeckState(snapshot);
      if (!activeShop || !activeItem) {
        return null;
      }

      const targetSummary = getMarketTargetSummary(snapshot, activeShop.id, activeItem.id);

      return {
        actionLabel: targetSummary?.actionLabel ?? '바로 구매',
        summary: targetSummary?.actionSummary ?? `${activeItem.name}를 바로 확보해 다음 루프의 장비 공백을 줄입니다.`,
        target: {
          action: 'buy-item',
          shopId: activeShop.id,
          itemId: activeItem.id
        },
        disabled: !isTown || isCombat || !activeItem.canAfford || !activeItem.meetsLevelReq,
        disabledReason: isCombat
          ? '전투 중에는 상점 구매를 바로 실행할 수 없습니다.'
          : !isTown
            ? '허브에서만 상점 구매를 할 수 있습니다.'
            : !activeItem.canAfford
              ? '골드가 부족해서 지금은 구매할 수 없습니다.'
              : !activeItem.meetsLevelReq
                ? '레벨 조건이 부족해서 지금은 구매할 수 없습니다.'
                : null,
        recovery: isCombat
          ? {
              label: '전투로 복귀',
              target: {
                workspace: 'combat'
              }
            }
          : !isTown
            ? {
                label: '이동 경로 보기',
                target: {
                  workspace: 'travel'
                }
              }
            : !activeItem.canAfford
              ? {
                  label: (snapshot.questBoard?.completable.length ?? 0) > 0 ? '보상 정산 보기' : '다음 의뢰 보기',
                  target: {
                    workspace: 'quests'
                  }
                }
              : !activeItem.meetsLevelReq
                ? {
                    label: '추천 전선 보기',
                    target: {
                      workspace: 'travel'
                    }
                  }
                : null
      };
    }
    case 'save': {
      const canSave = Boolean(snapshot.saveStatus?.canSave);
      const recommended = getRecommendedSaveSlot(snapshot);
      const quickSaveSlot = canSave ? recommended?.slot ?? null : null;
      if (!quickSaveSlot) {
        return {
          actionLabel: '저장',
          summary: snapshot.saveStatus?.reason ?? '세이브 슬롯을 확인한 뒤 저장합니다.',
          target: {
            workspace: 'save'
          },
          disabled: true,
          disabledReason: canSave
            ? '저장할 추천 슬롯을 찾지 못했습니다.'
            : snapshot.saveStatus?.reason ?? '현재는 저장할 수 없습니다.',
          recovery: canSave
            ? {
                label: '세이브 슬롯 보기',
                target: {
                  workspace: 'save'
                }
              }
            : isTown
              ? {
                  label: '세이브 조건 보기',
                  target: {
                    workspace: 'save'
                  }
                }
              : {
                  label: '이동 경로 보기',
                  target: {
                    workspace: 'travel'
                  }
                }
        };
      }

      return {
        actionLabel: '바로 저장',
        summary: `${recommended.label}에 지금 저장하면 다음 세션 재개 지점이 가장 깔끔합니다.`,
        target: {
          action: 'save-game',
          slotNumber: quickSaveSlot.slotNumber
        },
        disabled: false,
        disabledReason: null,
        recovery: null
      };
    }
    case 'feed': {
      const { activeEntry } = getFeedDeckState(snapshot);
      if (!activeEntry) {
        return null;
      }

      return {
        actionLabel: '이 장면 계속 보기',
        summary: `${getFeedCategoryLabel(activeEntry.category)} 로그만 바로 좁혀서 직전 흐름을 다시 붙입니다.`,
        target: {
          clientAction: 'focus-feed',
          feedCategory: activeEntry.category
        },
        disabled: false,
        disabledReason: null,
        recovery: null
      };
    }
    default:
      return null;
  }
}

function advanceResumeRoutePhase(nextPhase) {
  if (!uiState.resumeRoute) {
    return;
  }

  const phaseOrder = {
    inspect: 0,
    advance: 1,
    wrap: 2
  };
  const currentOrder = phaseOrder[uiState.resumeRoute.phase] ?? 0;
  const nextOrder = phaseOrder[nextPhase] ?? currentOrder;

  if (nextOrder <= currentOrder) {
    return;
  }

  uiState.resumeRoute = {
    ...uiState.resumeRoute,
    phase: nextPhase
  };
}

function getPreviousAchievementContextDescriptor(snapshot, previousPlan = null) {
  if (!snapshot?.hasGame) {
    return null;
  }

  return getTrackedAchievementDescriptor(snapshot) ??
    getAchievementDescriptorByTitle(snapshot, previousPlan?.achievementTitle ?? null);
}

function syncAchievementTrackingAfterAction(previousSnapshot, nextSnapshot, previousPlan = null) {
  const previousDescriptor = getPreviousAchievementContextDescriptor(previousSnapshot, previousPlan);
  const previousEntry = findTrackedAchievementEntry(previousSnapshot, previousDescriptor);
  const currentEntry = findTrackedAchievementEntry(nextSnapshot, previousDescriptor);

  if (nextSnapshot?.achievementTracking?.current?.id) {
    uiState.achievementFocusId = nextSnapshot.achievementTracking.current.id;
  } else if (uiState.achievementFocusId && previousDescriptor?.entry?.id === uiState.achievementFocusId) {
    uiState.achievementFocusId = null;
  }

  const nextPlan = getSmartResumePlan(nextSnapshot);
  const shouldRefreshRoute = Boolean(
    uiState.resumeRoute &&
    (previousPlan?.achievementTitle || uiState.resumeRoute.achievementTitle || nextPlan.achievementTitle)
  );

  if (shouldRefreshRoute) {
    const phase = uiState.resumeRoute?.phase ?? 'inspect';
    const loadContext = getSnapshotTrackingLoadContext(nextSnapshot);
    const refreshedRoute = getResumeRouteModel(nextSnapshot, nextPlan, loadContext);
    uiState.resumeRoute = refreshedRoute
      ? {
          ...refreshedRoute,
          phase
        }
      : null;
  }

  const nextDescriptor = getTrackedAchievementDescriptor(nextSnapshot);

  const previousHistoryMessage = getAchievementTrackingHistory(previousSnapshot)[0]?.message ?? '';
  const nextHistoryMessage = getAchievementTrackingHistory(nextSnapshot)[0]?.message ?? '';

  if (nextHistoryMessage && nextHistoryMessage !== previousHistoryMessage) {
    return nextHistoryMessage;
  }

  if (!previousDescriptor || !currentEntry) {
    return '';
  }

  if (!previousEntry?.unlocked && currentEntry.unlocked) {
    const nextTrackedTitle = nextDescriptor?.title ??
      nextPlan?.achievementTitle ??
      uiState.resumeRoute?.achievementTitle ??
      null;
    const nextTargetLabel = nextTrackedTitle && nextTrackedTitle !== previousDescriptor.title
      ? ` · 다음 목표 ${nextTrackedTitle}`
      : '';
    return `업적 추적 완료: ${previousDescriptor.title}${nextTargetLabel}`;
  }

  if (
    nextDescriptor?.title === previousDescriptor.title &&
    nextDescriptor.progress &&
    nextDescriptor.progress !== previousDescriptor.progress
  ) {
    return `업적 추적 갱신: ${nextDescriptor.label}`;
  }

  return '';
}

function clampIndex(index, length) {
  if (length <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(length - 1, index));
}

function cycleIndex(index, delta, length) {
  if (length <= 1) {
    return 0;
  }

  const next = (index + delta) % length;
  return next < 0 ? next + length : next;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0);
}

function formatDate(timestamp) {
  if (!timestamp) {
    return '비어 있음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function clampPercent(current, max) {
  if (!max || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function getLatestMessage(snapshot) {
  return snapshot?.feed?.[0]?.text ?? '브라우저 운영 대시보드 준비 완료.';
}

function setBusy(isBusy) {
  uiState.busy = isBusy;
  document.body.dataset.busy = String(isBusy);
  statusLine.textContent = isBusy
    ? '명령을 처리하는 중...'
    : getLatestMessage(uiState.snapshot);
}

function showToast(message) {
  if (!message) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('visible');
  if (uiState.toastTimer) {
    window.clearTimeout(uiState.toastTimer);
  }
  uiState.toastTimer = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? '요청을 처리하지 못했습니다.');
  }

  return payload;
}

async function loadSnapshot() {
  setBusy(true);
  try {
    uiState.snapshot = await requestJson('/api/state');
    uiState.resumeBrief = null;
    uiState.resumeRoute = null;
    uiState.resumePreviewStepId = null;
    uiState.previewCommit = null;
    uiState.achievementFocusId = null;
    uiState.activeWorkspace = normalizeWorkspace(uiState.snapshot, uiState.activeWorkspace);
    render();
  } catch (error) {
    renderError(error instanceof Error ? error.message : '상태 로드 실패');
  } finally {
    setBusy(false);
  }
}

async function performAction(action) {
  setBusy(true);
  try {
    const previousSnapshot = uiState.snapshot;
    const previousMessage = getLatestMessage(previousSnapshot);
    const previousPlan = previousSnapshot?.hasGame
      ? getSmartResumePlan(previousSnapshot)
      : null;
    const isTrackingControlAction =
      action.type === 'track-achievement' ||
      action.type === 'set-achievement-tracking-mode' ||
      action.type === 'clear-achievement-tracking';
    const previewContext = getPreviewCommitContext(previousSnapshot, action);
    const requestAction = { ...action };
    delete requestAction.previewAction;
    uiState.previewCommit = null;
    uiState.resumePreviewStepId = null;
    uiState.snapshot = await requestJson('/api/action', {
      method: 'POST',
      body: JSON.stringify(requestAction)
    });
    const loadContext = action.type === 'load-game'
      ? {
          intent: action.loadIntent ?? null,
          achievementTitle: action.loadAchievementTitle ?? null,
          achievementProgress: action.loadAchievementProgress ?? null
        }
      : null;
    const resumePlan = action.type === 'load-game'
      ? applySmartResumePlan(uiState.snapshot)
      : null;
    uiState.resumeBrief = resumePlan
      ? getResumeBriefModel(uiState.snapshot, resumePlan, loadContext)
      : null;
    if (resumePlan) {
      uiState.resumeRoute = getResumeRouteModel(uiState.snapshot, resumePlan, loadContext);
    } else if (action.type === 'save-game') {
      uiState.resumeRoute = null;
    } else if (action.type === 'new-game') {
      uiState.resumeRoute = null;
    } else if (action.type === 'clear-achievement-tracking') {
      uiState.resumeBrief = null;
      uiState.resumeRoute = null;
    } else if (isTrackingControlAction) {
      // Tracking controls should not advance the current resume route phase.
    } else if (action.type !== 'load-game') {
      advanceResumeRoutePhase(
        isResumeRouteCommitAction(action.type)
          ? 'wrap'
          : 'advance'
      );
    }
    if (!resumePlan) {
      uiState.activeWorkspace = getWorkspaceForAction(
        action.type,
        uiState.snapshot,
        uiState.activeWorkspace
      );
      uiState.feedIndex = 0;
    }
    if (action.type === 'track-achievement' && uiState.snapshot?.hasGame) {
      uiState.achievementFocusId = action.achievementId;
      focusAchievementTarget(action.achievementId, uiState.snapshot);
    }
    if (action.type === 'clear-achievement-tracking') {
      uiState.achievementFocusId = null;
    }
    if (action.type === 'load-game' || action.type === 'new-game') {
      uiState.achievementFocusId = null;
    }
    if (previewContext) {
      uiState.previewCommit = buildPreviewCommitDescriptor(
        previewContext,
        uiState.snapshot,
        uiState.activeWorkspace,
        uiState.resumeRoute
      );
    }
    const trackingToast = action.type !== 'load-game' &&
      action.type !== 'new-game' &&
      action.type !== 'save-game'
      ? syncAchievementTrackingAfterAction(previousSnapshot, uiState.snapshot, previousPlan)
      : '';
    render();
    const nextMessage = getLatestMessage(uiState.snapshot);
    if (uiState.previewCommit) {
      showToast(getPreviewCommitToast(uiState.previewCommit));
    } else if (resumePlan?.cue) {
      showToast(getResumeToastMessage(resumePlan, loadContext));
    } else if (trackingToast) {
      showToast(trackingToast);
    } else if (nextMessage && nextMessage !== previousMessage) {
      showToast(nextMessage);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '명령 처리 실패';
    showToast(message);
    statusLine.textContent = message;
  } finally {
    setBusy(false);
  }
}

function renderMeterCard(label, current, max, fillClass = '') {
  return `
    <div class="meter-card">
      <div class="meter-top">
        <span class="meter-label">${escapeHtml(label)}</span>
        <span class="meter-value">${formatNumber(current)} / ${formatNumber(max)}</span>
      </div>
      <div class="meter-track">
        <div class="meter-fill ${fillClass}" style="width: ${clampPercent(current, max)}%"></div>
      </div>
    </div>
  `;
}

function renderBadge(text, className = '') {
  return `<span class="badge ${escapeHtml(className)}">${escapeHtml(text)}</span>`;
}

function isResumeRouteCommitAction(actionType) {
  return [
    'accept-quest',
    'complete-quest',
    'travel',
    'buy-item',
    'battle-attack',
    'battle-defend',
    'battle-skill',
    'battle-item',
    'battle-escape',
    'inn-rest',
    'dungeon-rest',
    'town-explore',
    'dungeon-explore',
    'save-game'
  ].includes(actionType);
}

function renderEmptyCopy(message) {
  return `<p class="empty-copy">${escapeHtml(message)}</p>`;
}

function renderDeckPager({ index, total, prevAction, nextAction }) {
  return `
    <div class="deck-pager">
      <button
        class="ghost-button inline-button"
        type="button"
        data-ui-action="${escapeHtml(prevAction)}"
        ${total <= 1 ? 'disabled' : ''}
      >
        이전
      </button>
      <span class="deck-counter">${formatNumber(total ? index + 1 : 0)} / ${formatNumber(total)}</span>
      <button
        class="ghost-button inline-button"
        type="button"
        data-ui-action="${escapeHtml(nextAction)}"
        ${total <= 1 ? 'disabled' : ''}
      >
        다음
      </button>
    </div>
  `;
}

function renderSegmentedButtons(items, selectedId, actionName) {
  return `
    <div class="segment-row">
      ${items.map(item => `
        <button
          class="segment-button ${selectedId === item.id ? 'active' : ''} ${item.target ? 'target' : ''}"
          type="button"
          data-ui-action="${escapeHtml(actionName)}"
          data-ui-value="${escapeHtml(item.id)}"
        >
          <span class="segment-button-copy">
            <span>${escapeHtml(item.label)}</span>
            ${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ''}
          </span>
          <strong>${formatNumber(item.count ?? 0)}</strong>
        </button>
      `).join('')}
    </div>
  `;
}

function renderChipButtons(items, selectedId, options = {}) {
  const actionName = options.actionName ?? 'select-feed-filter';
  const ariaLabel = options.ariaLabel ?? '필터';

  return `
    <div class="chip-filter-row" role="tablist" aria-label="${escapeHtml(ariaLabel)}">
      ${items.map(item => `
        <button
          class="chip-filter ${selectedId === item.id ? 'active' : ''}"
          type="button"
          data-ui-action="${escapeHtml(actionName)}"
          data-ui-value="${escapeHtml(item.id)}"
        >
          <span>${escapeHtml(item.label)}</span>
          ${item.meta ? `<strong>${escapeHtml(item.meta)}</strong>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

function renderActionChipButtons(items, selectedId, options = {}) {
  const actionName = options.actionName ?? 'set-achievement-tracking-mode';
  const ariaLabel = options.ariaLabel ?? '행동';
  const dataKey = options.dataKey ?? 'tracking-mode';

  return `
    <div class="chip-filter-row" role="tablist" aria-label="${escapeHtml(ariaLabel)}">
      ${items.map(item => `
        <button
          class="chip-filter ${selectedId === item.id ? 'active' : ''}"
          type="button"
          data-action="${escapeHtml(actionName)}"
          data-${escapeHtml(dataKey)}="${escapeHtml(item.id)}"
        >
          <span>${escapeHtml(item.label)}</span>
          ${item.meta ? `<strong>${escapeHtml(item.meta)}</strong>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

function renderFeedFilterButtons(items, selectedId, options = {}) {
  return renderChipButtons(
    items.map(item => ({
      ...item,
      meta: formatNumber(item.count ?? 0)
    })),
    selectedId,
    options
  );
}

function getFeedEntryFilterId(entry) {
  return entry?.speaker ? `speaker:${entry.speaker}` : FEED_FILTER_SYSTEM;
}

function getFeedEntrySpeakerLabel(entry) {
  return entry?.speaker ?? '시스템';
}

function getFeedEntryCategoryId(entry) {
  return entry?.category ?? 'system';
}

function getFeedCategoryLabel(categoryId) {
  return FEED_CATEGORY_LABELS[categoryId] ?? FEED_CATEGORY_LABELS.system;
}

function getAchievementTrackingModeLabel(mode) {
  return mode === 'pinned' ? '핀 고정' : '자동 전환';
}

function getRecommendedFeedCategory(snapshot, highlights) {
  if (!highlights.length) {
    return 'system';
  }

  const hasCategory = categoryId => highlights.some(highlight => highlight.id === categoryId);
  if (snapshot.scene === 'combat' && hasCategory('combat')) {
    return 'combat';
  }

  if ((snapshot.questBoard?.completable.length ?? 0) > 0 && hasCategory('reward')) {
    return 'reward';
  }

  if (snapshot.tracker && hasCategory('quest')) {
    return 'quest';
  }

  if (!snapshot.location?.isTown && hasCategory('travel')) {
    return 'travel';
  }

  if (snapshot.location?.isTown && hasCategory('hub')) {
    return 'hub';
  }

  return highlights[0].id;
}

function getFeedHighlightState(snapshot) {
  const highlightMap = new Map();

  for (const entry of snapshot.feed ?? []) {
    const categoryId = getFeedEntryCategoryId(entry);
    const existing = highlightMap.get(categoryId);
    if (existing) {
      existing.count += 1;
      continue;
    }

    highlightMap.set(categoryId, {
      id: categoryId,
      label: getFeedCategoryLabel(categoryId),
      count: 1,
      entry
    });
  }

  const highlights = Array.from(highlightMap.values());
  return {
    highlights,
    recommendedCategoryId: getRecommendedFeedCategory(snapshot, highlights)
  };
}

function applyFeedCategoryFocus(categoryId, options = {}) {
  uiState.feedCategoryId = categoryId ?? FEED_CATEGORY_ALL;
  uiState.feedFilterId = FEED_FILTER_ALL;
  uiState.feedIndex = 0;

  if (options.openWorkspace && uiState.snapshot?.hasGame) {
    uiState.activeWorkspace = normalizeWorkspace(uiState.snapshot, 'feed');
  }
}

function getApproachingAchievement(snapshot) {
  const entries = [...(snapshot.achievements?.entries ?? [])]
    .filter(entry => !entry.unlocked)
    .sort(compareAchievementsByFocus);
  const candidate = entries[0] ?? null;

  if (!candidate) {
    return null;
  }

  const remaining = Math.max(0, candidate.target - candidate.current);
  const isNearCompletion = candidate.progressPercent >= 75 || remaining <= 1;
  if (!isNearCompletion) {
    return null;
  }

  return candidate;
}

function getActiveTrackedAchievement(snapshot) {
  const trackedAchievement = getTrackedAchievementDescriptor(snapshot);
  if (!trackedAchievement?.entry || trackedAchievement.entry.unlocked) {
    return null;
  }

  return trackedAchievement;
}

function getAchievementCardProgressLabel(entry) {
  if (entry.target > 1) {
    return `${formatNumber(entry.current)} / ${formatNumber(entry.target)}`;
  }

  return entry.progressPercent >= 100 ? '조건 충족' : '다음 해금';
}

function getAchievementAlertProgressLabel(entry) {
  const remaining = Math.max(0, entry.target - entry.current);
  if (entry.target > 1) {
    return remaining <= 1
      ? '1회 남음'
      : `${formatNumber(entry.current)} / ${formatNumber(entry.target)}`;
  }

  return `${formatNumber(entry.progressPercent)}%`;
}

function getSidebarAlerts(snapshot) {
  if (!snapshot?.hasGame || !snapshot.player || !snapshot.location) {
    return [];
  }

  const alerts = [];
  const location = snapshot.location;
  const player = snapshot.player;
  const feed = snapshot.feed ?? [];
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  const mpRatio = player.maxMp > 0 ? player.mp / player.maxMp : 1;
  const warningEntry = feed.find(entry => entry.tone === 'error' || entry.tone === 'warning');
  const rewardEntry = feed.find(entry => entry.category === 'reward' && entry.tone === 'success');
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  const approachingAchievement = trackedAchievement?.entry ?? getApproachingAchievement(snapshot);

  if (snapshot.scene === 'combat' && snapshot.battle) {
    alerts.push({
      id: 'combat-active',
      tone: snapshot.battle.isBoss ? 'warning' : 'info',
      eyebrow: 'Combat',
      title: snapshot.battle.isBoss ? '보스전 진행 중' : '교전 진행 중',
      body: snapshot.battle.isBoss
        ? `${snapshot.battle.monsterName} 대응에 집중해야 합니다. 전투 로그보다 전투 작업공간 우선입니다.`
        : `${snapshot.battle.monsterName}과 교전 중입니다. 현재 턴과 자원 상태를 먼저 확인하세요.`,
      badge: snapshot.battle.playerTurn ? '플레이어 턴' : '적 행동 중',
      workspace: 'combat'
    });
  }

  if ((snapshot.questBoard?.completable.length ?? 0) > 0) {
    alerts.push({
      id: 'quest-turnin',
      tone: 'success',
      eyebrow: 'Quest Turn-In',
      title: '완료 가능한 퀘스트 있음',
      body: `${formatNumber(snapshot.questBoard?.completable.length ?? 0)}개의 퀘스트가 보상 대기 상태입니다. 허브에서 마무리해 보상을 회수하세요.`,
      badge: '보상 대기',
      workspace: 'quests'
    });
  }

  if (!location.isTown && (hpRatio <= 0.4 || mpRatio <= 0.25)) {
    alerts.push({
      id: 'resource-warning',
      tone: 'warning',
      eyebrow: 'Field Safety',
      title: '휴식 또는 귀환 권장',
      body: `현재 자원이 낮습니다. HP ${formatNumber(player.hp)}/${formatNumber(player.maxHp)}, MP ${formatNumber(player.mp)}/${formatNumber(player.maxMp)} 상태입니다.`,
      badge: hpRatio <= 0.4 ? 'HP 낮음' : 'MP 낮음',
      workspace: 'travel'
    });
  }

  if (approachingAchievement) {
    const focus = getAchievementFocusDescriptor(approachingAchievement, snapshot);
    const isTrackedAchievement = trackedAchievement?.entry?.id === approachingAchievement.id;
    const progressLabel = isTrackedAchievement
      ? getAchievementCardProgressLabel(approachingAchievement)
      : getAchievementAlertProgressLabel(approachingAchievement);

    alerts.push({
      id: `achievement:${approachingAchievement.id}`,
      tone: 'success',
      eyebrow: isTrackedAchievement ? 'Achievement Chase' : 'Achievement Radar',
      title: isTrackedAchievement ? `${approachingAchievement.title} 추적` : `${approachingAchievement.title} 임박`,
      body: isTrackedAchievement ? `현재 추적 목표입니다. ${focus.hint}` : focus.hint,
      badge: progressLabel,
      uiAction: 'focus-achievement-target',
      uiValue: approachingAchievement.id
    });
  }

  if (warningEntry) {
    alerts.push({
      id: `warning:${warningEntry.id}`,
      tone: warningEntry.tone,
      eyebrow: 'Recent Warning',
      title: '최근 경고 확인',
      body: warningEntry.text,
      badge: getFeedCategoryLabel(warningEntry.category),
      clientAction: 'focus-feed',
      feedCategory: warningEntry.category
    });
  }

  if (rewardEntry) {
    alerts.push({
      id: `reward:${rewardEntry.id}`,
      tone: 'success',
      eyebrow: 'Latest Reward',
      title: '최근 보상 기록',
      body: rewardEntry.text,
      badge: rewardEntry.speaker ?? '보상 로그',
      clientAction: 'focus-feed',
      feedCategory: rewardEntry.category
    });
  }

  return alerts.slice(0, 3);
}

function getRecommendedTravelDestination(snapshot) {
  const destinations = snapshot.travel?.destinations ?? [];
  const recommendedId = snapshot.location?.recommendedDestinationId ?? null;

  return destinations.find(destination =>
    destination.id === recommendedId && destination.unlocked
  ) ?? destinations.find(destination => destination.recommended && destination.unlocked)
    ?? destinations.find(destination => destination.unlocked)
    ?? null;
}

function buildInteractionAttributes(target = {}) {
  const attributes = [];

  if (target.action) {
    attributes.push(`data-action="${escapeHtml(target.action)}"`);
  }
  if (target.workspace) {
    attributes.push(`data-workspace="${escapeHtml(target.workspace)}"`);
  }
  if (target.clientAction) {
    attributes.push(`data-client-action="${escapeHtml(target.clientAction)}"`);
  }
  if (target.resumeStepId) {
    attributes.push(`data-resume-step-id="${escapeHtml(target.resumeStepId)}"`);
  }
  if (target.destinationId) {
    attributes.push(`data-destination-id="${escapeHtml(target.destinationId)}"`);
  }
  if (target.questId) {
    attributes.push(`data-quest-id="${escapeHtml(target.questId)}"`);
  }
  if (target.shopId) {
    attributes.push(`data-shop-id="${escapeHtml(target.shopId)}"`);
  }
  if (target.itemId) {
    attributes.push(`data-item-id="${escapeHtml(target.itemId)}"`);
  }
  if (target.skillId) {
    attributes.push(`data-skill-id="${escapeHtml(target.skillId)}"`);
  }
  if (target.slotNumber) {
    attributes.push(`data-slot-number="${escapeHtml(target.slotNumber)}"`);
  }
  if (target.loadIntent) {
    attributes.push(`data-load-intent="${escapeHtml(target.loadIntent)}"`);
  }
  if (target.feedCategory) {
    attributes.push(`data-feed-category="${escapeHtml(target.feedCategory)}"`);
  }
  if (target.uiAction) {
    attributes.push(`data-ui-action="${escapeHtml(target.uiAction)}"`);
  }
  if (target.uiValue) {
    attributes.push(`data-ui-value="${escapeHtml(target.uiValue)}"`);
  }

  return attributes.join(' ');
}

function getPaceModeMeta(paceMode = uiState.paceMode) {
  return PACE_OPTIONS.find(option => option.id === paceMode) ?? PACE_OPTIONS[1];
}

function getSessionWindowMeta(sessionWindowId = uiState.sessionWindowId) {
  return SESSION_WINDOW_OPTIONS.find(option => option.id === sessionWindowId) ?? SESSION_WINDOW_OPTIONS[1];
}

function getInteractionTargetKey(target = {}) {
  const normalizedTarget = target ?? {};

  return [
    normalizedTarget.action ? `action:${normalizedTarget.action}` : '',
    normalizedTarget.workspace ? `workspace:${normalizedTarget.workspace}` : '',
    normalizedTarget.clientAction ? `client:${normalizedTarget.clientAction}` : '',
    normalizedTarget.destinationId ? `destination:${normalizedTarget.destinationId}` : '',
    normalizedTarget.questId ? `quest:${normalizedTarget.questId}` : '',
    normalizedTarget.feedCategory ? `feed:${normalizedTarget.feedCategory}` : '',
    normalizedTarget.uiAction ? `ui:${normalizedTarget.uiAction}` : '',
    normalizedTarget.uiValue ? `value:${normalizedTarget.uiValue}` : ''
  ]
    .filter(Boolean)
    .join('|');
}

function getEtaUpperBoundMinutes(label) {
  if (!label) {
    return null;
  }
  if (label === '즉시') {
    return 0;
  }
  if (label === '1턴') {
    return 2;
  }

  const rangeMatch = /^(\d+)-(\d+)분$/.exec(label);
  if (rangeMatch) {
    return Number(rangeMatch[2]);
  }

  const singleMatch = /^(\d+)분$/.exec(label);
  if (singleMatch) {
    return Number(singleMatch[1]);
  }

  return null;
}

function getEstimatedTimeLabel(snapshot, descriptor) {
  const target = descriptor?.target ?? {};
  const isTown = Boolean(snapshot?.location?.isTown);
  const bossReady = Boolean(snapshot?.location?.bossProgress?.ready);
  const hasBossProgress = Boolean(snapshot?.location?.bossProgress);
  const hasCompletableQuest = Boolean(snapshot?.questBoard?.completable?.length);

  if (target.action === 'battle-attack' || target.action === 'battle-defend' || target.action === 'battle-escape') {
    return '1턴';
  }
  if (target.workspace === 'combat') {
    return '즉시';
  }
  if (target.action === 'inn-rest' || target.action === 'dungeon-rest') {
    return '2-3분';
  }
  if (target.action === 'town-explore') {
    return '3-5분';
  }
  if (target.action === 'dungeon-explore') {
    if (bossReady) {
      return '8-12분';
    }

    return hasBossProgress ? '6-10분' : '4-8분';
  }
  if (target.action === 'travel') {
    return isTown ? '5-8분' : '4-7분';
  }
  if (target.workspace === 'travel') {
    return bossReady ? '4-6분' : '3-5분';
  }
  if (target.workspace === 'quests') {
    return hasCompletableQuest ? '2-4분' : '4-6분';
  }
  if (target.workspace === 'market' || target.action === 'visit-market') {
    return '3-6분';
  }
  if (target.action === 'visit-board') {
    return '3-5분';
  }
  if (target.clientAction === 'focus-feed' || target.workspace === 'feed') {
    return '1-2분';
  }

  return isTown ? '3-6분' : '4-8분';
}

function getSessionFitMeta(snapshot, descriptor) {
  const eta = descriptor?.eta ?? getEstimatedTimeLabel(snapshot, descriptor);
  const upperBound = getEtaUpperBoundMinutes(eta);
  const sessionWindow = getSessionWindowMeta();

  if (upperBound === null) {
    return {
      eta,
      fits: true,
      label: sessionWindow.minutes >= 999 ? '긴 세션' : `${sessionWindow.label} 기준 확인`,
      tone: 'recommended'
    };
  }

  if (upperBound <= sessionWindow.minutes) {
    return {
      eta,
      fits: true,
      label: '세션 적합',
      tone: 'success'
    };
  }

  return {
    eta,
    fits: false,
    label: '세션 초과',
      tone: 'warning'
  };
}

function getDescriptorBudgetMinutes(snapshot, descriptor) {
  return getEtaUpperBoundMinutes(descriptor?.eta ?? getEstimatedTimeLabel(snapshot, descriptor)) ?? 0;
}

function buildSessionStopDescriptor(snapshot, actionSteps) {
  const isTown = Boolean(snapshot?.location?.isTown);
  const bossReady = Boolean(snapshot?.location?.bossProgress?.ready);
  const hasQuestStep = actionSteps.some(step =>
    step.target?.workspace === 'quests' || step.target?.action === 'visit-board'
  );
  const hasTravelStep = actionSteps.some(step =>
    step.target?.workspace === 'travel' || step.target?.action === 'travel'
  );
  const hasRestStep = actionSteps.some(step =>
    step.target?.action === 'inn-rest' || step.target?.action === 'dungeon-rest'
  );

  if (isTown) {
    if (hasRestStep) {
      return {
        title: '회복 직후 저장하고 종료',
        body: '여관 정비가 끝난 직후 세이브 탭으로 넘어가면 다음 세션 시작이 가장 깔끔합니다.',
        badge: 'Stop Here',
        tone: 'success',
        target: { workspace: 'save' },
        eta: '1분'
      };
    }

    if (hasQuestStep) {
      return {
        title: '브리핑 정리 후 끊기',
        body: '보상 정산이나 다음 에피소드 확인까지만 마치고 저장하면 세션 피로가 적습니다.',
        badge: 'Stop Here',
        tone: 'recommended',
        target: { workspace: 'save' },
        eta: '1분'
      };
    }

    if (hasTravelStep) {
      return {
        title: '출격 직전 끊기',
        body: '이동 후보만 확인한 뒤 허브에서 저장해 두면 다음 세션에서 바로 출발할 수 있습니다.',
        badge: 'Stop Here',
        tone: 'recommended',
        target: { workspace: 'save' },
        eta: '1분'
      };
    }

    return {
      title: '허브 정리 후 저장',
      body: '짧은 루프를 마쳤다면 허브 상태에서 저장하고 종료하는 편이 가장 안정적입니다.',
      badge: 'Stop Here',
      tone: 'recommended',
      target: { workspace: 'save' },
      eta: '1분'
    };
  }

  if (bossReady) {
    return {
      title: '보스 진입 전 끊기',
      body: '보스 구역이 열려 있다면 진입 직전에 저장하거나 다음 세션 목표로 남겨 두는 편이 좋습니다.',
      badge: 'Stop Here',
      tone: 'warning',
      target: { workspace: 'save' },
      eta: '1분'
    };
  }

  if (hasRestStep) {
    return {
      title: '휴식 직후 끊기',
      body: '짧은 휴식으로 자원을 복구한 직후 저장해 두면 다음 세션 진입 리듬이 좋습니다.',
      badge: 'Stop Here',
      tone: 'success',
      target: { workspace: 'save' },
      eta: '1분'
    };
  }

  return {
    title: '다음 보상 직후 끊기',
    body: '전리품이나 진행 보상을 확인한 뒤 저장하고 종료하면 세션 만족도가 높습니다.',
    badge: 'Stop Here',
    tone: 'recommended',
    target: { workspace: 'save' },
    eta: '1분'
  };
}

function buildSessionPlan(snapshot, primaryAction, tempoRoutes) {
  if (!snapshot?.hasGame || snapshot.scene === 'combat') {
    return null;
  }

  const sessionWindow = getSessionWindowMeta();
  const budget = sessionWindow.minutes;
  const maxActionSteps =
    sessionWindow.id === 'micro' ? 1 : sessionWindow.id === 'short' ? 2 : 3;
  const candidates = [primaryAction, ...tempoRoutes]
    .filter(Boolean)
    .map(descriptor => ({
      ...descriptor,
      budgetMinutes: getDescriptorBudgetMinutes(snapshot, descriptor),
      sessionFit: getSessionFitMeta(snapshot, descriptor)
    }));

  if (!candidates.length) {
    return null;
  }

  const actionSteps = [];
  let usedMinutes = 0;
  let remainingCandidates = [...candidates];

  while (actionSteps.length < maxActionSteps && remainingCandidates.length) {
    let pool;

    if (actionSteps.length === 0) {
      const fittingStarts = remainingCandidates.filter(candidate => candidate.sessionFit.fits);
      pool = fittingStarts.length ? fittingStarts : remainingCandidates;
    } else if (budget >= 999) {
      pool = remainingCandidates;
    } else {
      pool = remainingCandidates.filter(candidate =>
        candidate.budgetMinutes <= Math.max(0, budget - usedMinutes)
      );
      if (!pool.length) {
        break;
      }
    }

    const nextStep = pool[0];
    actionSteps.push(nextStep);
    usedMinutes += nextStep.budgetMinutes;
    remainingCandidates = remainingCandidates.filter(candidate => candidate !== nextStep);
  }

  if (!actionSteps.length) {
    actionSteps.push(candidates[0]);
    usedMinutes = candidates[0].budgetMinutes;
  }

  const stopStep = buildSessionStopDescriptor(snapshot, actionSteps);
  const overflow = budget < 999 && usedMinutes > budget;
  const title = `이번 ${sessionWindow.label} 세션`;
  const subtitle = overflow
    ? `지금 상태에선 짧게 1루프만 권장합니다. 이후에는 ${stopStep.title} 쪽이 안전합니다.`
    : actionSteps.length === 1
      ? '한 번의 명확한 루프만 처리하고 끊기 좋은 계획입니다.'
      : `${actionSteps.length}단계 안에서 템포를 유지하고 마지막에 끊는 지점까지 제안합니다.`;

  return {
    title,
    subtitle,
    budgetLabel: budget >= 999 ? '유연한 장기 세션' : `${sessionWindow.label} 안쪽`,
    usageLabel: budget >= 999 ? `최대 ${usedMinutes}분 구성` : `최대 ${usedMinutes}분 / ${budget}분`,
    steps: [
      ...actionSteps.map((step, index) => ({
        id: `session-step-${index + 1}`,
        kind: 'action',
        order: `${index + 1}`,
        title: step.title,
        body: step.body,
        badge: step.badge,
        tone: step.tone,
        target: step.target,
        eta: step.eta ?? getEstimatedTimeLabel(snapshot, step)
      })),
      {
        id: 'session-step-stop',
        kind: 'stop',
        order: 'STOP',
        title: stopStep.title,
        body: stopStep.body,
        badge: stopStep.badge,
        tone: stopStep.tone,
        target: stopStep.target,
        eta: stopStep.eta
      }
    ]
  };
}

function getPrimaryActionDescriptor(snapshot) {
  if (!snapshot?.hasGame || !snapshot.player || !snapshot.location) {
    return null;
  }

  const isTown = Boolean(snapshot.location.isTown);
  const isCombat = snapshot.scene === 'combat';
  const paceMode = getPaceModeMeta().id;
  const player = snapshot.player;
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  const mpRatio = player.maxMp > 0 ? player.mp / player.maxMp : 1;
  const availableQuest = snapshot.questBoard?.available.flatMap(group => group.quests)[0] ?? null;
  const activeQuest = snapshot.questBoard?.active.flatMap(group => group.quests)[0] ?? null;
  const activeQuestCount = snapshot.questBoard?.active.reduce(
    (sum, group) => sum + group.quests.length,
    0
  ) ?? 0;
  const completableQuest = snapshot.questBoard?.completable[0] ?? null;
  const recommendedDestination = getRecommendedTravelDestination(snapshot);

  if (isCombat && snapshot.battle) {
    if (snapshot.battle.playerTurn) {
      const defendThreshold =
        paceMode === 'steady' ? 0.5 : paceMode === 'story' ? 0.42 : 0.3;
      const defendFirst = hpRatio <= defendThreshold;

      return {
        tone: defendFirst ? 'warning' : 'success',
        eyebrow: 'Next Move',
        title: defendFirst ? '방어로 턴 안정화' : '기본 공격으로 압박',
        body: defendFirst
          ? `HP가 낮습니다. ${snapshot.battle.monsterName}의 다음 타격을 버틸 수 있게 먼저 방어를 권장합니다.`
          : `${snapshot.battle.monsterName}에게 안정적인 압박을 넣는 기본 선택입니다.`,
        badge: defendFirst ? '생존 우선' : '표준 행동',
        steps: defendFirst
          ? [
              '이번 턴 방어를 선택해 피해를 완화합니다.',
              '적 행동 결과와 남은 HP를 확인합니다.',
              '다음 턴 회복 또는 반격으로 리듬을 되찾습니다.'
            ]
          : [
              '기본 공격으로 안정적인 피해를 넣습니다.',
              '적 HP와 다음 턴 위험도를 확인합니다.',
              '마무리 가능 여부에 따라 스킬 또는 추가 공격을 고릅니다.'
            ],
        target: {
          action: defendFirst ? 'battle-defend' : 'battle-attack'
        },
        eta: defendFirst ? '1턴' : '1턴'
      };
    }

    return {
      tone: 'info',
      eyebrow: 'Next Move',
      title: '전투 패널 유지',
      body: '지금은 적 행동이 진행 중입니다. 전투 작업공간을 유지하고 결과를 확인하세요.',
      badge: '적 행동 중',
      steps: [
        '전투 작업공간을 유지한 채 결과를 기다립니다.',
        '적의 피해량과 상태 변화를 확인합니다.',
        '플레이어 턴이 오면 즉시 다음 선택을 실행합니다.'
      ],
      target: {
        workspace: 'combat'
      },
      eta: '즉시'
    };
  }

  if (completableQuest) {
    return {
      tone: 'success',
      eyebrow: 'Next Move',
      title: '퀘스트 보상 정산',
      body: `${completableQuest.name} 완료 처리가 가능합니다. 퀘스트 탭에서 보상을 회수해 전력을 올리세요.`,
      badge: '보상 대기',
      steps: [
        '퀘스트 탭에서 보상 대기 라인을 확인합니다.',
        `${completableQuest.name}를 완료 처리합니다.`,
        'EXP, 골드, 해금 지역 또는 아이템 반영을 확인합니다.'
      ],
      target: {
        workspace: 'quests'
      },
      eta: '2-4분'
    };
  }

  const smartPlan = getSmartResumePlan(snapshot);
  if (smartPlan.achievementTitle && smartPlan.workspace === 'market') {
    const marketTarget = getMarketTargetSummary(snapshot, smartPlan.shopId ?? null, smartPlan.itemId ?? null);
    const purchaseReady = Boolean(isTown && !isCombat && marketTarget?.purchaseReady && marketTarget.itemId);

    if (marketTarget?.shopName) {
      return {
        tone: purchaseReady ? 'success' : 'info',
        eyebrow: 'Next Move',
        title: purchaseReady
          ? `${marketTarget.itemName} 확보`
          : marketTarget.itemName
            ? `${marketTarget.itemName} 점검`
            : `${marketTarget.shopName} 재고 확인`,
        body: purchaseReady
          ? `${smartPlan.achievementTitle} 업적 진척을 위해 ${marketTarget.shopName}에서 ${marketTarget.itemName} 확보를 우선합니다.`
          : marketTarget.itemName
            ? `${smartPlan.achievementTitle} 업적 진척을 위해 ${marketTarget.shopName}의 ${marketTarget.itemName} 조건을 먼저 확인합니다.`
            : `${smartPlan.achievementTitle} 업적 진척을 위해 ${marketTarget.shopName} 재고부터 확인합니다.`,
        badge: purchaseReady ? '업적 임박' : '목표 점검',
        steps: purchaseReady
          ? [
              `${marketTarget.shopName}에서 ${marketTarget.itemName}를 선택합니다.`,
              '구매 직후 누적 골드 사용량과 남은 정비 공백을 확인합니다.',
              '정비가 끝나면 다음 전선이나 저장 지점으로 이어갑니다.'
            ]
          : marketTarget.itemName
            ? [
                `${marketTarget.shopName}에서 ${marketTarget.itemName} 조건을 확인합니다.`,
                '구매 가능 여부나 레벨 조건을 점검합니다.',
                '준비가 되면 바로 구매하거나 다음 정비 루프를 정합니다.'
              ]
            : [
                `${marketTarget.shopName} 재고를 먼저 펼쳐 봅니다.`,
                '이번 세션에 소모할 골드와 준비 상태를 점검합니다.',
                '확인 후 다음 전선 또는 저장 지점으로 이어갑니다.'
              ],
        target: purchaseReady
          ? {
              action: 'buy-item',
              shopId: marketTarget.shopId,
              itemId: marketTarget.itemId
            }
          : {
              clientAction: 'resume-focus'
            },
        eta: purchaseReady ? '2-4분' : '2-3분'
      };
    }
  }

  if (paceMode === 'story') {
    const narrativeQuest = activeQuest ?? availableQuest;

    if (narrativeQuest) {
      return {
        tone: 'info',
        eyebrow: 'Next Move',
        title: activeQuest ? '브리핑으로 장면 재정렬' : '다음 에피소드 선택',
        body: activeQuest
          ? `${narrativeQuest.name}의 브리핑과 직접 전달을 다시 읽고 이번 세션의 감정선을 먼저 맞춥니다.`
          : `${narrativeQuest.name}부터 다음 서사 흐름을 고를 수 있습니다. 퀘스트 탭에서 장면을 확인하세요.`,
        badge: activeQuest ? '서사 우선' : '새 장면',
        steps: activeQuest
          ? [
              '퀘스트 탭에서 현재 에피소드의 브리핑과 직접 전달을 다시 읽습니다.',
              '이번 세션에서 어디까지 밀지 목표를 짧게 정합니다.',
              '준비가 되면 이동 또는 탐색으로 바로 장면을 이어갑니다.'
            ]
          : [
              '퀘스트 탭에서 새 에피소드의 브리핑을 읽습니다.',
              `${narrativeQuest.name}를 수락해 현재 장면을 고정합니다.`,
              '추천 이동지나 허브 루프로 자연스럽게 전개를 시작합니다.'
            ],
        target: {
          workspace: 'quests'
        },
        eta: activeQuest ? '3-5분' : '4-6분'
      };
    }
  }

  if (activeQuestCount === 0 && availableQuest) {
    return {
      tone: 'info',
      eyebrow: 'Next Move',
      title: '다음 에피소드 선택',
      body: `${availableQuest.name}부터 새 흐름을 시작할 수 있습니다. 퀘스트 탭에서 내용을 확인하세요.`,
      badge: '새 퀘스트',
      steps: [
        '퀘스트 탭에서 새 에피소드 내용을 확인합니다.',
        `${availableQuest.name}를 수락해 현재 목표를 고정합니다.`,
        '추천 이동지로 넘어가 전개를 시작합니다.'
      ],
      target: {
        workspace: 'quests'
      },
      eta: '4-6분'
    };
  }

  if (paceMode === 'steady' && isTown && (hpRatio <= 0.85 || mpRatio <= 0.65)) {
    return {
      tone: 'success',
      eyebrow: 'Next Move',
      title: '여관에서 안정 루프 정리',
      body: `다음 출격 전 자원을 정리하는 편이 좋습니다. 현재 HP ${formatNumber(player.hp)} / MP ${formatNumber(player.mp)} 상태입니다.`,
      badge: '안정 우선',
      steps: [
        '여관에서 HP/MP를 완전히 회복합니다.',
        '회복 후 곧 열릴 보상과 다음 전선을 다시 확인합니다.',
        '무리 없는 상태에서 다음 루프로 이어갑니다.'
      ],
      target: {
        action: 'inn-rest'
      },
      eta: '2-3분'
    };
  }

  const fieldRestHpThreshold =
    paceMode === 'steady' ? 0.58 : paceMode === 'push' ? 0.32 : 0.4;
  const fieldRestMpThreshold =
    paceMode === 'steady' ? 0.38 : paceMode === 'push' ? 0.2 : 0.25;

  if (!isTown && (hpRatio <= fieldRestHpThreshold || mpRatio <= fieldRestMpThreshold)) {
    return {
      tone: 'warning',
      eyebrow: 'Next Move',
      title: '짧은 휴식으로 리스크 완화',
      body: `현장 자원이 낮습니다. HP ${formatNumber(player.hp)} / MP ${formatNumber(player.mp)} 상태라면 먼저 회복이 안전합니다.`,
      badge: hpRatio <= 0.4 ? 'HP 낮음' : 'MP 낮음',
      steps: [
        '현장에서 짧은 휴식을 실행합니다.',
        '회복된 HP/MP와 남은 리스크를 확인합니다.',
        '안전하면 전진, 불안하면 귀환 쪽으로 방향을 정합니다.'
      ],
      target: {
        action: 'dungeon-rest'
      },
      eta: '2-3분'
    };
  }

  if (recommendedDestination) {
    const destinationTone = paceMode === 'steady' ? 'info' : 'success';
    const destinationBody = paceMode === 'push'
      ? '현재 흐름을 가장 빨리 앞으로 미는 전선입니다. 바로 이동해 템포를 끌어올리세요.'
      : paceMode === 'steady'
        ? '무리하지 않고 진행을 이어갈 수 있는 다음 구역입니다. 준비를 확인하고 이동합니다.'
        : recommendedDestination.recommended
          ? '현재 서사 흐름상 가장 자연스러운 다음 장면입니다. 이동 전에 장면 연결을 한 번 떠올리고 들어갑니다.'
          : '연결된 다음 구역으로 이동해 전개를 이어갑니다.';

    return {
      tone: destinationTone,
      eyebrow: 'Next Move',
      title: `${recommendedDestination.name}로 이동`,
      body: destinationBody,
      badge: paceMode === 'push'
        ? '압박 루트'
        : paceMode === 'steady'
          ? '안전 전진'
          : recommendedDestination.recommended ? '장면 연결' : '다음 구역',
      steps: [
        `${recommendedDestination.name}로 즉시 이동합니다.`,
        '도착 후 현재 퀘스트나 첫 클리어 보상을 확인합니다.',
        '탐색 또는 목표 진행으로 루프를 이어갑니다.'
      ],
      target: {
        action: 'travel',
        destinationId: recommendedDestination.id
      },
      eta: isTown ? '5-8분' : '4-7분'
    };
  }

  const fallbackTitle = isTown
    ? paceMode === 'story'
      ? '허브에서 장면 정리'
      : paceMode === 'steady'
        ? '허브에서 부담 낮은 루프'
        : '허브 정리 후 출격'
    : paceMode === 'story'
      ? '현장 단서 추적'
      : paceMode === 'steady'
        ? '안전 확인 후 전진'
        : '현장 전진';
  const fallbackBody = isTown
    ? paceMode === 'story'
      ? '브리핑과 짧은 이벤트를 통해 다음 장면의 분위기를 정리합니다.'
      : paceMode === 'steady'
        ? '가벼운 허브 루프로 부담을 낮춘 뒤 다음 행동을 정합니다.'
        : '짧은 이벤트와 보조 수익을 확인하며 바로 다음 전선으로 나갈 준비를 합니다.'
    : paceMode === 'story'
      ? '전투와 비전투 단서를 통해 이번 구역의 장면 감각을 더 선명하게 잡습니다.'
      : paceMode === 'steady'
        ? '전투 또는 비전투 이벤트를 보되 자원 손실이 커지기 전에 템포를 조절합니다.'
        : '전투 또는 비전투 이벤트를 통해 전선을 앞으로 밀어갑니다.';
  const fallbackBadge = isTown
    ? paceMode === 'story'
      ? '장면 정리'
      : paceMode === 'steady'
        ? '저강도 루프'
        : '허브 루프'
    : paceMode === 'story'
      ? '단서 추적'
      : paceMode === 'steady'
        ? '안전 탐사'
        : '탐사 루프';

  return {
    tone: 'info',
    eyebrow: 'Next Move',
    title: fallbackTitle,
    body: fallbackBody,
    badge: fallbackBadge,
    steps: isTown
      ? [
          '허브 탐색으로 짧은 이벤트를 확인합니다.',
          '얻은 자원이나 힌트에 맞춰 장비를 정리합니다.',
          '다음 퀘스트 또는 이동으로 메인 루프를 재개합니다.'
        ]
      : [
          '현장 전진으로 전투 또는 이벤트를 발동합니다.',
          '결과에 따라 자원 상태와 보상을 확인합니다.',
          '계속 전진할지 휴식할지 바로 판단합니다.'
        ],
    target: {
      action: isTown ? 'town-explore' : 'dungeon-explore'
    },
    eta: isTown ? '3-5분' : '4-8분'
  };
}

function getTempoRouteDescriptors(snapshot, primaryAction) {
  if (!snapshot?.hasGame || !snapshot.player || !snapshot.location || snapshot.scene === 'combat') {
    return [];
  }

  const isTown = Boolean(snapshot.location.isTown);
  const paceMode = getPaceModeMeta().id;
  const player = snapshot.player;
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  const mpRatio = player.maxMp > 0 ? player.mp / player.maxMp : 1;
  const availableQuest = snapshot.questBoard?.available.flatMap(group => group.quests)[0] ?? null;
  const activeQuest = snapshot.questBoard?.active.flatMap(group => group.quests)[0] ?? null;
  const completableQuest = snapshot.questBoard?.completable[0] ?? null;
  const recommendedDestination = getRecommendedTravelDestination(snapshot);
  const hasRewardFeed = snapshot.feed?.some(entry => getFeedEntryCategoryId(entry) === 'reward');
  const routes = [];

  if (isTown) {
    const travelRoute = recommendedDestination
      ? {
          tone: 'success',
          eyebrow: 'Push Route',
          title: `${recommendedDestination.name} 전선 확인`,
          body: '추천 이동지와 첫 클리어 보상만 빠르게 읽고 바로 다음 루프로 넘어갈 수 있습니다.',
          badge: '진행 유지',
          target: {
            workspace: 'travel'
          },
          eta: '3-5분'
        }
      : null;
    const storyRoute = availableQuest || activeQuest || completableQuest
      ? {
          tone: 'info',
          eyebrow: 'Story Route',
          title: '게시판에서 방향만 재정리',
          body: completableQuest
            ? '보상 대기와 다음 에피소드 연결만 확인하고 바로 다시 나갈 수 있습니다.'
            : '지금 어떤 에피소드 흐름을 탈지 브리핑만 짧게 재정리합니다.',
          badge: '브리핑',
          target: {
            workspace: 'quests'
          },
          eta: completableQuest ? '2-4분' : '3-5분'
        }
      : null;
    const marketRoute = {
      tone: 'info',
      eyebrow: 'Cool Down',
      title: '상점에서 한 번 다듬기',
      body: '소모품과 장비만 가볍게 정리하고 다시 전선으로 복귀하는 짧은 준비 루프입니다.',
      badge: '정비',
      target: {
        workspace: 'market'
      },
      eta: '3-6분'
    };
    const restRoute = {
      tone: 'success',
      eyebrow: 'Reset',
      title: '여관에서 템포 리셋',
      body: '리소스를 완전히 복구하고 다음 전투 구간을 더 안정적으로 여는 선택입니다.',
      badge: '회복',
      target: {
        action: 'inn-rest'
      },
      eta: '2-3분'
    };
    const lowPressureRoute = {
      tone: 'info',
      eyebrow: 'Low Pressure',
      title: '마을 탐색으로 가볍게 한 판',
      body: '짧은 이벤트를 통해 분위기를 환기하고 부담 없이 한 턴 더 굴립니다.',
      badge: '가벼운 루프',
      target: {
        action: 'town-explore'
      },
      eta: '3-5분'
    };

    if (paceMode === 'push') {
      routes.push(travelRoute, marketRoute, storyRoute, lowPressureRoute, restRoute);
    } else if (paceMode === 'story') {
      routes.push(storyRoute, travelRoute, lowPressureRoute, marketRoute, restRoute);
    } else {
      routes.push(restRoute, marketRoute, storyRoute, lowPressureRoute, travelRoute);
    }
  } else {
    const restRoute = (hpRatio <= 0.7 || mpRatio <= 0.5)
      ? {
          tone: hpRatio <= 0.4 || mpRatio <= 0.25 ? 'warning' : 'success',
          eyebrow: 'Reset',
          title: '짧은 휴식으로 리듬 회복',
          body: `HP ${formatNumber(player.hp)} / MP ${formatNumber(player.mp)} 상태라면 한 템포 쉬고 다시 미는 편이 안정적입니다.`,
          badge: hpRatio <= 0.4 || mpRatio <= 0.25 ? '안정화' : '숨 고르기',
          target: {
            action: 'dungeon-rest'
          },
          eta: '2-3분'
        }
      : null;
    const bossRoute = snapshot.location.bossProgress
      ? {
          tone: 'warning',
          eyebrow: 'Pressure Check',
          title: `${snapshot.location.bossProgress.bossName} 접근도 점검`,
          body: snapshot.location.bossProgress.ready
            ? '보스 구역이 열렸습니다. 진입 전에 이동 탭에서 보상과 준비 상태를 다시 읽을 수 있습니다.'
            : `${formatNumber(snapshot.location.bossProgress.remaining)}칸만 더 전진하면 보스 구역입니다. 전황을 짧게 재확인합니다.`,
          badge: '전선 확인',
          target: {
            workspace: 'travel'
          },
          eta: snapshot.location.bossProgress.ready ? '4-6분' : '3-5분'
        }
      : null;
    const questRoute = (activeQuest || completableQuest)
      ? {
          tone: 'info',
          eyebrow: 'Story Route',
          title: '퀘스트 브리핑 다시 보기',
          body: completableQuest
            ? '보상 정산 시점인지, 다음 에피소드가 이어지는지 바로 확인합니다.'
            : '현재 목표와 직접 전달 대사를 다시 보고 의미 있는 다음 한 판을 고릅니다.',
          badge: '브리핑',
          target: {
            workspace: 'quests'
          },
          eta: completableQuest ? '2-4분' : '3-5분'
        }
      : null;
    const rewardRoute = hasRewardFeed
      ? {
          tone: 'success',
          eyebrow: 'Reward Loop',
          title: '최근 보상만 빠르게 훑기',
          body: '방금 얻은 전리품과 성장 보상을 보고 다음 전투 동기를 다시 붙입니다.',
          badge: '기분 전환',
          target: {
            clientAction: 'focus-feed',
            feedCategory: 'reward'
          },
          eta: '1-2분'
        }
      : null;

    if (paceMode === 'push') {
      routes.push(bossRoute, questRoute, rewardRoute, restRoute);
    } else if (paceMode === 'story') {
      routes.push(questRoute, rewardRoute, bossRoute, restRoute);
    } else {
      routes.push(restRoute, questRoute, bossRoute, rewardRoute);
    }
  }

  const seen = new Set();
  const primaryKey = getInteractionTargetKey(primaryAction?.target);
  if (primaryKey) {
    seen.add(primaryKey);
  }

  return routes.filter(route => {
    if (!route) {
      return false;
    }

    const key = getInteractionTargetKey(route.target);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).slice(0, 2);
}

function formatQuestRewardSummary(quest) {
  if (!quest?.rewards) {
    return '예정된 퀘스트 보상이 없습니다.';
  }

  const rewardItems = Array.isArray(quest.rewards.items) ? quest.rewards.items : [];
  const parts = [
    `EXP +${formatNumber(quest.rewards.exp ?? 0)}`,
    `Gold +${formatNumber(quest.rewards.gold ?? 0)}`
  ];
  if (rewardItems.length > 0) {
    const preview = rewardItems.slice(0, 2).join(', ');
    parts.push(rewardItems.length > 2 ? `${preview} 외 ${formatNumber(rewardItems.length - 2)}개` : preview);
  }

  return parts.join(' · ');
}

function getRewardHorizonCards(snapshot) {
  if (!snapshot?.hasGame || !snapshot.player || !snapshot.location) {
    return [];
  }

  const player = snapshot.player;
  const completableQuest = snapshot.questBoard?.completable[0] ?? null;
  const activeQuest = snapshot.questBoard?.active.flatMap(group => group.quests)[0] ?? null;
  const recommendedDestination = getRecommendedTravelDestination(snapshot);
  const trackedAchievement = getActiveTrackedAchievement(snapshot);

  const cards = [
    {
      id: 'level-up',
      eyebrow: 'Level Horizon',
      title: `Lv ${formatNumber(player.level + 1)}까지 ${formatNumber(player.experienceRemaining)} EXP`,
      body: `현재 진행 ${formatNumber(player.experience)} / ${formatNumber(player.experienceToNextLevel)} · 레벨업 시 스킬 포인트 +1`,
      badge: `${formatNumber(player.experienceProgressPercent)}%`,
      progress: player.experienceProgressPercent
    }
  ];

  if (trackedAchievement?.entry) {
    const focus = getAchievementFocusDescriptor(trackedAchievement.entry, snapshot);
    cards.push({
      id: 'achievement-chase-reward',
      eyebrow: 'Achievement Chase',
      title: trackedAchievement.entry.title,
      body: `현재 추적 목표 · ${focus.hint}`,
      badge: getAchievementCardProgressLabel(trackedAchievement.entry),
      progress: trackedAchievement.entry.progressPercent,
      target: {
        uiAction: 'focus-achievement-target',
        uiValue: trackedAchievement.entry.id
      }
    });
  }

  if (completableQuest) {
    cards.push({
      id: 'quest-payoff',
      eyebrow: 'Quest Payoff',
      title: `${completableQuest.name ?? '완료한 퀘스트'} 보상 수령 가능`,
      body: formatQuestRewardSummary(completableQuest),
      badge: '즉시 회수',
      target: {
        workspace: 'quests'
      }
    });
  } else if (activeQuest) {
    cards.push({
      id: 'quest-payoff',
      eyebrow: 'Quest Payoff',
      title: `${activeQuest.name ?? '진행 중 퀘스트'} 다음 보상`,
      body: formatQuestRewardSummary(activeQuest),
      badge: activeQuest.estimatedTimeLabel,
      target: {
        workspace: 'quests'
      }
    });
  }

  if (recommendedDestination) {
    cards.push({
      id: 'frontier-payoff',
      eyebrow: 'Frontier Reward',
      title: `${recommendedDestination.name} 첫 클리어 보상`,
      body: recommendedDestination.firstClearRewardPreview ?? '추가 첫 클리어 보상이 없습니다.',
      badge: recommendedDestination.recommended ? '추천 루트' : '다음 전선',
      target: {
        action: 'travel',
        destinationId: recommendedDestination.id
      }
    });
  }

  return cards;
}

function classifyAchievementEntry(entry) {
  if (!entry || entry.tone !== 'success') {
    return null;
  }

  const text = entry.text;
  if (text.startsWith('업적 해금:')) {
    return {
      eyebrow: 'Achievement',
      title: text.replace('업적 해금: ', ''),
      copy: '해금 기록이 현재 세이브에 영구 반영됐습니다.',
      accent: 'unlock'
    };
  }
  if (text.startsWith('레벨 업:')) {
    return {
      eyebrow: 'Level Up',
      title: text.replace('레벨 업: ', ''),
      copy: '능력치와 스킬 포인트가 갱신됐습니다.',
      accent: 'level'
    };
  }
  if (text.startsWith('Act ') && text.includes('클리어')) {
    return {
      eyebrow: 'Act Clear',
      title: text,
      copy: '다음 전선과 보너스가 열렸습니다.',
      accent: 'act'
    };
  }
  if (text.startsWith('보스 ') && text.includes('격파')) {
    return {
      eyebrow: 'Boss Down',
      title: text,
      copy: '전선의 큰 고비를 넘겼습니다.',
      accent: 'boss'
    };
  }
  if (text.includes('첫 클리어')) {
    return {
      eyebrow: 'First Clear',
      title: text,
      copy: '첫 정복 보상이 런에 반영됐습니다.',
      accent: 'clear'
    };
  }
  if (text.startsWith('신규 지역 해금')) {
    return {
      eyebrow: 'Frontier Open',
      title: text,
      copy: '새 이동 경로와 다음 장면이 열렸습니다.',
      accent: 'unlock'
    };
  }
  if (text.startsWith('보상: EXP')) {
    return {
      eyebrow: 'Quest Reward',
      title: '퀘스트 보상 회수',
      copy: text,
      accent: 'reward'
    };
  }
  if (text.startsWith('전리품:')) {
    return {
      eyebrow: 'Loot',
      title: '전리품 확보',
      copy: text,
      accent: 'loot'
    };
  }
  if (entry.category === 'quest') {
    return {
      eyebrow: 'Quest Milestone',
      title: text,
      copy: '에피소드 흐름이 다음 단계로 넘어갔습니다.',
      accent: 'quest'
    };
  }

  return null;
}

function getAchievementHighlights(snapshot) {
  const highlights = [];
  const seenTitles = new Set();

  for (const entry of snapshot.feed ?? []) {
    const detail = classifyAchievementEntry(entry);
    if (!detail) {
      continue;
    }

    const key = `${detail.accent}:${detail.title}`;
    if (seenTitles.has(key)) {
      continue;
    }
    seenTitles.add(key);

    highlights.push({
      ...detail,
      id: entry.id,
      entry,
      target: entry.category === 'quest'
        ? { workspace: 'quests' }
        : {
            clientAction: 'focus-feed',
            feedCategory: entry.category
          }
    });

    if (highlights.length >= 3) {
      break;
    }
  }

  return highlights;
}

function getNextAchievementCard(snapshot) {
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  const nextAchievement = trackedAchievement?.entry ?? [...(snapshot.achievements?.entries ?? [])]
    .sort(compareAchievementsByFocus)
    .find(entry => !entry.unlocked);

  if (!nextAchievement) {
    return null;
  }

  const focus = getAchievementFocusDescriptor(nextAchievement, snapshot);
  const isTrackedAchievement = trackedAchievement?.entry?.id === nextAchievement.id;
  const progressLabel = getAchievementCardProgressLabel(nextAchievement);

  return {
    id: 'achievement-progress',
    eyebrow: isTrackedAchievement ? 'Achievement Chase' : 'Next Unlock',
    title: nextAchievement.title,
    body: isTrackedAchievement
      ? `현재 추적 목표 · ${focus.hint}`
      : `${getAchievementCategoryLabel(nextAchievement.category)} · ${focus.hint}`,
    badge: progressLabel,
    progress: nextAchievement.progressPercent,
    target: {
      uiAction: 'focus-achievement-target',
      uiValue: nextAchievement.id
    }
  };
}

function getMomentumCards(snapshot) {
  if (!snapshot?.hasGame || !snapshot.location || !snapshot.questBoard) {
    return [];
  }

  const availableCount = snapshot.questBoard.available.reduce((sum, group) => sum + group.quests.length, 0);
  const activeCount = snapshot.questBoard.active.reduce((sum, group) => sum + group.quests.length, 0);
  const completableCount = snapshot.questBoard.completable.length;
  const totalQuestCount = snapshot.questBoard.completedCount + availableCount + activeCount + completableCount;
  const campaignPercent = totalQuestCount > 0
    ? Math.round((snapshot.questBoard.completedCount / totalQuestCount) * 100)
    : 0;

  const cards = [
    {
      id: 'campaign-progress',
      eyebrow: 'Campaign',
      title: `${formatNumber(snapshot.questBoard.completedCount)} / ${formatNumber(totalQuestCount)} 퀘스트 완료`,
      body: '메인 스토리와 서브 에피소드 전체 진척도입니다.',
      badge: `${formatNumber(campaignPercent)}%`,
      progress: campaignPercent,
      target: {
        workspace: 'quests'
      }
    }
  ];

  if (snapshot.tracker) {
    cards.push({
      id: 'quest-progress',
      eyebrow: 'Tracked Quest',
      title: snapshot.tracker.questName,
      body: snapshot.tracker.objectiveDescription,
      badge: snapshot.tracker.status === 'ready'
        ? '턴인 가능'
        : `${formatNumber(snapshot.tracker.currentAmount)} / ${formatNumber(snapshot.tracker.requiredAmount)}`,
      progress: snapshot.tracker.progressPercent,
      target: {
        workspace: 'quests'
      }
    });
  }

  if (snapshot.location.bossProgress) {
    const bossProgress = snapshot.location.bossProgress;
    cards.push({
      id: 'boss-progress',
      eyebrow: 'Boss Route',
      title: `${bossProgress.bossName} 접근도`,
      body: bossProgress.ready
        ? '보스 조우 준비 완료. 한 번 더 전진하면 결전이 열립니다.'
        : `${formatNumber(bossProgress.remaining)}칸만 더 전진하면 보스 구역에 닿습니다.`,
      badge: bossProgress.ready
        ? '조우 가능'
        : `${formatNumber(bossProgress.current)} / ${formatNumber(bossProgress.target)}`,
      progress: bossProgress.target > 0
        ? Math.round((bossProgress.current / bossProgress.target) * 100)
        : 0,
      target: {
        action: 'dungeon-explore'
      }
    });
  }

  const nextAchievementCard = getNextAchievementCard(snapshot);
  if (nextAchievementCard) {
    cards.push(nextAchievementCard);
  }

  return cards;
}

function getQuestDeckState(snapshot) {
  if (!snapshot.questBoard) {
    return { lanes: [], activeLane: null, activeEntry: null };
  }

  const lanes = [
    {
      id: 'available',
      label: '수락 가능',
      description: '지금 새로 열린 메인 스토리와 짧은 계약입니다.',
      count: snapshot.questBoard.available.reduce((sum, group) => sum + group.quests.length, 0),
      entries: snapshot.questBoard.available.flatMap(group =>
        group.quests.map(quest => ({
          quest,
          groupLabel: group.label,
          groupIcon: group.icon,
          queueLabel: '새로운 에피소드'
        }))
      )
    },
    {
      id: 'active',
      label: '진행 중',
      description: '현재 런의 흐름을 결정하는 활성 에피소드입니다.',
      count: snapshot.questBoard.active.reduce((sum, group) => sum + group.quests.length, 0),
      entries: snapshot.questBoard.active.flatMap(group =>
        group.quests.map(quest => ({
          quest,
          groupLabel: group.label,
          groupIcon: group.icon,
          queueLabel: '현재 추적 중'
        }))
      )
    },
    {
      id: 'completable',
      label: '보상 대기',
      description: '허브에서 마무리하고 보상을 수령할 수 있는 퀘스트입니다.',
      count: snapshot.questBoard.completable.length,
      entries: snapshot.questBoard.completable.map(quest => ({
        quest,
        groupLabel: quest.categoryLabel,
        groupIcon: quest.categoryIcon,
        queueLabel: '턴인 가능'
      }))
    }
  ];

  const activeLane = lanes.find(lane => lane.id === uiState.questLane) ?? lanes[0] ?? null;
  if (!activeLane) {
    return { lanes, activeLane: null, activeEntry: null };
  }

  uiState.questLane = activeLane.id;
  uiState.questIndex = clampIndex(uiState.questIndex, activeLane.entries.length);

  return {
    lanes,
    activeLane,
    activeEntry: activeLane.entries[uiState.questIndex] ?? null
  };
}

function getTravelDeckState(snapshot) {
  const destinations = snapshot.travel?.destinations ?? [];
  uiState.travelIndex = clampIndex(uiState.travelIndex, destinations.length);

  return {
    total: destinations.length,
    destinations,
    activeDestination: destinations[uiState.travelIndex] ?? null
  };
}

function getMarketDeckState(snapshot) {
  const shops = snapshot.shops ?? [];
  const activeShop = shops.find(shop => shop.id === uiState.marketShopId) ?? shops[0] ?? null;
  if (!activeShop) {
    return { shops: [], activeShop: null, activeItem: null };
  }

  uiState.marketShopId = activeShop.id;
  uiState.marketIndex = clampIndex(uiState.marketIndex, activeShop.inventory.length);

  return {
    shops,
    activeShop,
    activeItem: activeShop.inventory[uiState.marketIndex] ?? null
  };
}

function getInventoryDeckState(snapshot) {
  const items = snapshot.inventory ?? [];
  uiState.inventoryIndex = clampIndex(uiState.inventoryIndex, items.length);

  return {
    total: items.length,
    items,
    activeItem: items[uiState.inventoryIndex] ?? null
  };
}

function getFeedDeckState(snapshot) {
  const allEntries = snapshot.feed ?? [];
  const categoryMap = new Map();

  for (const entry of allEntries) {
    const categoryId = getFeedEntryCategoryId(entry);
    const existingCategory = categoryMap.get(categoryId);
    if (existingCategory) {
      existingCategory.count += 1;
      continue;
    }

    categoryMap.set(categoryId, {
      id: categoryId,
      label: getFeedCategoryLabel(categoryId),
      count: 1
    });
  }

  const categoryFilters = [
    {
      id: FEED_CATEGORY_ALL,
      label: '전체 장면',
      count: allEntries.length
    },
    ...Array.from(categoryMap.values())
  ];

  const activeCategoryFilter =
    categoryFilters.find(filter => filter.id === uiState.feedCategoryId) ??
    categoryFilters[0] ?? {
      id: FEED_CATEGORY_ALL,
      label: '전체 장면',
      count: 0
    };
  uiState.feedCategoryId = activeCategoryFilter.id;

  const categoryEntries = activeCategoryFilter.id === FEED_CATEGORY_ALL
    ? allEntries
    : allEntries.filter(entry => getFeedEntryCategoryId(entry) === activeCategoryFilter.id);

  const speakerMap = new Map();

  for (const entry of categoryEntries) {
    const id = getFeedEntryFilterId(entry);
    const existing = speakerMap.get(id);
    if (existing) {
      existing.count += 1;
      continue;
    }

    speakerMap.set(id, {
      id,
      label: getFeedEntrySpeakerLabel(entry),
      count: 1
    });
  }

  const speakerFilters = [
    {
      id: FEED_FILTER_ALL,
      label: '전체 발화자',
      count: categoryEntries.length
    },
    ...Array.from(speakerMap.values())
  ];

  const activeSpeakerFilter =
    speakerFilters.find(filter => filter.id === uiState.feedFilterId) ??
    speakerFilters[0] ?? {
    id: FEED_FILTER_ALL,
    label: '전체 발화자',
    count: 0
  };
  uiState.feedFilterId = activeSpeakerFilter.id;

  const entries = activeSpeakerFilter.id === FEED_FILTER_ALL
    ? categoryEntries
    : categoryEntries.filter(entry => getFeedEntryFilterId(entry) === activeSpeakerFilter.id);

  uiState.feedIndex = clampIndex(uiState.feedIndex, entries.length);

  return {
    categoryFilters,
    activeCategoryFilter,
    speakerFilters,
    activeSpeakerFilter,
    total: entries.length,
    entries,
    activeEntry: entries[uiState.feedIndex] ?? null
  };
}

function renderDeckSummaryCard(title, subtitle, facts) {
  return `
    <article class="info-card deck-summary-card">
      <p class="eyebrow">Deck Context</p>
      <h3 class="panel-title">${escapeHtml(title)}</h3>
      <p class="detail-copy">${escapeHtml(subtitle)}</p>
      <div class="deck-fact-list">
        ${facts.map(fact => `
          <div class="deck-fact">
            <span>${escapeHtml(fact.label)}</span>
            <strong>${escapeHtml(fact.value)}</strong>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderSaveCue(eyebrow, title, copy, className = 'slot-resume') {
  if (!title && !copy) {
    return '';
  }

  return `
    <div class="${escapeHtml(className)}">
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      ${title ? `<strong class="slot-resume-title">${escapeHtml(title)}</strong>` : ''}
      ${copy ? `<p class="slot-resume-copy">${escapeHtml(copy)}</p>` : ''}
    </div>
  `;
}

function parseAchievementProgress(progressLabel) {
  if (typeof progressLabel !== 'string') {
    return null;
  }

  const match = progressLabel.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/u);
  if (!match) {
    return null;
  }

  const current = Number.parseInt(match[1], 10);
  const target = Number.parseInt(match[2], 10);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return null;
  }

  return {
    current,
    target,
    ratio: current / target,
    remaining: Math.max(0, target - current)
  };
}

function getSaveSlotTrackedAchievementTitle(slot) {
  return slot?.trackedAchievementTitle ?? slot?.nextAchievementTitle ?? null;
}

function getSaveSlotTrackedAchievementProgress(slot) {
  return slot?.trackedAchievementProgress ?? slot?.nextAchievementProgress ?? null;
}

function getSaveSlotTrackedAchievementHint(slot) {
  return slot?.trackedAchievementHint ?? slot?.nextAchievementHint ?? null;
}

function getSaveSlotTrackingModeLabel(slot) {
  if (slot?.achievementTrackingMode === 'pinned') {
    return '핀 고정';
  }

  if (slot?.achievementTrackingMode === 'auto') {
    return '자동 전환';
  }

  return null;
}

function getLatestSaveSlot(snapshot) {
  return (snapshot.saves ?? [])
    .filter(slot => slot.exists && typeof slot.savedAt === 'number')
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0] ?? null;
}

function getTrackedAchievementSlot(snapshot) {
  return (snapshot.saves ?? [])
    .filter(slot => slot.exists && getSaveSlotTrackedAchievementTitle(slot))
    .sort((left, right) => {
      const leftPinned = left.achievementTrackingMode === 'pinned' ? 1 : 0;
      const rightPinned = right.achievementTrackingMode === 'pinned' ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }

      const leftProgress = parseAchievementProgress(getSaveSlotTrackedAchievementProgress(left));
      const rightProgress = parseAchievementProgress(getSaveSlotTrackedAchievementProgress(right));
      const leftRatio = leftProgress?.ratio ?? -1;
      const rightRatio = rightProgress?.ratio ?? -1;
      if (leftRatio !== rightRatio) {
        return rightRatio - leftRatio;
      }

      const leftRemaining = leftProgress?.remaining ?? Number.MAX_SAFE_INTEGER;
      const rightRemaining = rightProgress?.remaining ?? Number.MAX_SAFE_INTEGER;
      if (leftRemaining !== rightRemaining) {
        return leftRemaining - rightRemaining;
      }

      const leftCount = left.achievementCount ?? 0;
      const rightCount = right.achievementCount ?? 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return (right.savedAt ?? 0) - (left.savedAt ?? 0);
    })[0] ?? null;
}

function renderLanding(snapshot) {
  const progressedSlots = (snapshot.saves ?? [])
    .filter(slot => slot.exists && typeof slot.achievementTotal === 'number');
  const bestAchievementSlot = progressedSlots
    .sort((a, b) => (b.achievementCount ?? 0) - (a.achievementCount ?? 0))[0] ?? null;
  const trackedAchievementSlot = getTrackedAchievementSlot(snapshot);
  const latestSaveSlot = getLatestSaveSlot(snapshot);
  const achievementRecordActionSlot = trackedAchievementSlot ?? bestAchievementSlot;
  const saveSlots = snapshot.saves?.length
    ? snapshot.saves.map(slot => renderSaveSlot(slot, {
      canSave: false,
      compact: false,
      landing: true,
      latestSlotNumber: latestSaveSlot?.slotNumber ?? null,
      trackedSlotNumber: trackedAchievementSlot?.slotNumber ?? null
    })).join('')
    : renderEmptyCopy('세이브 슬롯 정보를 불러오지 못했습니다.');
  const continueNextAchievementCue = latestSaveSlot
    ? renderSaveCue(
        'Next Unlock',
        latestSaveSlot.nextAchievementTitle
          ? `${latestSaveSlot.nextAchievementTitle}${latestSaveSlot.nextAchievementProgress ? ` · ${latestSaveSlot.nextAchievementProgress}` : ''}`
          : '',
        latestSaveSlot.nextAchievementHint ?? '',
        'slot-resume continue-run-cue'
      )
    : '';
  const continueRunLoadAttributes = renderAchievementChaseLoadAttributes(
    latestSaveSlot,
    latestSaveSlot?.slotNumber === trackedAchievementSlot?.slotNumber
  );
  const continueRunTrackingBadge = trackedAchievementSlot
    ? latestSaveSlot?.slotNumber === trackedAchievementSlot.slotNumber
      ? renderBadge(
          getSaveSlotTrackingModeLabel(trackedAchievementSlot)
            ? `${getSaveSlotTrackingModeLabel(trackedAchievementSlot)} 추적`
            : '업적 추적',
          'recommended'
        )
      : renderBadge(`추적 슬롯 ${formatNumber(trackedAchievementSlot.slotNumber)}`, 'warning')
    : '';
  const continueTrackedShortcut = latestSaveSlot && trackedAchievementSlot && trackedAchievementSlot.slotNumber !== latestSaveSlot.slotNumber
    ? `
      ${renderSaveCue(
        'Achievement Chase',
        `Slot ${formatNumber(trackedAchievementSlot.slotNumber)} · ${getSaveSlotTrackingModeLabel(trackedAchievementSlot) ? `${getSaveSlotTrackingModeLabel(trackedAchievementSlot)} · ` : ''}${getSaveSlotTrackedAchievementTitle(trackedAchievementSlot)}${getSaveSlotTrackedAchievementProgress(trackedAchievementSlot) ? ` ${getSaveSlotTrackedAchievementProgress(trackedAchievementSlot)}` : ''}`,
        getSaveSlotTrackedAchievementHint(trackedAchievementSlot) ?? '',
        'slot-resume continue-run-cue'
      )}
      <button
        class="ghost-button"
        type="button"
        data-action="load-game"
        ${renderAchievementChaseLoadAttributes(trackedAchievementSlot, true)}
        data-slot-number="${escapeHtml(trackedAchievementSlot.slotNumber)}"
      >
        업적 추적 슬롯 이어하기
      </button>
    `
    : '';
  const trackedAchievementSummary = trackedAchievementSlot
    ? `추적 대상 Slot ${formatNumber(trackedAchievementSlot.slotNumber)} · ${getSaveSlotTrackingModeLabel(trackedAchievementSlot) ? `${getSaveSlotTrackingModeLabel(trackedAchievementSlot)} · ` : ''}${getSaveSlotTrackedAchievementTitle(trackedAchievementSlot)}${getSaveSlotTrackedAchievementProgress(trackedAchievementSlot) ? ` ${getSaveSlotTrackedAchievementProgress(trackedAchievementSlot)}` : ''}`
    : bestAchievementSlot
      ? `최고 진행도 Slot ${formatNumber(bestAchievementSlot.slotNumber)} · ${formatNumber(bestAchievementSlot.achievementCount ?? 0)} / ${formatNumber(bestAchievementSlot.achievementTotal ?? 0)}`
      : '아직 기록된 업적 세이브가 없습니다.';
  const achievementRecordDetail = trackedAchievementSlot && bestAchievementSlot && bestAchievementSlot.slotNumber !== trackedAchievementSlot.slotNumber
    ? `최고 해금 Slot ${formatNumber(bestAchievementSlot.slotNumber)} · ${formatNumber(bestAchievementSlot.achievementCount ?? 0)} / ${formatNumber(bestAchievementSlot.achievementTotal ?? 0)}`
    : getSaveSlotTrackedAchievementHint(trackedAchievementSlot) ?? '';
  const achievementRecordAction = achievementRecordActionSlot
    ? `
      <div class="slot-actions">
        <button
          class="ghost-button"
          type="button"
          data-action="load-game"
          ${renderAchievementChaseLoadAttributes(achievementRecordActionSlot, Boolean(trackedAchievementSlot))}
          data-slot-number="${escapeHtml(achievementRecordActionSlot.slotNumber)}"
        >
          ${trackedAchievementSlot ? '업적 추적 이어하기' : '기록 슬롯 이어하기'}
        </button>
      </div>
    `
    : '';
  const continueRunCard = latestSaveSlot
    ? `
      <article class="continue-run-card">
        <div class="continue-run-head">
          <div>
            <p class="eyebrow">Continue Run</p>
            <h3 class="panel-title">최근 기록 바로 이어하기</h3>
            <p class="detail-copy">
              Slot ${formatNumber(latestSaveSlot.slotNumber)} · ${escapeHtml(latestSaveSlot.playerName ?? 'Unknown')} · Lv ${formatNumber(latestSaveSlot.playerLevel ?? 0)}
            </p>
          </div>
          <div class="badge-row">
            ${continueRunTrackingBadge}
            ${renderBadge(formatDate(latestSaveSlot.savedAt), 'success')}
            ${typeof latestSaveSlot.achievementTotal === 'number'
              ? renderBadge(
                  `업적 ${formatNumber(latestSaveSlot.achievementCount ?? 0)} / ${formatNumber(latestSaveSlot.achievementTotal)}`,
                  'recommended'
                )
              : ''}
          </div>
        </div>
        <div class="continue-run-route">
          <strong>${escapeHtml(latestSaveSlot.resumeTitle ?? latestSaveSlot.locationName ?? '이어하기')}</strong>
          <p>${escapeHtml(latestSaveSlot.resumeHint ?? `${latestSaveSlot.locationName ?? '현재 위치'}에서 여정을 이어갑니다.`)}</p>
        </div>
        ${continueNextAchievementCue}
        <div class="slot-actions">
          <button
            class="primary-button"
            type="button"
            data-action="load-game"
            ${continueRunLoadAttributes}
            data-slot-number="${escapeHtml(latestSaveSlot.slotNumber)}"
          >
            최근 기록 이어하기
          </button>
          ${continueTrackedShortcut}
        </div>
      </article>
    `
    : '';

  return `
    <div class="landing-shell">
      <section class="panel hero-panel landing-hero">
        <p class="eyebrow">Playable Browser Frontend</p>
        <h2 class="panel-title">30시간 캠페인을 위한 플레이 데크</h2>
        <p class="panel-subtitle">
          페이지를 내리지 않고도 루프를 이어갈 수 있도록, 퀘스트와 이동과 전투를 하나의 작업공간으로 압축했습니다.
        </p>
        ${continueRunCard}
        <div class="feature-grid">
          <article class="info-card">
            <strong class="quest-title">원스크린 운영</strong>
            <p class="detail-copy">좌측 HUD와 우측 작업공간만으로 게임 루프를 끊지 않습니다.</p>
          </article>
          <article class="info-card">
            <strong class="quest-title">퀘스트 집중</strong>
            <p class="detail-copy">의도, 소요 시간, 보상 상태를 탭 전환만으로 읽습니다.</p>
          </article>
          <article class="info-card">
            <strong class="quest-title">전투 고정 화면</strong>
            <p class="detail-copy">전투가 시작되면 같은 뷰포트 안에서 즉시 전투 작업공간으로 전환됩니다.</p>
          </article>
          <article class="info-card">
            <strong class="quest-title">업적 기록</strong>
            <p class="detail-copy">${escapeHtml(trackedAchievementSummary)}</p>
            ${achievementRecordDetail ? `<p class="detail-copy">${escapeHtml(achievementRecordDetail)}</p>` : ''}
            ${achievementRecordAction}
          </article>
        </div>
      </section>

      <div class="landing-stack">
        <section class="panel landing-form panel-scroll">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Start A Run</p>
              <h2 class="panel-title">신규 작전 개시</h2>
              <p class="panel-subtitle">이름, 클래스, 위험도만 고르면 바로 허브 대시보드로 진입합니다.</p>
            </div>
          </div>
          <form id="new-game-form" class="field-stack">
            <label class="field-stack">
              <span class="meter-label">Operative Name</span>
              <input
                class="text-field"
                type="text"
                name="name"
                maxlength="18"
                value="Operator"
                placeholder="플레이어 이름"
                required
              />
            </label>

            <div class="field-stack">
              <span class="meter-label">Class Vector</span>
              <div class="radio-grid">
                ${CLASS_OPTIONS.map((option, index) => `
                  <div>
                    <input
                      class="option-input"
                      type="radio"
                      id="class-${option.value}"
                      name="characterClass"
                      value="${escapeHtml(option.value)}"
                      ${index === 0 ? 'checked' : ''}
                    />
                    <label class="option-card" for="class-${option.value}">
                      <span class="badge-row">
                        ${renderBadge(`${option.icon} ${option.label}`, 'recommended')}
                      </span>
                      <strong>${escapeHtml(option.summary)}</strong>
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="field-stack">
              <span class="meter-label">Mode Pressure</span>
              <div class="radio-grid">
                ${MODE_OPTIONS.map((option, index) => `
                  <div>
                    <input
                      class="option-input"
                      type="radio"
                      id="mode-${option.value}"
                      name="gameMode"
                      value="${escapeHtml(option.value)}"
                      ${index === 1 ? 'checked' : ''}
                    />
                    <label class="option-card" for="mode-${option.value}">
                      <span class="badge-row">
                        ${renderBadge(option.label, 'recommended')}
                        ${renderBadge(option.risk, option.value === 'hardcore' ? 'warning' : '')}
                      </span>
                      <strong>${escapeHtml(option.summary)}</strong>
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>

            <button class="primary-button" type="submit">브라우저 출격</button>
          </form>
        </section>

        <section class="panel landing-saves">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Load Existing Run</p>
              <h2 class="panel-title">세이브 슬롯</h2>
              <p class="panel-subtitle">${escapeHtml(snapshot.activeSaveDirectory)}</p>
            </div>
          </div>
          <div class="slot-grid panel-scroll">${saveSlots}</div>
        </section>
      </div>
    </div>
  `;
}

function renderOverview(snapshot) {
  const player = snapshot.player;
  const location = snapshot.location;
  if (!player || !location) {
    return '';
  }

  const focus = snapshot.focus
    ? `
      <article class="focus-card" data-tone="${escapeHtml(snapshot.focus.tone)}">
        <p class="eyebrow">Adventure Focus</p>
        <h3 class="panel-title">${escapeHtml(snapshot.focus.title)}</h3>
        <ul class="focus-lines">
          ${snapshot.focus.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
      </article>
    `
    : `
      <article class="focus-card">
        <p class="eyebrow">Adventure Focus</p>
        <h3 class="panel-title">지금은 자유 탐험</h3>
        <p class="detail-copy">활성 퀘스트가 없으면 게시판과 추천 이동 카드가 다음 흐름을 제시합니다.</p>
      </article>
    `;

  const tracker = snapshot.tracker
    ? `
      <article class="focus-card">
        <p class="eyebrow">Quest Tracker</p>
        <h3 class="panel-title">${escapeHtml(snapshot.tracker.questName)}</h3>
        <p class="detail-copy">${escapeHtml(snapshot.tracker.objectiveDescription)}</p>
        <div class="badge-row">
          ${renderBadge(snapshot.tracker.status)}
          ${renderBadge(snapshot.tracker.progress, 'success')}
        </div>
      </article>
    `
    : `
      <article class="focus-card">
        <p class="eyebrow">Quest Tracker</p>
        <h3 class="panel-title">활성 퀘스트 없음</h3>
        <p class="detail-copy">게시판에서 메인 스토리 또는 짧은 계약을 골라 흐름을 시작하세요.</p>
      </article>
    `;

  return `
    <section class="panel hero-panel span-2">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Live Run</p>
          <h2 class="panel-title">${escapeHtml(player.name)} / ${escapeHtml(CLASS_LABELS[player.class] ?? player.class)}</h2>
          <p class="panel-subtitle">
            ${escapeHtml(location.name)} · ${location.isTown ? '허브 운영 구역' : '현장 탐사 구역'}
          </p>
        </div>
        <div class="badge-row">
          ${renderBadge(`Lv ${player.level}`, 'recommended')}
          ${renderBadge(`Gold ${formatNumber(player.gold)}`)}
          ${renderBadge(`Save Token ${formatNumber(player.saveTokenCount)}`)}
          ${location.bossProgress ? renderBadge(location.bossProgress.text, 'warning') : ''}
        </div>
      </div>

      <div class="chip-row">
        <div class="stat-chip">
          <span>현 위치</span>
          <strong>${escapeHtml(location.name)}</strong>
        </div>
        <div class="stat-chip">
          <span>인벤토리</span>
          <strong>${formatNumber(player.inventoryCount)}</strong>
        </div>
        <div class="stat-chip">
          <span>공격/방어</span>
          <strong>${formatNumber(player.attack)} / ${formatNumber(player.defense)}</strong>
        </div>
        <div class="stat-chip">
          <span>속도</span>
          <strong>${formatNumber(player.speed)}</strong>
        </div>
      </div>

      <div class="stat-grid">
        ${renderMeterCard('HP', player.hp, player.maxHp, 'hp')}
        ${renderMeterCard('MP', player.mp, player.maxMp, 'mp')}
        <div class="meter-card">
          <div class="meter-top">
            <span class="meter-label">Skill Points</span>
            <span class="meter-value">${formatNumber(player.skillPoints)}</span>
          </div>
          <div class="metric-cluster">
            <div>
              <span class="numeric">${formatNumber(player.gold)}</span>
              <span class="metric-label">Gold</span>
            </div>
            <div>
              <span class="numeric">${formatNumber(player.saveTokenCount)}</span>
              <span class="metric-label">Save Token</span>
            </div>
          </div>
        </div>
        <div class="meter-card">
          <div class="meter-top">
            <span class="meter-label">First Clear Reward</span>
          </div>
          <p class="detail-copy">
            ${escapeHtml(location.firstClearRewardPreview ?? '이미 수령했거나 해당 없음')}
          </p>
        </div>
      </div>

      <div class="focus-layout">
        ${focus}
        ${tracker}
      </div>
    </section>
  `;
}

function renderActionRail(snapshot) {
  const isTown = Boolean(snapshot.location?.isTown);
  const isCombat = snapshot.scene === 'combat';
  const primaryAction = getPrimaryActionDescriptor(snapshot);
  const sessionWindow = getSessionWindowMeta();
  const primarySessionFit = primaryAction ? getSessionFitMeta(snapshot, primaryAction) : null;
  const tempoRoutes = getTempoRouteDescriptors(snapshot, primaryAction)
    .slice()
    .sort((left, right) => {
      const leftFit = getSessionFitMeta(snapshot, left).fits ? 0 : 1;
      const rightFit = getSessionFitMeta(snapshot, right).fits ? 0 : 1;
      return leftFit - rightFit;
    });
  const sessionPlan = buildSessionPlan(snapshot, primaryAction, tempoRoutes);
  const resumeContextLabel = uiState.resumeRoute?.contextLabel ?? null;

  const actions = isCombat
    ? [
        ['battle-attack', '기본 공격', '턴을 주도하는 표준 선택', '1턴'],
        ['battle-defend', '방어 태세', '다음 피격을 완화', '1턴'],
        ['battle-escape', '이탈 시도', '보스전이 아니면 도주 가능', '1턴']
      ]
    : isTown
      ? [
          ['visit-board', '게시판 브리핑', '메인 스토리와 짧은 계약을 확인', '3-5분'],
          ['visit-market', '상점 거리', '장비와 소모품을 재정비', '3-6분'],
          ['town-explore', '마을 탐색', '짧은 이벤트와 보조 수익 탐색', '3-5분'],
          ['inn-rest', '여관 휴식', 'HP/MP를 완전히 회복', '2-3분']
        ]
      : [
          ['dungeon-explore', '던전 전진', '전투 또는 비전투 이벤트 발생', '4-8분'],
          ['dungeon-rest', '짧은 휴식', '안전 여유가 있으면 HP/MP 일부 회복', '2-3분']
        ];

  return `
    <section class="panel action-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Scene Commands</p>
          <h2 class="panel-title">${isCombat ? '전투 명령' : isTown ? '허브 운영' : '현장 탐사'}</h2>
          <p class="panel-subtitle">
            ${isCombat ? '전투 외 액션은 잠시 잠금됩니다.' : '추천 루프를 빠르게 실행할 수 있습니다.'}
          </p>
        </div>
      </div>
      ${isCombat ? '' : renderPaceModeRail()}
      ${isCombat ? '' : renderSessionWindowRail()}
      ${uiState.resumeRoute ? renderResumeRoute(snapshot) : ''}
      ${sessionPlan ? renderSessionPlan(sessionPlan, resumeContextLabel) : ''}
      ${primaryAction
        ? `
          <button
            class="primary-next-card"
            type="button"
            data-tone="${escapeHtml(primaryAction.tone)}"
            ${buildInteractionAttributes(primaryAction.target)}
          >
            <div class="priority-alert-head">
              <p class="eyebrow">${escapeHtml(resumeContextLabel ? `${primaryAction.eyebrow} · ${resumeContextLabel}` : primaryAction.eyebrow)}</p>
              <div class="action-meta-row">
                <span class="badge ${escapeHtml(primaryAction.tone === 'success' ? 'success' : primaryAction.tone === 'warning' || primaryAction.tone === 'error' ? 'warning' : 'recommended')}">${escapeHtml(primaryAction.badge)}</span>
                <span class="duration-chip">${escapeHtml(primaryAction.eta ?? getEstimatedTimeLabel(snapshot, primaryAction))}</span>
                ${primarySessionFit
                  ? `<span class="session-fit-chip ${escapeHtml(primarySessionFit.tone)}">${escapeHtml(primarySessionFit.label)}</span>`
                  : ''}
              </div>
            </div>
            <strong class="primary-next-title">${escapeHtml(primaryAction.title)}</strong>
            <p class="primary-next-copy">${escapeHtml(primaryAction.body)}</p>
            ${primarySessionFit && !primarySessionFit.fits
              ? `<p class="action-session-note">${escapeHtml(sessionWindow.label)} 세션 기준으로는 아래 대안 루트가 더 가볍습니다.</p>`
              : ''}
            <ol class="primary-next-steps">
              ${(primaryAction.steps ?? []).map(step => `
                <li>${escapeHtml(step)}</li>
              `).join('')}
            </ol>
          </button>
        `
        : ''}
      ${tempoRoutes.length
        ? `
          <div class="tempo-route-stack">
            <div class="tempo-route-header">
              <p class="eyebrow">${escapeHtml(resumeContextLabel ? `Tempo Routes · ${resumeContextLabel}` : 'Tempo Routes')}</p>
              <p class="detail-copy">${escapeHtml(sessionWindow.label)} 세션 안에서 고르기 쉬운 대안 루트를 먼저 보여줍니다.</p>
            </div>
            <div class="tempo-route-grid">
              ${tempoRoutes.map(route => {
                const fit = getSessionFitMeta(snapshot, route);

                return `
                <button
                  class="tempo-route-card"
                  type="button"
                  data-tone="${escapeHtml(route.tone)}"
                  ${buildInteractionAttributes(route.target)}
                >
                  <div class="tempo-route-head">
                    <p class="eyebrow">${escapeHtml(route.eyebrow)}</p>
                    <div class="action-meta-row">
                      <span class="badge ${escapeHtml(route.tone === 'success' ? 'success' : route.tone === 'warning' || route.tone === 'error' ? 'warning' : 'recommended')}">${escapeHtml(route.badge)}</span>
                      <span class="duration-chip">${escapeHtml(route.eta ?? getEstimatedTimeLabel(snapshot, route))}</span>
                      <span class="session-fit-chip ${escapeHtml(fit.tone)}">${escapeHtml(fit.label)}</span>
                    </div>
                  </div>
                  <strong class="tempo-route-title">${escapeHtml(route.title)}</strong>
                  <p class="tempo-route-copy">${escapeHtml(route.body)}</p>
                </button>
              `;
              }).join('')}
            </div>
          </div>
        `
        : ''}
      <div class="action-grid">
        ${actions.map(([action, title, description, eta]) => {
          const sessionFit = getSessionFitMeta(snapshot, {
            target: { action },
            eta
          });

          return `
          <button class="command-card" type="button" data-action="${action}">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(description)}</span>
            <span class="command-meta">예상 소요 ${escapeHtml(eta)} · ${escapeHtml(sessionFit.label)}</span>
          </button>
        `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderResumeRoute(snapshot) {
  if (!uiState.resumeRoute) {
    return '';
  }

  const routeState = getResumeWorkspaceState(snapshot);
  const stepViews = routeState?.stepViews ?? [];
  const currentStep = routeState?.currentStep ?? null;
  const completedCount = routeState?.completedCount ?? 0;

  return `
    <div class="resume-route-card" data-tone="${escapeHtml(uiState.resumeRoute.tone)}">
      <div class="resume-route-head">
        <div>
          <p class="eyebrow">${escapeHtml(uiState.resumeRoute.title)}</p>
          <strong class="resume-route-title">불러오기 직후 길잡이</strong>
          <p class="resume-route-copy">${escapeHtml(uiState.resumeRoute.summary)}</p>
          ${currentStep ? `
            <p class="resume-route-progress">
              현재 단계: ${escapeHtml(currentStep.order)} · 진행 ${escapeHtml(String(completedCount + 1))} / ${escapeHtml(String(stepViews.length))}
            </p>
          ` : ''}
        </div>
        <div class="slot-actions">
          ${uiState.resumeRoute.contextLabel ? renderBadge(uiState.resumeRoute.contextLabel, 'recommended') : ''}
          ${renderBadge('재개 보조', 'recommended')}
          <button class="ghost-button inline-button" type="button" data-client-action="dismiss-resume-route">닫기</button>
        </div>
      </div>
      <div class="resume-route-step-list">
        ${stepViews.map(step => `
          <button
            class="resume-route-step"
            type="button"
            data-tone="${escapeHtml(step.tone)}"
            data-status="${escapeHtml(step.status)}"
            ${buildInteractionAttributes({
              clientAction: 'resume-step-focus',
              resumeStepId: step.id
            })}
          >
            <span class="resume-route-order">${escapeHtml(step.order)}</span>
            <div class="resume-route-body">
              <div class="resume-route-step-head">
                <strong>${escapeHtml(step.title)}</strong>
                <div class="action-meta-row">
                  <span class="resume-route-status-chip ${escapeHtml(step.status)}">
                    ${escapeHtml(step.status === 'complete' ? '완료' : step.status === 'current' ? '현재 단계' : '대기')}
                  </span>
                  <span class="badge ${escapeHtml(step.tone === 'success' ? 'success' : step.tone === 'warning' || step.tone === 'error' ? 'warning' : 'recommended')}">${escapeHtml(step.badge)}</span>
                  ${step.eta ? `<span class="duration-chip">${escapeHtml(step.eta)}</span>` : ''}
                </div>
              </div>
              <p class="resume-route-copy">${escapeHtml(step.body)}</p>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSessionPlan(sessionPlan, contextLabel = null) {
  return `
    <div class="session-plan-card">
      <div class="session-plan-head">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Session Plan · ${contextLabel}` : 'Session Plan')}</p>
          <strong class="session-plan-title">${escapeHtml(sessionPlan.title)}</strong>
          <p class="session-plan-copy">${escapeHtml(sessionPlan.subtitle)}</p>
        </div>
        <div class="session-plan-meta">
          ${contextLabel ? renderBadge(contextLabel, 'recommended') : ''}
          <span class="badge recommended">${escapeHtml(sessionPlan.budgetLabel)}</span>
          <span class="duration-chip">${escapeHtml(sessionPlan.usageLabel)}</span>
        </div>
      </div>
      <div class="session-plan-step-list">
        ${sessionPlan.steps.map(step => `
          <button
            class="session-plan-step ${step.kind === 'stop' ? 'stop' : ''}"
            type="button"
            data-tone="${escapeHtml(step.tone)}"
            ${buildInteractionAttributes(step.target)}
          >
            <span class="session-plan-order">${escapeHtml(step.order)}</span>
            <div class="session-plan-body">
              <div class="session-plan-step-head">
                <strong>${escapeHtml(step.title)}</strong>
                <div class="action-meta-row">
                  <span class="badge ${escapeHtml(step.tone === 'success' ? 'success' : step.tone === 'warning' || step.tone === 'error' ? 'warning' : 'recommended')}">${escapeHtml(step.badge)}</span>
                  <span class="duration-chip">${escapeHtml(step.eta)}</span>
                </div>
              </div>
              <p class="session-plan-copy">${escapeHtml(step.body)}</p>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPaceModeRail() {
  const selected = getPaceModeMeta();

  return `
    <div class="pace-mode-stack">
      <div class="pace-mode-header">
        <p class="eyebrow">Run Stance</p>
        <p class="detail-copy">현재 성향: ${escapeHtml(selected.label)} · ${escapeHtml(selected.summary)}</p>
      </div>
      <div class="pace-mode-row">
        ${PACE_OPTIONS.map(option => `
          <button
            class="pace-mode-chip ${selected.id === option.id ? 'active' : ''}"
            type="button"
            data-pace="${escapeHtml(option.id)}"
            data-ui-action="select-pace-mode"
            data-ui-value="${escapeHtml(option.id)}"
            aria-pressed="${selected.id === option.id ? 'true' : 'false'}"
          >
            <strong>${escapeHtml(option.label)}</strong>
            <span>${escapeHtml(option.summary)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSessionWindowRail() {
  const selected = getSessionWindowMeta();

  return `
    <div class="session-window-stack">
      <div class="session-window-header">
        <p class="eyebrow">Session Window</p>
        <p class="detail-copy">현재 세션: ${escapeHtml(selected.label)} · ${escapeHtml(selected.summary)}</p>
      </div>
      <div class="session-window-row">
        ${SESSION_WINDOW_OPTIONS.map(option => `
          <button
            class="session-window-chip ${selected.id === option.id ? 'active' : ''}"
            type="button"
            data-session-window="${escapeHtml(option.id)}"
            data-ui-action="select-session-window"
            data-ui-value="${escapeHtml(option.id)}"
            aria-pressed="${selected.id === option.id ? 'true' : 'false'}"
          >
            <strong>${escapeHtml(option.label)}</strong>
            <span>${escapeHtml(option.summary)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTravel(snapshot) {
  if (!snapshot.travel) {
    return '';
  }

  const isCombat = snapshot.scene === 'combat';
  const { total, destinations, activeDestination } = getTravelDeckState(snapshot);
  const resumePreview = isResumePreviewWorkspace(snapshot, 'travel');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'travel');
  const achievementTarget = getActiveWorkspaceAchievementTarget(snapshot);
  const cardAchievementTarget = achievementTarget?.focus.workspace === 'travel' &&
    (!achievementTarget.focus.travelDestinationId || achievementTarget.focus.travelDestinationId === activeDestination?.id)
    ? achievementTarget
    : null;

  return `
    <section class="panel deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Travel Matrix</p>
          <h2 class="panel-title">연결 지역</h2>
          <p class="panel-subtitle">추천 목적지와 첫 클리어 보상을 먼저 읽고 이동합니다.</p>
        </div>
      </div>
      <div class="deck-toolbar">
        <p class="deck-description">
          ${escapeHtml(activeDestination?.recommended ? '추천 루트가 우선 선택됩니다.' : '이동 후보를 한 장씩 읽고 판단합니다.')}
        </p>
        ${renderDeckPager({
          index: uiState.travelIndex,
          total,
          prevAction: 'travel-prev',
          nextAction: 'travel-next'
        })}
      </div>
      <div class="deck-layout">
        ${renderDeckSummaryCard(
          snapshot.location?.name ?? '현재 위치',
          total
            ? `${formatNumber(destinations.filter(destination => destination.unlocked).length)}개 이동 가능 · ${formatNumber(destinations.filter(destination => destination.recommended).length)}개 추천`
            : '현재는 다른 지역으로 이어지는 루트가 없습니다.',
          [
            { label: '후보 지역', value: `${formatNumber(total)}곳` },
            {
              label: '첫 보상',
              value: activeDestination?.firstClearRewardPreview ?? '추가 보상 없음'
            },
            {
              label: '상태',
              value: activeDestination
                ? activeDestination.unlocked
                  ? activeDestination.cleared ? '재방문 가능' : '즉시 이동 가능'
                  : '잠금 상태'
                : '대기 중'
            }
          ]
        )}
        <div class="deck-main">
          ${activeDestination
            ? `
              <article class="travel-card deck-card ${activeDestination.recommended ? 'recommended' : ''} ${activeDestination.cleared ? 'cleared' : ''} ${resumeTarget ? 'resume-target-card' : ''} ${resumePreview ? 'preview-target-card' : ''}">
                <div class="badge-row">
                  ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
                  ${cardAchievementTarget ? renderBadge('업적 목표 카드', 'recommended') : ''}
                  ${activeDestination.recommended ? renderBadge('추천 루트', 'recommended') : ''}
                  ${activeDestination.cleared ? renderBadge('클리어', 'success') : ''}
                  ${activeDestination.unlocked ? renderBadge('이동 가능') : renderBadge('잠김', 'warning')}
                  ${activeDestination.act ? renderBadge(`Act ${activeDestination.act}`) : ''}
                </div>
                ${resumePreview ? renderResumePreviewCallout(snapshot, 'travel') : resumeTarget ? renderResumeTargetCallout(snapshot, 'travel') : ''}
                ${cardAchievementTarget
                  ? `<p class="detail-copy achievement-target-note">현재 추적 업적 ${escapeHtml(cardAchievementTarget.label)} 목표 카드입니다. ${escapeHtml(cardAchievementTarget.focus.hint)}</p>`
                  : ''}
                <strong class="travel-title">${escapeHtml(activeDestination.name)}</strong>
                <p class="travel-description">${escapeHtml(activeDestination.description)}</p>
                <div class="travel-meta">
                  <span class="badge">${escapeHtml(activeDestination.firstClearRewardPreview ?? '추가 보상 없음')}</span>
                </div>
                ${resumePreview ? renderPreviewActionNote() : ''}
                <div class="slot-actions">
                  <button
                    class="inline-button"
                    type="button"
                    data-action="travel"
                    data-destination-id="${escapeHtml(activeDestination.id)}"
                    ${resumePreview ? 'data-preview-action="true"' : ''}
                    ${(!activeDestination.unlocked || isCombat) ? 'disabled' : ''}
                  >
                    ${escapeHtml(resumePreview ? getPreviewActionLabel('이동') : '이동')}
                  </button>
                </div>
              </article>
            `
            : renderEmptyCopy('현재 위치에서 바로 이동 가능한 연결 지역이 없습니다.')}
        </div>
      </div>
    </section>
  `;
}

function renderQuestCard(quest, options = {}) {
  const { isTown, isCombat, actionLabel, actionType, highlight, resumeTarget, resumePreview, achievementTarget } = options;
  const categoryLabel = quest.categoryLabel ?? '작전 의뢰';
  const categoryIcon = quest.categoryIcon ?? '임무';
  const estimatedTimeLabel = quest.estimatedTimeLabel ?? '소요 추정 중';
  const sessionLabel = quest.sessionLabel ?? '세션 정보 정리 중';
  const rewardExp = quest.rewards?.exp ?? 0;
  const rewardGold = quest.rewards?.gold ?? 0;
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  return `
    <article class="quest-card ${highlight ? 'completable' : ''} ${resumeTarget ? 'resume-target-card' : ''} ${resumePreview ? 'preview-target-card' : ''}">
      <div class="badge-row">
        ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
        ${achievementTarget ? renderBadge('업적 목표 카드', 'recommended') : ''}
        ${renderBadge(`${categoryIcon} ${categoryLabel}`, 'recommended')}
        ${renderBadge(estimatedTimeLabel)}
        ${renderBadge(sessionLabel)}
        ${quest.narrative?.chapterLabel ? renderBadge(quest.narrative.chapterLabel) : ''}
      </div>
      ${resumePreview ? renderResumePreviewCallout(uiState.snapshot, 'quests') : resumeTarget ? renderResumeTargetCallout(uiState.snapshot, 'quests') : ''}
      ${achievementTarget
        ? `<p class="detail-copy achievement-target-note">현재 추적 업적 ${escapeHtml(achievementTarget.label)} 목표 카드입니다. ${escapeHtml(achievementTarget.focus.hint)}</p>`
        : ''}
      <strong class="quest-title">${escapeHtml(quest.name ?? '이름 없는 의뢰')}</strong>
      <p class="quest-hook">
        <span class="hook-label">브리핑 메모${quest.narrative?.featuredNpc ? ` · ${escapeHtml(quest.narrative.featuredNpc)}` : ''}</span>
        ${escapeHtml(quest.narrative?.hook ?? quest.description ?? '브리핑을 불러오는 중입니다.')}
      </p>
      ${quest.narrative?.npcLine
        ? `
          <p class="quest-dialogue">
            <span class="hook-label">직접 전달${quest.narrative?.featuredNpc ? ` · ${escapeHtml(quest.narrative.featuredNpc)}` : ''}</span>
            "${escapeHtml(quest.narrative.npcLine)}"
          </p>
        `
        : ''}
      <p class="quest-description">${escapeHtml(quest.narrative?.storyBeat ?? quest.description ?? '현장 설명을 동기화하는 중입니다.')}</p>
      <div class="quest-meta">
        <span class="badge">Lv ${formatNumber(quest.requiredLevel ?? 1)}</span>
        ${quest.narrative?.featuredNpc ? renderBadge(quest.narrative.featuredNpc) : ''}
        <span class="badge">EXP ${formatNumber(rewardExp)}</span>
        <span class="badge">Gold ${formatNumber(rewardGold)}</span>
      </div>
      <ul class="quest-objectives">
        ${objectives.length > 0
          ? objectives.map(objective => `
          <li class="objective-line">
            <div class="objective-meta">
              <span>${escapeHtml(objective.description)}</span>
              <span>${formatNumber(objective.currentAmount)} / ${formatNumber(objective.requiredAmount)}</span>
            </div>
            <div class="mini-track">
              <div class="mini-fill" style="width: ${clampPercent(objective.currentAmount, objective.requiredAmount)}%"></div>
            </div>
          </li>
        `).join('')
          : `
            <li class="objective-line">
              <div class="objective-meta">
                <span>진행 목표를 동기화하는 중입니다.</span>
                <span>-</span>
              </div>
            </li>
          `}
      </ul>
      ${actionType ? `
        ${resumePreview ? renderPreviewActionNote() : ''}
        <div class="slot-actions">
          <button
            class="inline-button"
            type="button"
            data-action="${escapeHtml(actionType)}"
            data-quest-id="${escapeHtml(quest.id ?? '')}"
            ${resumePreview ? 'data-preview-action="true"' : ''}
            ${(!isTown || isCombat) ? 'disabled' : ''}
          >
            ${escapeHtml(resumePreview ? getPreviewActionLabel(actionLabel) : actionLabel)}
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderQuestGroups(groups, emptyText, options) {
  if (!groups || groups.length === 0) {
    return renderEmptyCopy(emptyText);
  }

  return groups.map(group => `
    <section class="field-stack">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">${escapeHtml(group.icon)} ${escapeHtml(group.label)}</h3>
          <p class="panel-subtitle">${formatNumber(group.quests.length)}개 의뢰</p>
        </div>
      </div>
      <div class="quest-group-grid">
        ${group.quests.map(quest => renderQuestCard(quest, options)).join('')}
      </div>
    </section>
  `).join('');
}

function renderQuestBoard(snapshot) {
  if (!snapshot.questBoard) {
    return '';
  }

  const isTown = Boolean(snapshot.location?.isTown);
  const isCombat = snapshot.scene === 'combat';
  const { lanes, activeLane, activeEntry } = getQuestDeckState(snapshot);
  const resumePreview = isResumePreviewWorkspace(snapshot, 'quests');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'quests');
  const achievementTarget = getActiveWorkspaceAchievementTarget(snapshot);
  const cardAchievementTarget = achievementTarget?.focus.workspace === 'quests' &&
    (!achievementTarget.focus.questLane || achievementTarget.focus.questLane === activeLane?.id)
    ? achievementTarget
    : null;

  return `
    <section class="panel span-2 deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Episode Board</p>
          <h2 class="panel-title">퀘스트 운용</h2>
          <p class="panel-subtitle">
            ${isTown ? '허브에서 수락/완료가 가능하며, 현장에서는 내용만 점검할 수 있습니다.' : '현재는 현장 상태입니다. 내용 점검만 가능합니다.'}
          </p>
        </div>
        <div class="badge-row">
          ${renderBadge(`완료 ${formatNumber(snapshot.questBoard.completedCount)}`, 'success')}
          ${renderBadge(`진행 ${formatNumber(snapshot.questBoard.active.reduce((sum, group) => sum + group.quests.length, 0))}`)}
          ${renderBadge(`보상 대기 ${formatNumber(snapshot.questBoard.completable.length)}`, snapshot.questBoard.completable.length ? 'recommended' : '')}
        </div>
      </div>

      ${renderSegmentedButtons(
        lanes.map(lane => ({
          ...lane,
          meta: cardAchievementTarget?.focus.questLane === lane.id ? '업적 목표' : null,
          target: cardAchievementTarget?.focus.questLane === lane.id
        })),
        activeLane?.id ?? 'available',
        'select-quest-lane'
      )}

      <div class="deck-toolbar">
        <p class="deck-description">${escapeHtml(activeLane?.description ?? '현재 선택 가능한 퀘스트 라인이 없습니다.')}</p>
        ${renderDeckPager({
          index: uiState.questIndex,
          total: activeLane?.entries.length ?? 0,
          prevAction: 'quest-prev',
          nextAction: 'quest-next'
        })}
      </div>

      <div class="deck-layout">
        ${renderDeckSummaryCard(
          activeLane?.label ?? 'Episode Board',
          activeEntry
            ? `${activeEntry.groupIcon} ${activeEntry.groupLabel} 라인의 ${formatNumber((activeLane?.entries.length ?? 0))}개 중 ${formatNumber(uiState.questIndex + 1)}번째 카드입니다.`
            : '현재 이 라인에는 표시할 퀘스트가 없습니다.',
          [
            { label: '선택 라인', value: activeLane?.label ?? '없음' },
            {
              label: '카드 수',
              value: `${formatNumber(activeLane?.entries.length ?? 0)}개`
            },
            { label: '추적 대상', value: cardAchievementTarget?.label ?? '없음' },
            {
              label: '허브 상호작용',
              value: isTown && !isCombat ? '수락 및 완료 가능' : '내용 확인만 가능'
            }
          ]
        )}
        <div class="deck-main">
          <div class="slot-actions">
            <button class="ghost-button" type="button" data-action="visit-board" ${(!isTown || isCombat) ? 'disabled' : ''}>
              게시판 브리핑 갱신
            </button>
          </div>
          ${activeEntry
            ? renderQuestCard(activeEntry.quest, {
              isTown,
              isCombat,
              actionLabel:
                activeLane?.id === 'available'
                  ? '수락'
                  : activeLane?.id === 'completable'
                    ? '완료 처리'
                    : '',
              actionType:
                activeLane?.id === 'available'
                  ? 'accept-quest'
                  : activeLane?.id === 'completable'
                    ? 'complete-quest'
                    : '',
              highlight: activeLane?.id === 'completable',
              resumeTarget,
              resumePreview,
              achievementTarget: cardAchievementTarget
            })
            : renderEmptyCopy('이 라인에 표시할 퀘스트가 없습니다. 다른 라인을 선택해 보세요.')}
        </div>
      </div>
    </section>
  `;
}

function renderBattle(snapshot) {
  if (!snapshot.battle) {
    return '';
  }

  const battle = snapshot.battle;
  const resumePreview = isResumePreviewWorkspace(snapshot, 'combat');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'combat');
  return `
    <section class="panel span-2 ${resumeTarget ? 'resume-target-panel' : ''} ${resumePreview ? 'preview-target-panel' : ''}">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Combat Theatre</p>
          <h2 class="panel-title">${escapeHtml(battle.monsterIcon)} ${escapeHtml(battle.monsterName)}</h2>
          <p class="panel-subtitle">
            ${battle.isBoss ? '보스전' : '일반 조우'} · Turn ${formatNumber(battle.turnNumber)} · ${battle.playerTurn ? '플레이어 턴' : '적 행동 중'}
          </p>
        </div>
        <div class="badge-row">
          ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
          ${renderBadge(`Lv ${formatNumber(battle.monsterLevel)}`, battle.isBoss ? 'warning' : '')}
          ${renderBadge(`HP ${formatNumber(battle.monsterHp)} / ${formatNumber(battle.monsterMaxHp)}`)}
        </div>
      </div>

      ${resumePreview ? renderResumePreviewCallout(snapshot, 'combat') : resumeTarget ? renderResumeTargetCallout(snapshot, 'combat') : ''}

      ${renderMeterCard('Enemy Integrity', battle.monsterHp, battle.monsterMaxHp, '')}

      <div class="focus-layout">
        <article class="focus-card">
          <p class="eyebrow">Core Commands</p>
          ${resumePreview ? renderPreviewActionNote() : ''}
          <div class="action-grid">
            <button class="command-card" type="button" data-action="battle-attack" ${resumePreview ? 'data-preview-action="true"' : ''} ${!battle.playerTurn ? 'disabled' : ''}>
              <strong>${escapeHtml(resumePreview ? getPreviewActionLabel('기본 공격') : '기본 공격')}</strong>
              <span>안정적인 턴 소모 없이 압박을 유지합니다.</span>
            </button>
            <button class="command-card" type="button" data-action="battle-defend" ${resumePreview ? 'data-preview-action="true"' : ''} ${!battle.playerTurn ? 'disabled' : ''}>
              <strong>${escapeHtml(resumePreview ? getPreviewActionLabel('방어') : '방어')}</strong>
              <span>다음 피격의 충격을 낮춥니다.</span>
            </button>
            <button class="command-card" type="button" data-action="battle-escape" ${resumePreview ? 'data-preview-action="true"' : ''} ${!battle.playerTurn ? 'disabled' : ''}>
              <strong>${escapeHtml(resumePreview ? getPreviewActionLabel('도주') : '도주')}</strong>
              <span>보스전이 아니면 이탈을 시도합니다.</span>
            </button>
          </div>
        </article>

        <article class="focus-card">
          <p class="eyebrow">Skill Rack</p>
          <div class="quest-group-grid">
            ${battle.skills.length
              ? battle.skills.map(skill => `
                <div class="shop-card">
                  <strong class="shop-title">${escapeHtml(skill.name)}</strong>
                  <p class="shop-description">${escapeHtml(skill.description)}</p>
                  <div class="shop-meta">
                    <span class="badge">MP ${formatNumber(skill.mpCost)}</span>
                  </div>
                  <div class="slot-actions">
                    <button
                      class="inline-button"
                      type="button"
                      data-action="battle-skill"
                      data-skill-id="${escapeHtml(skill.id)}"
                      ${resumePreview ? 'data-preview-action="true"' : ''}
                      ${(!battle.playerTurn || !skill.usable) ? 'disabled' : ''}
                    >
                      ${escapeHtml(resumePreview ? getPreviewActionLabel('사용') : '사용')}
                    </button>
                  </div>
                </div>
              `).join('')
              : renderEmptyCopy('현재 사용 가능한 스킬이 없습니다.')}
          </div>
        </article>
      </div>

      <section class="field-stack">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">전투 소모품</h3>
            <p class="panel-subtitle">사용 시 턴이 소모됩니다.</p>
          </div>
        </div>
        <div class="inventory-list">
          ${battle.items.length
            ? battle.items.map(item => `
              <article class="inventory-card">
                <strong class="shop-title">${escapeHtml(item.icon)} ${escapeHtml(item.name)}</strong>
                <div class="inventory-meta">
                  <span class="badge">x${formatNumber(item.quantity)}</span>
                </div>
                <div class="slot-actions">
                  <button
                    class="inline-button"
                    type="button"
                    data-action="battle-item"
                    data-item-id="${escapeHtml(item.itemId)}"
                    ${resumePreview ? 'data-preview-action="true"' : ''}
                    ${!battle.playerTurn ? 'disabled' : ''}
                  >
                    ${escapeHtml(resumePreview ? getPreviewActionLabel('사용') : '사용')}
                  </button>
                </div>
              </article>
            `).join('')
            : renderEmptyCopy('전투용 소모품이 없습니다.')}
        </div>
      </section>
    </section>
  `;
}

function renderMarket(snapshot) {
  if (!snapshot.shops || snapshot.shops.length === 0) {
    return '';
  }

  const isTown = Boolean(snapshot.location?.isTown);
  const isCombat = snapshot.scene === 'combat';
  const { shops, activeShop, activeItem } = getMarketDeckState(snapshot);
  const resumePreview = isResumePreviewWorkspace(snapshot, 'market');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'market');
  const achievementTarget = getActiveWorkspaceAchievementTarget(snapshot);
  const cardAchievementTarget = achievementTarget?.focus.workspace === 'market' &&
    (!achievementTarget.focus.shopId || achievementTarget.focus.shopId === activeShop?.id) &&
    (!achievementTarget.focus.itemId || achievementTarget.focus.itemId === activeItem?.id)
    ? achievementTarget
    : null;

  return `
    <section class="panel deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Market Strip</p>
          <h2 class="panel-title">상점 네트워크</h2>
          <p class="panel-subtitle">허브에서만 실제 구매가 가능합니다. 현장에서는 재고 미리보기만 제공합니다.</p>
        </div>
        <div class="slot-actions">
          <button class="ghost-button" type="button" data-action="visit-market" ${(!isTown || isCombat) ? 'disabled' : ''}>
            상점 거리 브리핑
          </button>
        </div>
      </div>
      ${renderSegmentedButtons(
        shops.map(shop => ({
          id: shop.id,
          label: `${shop.icon} ${shop.name}`,
          count: shop.inventory.length,
          meta: achievementTarget?.focus.shopId === shop.id ? '업적 목표' : null,
          target: achievementTarget?.focus.shopId === shop.id
        })),
        activeShop?.id ?? '',
        'select-market-shop'
      )}
      <div class="deck-toolbar">
        <p class="deck-description">
          ${escapeHtml(activeShop ? `${activeShop.ownerName} · ${activeShop.greeting}` : '상점 정보를 찾지 못했습니다.')}
        </p>
        ${renderDeckPager({
          index: uiState.marketIndex,
          total: activeShop?.inventory.length ?? 0,
          prevAction: 'market-prev',
          nextAction: 'market-next'
        })}
      </div>
      <div class="deck-layout">
        ${renderDeckSummaryCard(
          activeShop ? `${activeShop.icon} ${activeShop.name}` : '상점 없음',
          activeShop ? `${activeShop.ownerName}가 운영하는 상점입니다.` : '사용 가능한 상점이 없습니다.',
          [
            { label: '재고 수', value: `${formatNumber(activeShop?.inventory.length ?? 0)}개` },
            { label: '보유 골드', value: `${formatNumber(snapshot.player?.gold ?? 0)} G` },
            { label: '추적 대상', value: cardAchievementTarget?.label ?? '없음' },
            { label: '구매 가능', value: isTown && !isCombat ? '허브에서 즉시 구매' : '현장에서는 미리보기만' }
          ]
        )}
        <div class="deck-main">
          ${activeItem
            ? `
              <article class="shop-card deck-card ${resumeTarget ? 'resume-target-card' : ''} ${resumePreview ? 'preview-target-card' : ''}">
                <div class="badge-row">
                  ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
                  ${cardAchievementTarget ? renderBadge('업적 목표 카드', 'recommended') : ''}
                  <span class="badge">${escapeHtml(activeItem.rarity)}</span>
                  <span class="badge">Lv ${formatNumber(activeItem.level)}</span>
                  <span class="badge">Gold ${formatNumber(activeItem.price)}</span>
                  ${activeItem.canAfford ? renderBadge('구매 가능', 'success') : renderBadge('자금 부족', 'warning')}
                  ${activeItem.meetsLevelReq ? '' : renderBadge('레벨 부족', 'warning')}
                </div>
                ${resumePreview ? renderResumePreviewCallout(snapshot, 'market') : resumeTarget ? renderResumeTargetCallout(snapshot, 'market') : ''}
                ${cardAchievementTarget
                  ? `<p class="detail-copy achievement-target-note">현재 추적 업적 ${escapeHtml(cardAchievementTarget.label)} 목표 카드입니다. ${escapeHtml(cardAchievementTarget.focus.hint)}</p>`
                  : ''}
                <strong class="shop-title">${escapeHtml(activeItem.icon)} ${escapeHtml(activeItem.name)}</strong>
                <p class="shop-description">${escapeHtml(activeItem.description)}</p>
                ${resumePreview ? renderPreviewActionNote() : ''}
                <div class="slot-actions">
                  <button
                    class="inline-button"
                    type="button"
                    data-action="buy-item"
                    data-shop-id="${escapeHtml(activeShop?.id ?? '')}"
                    data-item-id="${escapeHtml(activeItem.id)}"
                    ${resumePreview ? 'data-preview-action="true"' : ''}
                    ${(!isTown || isCombat || !activeItem.canAfford || !activeItem.meetsLevelReq) ? 'disabled' : ''}
                  >
                    ${escapeHtml(resumePreview ? getPreviewActionLabel('구매') : '구매')}
                  </button>
                </div>
              </article>
            `
            : renderEmptyCopy('현재 레벨에서 구매 가능한 재고가 없습니다.')}
        </div>
      </div>
    </section>
  `;
}

function renderInventory(snapshot) {
  if (!snapshot.inventory) {
    return '';
  }

  const { total, items, activeItem } = getInventoryDeckState(snapshot);
  const typeSummary = Object.entries(
    items.reduce((summary, item) => {
      summary[item.type] = (summary[item.type] ?? 0) + item.quantity;
      return summary;
    }, {})
  )
    .map(([type, quantity]) => `${type} ${formatNumber(quantity)}`)
    .join(' · ');

  return `
    <section class="panel deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Inventory</p>
          <h2 class="panel-title">휴대 장비</h2>
          <p class="panel-subtitle">소모품과 진행 아이템을 카테고리 없이 빠르게 훑는 요약 뷰.</p>
        </div>
      </div>
      <div class="deck-toolbar">
        <p class="deck-description">${escapeHtml(typeSummary || '현재 보유품이 없습니다.')}</p>
        ${renderDeckPager({
          index: uiState.inventoryIndex,
          total,
          prevAction: 'inventory-prev',
          nextAction: 'inventory-next'
        })}
      </div>
      <div class="deck-layout">
        ${renderDeckSummaryCard(
          '보유 자산',
          total ? '소모품과 장비를 한 장씩 훑어보는 고정 덱입니다.' : '인벤토리가 비어 있습니다.',
          [
            { label: '총 슬롯', value: `${formatNumber(total)}개` },
            { label: '유형 분포', value: typeSummary || '없음' },
            { label: '운영 팁', value: '전투 전 필요한 소모품 수량을 먼저 확인하세요.' }
          ]
        )}
        <div class="deck-main">
          ${activeItem
            ? `
              <article class="inventory-card deck-card">
                <div class="badge-row">
                  <span class="badge">${escapeHtml(activeItem.type)}</span>
                  <span class="badge">x${formatNumber(activeItem.quantity)}</span>
                </div>
                <strong class="shop-title">${escapeHtml(activeItem.icon)} ${escapeHtml(activeItem.name)}</strong>
                <p class="detail-copy">현재 런에서 확보한 물품입니다. 전투/탐사 흐름에 맞춰 수량만 빠르게 확인하도록 구성했습니다.</p>
              </article>
            `
            : renderEmptyCopy('인벤토리가 비어 있습니다.')}
        </div>
      </div>
    </section>
  `;
}

function getAchievementCategoryLabel(category) {
  switch (category) {
    case 'quest':
      return '정산';
    case 'economy':
      return '경제';
    case 'exploration':
      return '탐사';
    case 'boss':
      return '보스';
    case 'act':
      return '전선';
    case 'challenge':
      return '도전';
    default:
      return category ?? '업적';
  }
}

function getQuestAchievementLane(snapshot) {
  if ((snapshot.questBoard?.completable.length ?? 0) > 0) {
    return 'completable';
  }

  if (snapshot.questBoard?.active.some(group => group.quests.length > 0) ?? false) {
    return 'active';
  }

  return 'available';
}

function getMarketTargetSummary(snapshot, shopId = null, itemId = null) {
  const shops = snapshot.shops ?? [];
  const targetShop = shops.find(shop => shop.id === shopId) ?? shops[0] ?? null;
  if (!targetShop) {
    return null;
  }

  const targetItem = targetShop.inventory.find(item => item.id === itemId) ??
    (itemId ? null : targetShop.inventory[0] ?? null);

  if (!targetItem) {
    return {
      shopId: targetShop.id,
      itemId: null,
      shopName: targetShop.name,
      itemName: null,
      canAfford: false,
      meetsLevelReq: false,
      purchaseReady: false,
      detail: `첫 확인: ${targetShop.name} 재고`,
      actionLabel: `${targetShop.name} 재고 보기`,
      actionSummary: `${targetShop.name} 재고를 먼저 확인해 다음 루프의 준비 상태를 정리합니다.`
    };
  }

  return {
    shopId: targetShop.id,
    itemId: targetItem.id,
    shopName: targetShop.name,
    itemName: targetItem.name,
    canAfford: Boolean(targetItem.canAfford),
    meetsLevelReq: Boolean(targetItem.meetsLevelReq),
    purchaseReady: Boolean(targetItem.canAfford && targetItem.meetsLevelReq),
    detail: `첫 확인: ${targetShop.name} · ${targetItem.name}`,
    actionLabel: `${targetItem.name} 바로 구매`,
    actionSummary: `${targetShop.name}에서 ${targetItem.name} 확보를 우선해 다음 루프의 장비 공백을 줄입니다.`
  };
}

function getEconomyAchievementMarketTarget(snapshot) {
  const shops = snapshot.shops ?? [];
  const candidates = shops.flatMap(shop =>
    (shop.inventory ?? []).map(item => ({
      shop,
      item
    }))
  );

  const affordableCandidate = [...candidates]
    .filter(candidate => candidate.item.canAfford && candidate.item.meetsLevelReq)
    .sort((left, right) => right.item.price - left.item.price)[0] ?? null;
  const levelReadyCandidate = [...candidates]
    .filter(candidate => candidate.item.meetsLevelReq)
    .sort((left, right) => left.item.price - right.item.price)[0] ?? null;
  const fallbackCandidate = candidates[0] ?? null;
  const target = affordableCandidate ?? levelReadyCandidate ?? fallbackCandidate;

  if (!target) {
    const fallbackShop = shops[0] ?? null;
    return fallbackShop
      ? {
          shopId: fallbackShop.id,
          itemId: null,
          shopName: fallbackShop.name,
          itemName: null
        }
      : null;
  }

  return {
    shopId: target.shop.id,
    itemId: target.item.id,
    shopName: target.shop.name,
    itemName: target.item.name
  };
}

function getAchievementFocusDescriptor(entry, snapshot) {
  const isTown = Boolean(snapshot.location?.isTown);
  const recommendedDestination = getRecommendedTravelDestination(snapshot);
  const bossProgress = snapshot.location?.bossProgress ?? null;
  const questLane = getQuestAchievementLane(snapshot);
  const marketTarget = getEconomyAchievementMarketTarget(snapshot);

  switch (entry.id) {
    case 'first_turn_in':
      return {
        label: questLane === 'completable' ? '보상 정산 열기' : '퀘스트 탭 열기',
        hint: questLane === 'completable' ? '보상 대기 라인으로 이동' : '진행 퀘스트와 다음 의뢰 확인',
        workspace: 'quests',
        questLane
      };
    case 'field_buyer':
      return {
        label: marketTarget?.itemName
          ? `${marketTarget.itemName} 보기`
          : marketTarget?.shopName
            ? `${marketTarget.shopName} 보기`
            : isTown ? '상점 탭 열기' : '상점 재고 보기',
        hint: marketTarget?.shopName
          ? `${marketTarget.shopName}에서 다음 구매 후보를 확인`
          : isTown ? '구매 루프로 바로 복귀' : '다음 정비 후보를 미리 확인',
        workspace: 'market',
        shopId: marketTarget?.shopId ?? null,
        itemId: marketTarget?.itemId ?? null
      };
    case 'frontier_scout':
      return {
        label: recommendedDestination ? `${recommendedDestination.name} 보기` : '이동 탭 열기',
        hint: recommendedDestination ? '추천 루트부터 확인' : '다음 해금 지역 탐색',
        workspace: 'travel',
        travelDestinationId: recommendedDestination?.id ?? null
      };
    case 'boss_shutdown':
      return {
        label: bossProgress ? `${bossProgress.bossName} 전선 보기` : '전선 이동 보기',
        hint: bossProgress?.ready ? '보스 구역 진입 전 점검' : '다음 격파 루트를 확인',
        workspace: 'travel',
        travelDestinationId: recommendedDestination?.id ?? null
      };
    case 'act_one_stabilized':
      return {
        label: '새 전선 보기',
        hint: '해금된 다음 이동 경로를 확인',
        workspace: 'travel',
        travelDestinationId: recommendedDestination?.id ?? null
      };
    case 'flawless_clear':
      return entry.unlocked
        ? {
            label: '해금 로그 보기',
            hint: '최근 성취 기록을 다시 확인',
            workspace: 'feed',
            feedCategory: 'reward'
          }
        : {
            label: bossProgress ? `${bossProgress.bossName} 준비` : '전선 유지하기',
            hint: '보스전 전까지 현재 런 리듬을 유지',
            workspace: 'travel',
            travelDestinationId: recommendedDestination?.id ?? null
          };
    default:
      break;
  }

  switch (entry.category) {
    case 'quest':
      return {
        label: '퀘스트 탭 열기',
        hint: '진행도와 정산 상태를 확인',
        workspace: 'quests',
        questLane
      };
    case 'economy':
      return {
        label: marketTarget?.itemName
          ? `${marketTarget.itemName} 보기`
          : marketTarget?.shopName
            ? `${marketTarget.shopName} 보기`
            : isTown ? '상점 탭 열기' : '상점 재고 보기',
        hint: marketTarget?.shopName
          ? `${marketTarget.shopName}에서 소모 골드 루프를 확인`
          : isTown ? '소모 골드 업적을 바로 추적' : '정비 경로를 미리 확인',
        workspace: 'market',
        shopId: marketTarget?.shopId ?? null,
        itemId: marketTarget?.itemId ?? null
      };
    case 'exploration':
    case 'boss':
    case 'act':
      return {
        label: recommendedDestination ? `${recommendedDestination.name} 보기` : '이동 탭 열기',
        hint: '추천 전선과 다음 목적지를 확인',
        workspace: 'travel',
        travelDestinationId: recommendedDestination?.id ?? null
      };
    case 'challenge':
      return {
        label: entry.unlocked ? '해금 로그 보기' : '이동 탭 열기',
        hint: entry.unlocked ? '최근 성취를 다시 확인' : '도전 조건에 맞는 전선을 유지',
        workspace: entry.unlocked ? 'feed' : 'travel',
        feedCategory: entry.unlocked ? 'reward' : undefined,
        travelDestinationId: entry.unlocked ? null : recommendedDestination?.id ?? null
      };
    default:
      return {
        label: '업적 패널 유지',
        hint: '현재 업적 현황을 계속 추적',
        workspace: 'achievements'
      };
  }
}

function compareAchievementTitles(left, right) {
  return left.title.localeCompare(right.title, 'ko-KR');
}

function compareAchievementsByFocus(left, right) {
  if (left.unlocked !== right.unlocked) {
    return left.unlocked ? 1 : -1;
  }

  if (!left.unlocked && !right.unlocked) {
    if (left.progressPercent !== right.progressPercent) {
      return right.progressPercent - left.progressPercent;
    }

    const leftRemaining = Math.max(0, left.target - left.current);
    const rightRemaining = Math.max(0, right.target - right.current);
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

  return compareAchievementTitles(left, right);
}

function compareAchievementsByRecent(left, right) {
  if (left.unlocked !== right.unlocked) {
    return left.unlocked ? -1 : 1;
  }

  if (left.unlocked && right.unlocked) {
    const leftUnlockedAt = left.unlockedAt ?? 0;
    const rightUnlockedAt = right.unlockedAt ?? 0;
    if (leftUnlockedAt !== rightUnlockedAt) {
      return rightUnlockedAt - leftUnlockedAt;
    }
  }

  if (left.progressPercent !== right.progressPercent) {
    return right.progressPercent - left.progressPercent;
  }

  return compareAchievementTitles(left, right);
}

function compareAchievementsByTitle(left, right) {
  const titleCompare = compareAchievementTitles(left, right);
  if (titleCompare !== 0) {
    return titleCompare;
  }

  if (left.unlocked !== right.unlocked) {
    return left.unlocked ? -1 : 1;
  }

  return (right.unlockedAt ?? 0) - (left.unlockedAt ?? 0);
}

function getAchievementDeckState(snapshot) {
  const allEntries = [...(snapshot.achievements?.entries ?? [])];
  const trackedAchievement = getTrackedAchievementDescriptor(snapshot);
  const categoryFilters = [
    {
      id: ACHIEVEMENT_CATEGORY_ALL,
      label: '전체 업적',
      count: allEntries.length
    },
    ...ACHIEVEMENT_CATEGORY_ORDER
      .filter(category => allEntries.some(entry => entry.category === category))
      .map(category => ({
        id: category,
        label: getAchievementCategoryLabel(category),
        count: allEntries.filter(entry => entry.category === category).length
      }))
  ];

  const activeCategoryFilter =
    categoryFilters.find(filter => filter.id === uiState.achievementCategoryId) ??
    categoryFilters[0] ?? {
      id: ACHIEVEMENT_CATEGORY_ALL,
      label: '전체 업적',
      count: 0
    };
  uiState.achievementCategoryId = activeCategoryFilter.id;

  const filteredEntries = activeCategoryFilter.id === ACHIEVEMENT_CATEGORY_ALL
    ? allEntries
    : allEntries.filter(entry => entry.category === activeCategoryFilter.id);

  const activeSortOption =
    ACHIEVEMENT_SORT_OPTIONS.find(option => option.id === uiState.achievementSortId) ??
    ACHIEVEMENT_SORT_OPTIONS[0];
  uiState.achievementSortId = activeSortOption.id;

  const comparator = (() => {
    switch (activeSortOption.id) {
      case 'recent':
        return compareAchievementsByRecent;
      case 'title':
        return compareAchievementsByTitle;
      default:
        return compareAchievementsByFocus;
    }
  })();

  const trackedEntryId = activeSortOption.id === 'focus'
    ? trackedAchievement?.entry?.id ?? null
    : null;
  const entries = [...filteredEntries].sort((left, right) => {
    if (trackedEntryId) {
      const leftTracked = left.id === trackedEntryId;
      const rightTracked = right.id === trackedEntryId;
      if (leftTracked !== rightTracked) {
        return leftTracked ? -1 : 1;
      }
    }

    return comparator(left, right);
  });
  const nextTarget = entries.find(entry => !entry.unlocked) ??
    [...allEntries].sort(compareAchievementsByFocus).find(entry => !entry.unlocked) ??
    null;
  const unlockedInView = filteredEntries.filter(entry => entry.unlocked).length;

  return {
    entries,
    categoryFilters,
    activeCategoryFilter,
    sortOptions: ACHIEVEMENT_SORT_OPTIONS,
    activeSortOption,
    unlockedInView,
    totalInView: filteredEntries.length,
    nextTarget,
    latestUnlocked: snapshot.achievements?.latestUnlocked ?? null,
    trackedAchievement
  };
}

function renderAchievementTrackingControls(snapshot, trackedAchievement, nextTarget = null) {
  const mode = getAchievementTrackingMode(snapshot);
  const history = getAchievementTrackingHistory(snapshot).slice(0, 3);
  const modeLabel = getAchievementTrackingModeLabel(mode);
  const modeCopy = mode === 'pinned'
    ? '핀 고정 모드에서는 업적 카드를 누르면 그 업적이 현재 추적 대상으로 저장됩니다.'
    : '자동 전환 모드에서는 행동 후 가장 가까운 업적으로 추적 대상이 자동 갱신됩니다.';

  return `
    <div class="achievement-tracking-stack">
      ${renderDeckSummaryCard(
        'Tracking Control',
        trackedAchievement
          ? `${modeLabel} · ${trackedAchievement.label}`
          : `${modeLabel} · 현재 추적 대상 없음`,
        [
          {
            label: '현재 모드',
            value: modeLabel
          },
          {
            label: '현재 추적',
            value: trackedAchievement?.label ?? '없음'
          },
          {
            label: '최근 기록',
            value: history[0]?.message ?? '아직 추적 기록이 없습니다.'
          }
        ]
      )}
      <article class="detail-card achievement-history-card">
        <div>
          <p class="eyebrow">Tracking History</p>
          <h3 class="panel-title">추적 모드와 최근 전환 기록</h3>
          <p class="detail-copy">${escapeHtml(modeCopy)}</p>
        </div>
        <div class="deck-filter-group">
          <span class="filter-label">추적 정책</span>
          ${renderActionChipButtons(
            [
              { id: 'auto', label: '자동 전환', meta: '근접 업적 자동 추적' },
              { id: 'pinned', label: '핀 고정', meta: '선택 업적 유지' }
            ],
            mode,
            {
              actionName: 'set-achievement-tracking-mode',
              dataKey: 'tracking-mode',
              ariaLabel: '업적 추적 모드'
            }
          )}
        </div>
        <div class="slot-actions">
          ${nextTarget && !nextTarget.unlocked ? `
            <button
              class="ghost-button"
              type="button"
              data-action="track-achievement"
              data-achievement-id="${escapeHtml(nextTarget.id)}"
              data-tracking-mode="pinned"
            >
              다음 후보 핀 고정
            </button>
          ` : ''}
          <button
            class="ghost-button"
            type="button"
            data-action="clear-achievement-tracking"
            ${trackedAchievement ? '' : 'disabled'}
          >
            추적 해제
          </button>
        </div>
        <div class="achievement-history-list">
          ${history.length
            ? history.map(entry => `
              <div class="achievement-history-entry">
                <div class="achievement-history-head">
                  <span class="eyebrow">${escapeHtml(formatDate(entry.timestamp))}</span>
                  ${entry.mode ? renderBadge(getAchievementTrackingModeLabel(entry.mode), entry.mode === 'pinned' ? 'warning' : 'recommended') : ''}
                </div>
                <strong>${escapeHtml(entry.message)}</strong>
              </div>
            `).join('')
            : '<p class="detail-copy">아직 기록된 추적 전환이 없습니다.</p>'}
        </div>
      </article>
    </div>
  `;
}

function renderAchievementCard(entry, snapshot) {
  const focus = getAchievementFocusDescriptor(entry, snapshot);
  const isTracked = getTrackedAchievementDescriptor(snapshot)?.entry?.id === entry.id;
  const trackingMode = getAchievementTrackingMode(snapshot);
  const cardActionAttributes = !entry.unlocked && trackingMode === 'pinned'
    ? `
      data-action="track-achievement"
      data-achievement-id="${escapeHtml(entry.id)}"
      data-tracking-mode="pinned"
    `
    : `
      data-ui-action="focus-achievement-target"
      data-ui-value="${escapeHtml(entry.id)}"
    `;

  return `
    <button
      class="achievement-card deck-card"
      type="button"
      data-accent="${escapeHtml(entry.accent)}"
      data-tracked="${isTracked ? 'true' : 'false'}"
      data-unlocked="${entry.unlocked ? 'true' : 'false'}"
      ${cardActionAttributes}
    >
      <div class="achievement-head">
        <p class="eyebrow">${escapeHtml(getAchievementCategoryLabel(entry.category))}</p>
        <span class="badge ${entry.unlocked ? 'success' : ''}">
          ${escapeHtml(entry.unlocked ? 'Unlocked' : 'Locked')}
        </span>
      </div>
      <strong class="achievement-title">${escapeHtml(entry.title)}</strong>
      <p class="achievement-copy">${escapeHtml(entry.description)}</p>
      ${entry.rewardPreview ? `<p class="achievement-reward-copy">보상 · ${escapeHtml(entry.rewardPreview)}</p>` : ''}
      <div class="badge-row">
        ${isTracked ? renderBadge('업적 추적', 'recommended') : ''}
        ${!entry.unlocked && trackingMode === 'pinned' && !isTracked ? renderBadge('카드 선택 시 핀 고정', 'warning') : ''}
        ${renderBadge(`${formatNumber(entry.current)} / ${formatNumber(entry.target)}`, entry.unlocked ? 'success' : '')}
        ${entry.unlocked && entry.unlockedAt ? renderBadge(formatDate(entry.unlockedAt)) : ''}
      </div>
      <div class="reward-horizon-meter">
        <div class="reward-horizon-fill" style="width: ${Math.max(0, Math.min(100, entry.progressPercent))}%"></div>
      </div>
      <div class="achievement-route-row">
        <strong class="achievement-route-label">${escapeHtml(isTracked ? `추적 대상 · ${focus.label}` : focus.label)}</strong>
        <span class="achievement-route-hint">${escapeHtml(focus.hint)}</span>
      </div>
    </button>
  `;
}

function focusAchievementTarget(achievementId, snapshot) {
  const entry = snapshot.achievements?.entries.find(item => item.id === achievementId);
  if (!entry) {
    return;
  }

  uiState.achievementFocusId = achievementId;
  const focus = getAchievementFocusDescriptor(entry, snapshot);
  if (!focus) {
    return;
  }

  if (focus.questLane) {
    uiState.questLane = focus.questLane;
    uiState.questIndex = 0;
  }

  if (focus.travelDestinationId) {
    const destinations = snapshot.travel?.destinations ?? [];
    const destinationIndex = destinations.findIndex(destination => destination.id === focus.travelDestinationId);
    if (destinationIndex >= 0) {
      uiState.travelIndex = destinationIndex;
    }
  }

  if (focus.workspace === 'market') {
    focusMarketRoute(snapshot, focus.shopId ?? null, focus.itemId ?? null);
    return;
  }

  if (focus.feedCategory) {
    applyFeedCategoryFocus(focus.feedCategory, { openWorkspace: true });
    return;
  }

  uiState.activeWorkspace = normalizeWorkspace(snapshot, focus.workspace ?? 'achievements');
}

function renderAchievements(snapshot) {
  if (!snapshot.achievements) {
    return renderEmptyCopy('업적 데이터를 불러오지 못했습니다.');
  }

  const {
    entries,
    categoryFilters,
    activeCategoryFilter,
    sortOptions,
    activeSortOption,
    unlockedInView,
    totalInView,
    nextTarget,
    latestUnlocked,
    trackedAchievement
  } = getAchievementDeckState(snapshot);
  const filteredPercent = totalInView > 0
    ? Math.round((unlockedInView / totalInView) * 100)
    : 0;

  return `
    <section class="panel deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Achievement Vault</p>
          <h2 class="panel-title">업적 현황</h2>
          <p class="panel-subtitle">최근 해금 기록과 남은 도전의 진행률을 한 화면에서 확인합니다.</p>
        </div>
      </div>
      ${renderAchievementTrackingControls(snapshot, trackedAchievement, nextTarget)}
      <div class="deck-filter-stack">
        <div class="deck-filter-group">
          <span class="filter-label">카테고리</span>
          ${renderFeedFilterButtons(categoryFilters, activeCategoryFilter.id, {
            actionName: 'select-achievement-category',
            ariaLabel: '업적 카테고리 필터'
          })}
        </div>
        <div class="deck-filter-group">
          <span class="filter-label">정렬</span>
          ${renderChipButtons(
            sortOptions.map(option => ({
              id: option.id,
              label: option.label,
              meta: option.summary
            })),
            activeSortOption.id,
            {
              actionName: 'select-achievement-sort',
              ariaLabel: '업적 정렬 옵션'
            }
          )}
        </div>
      </div>
      <div class="deck-layout">
        ${renderDeckSummaryCard(
          activeCategoryFilter.id === ACHIEVEMENT_CATEGORY_ALL
            ? '해금 진행도'
            : `${activeCategoryFilter.label} 업적`,
          latestUnlocked
            ? `최근 해금: ${latestUnlocked.title}${latestUnlocked.unlockedAt ? ` · ${formatDate(latestUnlocked.unlockedAt)}` : ''}`
            : '아직 해금된 업적이 없습니다. 첫 정산이나 첫 보스 격파부터 시작됩니다.',
          [
            {
              label: '전체 해금',
              value: `${formatNumber(snapshot.achievements.unlockedCount)} / ${formatNumber(snapshot.achievements.totalCount)}`
            },
            {
              label: '현재 보기',
              value: `${formatNumber(unlockedInView)} / ${formatNumber(totalInView)} · ${formatNumber(filteredPercent)}%`
            },
            {
              label: '다음 목표',
              value: nextTarget ? nextTarget.title : '전체 해금 완료'
            },
            {
              label: '추적 대상',
              value: trackedAchievement?.label ?? '없음'
            },
            {
              label: '정렬',
              value: activeSortOption.label
            }
          ]
        )}
        <div class="deck-main">
          ${entries.length
            ? `
              <div class="achievement-grid">
                ${entries.map(entry => renderAchievementCard(entry, snapshot)).join('')}
              </div>
            `
            : renderEmptyCopy('선택한 조건에 맞는 업적이 없습니다.')}
        </div>
      </div>
    </section>
  `;
}

function renderSaveSlot(slot, options) {
  const {
    canSave,
    compact,
    landing,
    recommendedSlotNumber = null,
    recommendedSlotKind = null,
    latestSlotNumber = null,
    trackedSlotNumber = null
  } = options;
  const stateLabel = slot.exists
    ? `${slot.playerName ?? 'Unknown'} · Lv ${formatNumber(slot.playerLevel ?? 0)}`
    : '빈 슬롯';
  const achievementLabel = slot.exists && typeof slot.achievementTotal === 'number'
    ? ` · 업적 ${formatNumber(slot.achievementCount ?? 0)} / ${formatNumber(slot.achievementTotal)}`
    : '';
  const isRecommended = recommendedSlotNumber === slot.slotNumber;
  const recommendationBadge = isRecommended
    ? renderBadge(
        recommendedSlotKind === 'empty' ? '추천 빈 슬롯' : '추천 슬롯',
        'recommended'
      )
    : '';
  const isLatest = latestSlotNumber === slot.slotNumber;
  const isTracked = trackedSlotNumber === slot.slotNumber;
  const trackedLoadAttributes = renderAchievementChaseLoadAttributes(slot, landing && isTracked);
  const resumeCue = slot.exists
    ? renderSaveCue('Resume Cue', slot.resumeTitle ?? '', slot.resumeHint ?? '')
    : '';
  const trackedAchievementCue = slot.exists && landing && isTracked
    ? renderSaveCue(
        'Achievement Chase',
        getSaveSlotTrackedAchievementTitle(slot)
          ? `${getSaveSlotTrackedAchievementTitle(slot)}${getSaveSlotTrackedAchievementProgress(slot) ? ` · ${getSaveSlotTrackedAchievementProgress(slot)}` : ''}`
          : '',
        getSaveSlotTrackedAchievementHint(slot) ?? ''
      )
    : '';
  const nextAchievementCue = slot.exists
    ? renderSaveCue(
        'Next Unlock',
        slot.nextAchievementTitle
          ? `${slot.nextAchievementTitle}${slot.nextAchievementProgress ? ` · ${slot.nextAchievementProgress}` : ''}`
          : '',
        slot.nextAchievementHint ?? ''
      )
    : '';

  return `
    <article class="slot-card ${slot.exists ? 'active-slot' : ''} ${isRecommended ? 'recommended-slot' : ''} ${isLatest ? 'latest-slot' : ''} ${isTracked ? 'tracked-slot' : ''}">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Slot ${formatNumber(slot.slotNumber)}</h3>
          <p class="panel-subtitle">${escapeHtml(stateLabel)}</p>
        </div>
        <div class="badge-row">
          ${isTracked ? renderBadge('업적 추적', 'recommended') : ''}
          ${isLatest ? renderBadge('최근 기록', 'success') : ''}
          ${recommendationBadge}
          ${slot.exists ? renderBadge(formatDate(slot.savedAt), 'success') : renderBadge('Empty')}
        </div>
      </div>
      ${
        slot.exists
          ? `
            <p class="slot-meta">
              ${escapeHtml(slot.locationName ?? 'Unknown')} · ${escapeHtml(slot.saveType ?? 'manual')}${escapeHtml(achievementLabel)}
            </p>
            ${resumeCue}
            ${trackedAchievementCue}
            ${nextAchievementCue}
          `
          : `<p class="slot-meta">새 여정을 기록할 준비가 된 슬롯입니다.</p>`
      }
      <div class="slot-actions">
        ${landing
          ? `
            <button
              class="inline-button"
              type="button"
              data-action="load-game"
              ${trackedLoadAttributes}
              data-slot-number="${escapeHtml(slot.slotNumber)}"
              ${slot.exists ? '' : 'disabled'}
            >
              불러오기
            </button>
          `
          : `
            <button
              class="inline-button"
              type="button"
              data-action="save-game"
              data-slot-number="${escapeHtml(slot.slotNumber)}"
              ${canSave ? '' : 'disabled'}
            >
              저장
            </button>
            <button
              class="inline-button"
              type="button"
              data-action="load-game"
              data-slot-number="${escapeHtml(slot.slotNumber)}"
              ${slot.exists ? '' : 'disabled'}
            >
              불러오기
            </button>
          `
        }
      </div>
      ${compact ? '' : '<p class="detail-copy">플레이테스트용 분리 세이브 디렉터리와도 함께 동작합니다.</p>'}
    </article>
  `;
}

function getRecommendedSaveSlot(snapshot) {
  const slots = snapshot.saves ?? [];
  const emptySlot = slots.find(slot => !slot.exists);
  if (emptySlot) {
    return {
      slot: emptySlot,
      kind: 'empty',
      label: `Slot ${formatNumber(emptySlot.slotNumber)} · 새 기록`
    };
  }

  const recentSlot = slots
    .filter(slot => slot.exists)
    .sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0))[0] ?? null;

  if (recentSlot) {
    return {
      slot: recentSlot,
      kind: 'recent',
      label: `Slot ${formatNumber(recentSlot.slotNumber)} · 최근 기록`
    };
  }

  return null;
}

function getResumeCueDescriptor(snapshot) {
  const nextAction = getPrimaryActionDescriptor(snapshot);
  if (!nextAction) {
    return null;
  }

  const target = nextAction.target ?? {};
  const targetLabel = target.workspace === 'quests'
    ? '퀘스트 탭'
    : target.workspace === 'travel'
      ? '이동 탭'
      : target.workspace === 'market'
        ? '상점 탭'
        : target.action === 'inn-rest' || target.action === 'dungeon-rest'
          ? '회복 루프'
          : target.action === 'town-explore' || target.action === 'dungeon-explore'
            ? '탐색 루프'
            : '추천 행동';
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;
  const cueBody = contextLabel
    ? `${targetLabel}에서 바로 이어가면 ${contextLabel} 목표 흐름을 가장 자연스럽게 복원합니다.`
    : `${targetLabel}에서 바로 이어가면 현재 세션 리듬이 가장 자연스럽게 복원됩니다.`;
  const cueNote = contextLabel
    ? `${contextLabel} 목표 기준 · ${nextAction.body}`
    : nextAction.body;

  return {
    title: `${nextAction.title}부터 재개`,
    body: cueBody,
    cue: cueNote,
    badge: nextAction.badge,
    tone: nextAction.tone,
    eta: nextAction.eta ?? getEstimatedTimeLabel(snapshot, nextAction),
    target,
    steps: (nextAction.steps ?? []).slice(0, 2),
    contextLabel
  };
}

function renderSaveWrapPanel(snapshot) {
  const canSave = Boolean(snapshot.saveStatus?.canSave);
  const recommended = getRecommendedSaveSlot(snapshot);
  const sessionWindow = getSessionWindowMeta();
  const player = snapshot.player;
  const location = snapshot.location;
  const resumePreview = isResumePreviewWorkspace(snapshot, 'save');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'save');
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;
  const trackedAchievement = getActiveTrackedAchievement(snapshot);

  if (!player || !location) {
    return '';
  }

  const wrapTitle = canSave ? '지금 세션 마감 가능' : '세션 마감 전 한 단계 필요';
  const wrapBody = canSave
    ? '현재 위치에서 바로 저장하고 끊어도 다음 세션 연결이 자연스럽습니다.'
    : snapshot.saveStatus?.reason ?? '현재는 바로 저장할 수 없습니다.';
  const quickSaveSlot = canSave ? recommended?.slot ?? null : null;
  const quickSaveLabel = resumePreview
    ? getPreviewActionLabel('저장')
    : recommended?.kind === 'recent'
      ? '추천 슬롯에 저장'
      : '추천 빈 슬롯에 저장';

  return `
    <div class="save-wrap-panel ${resumeTarget ? 'resume-target-panel' : ''} ${resumePreview ? 'preview-target-panel' : ''}">
      <div class="save-wrap-head">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Session Wrap · ${contextLabel}` : 'Session Wrap')}</p>
          <strong class="save-wrap-title">${escapeHtml(wrapTitle)}</strong>
          <p class="save-wrap-copy">${escapeHtml(wrapBody)}</p>
        </div>
        <div class="save-wrap-meta">
          ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
          ${!resumeTarget && contextLabel ? renderBadge(contextLabel, 'recommended') : ''}
          <span class="badge ${escapeHtml(canSave ? 'success' : 'warning')}">${escapeHtml(canSave ? '저장 가능' : '저장 제한')}</span>
          <span class="duration-chip">${escapeHtml(sessionWindow.label)} 세션</span>
        </div>
      </div>
      ${resumePreview ? renderResumePreviewCallout(snapshot, 'save') : resumeTarget ? renderResumeTargetCallout(snapshot, 'save') : ''}
      <div class="save-wrap-facts">
        <div class="save-wrap-fact">
          <span>추천 슬롯</span>
          <strong>${escapeHtml(recommended?.label ?? '없음')}</strong>
        </div>
        <div class="save-wrap-fact">
          <span>현재 위치</span>
          <strong>${escapeHtml(location.name)}</strong>
        </div>
        <div class="save-wrap-fact">
          <span>업적 진행</span>
          <strong>${formatNumber(player.achievementCount)} / ${formatNumber(player.achievementTotal)}</strong>
        </div>
        <div class="save-wrap-fact">
          <span>추적 대상</span>
          <strong>${escapeHtml(trackedAchievement?.label ?? '없음')}</strong>
        </div>
        <div class="save-wrap-fact">
          <span>세이브 토큰</span>
          <strong>${formatNumber(player.saveTokenCount)}</strong>
        </div>
      </div>
      ${resumePreview ? renderPreviewActionNote() : ''}
      <div class="slot-actions">
        ${quickSaveSlot
          ? `
            <button
              class="inline-button"
              type="button"
              data-action="save-game"
              data-slot-number="${escapeHtml(quickSaveSlot.slotNumber)}"
              ${resumePreview ? 'data-preview-action="true"' : ''}
            >
              ${escapeHtml(quickSaveLabel)}
            </button>
          `
          : ''}
        ${canSave && recommended?.kind === 'recent'
          ? `<p class="detail-copy">추천 슬롯에 바로 저장하거나, 아래 슬롯 목록에서 다른 저장 대상을 직접 고를 수 있습니다.</p>`
          : ''}
      </div>
    </div>
  `;
}

function renderResumeCuePanel(snapshot) {
  const cue = getResumeCueDescriptor(snapshot);
  if (!cue) {
    return '';
  }

  const pace = getPaceModeMeta();
  const fit = getSessionFitMeta(snapshot, cue);

  return `
    <div class="resume-cue-panel" data-tone="${escapeHtml(cue.tone)}">
      <div class="resume-cue-head">
        <div>
          <p class="eyebrow">${escapeHtml(cue.contextLabel ? `Resume Cue · ${cue.contextLabel}` : 'Resume Cue')}</p>
          <strong class="resume-cue-title">${escapeHtml(cue.title)}</strong>
          <p class="resume-cue-copy">${escapeHtml(cue.body)}</p>
        </div>
        <div class="resume-cue-meta">
          ${cue.contextLabel ? renderBadge(cue.contextLabel, 'recommended') : ''}
          <span class="badge ${escapeHtml(cue.tone === 'success' ? 'success' : cue.tone === 'warning' || cue.tone === 'error' ? 'warning' : 'recommended')}">${escapeHtml(cue.badge)}</span>
          <span class="duration-chip">${escapeHtml(cue.eta)}</span>
          <span class="session-fit-chip ${escapeHtml(fit.tone)}">${escapeHtml(fit.label)}</span>
          <span class="badge">${escapeHtml(pace.label)} 페이스</span>
        </div>
      </div>
      <p class="resume-cue-note">${escapeHtml(cue.cue)}</p>
      <ol class="resume-cue-steps">
        ${cue.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
      <div class="slot-actions">
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes(cue.target)}
        >
          재개 위치 미리 열기
        </button>
      </div>
    </div>
  `;
}

function renderSavePanel(snapshot) {
  const canSave = Boolean(snapshot.saveStatus?.canSave);
  const recommended = getRecommendedSaveSlot(snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Save Control · ${contextLabel}` : 'Save Control')}</p>
          <h2 class="panel-title">세이브 / 로드</h2>
          <p class="panel-subtitle">${escapeHtml(snapshot.activeSaveDirectory)}</p>
        </div>
      </div>
      <div class="save-layout">
        ${renderSaveWrapPanel(snapshot)}
        ${renderResumeCuePanel(snapshot)}
        <div class="save-banner">
          <strong>${canSave ? '현재 저장 가능' : '현재 저장 제한'}</strong>
          <p class="detail-copy">${escapeHtml(snapshot.saveStatus?.reason ?? '저장 상태를 판별하지 못했습니다.')}</p>
        </div>
        <div class="slot-grid">
          ${snapshot.saves.map(slot => renderSaveSlot(slot, {
            canSave,
            compact: true,
            landing: false,
            recommendedSlotNumber: recommended?.slot.slotNumber ?? null,
            recommendedSlotKind: recommended?.kind ?? null
          })).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderFeedEntries(entries, options = {}) {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const compact = Boolean(options.compact);
  const source = entries?.length
    ? entries
    : [{ id: 'empty', tone: 'info', category: 'system', text: '아직 기록된 로그가 없습니다.', timestamp: Date.now() }];

  return `
    <ul class="feed-list ${compact ? 'compact-feed' : ''}">
      ${source.slice(0, limit).map(entry => `
        <li class="feed-entry" data-tone="${escapeHtml(entry.tone)}">
          <div class="feed-head">
            <div class="feed-tag-row">
              <span class="tone-chip ${escapeHtml(entry.tone)}">${escapeHtml(TONE_LABELS[entry.tone] ?? entry.tone)}</span>
              <span class="category-chip">${escapeHtml(getFeedCategoryLabel(entry.category))}</span>
              ${entry.speaker ? `<span class="speaker-chip">${escapeHtml(entry.speaker)}</span>` : ''}
            </div>
            <span class="feed-meta">${escapeHtml(formatDate(entry.timestamp))}</span>
          </div>
          <div class="feed-copy ${entry.speaker ? 'voice-copy' : ''}">${entry.speaker ? `"${escapeHtml(entry.text)}"` : escapeHtml(entry.text)}</div>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderFeedHighlightCards(snapshot, options = {}) {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const compact = Boolean(options.compact);
  const activeCategoryId = options.activeCategoryId ?? null;
  const { highlights, recommendedCategoryId } = getFeedHighlightState(snapshot);

  if (!highlights.length) {
    return renderEmptyCopy('아직 카테고리별로 묶을 로그가 없습니다.');
  }

  return `
    <div class="feed-highlight-grid ${compact ? 'compact' : ''}">
      ${highlights.slice(0, limit).map(highlight => {
        const latestEntry = highlight.entry;
        const isRecommended = highlight.id === recommendedCategoryId;
        const isActive = highlight.id === activeCategoryId;
        const meta = latestEntry.speaker
          ? `${latestEntry.speaker} · ${formatDate(latestEntry.timestamp)}`
          : formatDate(latestEntry.timestamp);

        return `
          <button
            class="feed-highlight-card ${isActive ? 'active' : ''}"
            type="button"
            data-client-action="focus-feed"
            data-feed-category="${escapeHtml(highlight.id)}"
          >
            <div class="feed-highlight-head">
              <div class="feed-highlight-badges">
                <span class="category-chip">${escapeHtml(highlight.label)}</span>
                ${isRecommended ? renderBadge('추천', 'recommended') : ''}
              </div>
              <strong class="feed-highlight-count">${formatNumber(highlight.count)}개</strong>
            </div>
            <p class="feed-highlight-copy ${latestEntry.speaker ? 'voice-copy' : ''}">${latestEntry.speaker ? `"${escapeHtml(latestEntry.text)}"` : escapeHtml(latestEntry.text)}</p>
            <p class="feed-highlight-meta">${escapeHtml(meta)}</p>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderAchievementReel(snapshot, options = {}) {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const compact = Boolean(options.compact);
  const achievements = getAchievementHighlights(snapshot).slice(0, limit);

  if (!achievements.length) {
    return renderEmptyCopy('아직 성취 하이라이트로 끌어올릴 기록이 없습니다.');
  }

  return `
    <div class="achievement-grid ${compact ? 'compact' : ''}">
      ${achievements.map(achievement => `
        <button
          class="achievement-card"
          type="button"
          data-accent="${escapeHtml(achievement.accent)}"
          ${buildInteractionAttributes(achievement.target)}
        >
          <div class="achievement-head">
            <p class="eyebrow">${escapeHtml(achievement.eyebrow)}</p>
            <span class="badge success">${escapeHtml(getFeedCategoryLabel(achievement.entry.category))}</span>
          </div>
          <strong class="achievement-title">${escapeHtml(achievement.title)}</strong>
          <p class="achievement-copy">${escapeHtml(achievement.copy)}</p>
        </button>
      `).join('')}
    </div>
  `;
}

function renderSidebarAlerts(snapshot) {
  const alerts = getSidebarAlerts(snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <section class="panel alert-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Priority Intel · ${contextLabel}` : 'Priority Intel')}</p>
          <h2 class="panel-title">즉시 확인</h2>
          <p class="panel-subtitle">지금 가장 먼저 확인할 정보만 추려 둔 우선 레일입니다.</p>
        </div>
      </div>
      <div class="alert-stack">
        ${alerts.length
          ? alerts.map(alert => `
            <button
              class="priority-alert-card"
              type="button"
              data-tone="${escapeHtml(alert.tone)}"
              ${buildInteractionAttributes(alert)}
            >
              <div class="priority-alert-head">
                <p class="eyebrow">${escapeHtml(alert.eyebrow)}</p>
                <span class="badge ${escapeHtml(alert.tone === 'success' ? 'success' : alert.tone === 'warning' || alert.tone === 'error' ? 'warning' : '')}">${escapeHtml(alert.badge)}</span>
              </div>
              <strong class="priority-alert-title">${escapeHtml(alert.title)}</strong>
              <p class="priority-alert-copy">${escapeHtml(alert.body)}</p>
            </button>
          `).join('')
          : renderEmptyCopy('지금 즉시 대응할 우선 알림이 없습니다. 현재 루프를 그대로 진행하면 됩니다.')}
      </div>
    </section>
  `;
}

function renderRewardHorizon(snapshot) {
  const cards = getRewardHorizonCards(snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <section class="panel reward-horizon-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Reward Horizon · ${contextLabel}` : 'Reward Horizon')}</p>
          <h2 class="panel-title">곧 열릴 보상</h2>
          <p class="panel-subtitle">조금만 더 진행하면 바로 회수할 수 있는 성장 보상을 고정 표시합니다.</p>
        </div>
      </div>
      <div class="reward-horizon-grid">
        ${cards.map(card => `
          <button
            class="reward-horizon-card"
            type="button"
            ${buildInteractionAttributes(card.target)}
          >
            <div class="reward-horizon-head">
              <p class="eyebrow">${escapeHtml(card.eyebrow)}</p>
              <span class="badge recommended">${escapeHtml(card.badge)}</span>
            </div>
            <strong class="reward-horizon-title">${escapeHtml(card.title)}</strong>
            <p class="reward-horizon-copy">${escapeHtml(card.body)}</p>
            ${typeof card.progress === 'number'
              ? `
                <div class="reward-horizon-meter">
                  <div class="reward-horizon-fill" style="width: ${Math.max(0, Math.min(100, card.progress))}%"></div>
                </div>
              `
              : ''}
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderMomentumPanel(snapshot) {
  const cards = getMomentumCards(snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <section class="panel momentum-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Momentum · ${contextLabel}` : 'Momentum')}</p>
          <h2 class="panel-title">클리어까지의 진척</h2>
          <p class="panel-subtitle">지금 이 런이 얼마나 앞으로 나아갔는지 핵심 진척도만 압축 표시합니다.</p>
        </div>
      </div>
      <div class="momentum-grid">
        ${cards.map(card => `
          <button
            class="momentum-card"
            type="button"
            ${buildInteractionAttributes(card.target)}
          >
            <div class="momentum-head">
              <p class="eyebrow">${escapeHtml(card.eyebrow)}</p>
              <span class="badge recommended">${escapeHtml(card.badge)}</span>
            </div>
            <strong class="momentum-title">${escapeHtml(card.title)}</strong>
            <p class="momentum-copy">${escapeHtml(card.body)}</p>
            <div class="momentum-meter">
              <div class="momentum-fill" style="width: ${Math.max(0, Math.min(100, card.progress ?? 0))}%"></div>
            </div>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTrackedAchievementFeedCue(snapshot) {
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  if (!trackedAchievement?.entry) {
    return '';
  }

  const focus = getAchievementFocusDescriptor(trackedAchievement.entry, snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? trackedAchievement.label;
  const summary = focus.workspace === 'feed'
    ? '최근 해금/보상 로그를 바로 따라갑니다.'
    : `관련 로그를 확인한 뒤 ${focus.label} 경로로 다시 이어갈 수 있습니다.`;
  const note = focus.workspace === 'feed'
    ? focus.hint
    : `다음 연결: ${focus.label} · ${focus.hint}`;

  return `
    <div class="slot-resume tracked-feed-cue">
      <p class="eyebrow">${escapeHtml(`Achievement Chase · ${contextLabel}`)}</p>
      <strong class="slot-resume-title">${escapeHtml(trackedAchievement.label)}</strong>
      <p class="slot-resume-copy">${escapeHtml(summary)}</p>
      <p class="slot-resume-copy">${escapeHtml(note)}</p>
      <div class="slot-actions">
        ${renderBadge('업적 추적', 'recommended')}
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes({
            uiAction: 'focus-achievement-target',
            uiValue: trackedAchievement.entry.id
          })}
        >
          추적 업적 열기
        </button>
      </div>
    </div>
  `;
}

function renderFeed(snapshot) {
  const resumePreview = isResumePreviewWorkspace(snapshot, 'feed');
  const resumeTarget = !resumePreview && isResumeTargetWorkspace(snapshot, 'feed');
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  const {
    categoryFilters,
    activeCategoryFilter,
    speakerFilters,
    activeSpeakerFilter,
    total,
    entries,
    activeEntry
  } = getFeedDeckState(snapshot);
  const toneSummary = Object.entries(
    entries.reduce((summary, entry) => {
      summary[entry.tone] = (summary[entry.tone] ?? 0) + 1;
      return summary;
    }, {})
  )
    .map(([tone, count]) => `${TONE_LABELS[tone] ?? tone} ${formatNumber(count)}`)
    .join(' · ');

  return `
    <section class="panel deck-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Run Feed · ${contextLabel}` : 'Run Feed')}</p>
          <h2 class="panel-title">최근 로그</h2>
          <p class="panel-subtitle">전투, 보상, 경고, 진행 힌트를 장면과 발화자 축으로 좁혀 봅니다.</p>
        </div>
      </div>
      ${renderTrackedAchievementFeedCue(snapshot)}
      <div class="feed-highlight-stack">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Quick Focus · ${contextLabel}` : 'Quick Focus')}</p>
          <p class="detail-copy">최근 로그를 장면 단위로 바로 묶어 보고, 한 번에 해당 카테고리로 점프합니다.</p>
        </div>
        ${renderFeedHighlightCards(snapshot, { activeCategoryId: activeCategoryFilter.id })}
      </div>
      <div class="feed-filter-stack">
        <div class="feed-filter-group">
          <span class="filter-label">장면</span>
          ${renderFeedFilterButtons(categoryFilters, activeCategoryFilter.id, {
            actionName: 'select-feed-category',
            ariaLabel: '로그 장면 필터'
          })}
        </div>
        <div class="feed-filter-group">
          <span class="filter-label">발화자</span>
          ${renderFeedFilterButtons(speakerFilters, activeSpeakerFilter.id, {
            actionName: 'select-feed-filter',
            ariaLabel: '로그 발화자 필터'
          })}
        </div>
      </div>
      <div class="deck-toolbar">
        <p class="deck-description">${escapeHtml(toneSummary || '기록된 로그가 없습니다.')}</p>
        ${renderDeckPager({
          index: uiState.feedIndex,
          total,
          prevAction: 'feed-prev',
          nextAction: 'feed-next'
        })}
      </div>
      <div class="deck-layout">
        ${renderDeckSummaryCard(
          '세션 로그',
          total
            ? `${contextLabel ? `${contextLabel} 기준 · ` : ''}${activeCategoryFilter.label} · ${activeSpeakerFilter.label} 기준으로 최신 기록부터 하나씩 넘기며 확인합니다.`
            : '아직 기록된 로그가 없습니다.',
          [
            { label: '현재 장면', value: activeCategoryFilter.label },
            { label: '현재 발화자', value: activeSpeakerFilter.label },
            { label: '기록 수', value: `${formatNumber(total)}개` },
            { label: '톤 분포', value: toneSummary || '없음' },
            { label: '추적 대상', value: trackedAchievement?.label ?? '없음' },
            {
              label: '현재 선택',
              value: activeEntry ? formatDate(activeEntry.timestamp) : '없음'
            }
          ]
        )}
        <div class="deck-main">
          ${activeEntry
            ? `
              <article class="feed-entry deck-card ${resumeTarget ? 'resume-target-card' : ''} ${resumePreview ? 'preview-target-card' : ''}" data-tone="${escapeHtml(activeEntry.tone)}">
                <div class="feed-head">
                  <div class="feed-tag-row">
                    ${resumePreview ? renderResumePreviewBadge() : resumeTarget ? renderResumeTargetBadge() : ''}
                    <span class="tone-chip ${escapeHtml(activeEntry.tone)}">${escapeHtml(TONE_LABELS[activeEntry.tone] ?? activeEntry.tone)}</span>
                    <span class="category-chip">${escapeHtml(getFeedCategoryLabel(activeEntry.category))}</span>
                    ${activeEntry.speaker ? `<span class="speaker-chip">${escapeHtml(activeEntry.speaker)}</span>` : ''}
                  </div>
                  <span class="feed-meta">${escapeHtml(formatDate(activeEntry.timestamp))}</span>
                </div>
                ${resumePreview ? renderResumePreviewCallout(snapshot, 'feed') : resumeTarget ? renderResumeTargetCallout(snapshot, 'feed') : ''}
                <div class="feed-copy ${activeEntry.speaker ? 'voice-copy' : ''}">${activeEntry.speaker ? `"${escapeHtml(activeEntry.text)}"` : escapeHtml(activeEntry.text)}</div>
              </article>
            `
            : renderEmptyCopy('아직 기록된 로그가 없습니다.')}
        </div>
      </div>
    </section>
  `;
}

function renderDockedFeed(snapshot) {
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;

  return `
    <section class="panel dock-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Recent Wins · ${contextLabel}` : 'Recent Wins')}</p>
          <h2 class="panel-title">방금 해낸 것</h2>
        </div>
        <div class="slot-actions">
          <button class="ghost-button" type="button" data-workspace="feed">전체 로그</button>
        </div>
      </div>
      ${renderTrackedAchievementFeedCue(snapshot)}
      ${renderAchievementReel(snapshot, {
        limit: 2,
        compact: true
      })}
      ${renderFeedHighlightCards(snapshot, {
        limit: 2,
        compact: true,
        activeCategoryId: uiState.activeWorkspace === 'feed' ? uiState.feedCategoryId : null
      })}
    </section>
  `;
}

function renderTrackedAchievementHudCard(snapshot) {
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  if (!trackedAchievement?.entry) {
    return '';
  }

  const focus = getAchievementFocusDescriptor(trackedAchievement.entry, snapshot);
  const contextLabel = uiState.resumeRoute?.contextLabel ?? trackedAchievement.label;

  return `
    <article class="focus-card hud-focus-card" data-tone="success">
      <p class="eyebrow">${escapeHtml(`Achievement Chase · ${contextLabel}`)}</p>
      <h3 class="panel-title">${escapeHtml(trackedAchievement.entry.title)}</h3>
      <p class="detail-copy">${escapeHtml(focus.hint)}</p>
      <div class="badge-row">
        ${renderBadge('업적 추적', 'recommended')}
        ${renderBadge(getAchievementCardProgressLabel(trackedAchievement.entry), 'success')}
        ${renderBadge(focus.label)}
      </div>
      <div class="slot-actions">
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes({
            uiAction: 'focus-achievement-target',
            uiValue: trackedAchievement.entry.id
          })}
        >
          추적 경로 열기
        </button>
      </div>
    </article>
  `;
}

function renderSidebarHud(snapshot) {
  const player = snapshot.player;
  const location = snapshot.location;
  const contextLabel = uiState.resumeRoute?.contextLabel ?? null;
  if (!player || !location) {
    return '';
  }

  const focus = snapshot.focus
    ? `
      <article class="focus-card hud-focus-card" data-tone="${escapeHtml(snapshot.focus.tone)}">
        <p class="eyebrow">Adventure Focus</p>
        <h3 class="panel-title">${escapeHtml(snapshot.focus.title)}</h3>
        <ul class="focus-lines">
          ${snapshot.focus.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
      </article>
    `
    : '';

  const tracker = snapshot.tracker
    ? `
      <article class="focus-card hud-focus-card">
        <p class="eyebrow">Quest Tracker</p>
        <h3 class="panel-title">${escapeHtml(snapshot.tracker.questName)}</h3>
        <p class="detail-copy">${escapeHtml(snapshot.tracker.objectiveDescription)}</p>
        <div class="badge-row">
          ${renderBadge(snapshot.tracker.status)}
          ${renderBadge(snapshot.tracker.progress, 'success')}
        </div>
      </article>
    `
    : `
      <article class="focus-card hud-focus-card">
        <p class="eyebrow">Quest Tracker</p>
        <h3 class="panel-title">활성 퀘스트 없음</h3>
        <p class="detail-copy">우측 작업공간에서 퀘스트 탭을 열어 다음 목표를 정하세요.</p>
      </article>
    `;

  return `
    <section class="panel hero-panel hud-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${escapeHtml(contextLabel ? `Live Run · ${contextLabel}` : 'Live Run')}</p>
          <h2 class="panel-title">${escapeHtml(player.name)} / ${escapeHtml(CLASS_LABELS[player.class] ?? player.class)}</h2>
          <p class="panel-subtitle">${escapeHtml(location.name)} · ${location.isTown ? '허브' : '탐사 구역'}</p>
        </div>
        <div class="badge-row">
          ${renderBadge(`Lv ${player.level}`, 'recommended')}
          ${renderBadge(`Gold ${formatNumber(player.gold)}`)}
          ${renderBadge(`업적 ${formatNumber(player.achievementCount)} / ${formatNumber(player.achievementTotal)}`)}
          ${location.bossProgress ? renderBadge(location.bossProgress.text, 'warning') : ''}
        </div>
      </div>

      <div class="hud-meters">
        ${renderMeterCard('HP', player.hp, player.maxHp, 'hp')}
        ${renderMeterCard('MP', player.mp, player.maxMp, 'mp')}
      </div>

      <div class="hud-stat-grid">
        <article class="info-card mini-info-card">
          <span class="metric-label">Attack / Defense</span>
          <strong class="quest-title">${formatNumber(player.attack)} / ${formatNumber(player.defense)}</strong>
        </article>
        <article class="info-card mini-info-card">
          <span class="metric-label">Speed / Skill</span>
          <strong class="quest-title">${formatNumber(player.speed)} / ${formatNumber(player.skillPoints)}</strong>
        </article>
        <article class="info-card mini-info-card">
          <span class="metric-label">Inventory / Token</span>
          <strong class="quest-title">${formatNumber(player.inventoryCount)} / ${formatNumber(player.saveTokenCount)}</strong>
        </article>
      </div>

      <article class="info-card detail-card">
        <p class="eyebrow">Field Note</p>
        <p class="detail-copy">${escapeHtml(location.description)}</p>
        <div class="badge-row">
          ${renderBadge(location.firstClearRewardPreview ?? '첫 클리어 보상 없음', 'recommended')}
        </div>
      </article>

      <div class="hud-focus-stack">
        ${renderTrackedAchievementHudCard(snapshot)}
        ${focus}
        ${tracker}
      </div>
    </section>
  `;
}

function renderWorkspaceTabs(snapshot) {
  const routeState = getResumeWorkspaceState(snapshot);

  return `
    <div class="workspace-tabs">
      ${getAvailableWorkspaces(snapshot).map(workspaceId => {
        const routeStep = getWorkspaceRouteStep(routeState, workspaceId, snapshot);
        const previewStep = getWorkspacePreviewStep(routeState, workspaceId, snapshot);
        const trackedWorkspace = getTrackedAchievementWorkspaceDescriptor(snapshot, workspaceId);

        return `
        <button
          class="workspace-tab ${uiState.activeWorkspace === workspaceId ? 'active' : ''} ${previewStep ? 'preview' : ''}"
          type="button"
          ${buildInteractionAttributes(
            previewStep
              ? {
                clientAction: 'resume-step-focus',
                resumeStepId: previewStep.id
              }
              : routeStep
              ? {
                clientAction: 'resume-step-focus',
                resumeStepId: routeStep.id
              }
              : trackedWorkspace
              ? {
                uiAction: 'focus-achievement-target',
                uiValue: trackedWorkspace.entry.id
              }
              : {
                workspace: workspaceId
              }
          )}
        >
          <span class="workspace-tab-copy">
            <strong class="workspace-tab-title">${escapeHtml(WORKSPACE_META[workspaceId].label)}</strong>
            ${renderWorkspaceRouteDetail(routeState, workspaceId, snapshot)}
          </span>
          ${renderWorkspaceRouteBadge(routeState, workspaceId, snapshot)}
        </button>
      `;
      }).join('')}
    </div>
  `;
}

function getTrackedAchievementWorkspaceDescriptor(snapshot, workspaceId) {
  const trackedAchievement = getActiveTrackedAchievement(snapshot);
  if (!trackedAchievement?.entry) {
    return null;
  }

  const focus = getAchievementFocusDescriptor(trackedAchievement.entry, snapshot);
  if (focus.workspace !== workspaceId) {
    return null;
  }

  return {
    ...trackedAchievement,
    focus
  };
}

function getActiveWorkspaceAchievementTarget(snapshot) {
  return getTrackedAchievementWorkspaceDescriptor(snapshot, uiState.activeWorkspace);
}

function renderWorkspaceRouteBadge(routeState, workspaceId, snapshot) {
  const previewStep = getWorkspacePreviewStep(routeState, workspaceId, snapshot);
  if (previewStep) {
    return '<span class="workspace-route-badge preview">미리 보기</span>';
  }

  const routeStep = getWorkspaceRouteStep(routeState, workspaceId, snapshot);
  if (routeStep?.status === 'current') {
    return '<span class="workspace-route-badge current">현재 경로</span>';
  }

  if (routeStep?.status === 'pending') {
    return `<span class="workspace-route-badge pending">${escapeHtml(`${routeStep.order} 예정`)}</span>`;
  }

  if (routeStep?.status === 'complete') {
    return '<span class="workspace-route-badge complete">완료</span>';
  }

  const trackedWorkspace = getTrackedAchievementWorkspaceDescriptor(snapshot, workspaceId);
  if (trackedWorkspace) {
    return '<span class="workspace-route-badge target">추적 업적</span>';
  }

  return '';
}

function renderWorkspaceRouteDetail(routeState, workspaceId, snapshot) {
  const previewStep = getWorkspacePreviewStep(routeState, workspaceId, snapshot);
  if (previewStep?.title) {
    return `<span class="workspace-route-detail preview">${escapeHtml(previewStep.title)}</span>`;
  }

  const routeStep = getWorkspaceRouteStep(routeState, workspaceId, snapshot);
  if (routeStep?.status === 'current') {
    return `<span class="workspace-route-detail current">${escapeHtml(routeStep.title)}</span>`;
  }

  if (routeStep?.status === 'pending') {
    return `<span class="workspace-route-detail pending">${escapeHtml(routeStep.title)}</span>`;
  }

  if (routeStep?.status === 'complete') {
    return `<span class="workspace-route-detail complete">${escapeHtml(routeStep.title)}</span>`;
  }

  const trackedWorkspace = getTrackedAchievementWorkspaceDescriptor(snapshot, workspaceId);
  if (trackedWorkspace?.focus?.label) {
    return `<span class="workspace-route-detail target">${escapeHtml(trackedWorkspace.focus.label)}</span>`;
  }

  return '';
}

function getWorkspaceRouteStep(routeState, workspaceId, snapshot) {
  if (!routeState) {
    return null;
  }

  return routeState.stepViews.find(step => getWorkspaceForResumeTarget(step.target, snapshot) === workspaceId) ?? null;
}

function getWorkspacePreviewStep(routeState, workspaceId, snapshot) {
  if (!routeState) {
    return null;
  }

  const previewState = getResumePreviewState(snapshot);
  if (!previewState || previewState.previewWorkspace !== workspaceId) {
    return null;
  }

  return previewState.previewStep;
}

function focusQuestRoute(snapshot, laneId = getQuestAchievementLane(snapshot), questId = null) {
  uiState.activeWorkspace = 'quests';
  uiState.questLane = laneId;
  uiState.questIndex = 0;

  const { activeLane } = getQuestDeckState(snapshot);
  if (!activeLane || !questId) {
    return;
  }

  const questIndex = activeLane.entries.findIndex(entry => entry.quest?.id === questId);
  uiState.questIndex = questIndex >= 0 ? questIndex : 0;
}

function focusTravelRoute(snapshot, destinationId = null) {
  uiState.activeWorkspace = 'travel';
  const destinations = snapshot.travel?.destinations ?? [];
  const recommendedId = destinationId ?? getRecommendedTravelDestination(snapshot)?.id ?? null;
  const travelIndex = destinations.findIndex(destination => destination.id === recommendedId);
  uiState.travelIndex = clampIndex(travelIndex >= 0 ? travelIndex : 0, destinations.length);
}

function focusMarketRoute(snapshot, shopId = null, itemId = null) {
  uiState.activeWorkspace = 'market';
  const shops = snapshot.shops ?? [];
  const targetShop = shops.find(shop => shop.id === shopId) ?? shops[0] ?? null;
  if (!targetShop) {
    return;
  }

  uiState.marketShopId = targetShop.id;
  const itemIndex = targetShop.inventory.findIndex(item => item.id === itemId);
  uiState.marketIndex = clampIndex(itemIndex >= 0 ? itemIndex : 0, targetShop.inventory.length);
}

function applyResumeStepFocus(stepId, snapshot) {
  const routeState = getResumeWorkspaceState(snapshot);
  const step = routeState?.stepViews.find(entry => entry.id === stepId);
  if (!step) {
    return false;
  }

  uiState.resumePreviewStepId = step.status === 'current' ? null : step.id;

  const target = step.target ?? {};
  const smartPlan = getSmartResumePlan(snapshot);

  if (target.clientAction === 'resume-focus') {
    applySmartResumePlan(snapshot);
    return true;
  }

  if (target.clientAction === 'focus-feed') {
    applyFeedCategoryFocus(target.feedCategory ?? FEED_CATEGORY_ALL, { openWorkspace: true });
    return true;
  }

  switch (target.action) {
    case 'accept-quest':
      focusQuestRoute(snapshot, 'available', target.questId ?? null);
      return true;
    case 'complete-quest':
      focusQuestRoute(snapshot, 'completable', target.questId ?? null);
      return true;
    case 'visit-board':
      focusQuestRoute(snapshot, smartPlan.questLane ?? getQuestAchievementLane(snapshot));
      return true;
    case 'travel':
      focusTravelRoute(snapshot, target.destinationId ?? null);
      return true;
    case 'visit-market':
    case 'buy-item':
      focusMarketRoute(snapshot, target.shopId ?? null, target.itemId ?? null);
      return true;
    case 'save-game':
    case 'load-game':
      uiState.activeWorkspace = 'save';
      return true;
    case 'battle-attack':
    case 'battle-defend':
    case 'battle-skill':
    case 'battle-item':
    case 'battle-escape':
      uiState.activeWorkspace = 'combat';
      return true;
    default:
      break;
  }

  switch (target.workspace) {
    case 'quests':
      focusQuestRoute(snapshot, step.id === 'resume-route-now' ? (smartPlan.questLane ?? getQuestAchievementLane(snapshot)) : getQuestAchievementLane(snapshot));
      return true;
    case 'travel':
      focusTravelRoute(snapshot);
      return true;
    case 'market':
      focusMarketRoute(snapshot, target.shopId ?? null, target.itemId ?? null);
      return true;
    case 'feed':
      applyFeedCategoryFocus(target.feedCategory ?? smartPlan.feedCategory ?? FEED_CATEGORY_ALL, { openWorkspace: true });
      return true;
    case 'save':
      uiState.activeWorkspace = 'save';
      return true;
    case 'combat':
      uiState.activeWorkspace = 'combat';
      return true;
    default:
      break;
  }

  return false;
}

function renderWorkspaceResumePreview(snapshot) {
  const previewState = getResumePreviewState(snapshot);
  if (!previewState) {
    return '';
  }

  const { routeState, previewStep, previewWorkspace } = previewState;
  const previewMeta = WORKSPACE_META[previewWorkspace];
  const previewOutcome = getPreviewExecutionOutcome(snapshot);

  return `
    <article class="workspace-resume-preview" data-tone="${escapeHtml(previewStep.tone)}">
      <div class="workspace-resume-preview-copy">
        <p class="eyebrow">${escapeHtml(routeState.contextLabel ? `Resume Preview · ${routeState.contextLabel}` : 'Resume Preview')}</p>
        <strong class="workspace-resume-preview-title">${escapeHtml(`${previewStep.order} 단계 미리 보기`)}</strong>
        <p class="workspace-resume-preview-note">
          현재 재개 경로는 ${escapeHtml(routeState.currentStep.order)} 단계에 머물러 있습니다. 지금은 ${escapeHtml(previewMeta?.label ?? previewWorkspace)} 작업공간의 다음 장면을 미리 보고 있습니다.
        </p>
        <p class="workspace-resume-preview-detail">${escapeHtml(previewStep.title)}</p>
        <p class="workspace-resume-preview-body">${escapeHtml(previewStep.body)}</p>
        ${previewOutcome
          ? `<p class="workspace-resume-preview-followup">${escapeHtml(`${previewOutcome.label}: ${previewOutcome.summary}`)}</p>`
          : ''}
      </div>
      <div class="workspace-resume-preview-meta">
        ${renderBadge(`현재 ${routeState.currentStep.order}`, 'recommended')}
        ${previewStep.badge ? renderBadge(previewStep.badge, previewStep.tone === 'success' ? 'success' : previewStep.tone === 'warning' || previewStep.tone === 'error' ? 'warning' : 'recommended') : ''}
        ${previewStep.eta ? `<span class="duration-chip">${escapeHtml(previewStep.eta)}</span>` : ''}
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes({
            clientAction: 'resume-step-focus',
            resumeStepId: routeState.currentStep.id
          })}
        >
          현재 단계로 돌아가기
        </button>
        <button class="ghost-button inline-button" type="button" data-client-action="dismiss-resume-preview">미리 보기 닫기</button>
      </div>
    </article>
  `;
}

function renderWorkspaceResumeCommand(snapshot) {
  const previewState = getResumePreviewState(snapshot);
  if (previewState && previewState.previewWorkspace === uiState.activeWorkspace) {
    const { routeState, previewStep } = previewState;
    const actionOptions = getResumeTargetActionOptions(snapshot, uiState.activeWorkspace);
    const previewOutcome = getPreviewExecutionOutcome(snapshot);
    const availability = getResumeActionAvailability(actionOptions);
    if (!actionOptions?.actionLabel || !actionOptions.target) {
      return '';
    }

    return `
      <article class="workspace-resume-command" data-tone="${escapeHtml(previewStep.tone)}" data-mode="preview">
        <div class="workspace-resume-command-copy">
          <p class="eyebrow">${escapeHtml(routeState.contextLabel ? `Preview Command · ${routeState.contextLabel}` : 'Preview Command')}</p>
          <strong class="workspace-resume-command-title">${escapeHtml(getPreviewActionLabel(actionOptions.actionLabel))}</strong>
          <p class="workspace-resume-command-note">${escapeHtml(actionOptions.summary ?? previewStep.body)}</p>
          ${availability
            ? `<p class="workspace-resume-command-state ${escapeHtml(availability.tone)}">${escapeHtml(`${availability.label}: ${availability.detail}`)}</p>`
            : ''}
          ${previewOutcome
            ? `<p class="workspace-resume-command-followup">${escapeHtml(`${previewOutcome.label}: ${previewOutcome.summary}`)}</p>`
            : ''}
        </div>
        <div class="workspace-resume-command-meta">
          ${renderBadge(`${previewStep.order} 미리 보기`, 'recommended')}
          ${previewStep.badge ? renderBadge(previewStep.badge, previewStep.tone === 'success' ? 'success' : previewStep.tone === 'warning' || previewStep.tone === 'error' ? 'warning' : 'recommended') : ''}
          ${previewStep.eta ? `<span class="duration-chip">${escapeHtml(previewStep.eta)}</span>` : ''}
          <button
            class="inline-button"
            type="button"
            data-preview-action="true"
            ${buildInteractionAttributes(actionOptions.target)}
            ${actionOptions.disabled ? 'disabled' : ''}
          >
            ${escapeHtml(getPreviewActionLabel(actionOptions.actionLabel))}
          </button>
          ${renderResumeRecoveryAction(actionOptions)}
          <button
            class="ghost-button inline-button"
            type="button"
            ${buildInteractionAttributes({
              clientAction: 'resume-step-focus',
              resumeStepId: routeState.currentStep.id
            })}
          >
            현재 단계로 돌아가기
          </button>
        </div>
      </article>
    `;
  }

  const routeState = getResumeWorkspaceState(snapshot);
  if (!routeState?.currentStep || routeState.currentWorkspace !== uiState.activeWorkspace) {
    return '';
  }

  const actionOptions = getResumeTargetActionOptions(snapshot, uiState.activeWorkspace);
  const availability = getResumeActionAvailability(actionOptions);
  if (!actionOptions?.actionLabel || !actionOptions.target) {
    return '';
  }

  return `
    <article class="workspace-resume-command" data-tone="${escapeHtml(routeState.currentStep.tone)}">
      <div class="workspace-resume-command-copy">
        <p class="eyebrow">${escapeHtml(routeState.contextLabel ? `Resume Command · ${routeState.contextLabel}` : 'Resume Command')}</p>
        <strong class="workspace-resume-command-title">${escapeHtml(actionOptions.actionLabel)}</strong>
        <p class="workspace-resume-command-note">${escapeHtml(actionOptions.summary ?? routeState.currentStep.body)}</p>
        ${availability
          ? `<p class="workspace-resume-command-state ${escapeHtml(availability.tone)}">${escapeHtml(`${availability.label}: ${availability.detail}`)}</p>`
          : ''}
      </div>
      <div class="workspace-resume-command-meta">
        ${renderBadge(routeState.currentStep.order, 'recommended')}
        ${routeState.currentStep.badge ? renderBadge(routeState.currentStep.badge, routeState.currentStep.tone === 'success' ? 'success' : routeState.currentStep.tone === 'warning' || routeState.currentStep.tone === 'error' ? 'warning' : 'recommended') : ''}
        ${routeState.currentStep.eta ? `<span class="duration-chip">${escapeHtml(routeState.currentStep.eta)}</span>` : ''}
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes(actionOptions.target)}
          ${actionOptions.disabled ? 'disabled' : ''}
        >
          지금 실행
        </button>
        ${renderResumeRecoveryAction(actionOptions)}
      </div>
    </article>
  `;
}

function renderWorkspaceResumeSteps(snapshot) {
  const routeState = getResumeWorkspaceState(snapshot);
  const stepViews = routeState?.stepViews ?? [];
  if (!stepViews.length) {
    return '';
  }

  return `
    <div class="workspace-resume-steps">
      <div class="workspace-resume-steps-head">
        <p class="eyebrow">${escapeHtml(routeState?.contextLabel ? `Resume Steps · ${routeState.contextLabel}` : 'Resume Steps')}</p>
        <p class="detail-copy">사이드바를 열지 않고 현재 탭에서 바로 재개 순서를 따라갑니다.</p>
      </div>
      <div class="workspace-resume-step-strip">
        ${stepViews.map(step => {
          const stepWorkspace = getWorkspaceForResumeTarget(step.target, snapshot);
          const workspaceLabel = stepWorkspace === uiState.activeWorkspace
            ? '현재 탭'
            : WORKSPACE_META[stepWorkspace]?.label ?? '다음 위치';

          return `
            <button
              class="workspace-resume-step"
              type="button"
              data-tone="${escapeHtml(step.tone)}"
              data-status="${escapeHtml(step.status)}"
              ${buildInteractionAttributes({
                clientAction: 'resume-step-focus',
                resumeStepId: step.id
              })}
            >
              <span class="workspace-resume-step-order">${escapeHtml(step.order)}</span>
              <div class="workspace-resume-step-body">
                <div class="workspace-resume-step-head">
                  <strong>${escapeHtml(step.title)}</strong>
                  <span class="workspace-resume-step-destination">${escapeHtml(workspaceLabel)}</span>
                </div>
                <p>${escapeHtml(step.body)}</p>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderWorkspaceResumeReturn(snapshot) {
  const routeState = getResumeWorkspaceState(snapshot);
  if (!routeState?.currentStep || !routeState.currentWorkspace || routeState.currentWorkspace === uiState.activeWorkspace) {
    return '';
  }

  const destinationMeta = WORKSPACE_META[routeState.currentWorkspace];

  return `
    <article class="workspace-resume-return" data-tone="${escapeHtml(routeState.currentStep.tone)}">
      <div class="workspace-resume-return-copy">
        <p class="eyebrow">${escapeHtml(routeState.contextLabel ? `Resume Return · ${routeState.contextLabel}` : 'Resume Return')}</p>
        <strong class="workspace-resume-return-title">${escapeHtml(destinationMeta?.label ?? routeState.currentWorkspace)} 탭으로 복귀</strong>
        <p class="workspace-resume-return-note">
          현재 재개 경로는 ${escapeHtml(destinationMeta?.label ?? routeState.currentWorkspace)} 탭의 ${escapeHtml(routeState.currentStep.order)} 단계에 있습니다.
        </p>
        <p class="workspace-resume-return-detail">${escapeHtml(routeState.currentStep.title)}</p>
      </div>
      <div class="workspace-resume-return-meta">
        ${renderBadge(routeState.currentStep.order, 'recommended')}
        ${routeState.currentStep.badge ? renderBadge(routeState.currentStep.badge, routeState.currentStep.tone === 'success' ? 'success' : routeState.currentStep.tone === 'warning' || routeState.currentStep.tone === 'error' ? 'warning' : 'recommended') : ''}
        <button
          class="inline-button"
          type="button"
          ${buildInteractionAttributes({
            clientAction: 'resume-step-focus',
            resumeStepId: routeState.currentStep.id
          })}
        >
          현재 경로로 복귀
        </button>
      </div>
    </article>
  `;
}

function renderWorkspaceContent(snapshot) {
  switch (uiState.activeWorkspace) {
    case 'combat':
      return snapshot.battle ? renderBattle(snapshot) : renderFeed(snapshot);
    case 'quests':
      return renderQuestBoard(snapshot);
    case 'travel':
      return renderTravel(snapshot);
    case 'market':
      return renderMarket(snapshot);
    case 'inventory':
      return renderInventory(snapshot);
    case 'achievements':
      return renderAchievements(snapshot);
    case 'save':
      return renderSavePanel(snapshot);
    case 'feed':
      return renderFeed(snapshot);
    default:
      return renderQuestBoard(snapshot);
  }
}

function renderGame(snapshot) {
  uiState.activeWorkspace = normalizeWorkspace(snapshot, uiState.activeWorkspace);
  const workspaceMeta = WORKSPACE_META[uiState.activeWorkspace];
  const routeState = getResumeWorkspaceState(snapshot);
  const previewState = getResumePreviewState(snapshot);
  const achievementTarget = getActiveWorkspaceAchievementTarget(snapshot);
  const routeStripLabel = previewState
    ? (routeState?.contextLabel ? `Resume Preview · ${routeState.contextLabel}` : 'Resume Preview')
    : (routeState?.contextLabel ? `Resume Anchor · ${routeState.contextLabel}` : 'Resume Anchor');
  const routeStripTitle = previewState?.previewStep.title ?? routeState?.currentStep?.title ?? '';
  const routeStripSummary = previewState
    ? `${previewState.previewStep.order} 단계 미리 보기 · 클릭하면 ${routeState?.currentStep?.order ?? '지금'} 단계로 복귀`
    : routeState?.currentStep
      ? `${routeState.currentStep.order} 단계 · ${String(routeState.completedCount + 1)} / ${String(routeState.stepViews.length)}`
      : '';
  const routeStripTargetId = previewState?.routeState.currentStep?.id ?? routeState?.currentStep?.id ?? null;
  const routeStripStatus = previewState ? 'preview' : routeState?.currentStep?.status ?? 'current';

  return `
    <div class="game-shell">
      <aside class="sidebar-stack">
        ${renderSidebarHud(snapshot)}
        ${renderRewardHorizon(snapshot)}
        ${renderMomentumPanel(snapshot)}
        ${renderSidebarAlerts(snapshot)}
        ${renderActionRail(snapshot)}
        ${renderDockedFeed(snapshot)}
      </aside>

      <section class="panel workspace-shell">
        <div class="workspace-header">
          <div>
            <p class="eyebrow">Workspace</p>
            <h2 class="panel-title">${escapeHtml(workspaceMeta.label)}</h2>
            <p class="panel-subtitle">${escapeHtml(workspaceMeta.hint)}</p>
            ${achievementTarget ? `
              <button
                class="workspace-route-strip"
                type="button"
                data-status="target"
                ${buildInteractionAttributes({
                  uiAction: 'focus-achievement-target',
                  uiValue: achievementTarget.entry.id
                })}
              >
                <span class="workspace-route-strip-label">${escapeHtml(routeState?.contextLabel ? `Achievement Target · ${routeState.contextLabel}` : 'Achievement Target')}</span>
                <strong>${escapeHtml(achievementTarget.focus.label)}</strong>
                <span>${escapeHtml(`현재 추적 업적 ${achievementTarget.label} 목표에 맞는 작업공간입니다. ${achievementTarget.focus.hint}`)}</span>
              </button>
            ` : ''}
            ${routeState?.currentStep ? `
              <button
                class="workspace-route-strip"
                type="button"
                data-status="${escapeHtml(routeStripStatus)}"
                ${buildInteractionAttributes(routeStripTargetId
                  ? {
                    clientAction: 'resume-step-focus',
                    resumeStepId: routeStripTargetId
                  }
                  : {}
                )}
              >
                <span class="workspace-route-strip-label">${escapeHtml(routeStripLabel)}</span>
                <strong>${escapeHtml(routeStripTitle)}</strong>
                <span>${escapeHtml(routeStripSummary)}</span>
              </button>
            ` : ''}
          </div>
          <div class="slot-actions">
            <button class="ghost-button" type="button" data-client-action="refresh">상태 동기화</button>
          </div>
        </div>
        ${renderWorkspaceTabs(snapshot)}
        ${renderWorkspaceResumeReturn(snapshot)}
        ${renderWorkspaceResumePreview(snapshot)}
        ${renderPreviewCommitMarker()}
        ${uiState.resumeBrief ? `
          <article class="resume-brief-card" data-tone="${escapeHtml(uiState.resumeBrief.tone)}">
            <div class="resume-brief-head">
              <div>
                <p class="eyebrow">Resume Brief</p>
                <h3 class="panel-title">${escapeHtml(uiState.resumeBrief.title)}</h3>
                <p class="detail-copy">${escapeHtml(uiState.resumeBrief.body)}</p>
              </div>
              <div class="slot-actions">
                ${renderBadge(uiState.resumeBrief.badge, uiState.resumeBrief.tone === 'success' ? 'success' : uiState.resumeBrief.tone === 'warning' ? 'warning' : 'recommended')}
                ${uiState.resumeBrief.actionLabel ? `
                  <button class="inline-button" type="button" data-client-action="resume-focus">${escapeHtml(uiState.resumeBrief.actionLabel)}</button>
                ` : ''}
                <button class="ghost-button inline-button" type="button" data-client-action="dismiss-resume-brief">닫기</button>
              </div>
            </div>
            <p class="resume-brief-detail">${escapeHtml(uiState.resumeBrief.detail)}</p>
          </article>
        ` : ''}
        ${renderWorkspaceResumeCommand(snapshot)}
        ${renderWorkspaceResumeSteps(snapshot)}
        <div class="workspace-body">
          ${renderWorkspaceContent(snapshot)}
        </div>
      </section>
    </div>
  `;
}

function renderError(message) {
  appRoot.innerHTML = `
    <section class="panel hero-panel">
      <p class="eyebrow">Frontend Error</p>
      <h2 class="panel-title">상태를 불러오지 못했습니다.</h2>
      <p class="panel-subtitle">${escapeHtml(message)}</p>
      <div class="slot-actions">
        <button class="primary-button" type="button" data-client-action="refresh">다시 시도</button>
      </div>
    </section>
  `;
}

function render() {
  if (!uiState.snapshot) {
    renderError('스냅샷이 아직 준비되지 않았습니다.');
    return;
  }

  statusLine.textContent = getLatestMessage(uiState.snapshot);
  appRoot.innerHTML = uiState.snapshot.hasGame
    ? renderGame(uiState.snapshot)
    : renderLanding(uiState.snapshot);
}

function handleUiAction(target) {
  const snapshot = uiState.snapshot;
  const { uiAction, uiValue } = target.dataset;
  if (!snapshot?.hasGame || !uiAction) {
    return false;
  }

  uiState.resumeBrief = null;
  uiState.resumePreviewStepId = null;
  advanceResumeRoutePhase('advance');

  switch (uiAction) {
    case 'select-session-window':
      uiState.sessionWindowId = SESSION_WINDOW_OPTIONS.some(option => option.id === uiValue)
        ? uiValue
        : uiState.sessionWindowId;
      break;
    case 'select-pace-mode':
      uiState.paceMode = PACE_OPTIONS.some(option => option.id === uiValue)
        ? uiValue
        : uiState.paceMode;
      break;
    case 'select-quest-lane':
      uiState.questLane = uiValue ?? 'available';
      uiState.questIndex = 0;
      break;
    case 'quest-prev': {
      const { activeLane } = getQuestDeckState(snapshot);
      uiState.questIndex = cycleIndex(uiState.questIndex, -1, activeLane?.entries.length ?? 0);
      break;
    }
    case 'quest-next': {
      const { activeLane } = getQuestDeckState(snapshot);
      uiState.questIndex = cycleIndex(uiState.questIndex, 1, activeLane?.entries.length ?? 0);
      break;
    }
    case 'travel-prev': {
      const { total } = getTravelDeckState(snapshot);
      uiState.travelIndex = cycleIndex(uiState.travelIndex, -1, total);
      break;
    }
    case 'travel-next': {
      const { total } = getTravelDeckState(snapshot);
      uiState.travelIndex = cycleIndex(uiState.travelIndex, 1, total);
      break;
    }
    case 'select-market-shop':
      uiState.marketShopId = uiValue ?? uiState.marketShopId;
      uiState.marketIndex = 0;
      break;
    case 'market-prev': {
      const { activeShop } = getMarketDeckState(snapshot);
      uiState.marketIndex = cycleIndex(uiState.marketIndex, -1, activeShop?.inventory.length ?? 0);
      break;
    }
    case 'market-next': {
      const { activeShop } = getMarketDeckState(snapshot);
      uiState.marketIndex = cycleIndex(uiState.marketIndex, 1, activeShop?.inventory.length ?? 0);
      break;
    }
    case 'inventory-prev': {
      const { total } = getInventoryDeckState(snapshot);
      uiState.inventoryIndex = cycleIndex(uiState.inventoryIndex, -1, total);
      break;
    }
    case 'inventory-next': {
      const { total } = getInventoryDeckState(snapshot);
      uiState.inventoryIndex = cycleIndex(uiState.inventoryIndex, 1, total);
      break;
    }
    case 'select-feed-filter':
      uiState.feedFilterId = uiValue ?? FEED_FILTER_ALL;
      uiState.feedIndex = 0;
      break;
    case 'select-feed-category':
      applyFeedCategoryFocus(uiValue ?? FEED_CATEGORY_ALL);
      break;
    case 'select-achievement-category':
      uiState.achievementCategoryId = uiValue ?? ACHIEVEMENT_CATEGORY_ALL;
      break;
    case 'select-achievement-sort':
      uiState.achievementSortId = ACHIEVEMENT_SORT_OPTIONS.some(option => option.id === uiValue)
        ? uiValue
        : uiState.achievementSortId;
      break;
    case 'focus-achievement-target':
      focusAchievementTarget(uiValue ?? '', snapshot);
      break;
    case 'feed-prev': {
      const { total } = getFeedDeckState(snapshot);
      uiState.feedIndex = cycleIndex(uiState.feedIndex, -1, total);
      break;
    }
    case 'feed-next': {
      const { total } = getFeedDeckState(snapshot);
      uiState.feedIndex = cycleIndex(uiState.feedIndex, 1, total);
      break;
    }
    default:
      return false;
  }

  render();
  return true;
}

function handleClientAction(target) {
  if (target.dataset.clientAction === 'refresh') {
    void loadSnapshot();
    return true;
  }

  if (target.dataset.clientAction === 'dismiss-resume-brief') {
    uiState.resumeBrief = null;
    render();
    return true;
  }

  if (target.dataset.clientAction === 'dismiss-resume-preview') {
    uiState.resumePreviewStepId = null;
    render();
    return true;
  }

  if (target.dataset.clientAction === 'dismiss-preview-commit') {
    uiState.previewCommit = null;
    render();
    return true;
  }

  if (target.dataset.clientAction === 'dismiss-resume-route') {
    uiState.resumeRoute = null;
    uiState.resumePreviewStepId = null;
    render();
    return true;
  }

  if (target.dataset.clientAction === 'resume-focus' && uiState.snapshot?.hasGame) {
    applySmartResumePlan(uiState.snapshot);
    uiState.resumeBrief = null;
    uiState.resumePreviewStepId = null;
    advanceResumeRoutePhase('advance');
    render();
    return true;
  }

  if (target.dataset.clientAction === 'focus-feed') {
    uiState.resumeBrief = null;
    uiState.resumePreviewStepId = null;
    advanceResumeRoutePhase('advance');
    applyFeedCategoryFocus(target.dataset.feedCategory ?? FEED_CATEGORY_ALL, { openWorkspace: true });
    render();
    return true;
  }

  if (target.dataset.clientAction === 'resume-step-focus' && uiState.snapshot?.hasGame) {
    const handled = applyResumeStepFocus(target.dataset.resumeStepId ?? '', uiState.snapshot);
    if (!handled) {
      return false;
    }

    uiState.resumeBrief = null;
    render();
    return true;
  }

  return false;
}

function buildActionFromElement(element) {
  const {
    action,
    destinationId,
    questId,
    shopId,
    itemId,
    achievementId,
    trackingMode,
    skillId,
    slotNumber,
    loadIntent,
    loadAchievementTitle,
    loadAchievementProgress,
    previewAction
  } = element.dataset;
  if (!action) {
    return null;
  }

  const withPreviewAction = targetAction => (
    previewAction === 'true'
      ? {
          ...targetAction,
          previewAction: true
        }
      : targetAction
  );

  switch (action) {
    case 'load-game':
      return withPreviewAction({
        type: action,
        slotNumber: Number(slotNumber),
        ...(loadIntent ? { loadIntent } : {}),
        ...(loadAchievementTitle ? { loadAchievementTitle } : {}),
        ...(loadAchievementProgress ? { loadAchievementProgress } : {})
      });
    case 'save-game':
      return withPreviewAction({ type: action, slotNumber: Number(slotNumber) });
    case 'set-achievement-tracking-mode':
      return withPreviewAction({ type: action, mode: trackingMode });
    case 'track-achievement':
      return withPreviewAction({
        type: action,
        achievementId,
        ...(trackingMode ? { mode: trackingMode } : {})
      });
    case 'clear-achievement-tracking':
      return withPreviewAction({ type: action });
    case 'travel':
      return withPreviewAction({ type: action, destinationId });
    case 'accept-quest':
    case 'complete-quest':
      return withPreviewAction({ type: action, questId });
    case 'buy-item':
      return withPreviewAction({ type: action, shopId, itemId });
    case 'battle-skill':
      return withPreviewAction({ type: action, skillId });
    case 'battle-item':
      return withPreviewAction({ type: action, itemId });
    default:
      return withPreviewAction({ type: action });
  }
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const target = event.target.closest('[data-client-action], [data-action], [data-workspace], [data-ui-action]');
  if (!target || uiState.busy) {
    return;
  }

  if (target.dataset.clientAction && handleClientAction(target)) {
    return;
  }

  if (target.dataset.uiAction) {
    handleUiAction(target);
    return;
  }

  if (target.dataset.workspace && uiState.snapshot?.hasGame) {
    uiState.resumeBrief = null;
    uiState.resumePreviewStepId = null;
    advanceResumeRoutePhase('advance');
    uiState.activeWorkspace = normalizeWorkspace(uiState.snapshot, target.dataset.workspace);
    render();
    return;
  }

  const action = buildActionFromElement(target);
  if (action) {
    void performAction(action);
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'new-game-form') {
    return;
  }

  event.preventDefault();
  if (uiState.busy) {
    return;
  }

  const formData = new FormData(form);
  const action = {
    type: 'new-game',
    name: String(formData.get('name') ?? 'Operator').trim() || 'Operator',
    characterClass: String(formData.get('characterClass') ?? 'Warrior'),
    gameMode: String(formData.get('gameMode') ?? 'adventure')
  };

  void performAction(action);
});

void loadSnapshot();
