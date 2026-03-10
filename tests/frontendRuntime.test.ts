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

describe('Frontend runtime', () => {
  let saveDir: string;

  beforeEach(() => {
    saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-frontend-'));
    process.env.TERMINAL_QUEST_SAVE_DIR = saveDir;
  });

  afterEach(() => {
    delete process.env.TERMINAL_QUEST_SAVE_DIR;
    fs.rmSync(saveDir, { recursive: true, force: true });
  });

  it('should expose landing state before a run starts', () => {
    const session = createFrontendSession();
    const snapshot = getFrontendSnapshot(session);

    expect(snapshot.scene).toBe('landing');
    expect(snapshot.hasGame).toBe(false);
    expect(snapshot.activeSaveDirectory).toBe(saveDir);
    expect(snapshot.saves).toHaveLength(3);
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
    expect(snapshot.feed[0]?.speaker).toBe('게시판 담당관');
    expect(snapshot.feed[0]?.category).toBe('hub');
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
    expect(firstQuest).toBeDefined();
    expect(firstQuest?.narrative?.npcLine).toBeTruthy();

    snapshot = performFrontendAction(session, {
      type: 'accept-quest',
      questId: firstQuest?.id ?? ''
    });

    expect(snapshot.tracker?.currentAmount).toBeDefined();
    expect(snapshot.tracker?.requiredAmount).toBeGreaterThan(0);
    expect(snapshot.tracker?.progressPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.feed[0]).toMatchObject({
      category: 'quest',
      speaker: firstQuest?.narrative?.featuredNpc,
      text: firstQuest?.narrative?.npcLine
    });

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
    expect(snapshot.feed[0]).toMatchObject({
      category: 'travel',
      speaker: '현장 기록관'
    });
    expect(snapshot.location?.bossProgress?.current).toBe(0);
    expect(snapshot.location?.bossProgress?.target).toBeGreaterThan(0);
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
      nextAchievementTitle: '전선 개척',
      nextAchievementProgress: '2/4'
    });
    expect(savedSlot?.resumeHint).toContain('게시판에서 다음 의뢰');
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
