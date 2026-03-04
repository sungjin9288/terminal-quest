import {
  ensureQuestState,
  acceptQuest,
  updateQuestProgressOnKill
} from '../src/systems/quest';
import { getQuestTrackerSummary } from '../src/systems/questTracker';
import { createQuestTestGameState } from './helpers/questFixtureFactory';

describe('Quest Tracker', () => {
  it('should return null when there are no active quests', () => {
    const gameState = createQuestTestGameState({
      playerOptions: { name: 'TrackerTester' }
    });
    ensureQuestState(gameState);

    const summary = getQuestTrackerSummary(gameState);
    expect(summary).toBeNull();
  });

  it('should return active quest summary with progress', () => {
    const gameState = createQuestTestGameState({
      playerOptions: { name: 'TrackerTester' }
    });
    ensureQuestState(gameState);
    acceptQuest(gameState, 'slime-cleanup');
    updateQuestProgressOnKill(gameState, 'bug-slime', 1);

    const summary = getQuestTrackerSummary(gameState);

    expect(summary).not.toBeNull();
    expect(summary?.questId).toBe('slime-cleanup');
    expect(summary?.status).toBe('active');
    expect(summary?.currentAmount).toBe(1);
    expect(summary?.requiredAmount).toBe(3);
  });

  it('should prioritize completable quests over active quests', () => {
    const gameState = createQuestTestGameState({
      playerOptions: { name: 'TrackerTester' }
    });
    ensureQuestState(gameState);
    acceptQuest(gameState, 'forest-survey');
    acceptQuest(gameState, 'slime-cleanup');
    updateQuestProgressOnKill(gameState, 'bug-slime', 3);

    const summary = getQuestTrackerSummary(gameState);

    expect(summary).not.toBeNull();
    expect(summary?.questId).toBe('slime-cleanup');
    expect(summary?.status).toBe('ready');
  });
});
