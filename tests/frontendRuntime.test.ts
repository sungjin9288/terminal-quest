import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  CharacterClass,
  GameMode
} from '../src/types';
import {
  createFrontendSession,
  getFrontendSnapshot,
  performFrontendAction
} from '../src/frontend/runtime';
import { ensureAiState } from '../src/systems/aiDirector';

describe('Frontend runtime', () => {
  let saveDir: string;
  let telemetryDir: string;
  let notesDir: string;
  let cycleDir: string;

  beforeEach(() => {
    saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-frontend-'));
    telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-frontend-telemetry-'));
    notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-frontend-notes-'));
    cycleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-frontend-cycle-'));
    process.env.TERMINAL_QUEST_SAVE_DIR = saveDir;
    process.env.TERMINAL_QUEST_TELEMETRY_DIR = telemetryDir;
    process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR = notesDir;
    process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR = cycleDir;
  });

  afterEach(() => {
    delete process.env.TERMINAL_QUEST_SAVE_DIR;
    delete process.env.TERMINAL_QUEST_TELEMETRY_DIR;
    delete process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR;
    delete process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR;
    fs.rmSync(saveDir, { recursive: true, force: true });
    fs.rmSync(telemetryDir, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
    fs.rmSync(cycleDir, { recursive: true, force: true });
  });

  it('should expose landing state before a run starts', () => {
    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.scene).toBe('landing');
    expect(snapshot.hasGame).toBe(false);
    expect(snapshot.activeSaveDirectory).toBe(saveDir);
    expect(snapshot.saves).toHaveLength(3);
    expect(snapshot.ops).toMatchObject({
      telemetryEvents: 0,
      playtestNotes: 0,
      topFinding: 'Encounter Director telemetry가 아직 없습니다. telemetry opt-in 상태로 탐험 세션을 먼저 수집하세요.',
      linearDrafts: []
    });
  });

  it('should expose ai ops preview from playtest telemetry and notes on landing', () => {
    fs.writeFileSync(
      path.join(telemetryDir, 'events.ndjson'),
      [
        JSON.stringify({
          eventType: 'ai_recommendation_shown',
          isoTime: '2026-03-12T01:00:00.000Z',
          context: { locationId: 'bit-town' },
          payload: {}
        }),
        JSON.stringify({
          eventType: 'ai_recommendation_dismissed',
          isoTime: '2026-03-12T01:00:05.000Z',
          context: { locationId: 'bit-town' },
          payload: { intentId: 'frontier:memory-forest', source: 'ai-card' }
        })
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(notesDir, 'session-20260312-010000.md'),
      [
        '# Session',
        '',
        '## Follow-ups',
        '- P0: Resume panel felt unclear and the AI recommendation was dismissed twice.',
        ''
      ].join('\n'),
      'utf-8'
    );

    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ops).toMatchObject({
      telemetryEvents: 2,
      playtestNotes: 1,
      doctor: {
        status: 'warn',
        recommendedCommand: 'npm run ai:ops:cycle'
      },
      status: {
        id: 'export-pending',
        label: 'Export 대기'
      },
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
        P1: 0,
        P2: 0
      },
      linearDrafts: [{
        priority: 'P0',
        theme: 'resume',
        title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
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
      }],
      nextCommand: {
        label: 'export 대상 점검',
        command: 'npm run ai:linear:export:dry',
        reason: '미수출 또는 갱신 필요 draft 1건이 있습니다.',
        tone: 'recommended'
      },
      encounterDecisionCount: 0
    });
    expect(snapshot.ops?.recommendationDismissRate).toBe(1);
  });

  it('should expose the latest persisted ai ops cycle summary in ops preview', () => {
    const nowMs = Date.now();
    const generatedAtIso = new Date(nowMs - 4 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(cycleDir, 'latest.json'),
      `${JSON.stringify({
        generatedAtIso,
        mode: 'artifact',
        overallPass: true,
        bundleDir: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-142110',
        reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-142110/playtest-report.json',
        latestSummaryPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest.json',
        latestReportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest-playtest-report.json',
        report: {
          telemetryFilePath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-142110/playtest-report.json',
          notesDir: notesDir,
          totalEvents: 0,
          totalNotes: 7,
          nextCommand: 'npm run ai:backlog:dry'
        },
        steps: [
          {
            id: 'playtest-report',
            label: 'Playtest report JSON',
            command: 'node scripts/playtest-report.js --json',
            ok: true,
            status: 0,
            outputFileName: 'playtest-report.json'
          },
          {
            id: 'ai-insights',
            label: 'AI insights',
            command: 'node scripts/generate-ai-insights-report.js --dry-run',
            ok: true,
            status: 0,
            outputFileName: 'ai-insights.txt'
          }
        ]
      }, null, 2)}\n`,
      'utf-8'
    );

    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ops?.latestCycle).toMatchObject({
      overallPass: true,
      mode: 'artifact',
      stepsPassed: 2,
      stepsTotal: 2,
      stale: false,
      ageHours: 4,
      failedSteps: [],
      nextCommand: 'npm run ai:backlog:dry'
    });
    expect(snapshot.ops?.status).toMatchObject({
      id: 'backlog-seed',
      label: 'Backlog 준비'
    });
  });

  it('should expose a follow-up command when the latest persisted ai ops cycle failed', () => {
    const nowMs = Date.now();
    const generatedAtIso = new Date(nowMs - 30 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(cycleDir, 'latest.json'),
      `${JSON.stringify({
        generatedAtIso,
        mode: 'artifact',
        overallPass: false,
        bundleDir: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000',
        reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000/playtest-report.json',
        latestSummaryPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest.json',
        latestReportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest-playtest-report.json',
        report: {
          telemetryFilePath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000/playtest-report.json',
          notesDir: notesDir,
          totalEvents: 0,
          totalNotes: 2,
          nextCommand: 'npm run ai:ops:cycle:latest'
        },
        steps: [
          {
            id: 'playtest-report',
            label: 'Playtest report JSON',
            command: 'node scripts/playtest-report.js --json',
            ok: true,
            status: 0,
            outputFileName: 'playtest-report.json'
          },
          {
            id: 'ai-insights',
            label: 'AI insights',
            command: 'node scripts/generate-ai-insights-report.js --dry-run',
            ok: false,
            status: 1,
            outputFileName: 'ai-insights.txt'
          }
        ]
      }, null, 2)}\n`,
      'utf-8'
    );

    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ops?.latestCycle).toMatchObject({
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
      ]
    });
    expect(snapshot.ops?.latestCycleFollowUp).toMatchObject({
      label: 'cycle 실패 조치',
      command: 'npm run ai:ops:cycle:latest',
      tone: 'warning'
    });
    expect(snapshot.ops?.doctor).toMatchObject({
      status: 'fail',
      recommendedCommand: 'npm run ai:ops:cycle:latest'
    });
    expect(snapshot.ops?.status).toMatchObject({
      id: 'cycle-failed',
      label: 'Cycle 실패'
    });
  });

  it('should recommend rerunning the ops cycle when the latest persisted cycle is stale', () => {
    const nowMs = Date.now();
    const generatedAtIso = new Date(nowMs - 30 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(cycleDir, 'latest.json'),
      `${JSON.stringify({
        generatedAtIso,
        mode: 'artifact',
        overallPass: true,
        bundleDir: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000',
        reportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000/playtest-report.json',
        latestSummaryPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest.json',
        latestReportJsonPath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/latest-playtest-report.json',
        report: {
          telemetryFilePath: '/tmp/terminal-quest-ai-ops-cycle-latest-view/20260316-143000/playtest-report.json',
          notesDir: notesDir,
          totalEvents: 0,
          totalNotes: 2,
          nextCommand: 'npm run ai:linear:export:dry'
        },
        steps: [
          {
            id: 'playtest-report',
            label: 'Playtest report JSON',
            command: 'node scripts/playtest-report.js --json',
            ok: true,
            status: 0,
            outputFileName: 'playtest-report.json'
          },
          {
            id: 'ai-insights',
            label: 'AI insights',
            command: 'node scripts/generate-ai-insights-report.js --dry-run',
            ok: true,
            status: 0,
            outputFileName: 'ai-insights.txt'
          }
        ]
      }, null, 2)}\n`,
      'utf-8'
    );

    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ops?.latestCycle).toMatchObject({
      overallPass: true,
      stale: true,
      ageHours: 30,
      failedSteps: []
    });
    expect(snapshot.ops?.latestCycleFollowUp).toMatchObject({
      label: 'cycle 갱신',
      command: 'npm run ai:ops:cycle',
      tone: 'warning'
    });
    expect(snapshot.ops?.doctor).toMatchObject({
      status: 'warn',
      recommendedCommand: 'npm run ai:ops:cycle'
    });
    expect(snapshot.ops?.status).toMatchObject({
      id: 'cycle-stale',
      label: 'Cycle stale'
    });
  });

  it('should start a new run and accept an available quest', () => {
    const session = createFrontendSession();

    let snapshot = performFrontendAction(session, {
      type: 'new-game',
      name: 'BrowserHero',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Adventure
    });

    expect(snapshot.scene).toBe('town');
    expect(snapshot.player?.name).toBe('BrowserHero');
    expect(snapshot.player?.experience).toBe(0);
    expect(snapshot.player?.experienceToNextLevel).toBeGreaterThan(0);
    expect(snapshot.player?.experienceRemaining).toBe(snapshot.player?.experienceToNextLevel);
    expect(snapshot.player?.experienceProgressPercent).toBe(0);
    expect(snapshot.location?.name).toBe('비트 타운');
    expect(snapshot.location?.description).toContain('안전 허브');
    expect(snapshot.feed.some(entry =>
      entry.speaker === '게시판 담당관' &&
      entry.category === 'hub'
    )).toBe(true);
    expect(snapshot.ai?.directorMode).toBe('full');
    expect(snapshot.ai?.currentIntent?.title).toBe('새 퀘스트');
    expect(snapshot.ai?.currentIntent?.recommendedAction).toBe('quest');
    expect(snapshot.ai?.narrativeCue?.title).toBe('첫 장면');
    expect(snapshot.ai?.narrativeCue?.beats).toContain('비트 타운 도착');
    expect(snapshot.ai?.recentMoments[0]?.label).toBe('비트 타운 도착');
    expect(snapshot.achievements).toMatchObject({
      unlockedCount: 0,
      totalCount: 10,
      latestUnlocked: null
    });
    expect(snapshot.achievements?.entries).toHaveLength(10);
    expect(snapshot.achievements?.entries.every(entry => entry.unlocked === false)).toBe(true);
    expect(snapshot.shops?.[0].greeting).toContain('무기');
    expect(snapshot.shops?.[0].inventory[0]?.name).toBe('녹슨 검');
    expect(snapshot.shops?.[0].inventory[0]?.description).toContain('전투 장비');

    const firstQuest = snapshot.questBoard?.available.flatMap(group => group.quests)[0];
    const reconQuest = snapshot.questBoard?.available.flatMap(group =>
      group.quests.find(quest => quest.id === 'ai-contract-frontier-recon') ? [group.quests.find(quest => quest.id === 'ai-contract-frontier-recon')] : []
    )[0];
    const cullQuest = snapshot.questBoard?.available.flatMap(group =>
      group.quests.find(quest => quest.id === 'ai-contract-frontier-cull') ? [group.quests.find(quest => quest.id === 'ai-contract-frontier-cull')] : []
    )[0];
    const availableQuestIds = snapshot.questBoard?.available.flatMap(group =>
      group.quests.map(quest => quest.id)
    ) ?? [];
    expect(availableQuestIds).toContain('ai-contract-frontier-recon');
    expect(availableQuestIds).toContain('ai-contract-frontier-cull');
    expect(firstQuest).toBeDefined();
    expect(firstQuest?.narrative?.npcLine).toBeTruthy();
    expect(reconQuest?.aiContract).toMatchObject({
      templateId: 'frontier-recon',
      directive: 'push',
      adaptive: false,
      sessionWindow: 'opening'
    });
    expect(cullQuest?.aiContract).toMatchObject({
      templateId: 'frontier-cull',
      directive: 'push',
      adaptive: true
    });

    snapshot = performFrontendAction(session, {
      type: 'accept-quest',
      questId: firstQuest?.id ?? ''
    });

    expect(snapshot.tracker?.currentAmount).toBeDefined();
    expect(snapshot.tracker?.requiredAmount).toBeGreaterThan(0);
    expect(snapshot.tracker?.progressPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.feed.some(entry =>
      entry.category === 'quest' &&
      entry.speaker === firstQuest?.narrative?.featuredNpc &&
      entry.text === firstQuest?.narrative?.npcLine
    )).toBe(true);
    expect(snapshot.feed.some(entry =>
      entry.category === 'quest' &&
      entry.speaker === '동행 기록관' &&
      entry.text.includes('기준 장면')
    )).toBe(true);
    expect(snapshot.ai?.currentIntent?.title).toBe('다음 목표');
    expect(snapshot.ai?.currentIntent?.kind).toBe('quest-objective');
    expect(snapshot.ai?.narrativeCue?.title).toBe('장면 고정');
    expect(snapshot.ai?.recentMoments[0]?.label).toBe(firstQuest?.name);

    const activeQuestIds = snapshot.questBoard?.active.flatMap(group =>
      group.quests.map(quest => quest.id)
    ) ?? [];
    expect(activeQuestIds).toContain(firstQuest?.id);
  });

  it('should attach voiced feed reactions for hub services and travel', () => {
    const session = createFrontendSession();

    let snapshot = performFrontendAction(session, {
      type: 'new-game',
      name: 'VoicePilot',
      characterClass: CharacterClass.Mage,
      gameMode: GameMode.Story
    });

    snapshot = performFrontendAction(session, {
      type: 'visit-market'
    });
    expect(snapshot.feed[0]?.speaker).toBe('무기상 캐시');
    expect(snapshot.feed[0]?.category).toBe('hub');

    snapshot = performFrontendAction(session, {
      type: 'travel',
      destinationId: 'memory-forest'
    });
    expect(snapshot.feed.some(entry =>
      entry.category === 'travel' &&
      entry.speaker === '현장 기록관'
    )).toBe(true);
    expect(snapshot.ai?.narrativeCue?.title).toBe('장면 전환');
    expect(snapshot.ai?.recentMoments[0]?.label).toBe('메모리 숲 진입');
    expect(snapshot.location?.bossProgress?.current).toBe(0);
    expect(snapshot.location?.bossProgress?.target).toBeGreaterThan(0);
  });

  it('should expose encounter director preview in dungeon snapshots', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'EncounterReader',
      characterClass: CharacterClass.Cleric,
      gameMode: GameMode.Adventure
    });

    performFrontendAction(session, {
      type: 'travel',
      destinationId: 'memory-forest'
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.player.stats.hp = Math.floor(session.gameState.player.stats.maxHp * 0.35);
    session.gameState.player.stats.mp = Math.floor(session.gameState.player.stats.maxMp * 0.25);

    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ai?.encounterDirector).toMatchObject({
      mode: 'recovery',
      preferredEventId: 'maintenance-niche'
    });
    expect(snapshot.ai?.encounterDirector?.encounterChance).toBeLessThan(0.3);
    expect(snapshot.ai?.encounterDirector?.reason).toContain('회복 이벤트');
  });

  it('should expose endgame challenge context inside encounter director snapshots', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'AbyssReader',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Challenge
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.player.currentLocation = 'corruption-space';
    session.gameState.position.locationId = 'corruption-space';
    session.gameState.player.unlockedLocations.push('corruption-space');
    session.gameState.statistics.endgameChallengeUnlocked = true;
    session.gameState.statistics.endgameChallengeClears = 7;
    session.gameState.statistics.endgameChallengeTier = 3;
    session.gameState.statistics.endgameChallengeCurrentStreak = 4;
    session.gameState.statistics.endgameChallengeBestStreak = 4;

    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.ai?.encounterDirector).toMatchObject({
      mode: 'pressure',
      challengeContext: {
        tier: 3,
        streak: 4,
        modifierName: expect.any(String)
      }
    });
    expect(snapshot.ai?.encounterDirector?.reason).toContain('심연 T3');
  });

  it('should enter combat after exploring a dungeon with an encounter roll', () => {
    const session = createFrontendSession({
      random: () => 0.1
    });

    performFrontendAction(session, {
      type: 'new-game',
      name: 'Scout',
      characterClass: CharacterClass.Rogue,
      gameMode: GameMode.Adventure
    });

    let snapshot = performFrontendAction(session, {
      type: 'travel',
      destinationId: 'memory-forest'
    });

    expect(snapshot.scene).toBe('dungeon');
    expect(snapshot.location?.id).toBe('memory-forest');

    snapshot = performFrontendAction(session, {
      type: 'dungeon-explore'
    });

    expect(snapshot.scene).toBe('combat');
    expect(snapshot.battle?.monsterName).toBeTruthy();
    expect(snapshot.battle?.skills[0]?.name).toBe('섀도 스탭');
    expect(snapshot.battle?.skills[0]?.description).toContain('치명타');
    expect(snapshot.feed.some(entry =>
      entry.speaker === '숲 순찰대' &&
      entry.category === 'combat'
    )).toBe(true);
  });

  it('should pivot a repeated combat streak into a directed dungeon event', () => {
    const random = jest.fn()
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5);
    const session = createFrontendSession({ random });

    performFrontendAction(session, {
      type: 'new-game',
      name: 'PacingPilot',
      characterClass: CharacterClass.Rogue,
      gameMode: GameMode.Adventure
    });

    performFrontendAction(session, {
      type: 'travel',
      destinationId: 'memory-forest'
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.position.locationId = 'memory-forest';
    session.gameState.position.stepsTaken = 8;
    const aiState = ensureAiState(session.gameState);
    aiState.fatigueSnapshot.consecutiveCombats = 3;
    aiState.fatigueSnapshot.repeatActionCount = 3;
    aiState.fatigueSnapshot.consecutiveNonProgressLoops = 3;

    const snapshot = performFrontendAction(session, {
      type: 'dungeon-explore'
    });

    expect(snapshot.scene).toBe('dungeon');
    expect(session.battle).toBeNull();
    expect(snapshot.feed.some(entry =>
      entry.category === 'travel' &&
      entry.text.includes('우회 동선')
    )).toBe(true);
    expect(aiState.fatigueSnapshot.consecutiveCombats).toBe(0);
    expect(aiState.fatigueSnapshot.consecutiveNonProgressLoops).toBe(0);
  });

  it('should add boss intro and victory voice lines during a boss clear', () => {
    const session = createFrontendSession({
      random: () => 0.1
    });

    performFrontendAction(session, {
      type: 'new-game',
      name: 'BossPilot',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Adventure
    });

    performFrontendAction(session, {
      type: 'travel',
      destinationId: 'memory-forest'
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.position.stepsTaken = 9;
    session.gameState.player.stats.attack = 9999;
    session.gameState.player.stats.speed = 9999;

    let snapshot = performFrontendAction(session, {
      type: 'dungeon-explore'
    });

    expect(snapshot.scene).toBe('combat');
    expect(snapshot.feed.some(entry =>
      entry.speaker === '현장 기록관' &&
      entry.text.includes('오염원')
    )).toBe(true);

    if (!session.battle) {
      throw new Error('battle state missing');
    }

    session.battle.playerTurn = true;
    session.battle.monster.currentHp = 1;
    session.battle.monster.stats.evasion = 0;

    snapshot = performFrontendAction(session, {
      type: 'battle-attack'
    });

    expect(snapshot.scene).toBe('dungeon');
    expect(snapshot.player?.achievementCount).toBe(2);
    expect(snapshot.player?.achievementTotal).toBe(10);
    expect(snapshot.achievements?.unlockedCount).toBe(2);
    expect(snapshot.achievements?.totalCount).toBe(10);
    expect(
      snapshot.achievements?.entries
        .filter(entry => entry.unlocked)
        .map(entry => entry.id)
        .sort()
    ).toEqual(['boss_shutdown', 'flawless_clear']);
    expect(snapshot.feed.some(entry => entry.text === '업적 해금: 무결점 클리어')).toBe(true);
    expect(snapshot.feed.some(entry => entry.text === '업적 해금: 오염원 차단')).toBe(true);
    expect(snapshot.feed.some(entry =>
      entry.speaker === '현장 기록관' &&
      entry.category === 'combat' &&
      entry.text.includes('압력이 빠지고')
    )).toBe(true);
    expect(snapshot.feed.some(entry =>
      entry.speaker === '현장 기록관' &&
      entry.category === 'reward' &&
      entry.text.includes('오염원 차단')
    )).toBe(true);
    expect(snapshot.ai?.narrativeCue?.title).toBe('성과 회고');
    expect(snapshot.ai?.recentMoments[0]?.label).toContain('업적 해금');
    expect(snapshot.feed.some(entry => entry.category === 'reward')).toBe(true);
  });

  it('should surface achievement counts in save slot metadata', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'Archivist',
      characterClass: CharacterClass.Cleric,
      gameMode: GameMode.Adventure
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.statistics.questsCompleted = 1;

    const snapshot = performFrontendAction(session, {
      type: 'save-game',
      slotNumber: 1
    });

    const savedSlot = snapshot.saves.find(slot => slot.slotNumber === 1);

    expect(savedSlot).toMatchObject({
      exists: true,
      achievementCount: 1,
      achievementTotal: 10,
      resumeTitle: '새 퀘스트',
      achievementTrackingMode: 'auto',
      aiDirectorMode: 'full',
      aiIntentTitle: '새 퀘스트',
      nextAchievementTitle: '전선 개척',
      nextAchievementProgress: '2/4'
    });
    expect(savedSlot?.resumeHint).toContain('게시판에서 다음 의뢰');
    expect(savedSlot?.aiIntentReason).toContain('게시판에서 다음 의뢰');
    expect(savedSlot?.nextAchievementHint).toContain('서로 다른 지역 4곳을 해금합니다.');
  });

  it('should surface explicit tracked achievement metadata when a save has an imminent unlock', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'Quartermaster',
      characterClass: CharacterClass.Rogue,
      gameMode: GameMode.Adventure
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.statistics.goldSpent = 240;

    const snapshot = performFrontendAction(session, {
      type: 'save-game',
      slotNumber: 1
    });

    const savedSlot = snapshot.saves.find(slot => slot.slotNumber === 1);

    expect(savedSlot).toMatchObject({
      exists: true,
      achievementTrackingMode: 'auto',
      trackedAchievementTitle: '현장 조달',
      trackedAchievementProgress: '240/250',
      nextAchievementTitle: '현장 조달',
      nextAchievementProgress: '240/250'
    });
    expect(savedSlot?.trackedAchievementHint).toContain('상점과 여관에 누적 250골드를 사용합니다.');
  });

  it('should expose active achievement perks in runtime snapshots and save metadata', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'PerkPilot',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Adventure
    });

    if (!session.gameState) {
      throw new Error('game state missing');
    }

    session.gameState.statistics.goldSpent = 250;
    session.gameState.statistics.locationsDiscovered = 4;
    session.gameState.statistics.itemsCollected = 20;

    const snapshot = performFrontendAction(session, {
      type: 'save-game',
      slotNumber: 1
    });

    expect(snapshot.achievementPerks).toMatchObject({
      inventorySizeBonus: 6,
      shopDiscountPercent: 8
    });
    expect(snapshot.achievementPerks?.summary).toEqual([
      '가방 +6칸',
      '상점 할인 8%'
    ]);

    const savedSlot = snapshot.saves.find(slot => slot.slotNumber === 1);
    expect(savedSlot?.achievementPerkSummary).toEqual([
      '가방 +6칸',
      '상점 할인 8%'
    ]);
  });

  it('should expose shared tracking mode and history in runtime snapshots and save metadata', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'Tracker',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Adventure
    });

    let snapshot = performFrontendAction(session, {
      type: 'set-achievement-tracking-mode',
      mode: 'pinned'
    });

    expect(snapshot.achievementTracking).toMatchObject({
      mode: 'pinned',
      current: {
        id: 'frontier_scout'
      }
    });
    expect(snapshot.feed.some(entry => entry.text.includes('추적 모드 변경: 핀 고정'))).toBe(true);

    snapshot = performFrontendAction(session, {
      type: 'track-achievement',
      achievementId: 'field_buyer'
    });

    expect(snapshot.achievementTracking).toMatchObject({
      mode: 'pinned',
      current: {
        id: 'field_buyer',
        current: 0,
        target: 250
      }
    });
    expect(snapshot.achievementTracking?.history[0]?.message).toContain('현장 조달');

    snapshot = performFrontendAction(session, {
      type: 'save-game',
      slotNumber: 1
    });

    const savedSlot = snapshot.saves.find(slot => slot.slotNumber === 1);
    expect(savedSlot).toMatchObject({
      exists: true,
      achievementTrackingMode: 'pinned',
      trackedAchievementTitle: '현장 조달',
      trackedAchievementProgress: '0/250'
    });
    expect(savedSlot?.achievementTrackingHistory).toContain('현장 조달');
  });

  it('should clear explicit tracked achievement state on demand', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'ClearTracker',
      characterClass: CharacterClass.Warrior,
      gameMode: GameMode.Adventure
    });

    performFrontendAction(session, {
      type: 'set-achievement-tracking-mode',
      mode: 'pinned'
    });

    performFrontendAction(session, {
      type: 'track-achievement',
      achievementId: 'field_buyer'
    });

    const snapshot = performFrontendAction(session, {
      type: 'clear-achievement-tracking'
    });

    expect(snapshot.achievementTracking).toMatchObject({
      mode: 'pinned',
      current: null
    });
    expect(snapshot.feed[0]?.text).toContain('추적 해제');
  });

  it('should save and load a browser run through the shared save system', () => {
    const session = createFrontendSession();

    performFrontendAction(session, {
      type: 'new-game',
      name: 'SavePilot',
      characterClass: CharacterClass.Mage,
      gameMode: GameMode.Story
    });

    let snapshot = performFrontendAction(session, {
      type: 'save-game',
      slotNumber: 1
    });

    expect(fs.existsSync(path.join(saveDir, 'slot1.json'))).toBe(true);
    expect(snapshot.saves.find(slot => slot.slotNumber === 1)?.exists).toBe(true);

    const secondSession = createFrontendSession();
    snapshot = performFrontendAction(secondSession, {
      type: 'load-game',
      slotNumber: 1
    });

    expect(snapshot.hasGame).toBe(true);
    expect(snapshot.player?.name).toBe('SavePilot');
    expect(snapshot.scene).toBe('town');
  });
});
