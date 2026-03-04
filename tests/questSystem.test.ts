import {
  ensureQuestState,
  acceptQuest,
  getAvailableQuests,
  getCompletedQuests,
  getCompletableQuests,
  updateQuestProgressOnKill,
  updateQuestProgressOnTalk,
  updateQuestProgressOnExplore,
  completeQuest
} from '../src/systems/quest';
import { createQuestTestGameState } from './helpers/questFixtureFactory';
import { refreshSeasonalEventState } from '../src/systems/seasonalEvents';

describe('Quest System', () => {
  it('should initialize default quests for a new game state', () => {
    const gameState = createQuestTestGameState();

    ensureQuestState(gameState);
    const questIds = Object.keys(gameState.quests);

    expect(questIds).toEqual(
      expect.arrayContaining([
        'slime-cleanup',
        'forest-survey',
        'ghost-debugging',
        'potion-supply',
        'board-checkin',
        'merchant-network',
        'inn-consult'
      ])
    );
    expect(questIds.length).toBeGreaterThanOrEqual(25);

    const prerequisiteUsage = new Map<string, number>();
    for (const quest of Object.values(gameState.quests)) {
      for (const prerequisiteId of quest.prerequisites) {
        prerequisiteUsage.set(
          prerequisiteId,
          (prerequisiteUsage.get(prerequisiteId) ?? 0) + 1
        );
      }
    }
    const branchRootCount = Array.from(prerequisiteUsage.values())
      .filter(count => count >= 2)
      .length;
    expect(branchRootCount).toBeGreaterThanOrEqual(4);

    expect(gameState.player.activeQuests).toEqual([]);
    expect(gameState.player.completedQuests).toEqual([]);
  });

  it('should use current inventory when accepting collect quest', () => {
    const gameState = createQuestTestGameState();
    gameState.player.inventory.push('health-potion', 'health-potion');
    ensureQuestState(gameState);

    const accepted = acceptQuest(gameState, 'potion-supply');
    expect(accepted.success).toBe(true);
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('potion-supply');
  });

  it('should enforce prerequisites on quest acceptance', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);

    const blocked = acceptQuest(gameState, 'ghost-debugging');
    expect(blocked.success).toBe(false);

    const accepted = acceptQuest(gameState, 'slime-cleanup');
    expect(accepted.success).toBe(true);
    expect(gameState.player.activeQuests).toContain('slime-cleanup');
  });

  it('should progress kill objective and mark quest completable', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);
    acceptQuest(gameState, 'slime-cleanup');

    updateQuestProgressOnKill(gameState, 'bug-slime', 2);
    const updates = updateQuestProgressOnKill(gameState, 'bug-slime', 1);

    expect(updates.some(update => update.questReadyToComplete)).toBe(true);
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('slime-cleanup');
  });

  it('should complete quest and apply rewards', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);
    acceptQuest(gameState, 'slime-cleanup');
    updateQuestProgressOnKill(gameState, 'bug-slime', 3);

    const result = completeQuest(gameState, 'slime-cleanup');

    expect(result.success).toBe(true);
    expect(result.expGained).toBe(120);
    expect(result.goldGained).toBe(90);
    expect(result.itemsAdded).toContain('health-potion');
    expect(result.levelsGained).toBe(1);
    expect(gameState.player.level).toBe(2);
    expect(gameState.player.completedQuests).toContain('slime-cleanup');
    expect(gameState.player.activeQuests).not.toContain('slime-cleanup');
    expect(gameState.statistics.questsCompleted).toBe(1);
  });

  it('should return completed quests after completion', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);
    acceptQuest(gameState, 'slime-cleanup');
    updateQuestProgressOnKill(gameState, 'bug-slime', 3);
    completeQuest(gameState, 'slime-cleanup');

    const completedQuests = getCompletedQuests(gameState);

    expect(completedQuests.map(quest => quest.id)).toContain('slime-cleanup');
  });

  it('should progress explore objective on location entry', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);
    acceptQuest(gameState, 'forest-survey');

    const updates = updateQuestProgressOnExplore(gameState, 'memory-forest');

    expect(updates.length).toBeGreaterThan(0);
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('forest-survey');
  });

  it('should progress talk objective on interaction', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);
    acceptQuest(gameState, 'board-checkin');

    const updates = updateQuestProgressOnTalk(gameState, 'quest-board');

    expect(updates.length).toBeGreaterThan(0);
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('board-checkin');
  });

  it('should progress merchant talk quest after board check-in completion', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);

    acceptQuest(gameState, 'board-checkin');
    updateQuestProgressOnTalk(gameState, 'quest-board');
    completeQuest(gameState, 'board-checkin');

    const accepted = acceptQuest(gameState, 'merchant-network');
    expect(accepted.success).toBe(true);

    updateQuestProgressOnTalk(gameState, 'merchant');
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('merchant-network');
  });

  it('should progress innkeeper talk quest after board check-in completion', () => {
    const gameState = createQuestTestGameState();
    ensureQuestState(gameState);

    acceptQuest(gameState, 'board-checkin');
    updateQuestProgressOnTalk(gameState, 'quest-board');
    completeQuest(gameState, 'board-checkin');

    const accepted = acceptQuest(gameState, 'inn-consult');
    expect(accepted.success).toBe(true);

    updateQuestProgressOnTalk(gameState, 'innkeeper');
    expect(getCompletableQuests(gameState).map(quest => quest.id)).toContain('inn-consult');
  });

  it('should gate seasonal quests by active event flag', () => {
    const gameState = createQuestTestGameState({
      playerOptions: {
        level: 30
      }
    });
    ensureQuestState(gameState);
    gameState.player.completedQuests.push('final-purge');
    ensureQuestState(gameState);

    const beforeEventIds = getAvailableQuests(gameState).map(quest => quest.id);
    expect(beforeEventIds).not.toContain('spring-memory-festival-sweep');

    refreshSeasonalEventState(gameState, new Date('2026-03-04T00:00:00Z'));
    const afterEventIds = getAvailableQuests(gameState).map(quest => quest.id);
    expect(afterEventIds).toContain('spring-memory-festival-sweep');
  });

  it('should reset repeatable seasonal quest after completion', () => {
    const gameState = createQuestTestGameState({
      playerOptions: {
        level: 30
      }
    });
    gameState.player.inventory.push('save-token');
    ensureQuestState(gameState);
    gameState.player.completedQuests.push('final-purge');
    refreshSeasonalEventState(gameState, new Date('2026-03-04T00:00:00Z'));
    ensureQuestState(gameState);

    const accepted = acceptQuest(gameState, 'spring-memory-festival-sweep');
    expect(accepted.success).toBe(true);

    updateQuestProgressOnKill(gameState, 'corruption-spawn', 5);
    const result = completeQuest(gameState, 'spring-memory-festival-sweep');

    expect(result.success).toBe(true);
    expect(result.repeatableReset).toBe(true);
    expect(result.expGained).toBeGreaterThan(result.baseExpGained);
    expect(result.goldGained).toBeGreaterThan(result.baseGoldGained);
    expect(gameState.quests['spring-memory-festival-sweep']?.status).toBe('not-started');
    expect(gameState.player.completedQuests).not.toContain('spring-memory-festival-sweep');

    const acceptedAgain = acceptQuest(gameState, 'spring-memory-festival-sweep');
    expect(acceptedAgain.success).toBe(true);
  });
});
