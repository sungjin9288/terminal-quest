import {
  decideDungeonExploreOutcome,
  recordEncounterDirectorExploreOutcome,
  resetEncounterDirectorFatigue
} from '../src/systems/aiEncounterDirector';
import { ensureAiState } from '../src/systems/aiDirector';
import { createTestGameState } from './helpers/gameStateFactory';

describe('AI Encounter Director', () => {
  it('should steer low-resource dungeon states toward a recovery event', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 4
      }
    });
    gameState.player.stats.hp = Math.floor(gameState.player.stats.maxHp * 0.35);
    gameState.player.stats.mp = Math.floor(gameState.player.stats.maxMp * 0.2);

    const decision = decideDungeonExploreOutcome(gameState, () => 0.9);

    expect(decision.mode).toBe('recovery');
    expect(decision.outcome).toBe('event');
    expect(decision.preferredEventId).toBe('maintenance-niche');
    expect(decision.encounterChance).toBeLessThan(0.3);
  });

  it('should force combat when the boss encounter is ready', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 4
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 10;

    const decision = decideDungeonExploreOutcome(gameState, () => 0.99);

    expect(decision.mode).toBe('pressure');
    expect(decision.outcome).toBe('combat');
    expect(decision.encounterChance).toBe(1);
  });

  it('should prefer a route scan event after repeated combats near the boss line', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 4
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 8;
    const aiState = ensureAiState(gameState);
    aiState.fatigueSnapshot.consecutiveCombats = 3;
    aiState.fatigueSnapshot.repeatActionCount = 3;
    aiState.fatigueSnapshot.consecutiveNonProgressLoops = 3;

    const decision = decideDungeonExploreOutcome(gameState, () => 0.9);

    expect(decision.mode).toBe('variety');
    expect(decision.outcome).toBe('event');
    expect(decision.preferredEventId).toBe('route-scan');
  });

  it('should apply a sharper pressure profile inside the active endgame challenge', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'corruption-space',
        unlockedLocations: ['bit-town', 'corruption-space'],
        level: 30
      }
    });
    gameState.position.locationId = 'corruption-space';
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 7;
    gameState.statistics.endgameChallengeTier = 3;
    gameState.statistics.endgameChallengeCurrentStreak = 4;
    gameState.statistics.endgameChallengeBestStreak = 4;

    const decision = decideDungeonExploreOutcome(gameState, () => 0.75);

    expect(decision.mode).toBe('pressure');
    expect(decision.outcome).toBe('combat');
    expect(decision.encounterChance).toBeGreaterThanOrEqual(0.8);
    expect(decision.challengeContext).toMatchObject({
      tier: 3,
      streak: 4,
      modifierName: expect.any(String)
    });
    expect(decision.reason).toContain('심연 T3');
  });

  it('should keep endgame fatigue mitigation on a pressured route-scan path', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'corruption-space',
        unlockedLocations: ['bit-town', 'corruption-space'],
        level: 30
      }
    });
    gameState.position.locationId = 'corruption-space';
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 1;
    gameState.statistics.endgameChallengeTier = 1;
    gameState.statistics.endgameChallengeCurrentStreak = 0;
    gameState.statistics.endgameChallengeBestStreak = 0;
    const aiState = ensureAiState(gameState);
    aiState.fatigueSnapshot.consecutiveCombats = 3;
    aiState.fatigueSnapshot.repeatActionCount = 3;
    aiState.fatigueSnapshot.consecutiveNonProgressLoops = 3;

    const decision = decideDungeonExploreOutcome(gameState, () => 0.95);

    expect(decision.mode).toBe('variety');
    expect(decision.outcome).toBe('event');
    expect(decision.encounterChance).toBeGreaterThanOrEqual(0.46);
    expect(decision.preferredEventId).toBe('route-scan');
    expect(decision.reason).toContain('압박만 재배치');
  });

  it('should update and reset fatigue snapshot from explore outcomes', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 4
      }
    });
    const aiState = ensureAiState(gameState);

    recordEncounterDirectorExploreOutcome(gameState, { outcome: 'combat' });
    expect(aiState.fatigueSnapshot).toMatchObject({
      repeatActionCount: 1,
      consecutiveCombats: 1,
      consecutiveNonProgressLoops: 1
    });

    recordEncounterDirectorExploreOutcome(gameState, {
      outcome: 'event',
      eventId: 'route-scan'
    });
    expect(aiState.fatigueSnapshot).toMatchObject({
      repeatActionCount: 0,
      consecutiveCombats: 0,
      consecutiveNonProgressLoops: 0
    });

    recordEncounterDirectorExploreOutcome(gameState, {
      outcome: 'event',
      eventId: 'memory-echo'
    });
    expect(aiState.fatigueSnapshot.repeatActionCount).toBe(1);
    expect(aiState.fatigueSnapshot.consecutiveNonProgressLoops).toBe(1);

    resetEncounterDirectorFatigue(gameState, 'rest');
    expect(aiState.fatigueSnapshot).toMatchObject({
      repeatActionCount: 0,
      consecutiveCombats: 0,
      consecutiveNonProgressLoops: 0
    });
  });
});
