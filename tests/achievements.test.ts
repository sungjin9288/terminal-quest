import {
  ensureAchievementPerkState,
  ensureAchievementState,
  ensureAchievementTrackingState,
  ensureRunSummary,
  evaluateAchievements,
  formatAchievementRewardMessage,
  getAchievementSummary,
  recordRunBossDefeat,
  resetRunSummary,
  setAchievementTrackingMode,
  syncAchievementTrackingState
} from '../src/systems/achievements';
import { createTestGameState } from './helpers/gameStateFactory';

describe('Achievement system', () => {
  it('should normalize missing achievement and run summary state', () => {
    const gameState = createTestGameState();

    delete (gameState as { achievements?: unknown }).achievements;
    delete (gameState as { achievementTracking?: unknown }).achievementTracking;
    delete (gameState as { achievementPerks?: unknown }).achievementPerks;
    delete (gameState as { runSummary?: unknown }).runSummary;

    ensureAchievementState(gameState);
    ensureAchievementTrackingState(gameState);
    ensureAchievementPerkState(gameState);
    ensureRunSummary(gameState);

    expect(gameState.achievements).toEqual({ unlocked: {} });
    expect(gameState.achievementTracking).toEqual({
      mode: 'auto',
      achievementId: null,
      updatedAt: expect.any(Number),
      history: []
    });
    expect(gameState.achievementPerks).toEqual({
      inventorySizeBonus: 0,
      shopDiscountPercent: 0,
      unlockedShopTiers: []
    });
    expect(gameState.runSummary).toMatchObject({
      activeLocationId: null,
      damageTaken: 0,
      goldEarned: 0,
      goldSpent: 0,
      questsCompleted: 0,
      itemsCollected: 0,
      bossesDefeated: []
    });
  });

  it('should unlock flawless clear from current run summary', () => {
    const gameState = createTestGameState();

    resetRunSummary(gameState, 'memory-forest', 1000);
    recordRunBossDefeat(gameState, 'corruption-core', 1010);

    const evaluation = evaluateAchievements(gameState, 1020);
    const unlockedIds = evaluation.newlyUnlocked.map(achievement => achievement.id);

    expect(unlockedIds).toContain('flawless_clear');
    expect(getAchievementSummary(gameState)).toMatchObject({
      unlockedCount: 1,
      totalCount: 10
    });
    expect(evaluation.rewardGrants[0]).toMatchObject({
      achievementId: 'flawless_clear',
      skillPointsGranted: 1
    });
  });

  it('should persist multiple unlocks that resolve in a single evaluation', () => {
    const gameState = createTestGameState();

    resetRunSummary(gameState, 'memory-forest', 1000);
    gameState.statistics.bossesDefeated.push('memory-leak-titan');
    recordRunBossDefeat(gameState, 'memory-leak-titan', 1010);

    const evaluation = evaluateAchievements(gameState, 1020);
    const summary = getAchievementSummary(gameState);

    expect(evaluation.newlyUnlocked.map(achievement => achievement.id).sort()).toEqual([
      'boss_shutdown',
      'flawless_clear'
    ]);
    expect(summary.unlockedCount).toBe(2);
    expect(summary.entries.filter(entry => entry.unlocked).map(entry => entry.id).sort()).toEqual([
      'boss_shutdown',
      'flawless_clear'
    ]);
  });

  it('should seed a pinned tracking target when pin mode is enabled', () => {
    const gameState = createTestGameState();

    const result = setAchievementTrackingMode(gameState, 'pinned', {
      now: 1000,
      recordHistory: true,
      cause: '수동 설정'
    });

    expect(gameState.achievementTracking).toMatchObject({
      mode: 'pinned',
      achievementId: 'frontier_scout'
    });
    expect(result.current?.id).toBe('frontier_scout');
    expect(result.history.map(entry => entry.message)).toEqual([
      '수동 설정 후 추적 모드 변경: 핀 고정',
      '수동 설정 후 추적 고정: 전선 개척 2/4'
    ]);
  });

  it('should complete and auto-switch tracking history after an imminent unlock resolves', () => {
    const gameState = createTestGameState();

    gameState.statistics.goldSpent = 240;
    gameState.statistics.locationsDiscovered = 3;

    syncAchievementTrackingState(gameState, {
      now: 1000,
      recordHistory: true,
      cause: '상점 구매'
    });

    gameState.statistics.goldSpent = 250;
    evaluateAchievements(gameState, 1100);

    const result = syncAchievementTrackingState(gameState, {
      now: 1200,
      recordHistory: true,
      cause: '상점 구매'
    });

    expect(gameState.achievementTracking).toMatchObject({
      mode: 'auto',
      achievementId: 'frontier_scout'
    });
    expect(result.history.map(entry => entry.message)).toEqual([
      '상점 구매 후 추적 완료: 현장 조달 250/250',
      '상점 구매 후 자동 전환: 전선 개척 3/4'
    ]);
  });

  it('should grant achievement rewards exactly once on unlock', () => {
    const gameState = createTestGameState();
    gameState.statistics.questsCompleted = 1;

    const evaluation = evaluateAchievements(gameState, 1000);
    const secondEvaluation = evaluateAchievements(gameState, 1100);

    expect(evaluation.rewardGrants).toHaveLength(1);
    expect(evaluation.rewardGrants[0]).toMatchObject({
      achievementId: 'first_turn_in',
      goldGranted: 30,
      itemsAdded: [
        {
          itemId: 'save-token',
          quantity: 1
        }
      ]
    });
    expect(gameState.player.gold).toBe(130);
    expect(gameState.player.inventory.filter(itemId => itemId === 'save-token')).toHaveLength(1);
    expect(secondEvaluation.rewardGrants).toHaveLength(0);
    expect(formatAchievementRewardMessage(evaluation.rewardGrants[0])).toContain('골드 +30');
  });

  it('should apply perk rewards for economy, exploration, and collection milestones', () => {
    const gameState = createTestGameState();

    gameState.statistics.goldSpent = 250;
    gameState.statistics.locationsDiscovered = 4;
    gameState.statistics.itemsCollected = 20;

    const evaluation = evaluateAchievements(gameState, 1000);
    const unlockedIds = evaluation.newlyUnlocked.map(achievement => achievement.id).sort();

    expect(unlockedIds).toEqual([
      'field_buyer',
      'frontier_scout',
      'supply_runner'
    ]);
    expect(gameState.achievementPerks).toMatchObject({
      inventorySizeBonus: 6,
      shopDiscountPercent: 8,
      unlockedShopTiers: []
    });
    expect(gameState.player.maxInventorySize).toBe(26);
    expect(formatAchievementRewardMessage(evaluation.rewardGrants[0])).toContain('상점 할인');
  });

  it('should unlock seasonal and endgame perk rewards through shared state', () => {
    const gameState = createTestGameState();

    gameState.flags['seasonal-quest-completed'] = true;
    gameState.statistics.endgameChallengeUnlocked = true;

    const evaluation = evaluateAchievements(gameState, 1000);
    const unlockedIds = evaluation.newlyUnlocked.map(achievement => achievement.id).sort();

    expect(unlockedIds).toEqual([
      'endgame_signal',
      'seasonal_contractor'
    ]);
    expect(gameState.achievementPerks?.shopDiscountPercent).toBe(5);
    expect(gameState.achievementPerks?.unlockedShopTiers.sort()).toEqual([
      'binary-weapons:level25',
      'buffer-potions:level15'
    ]);
  });
});
