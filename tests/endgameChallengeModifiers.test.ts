import {
  FINAL_BOSS_ID,
  applyEndgameChallengeVictory,
  getEndgameChallengeState,
  listEndgameChallengeModifiers,
  scaleMonsterForEndgame
} from '../src/systems/endgameChallenge';
import { createTestGameState } from './helpers/gameStateFactory';
import { createTestMonster } from './helpers/dataFixtureFactory';

describe('Endgame Challenge Modifiers', () => {
  it('should expose stable modifier metadata', () => {
    const modifiers = listEndgameChallengeModifiers();

    expect(modifiers.length).toBeGreaterThanOrEqual(4);
    expect(new Set(modifiers.map(modifier => modifier.id)).size).toBe(modifiers.length);
    expect(modifiers.every(modifier => modifier.bonusRewardEveryClears >= 4)).toBe(true);
  });

  it('should resolve active modifier only in endgame challenge location', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'corruption-space',
        level: 30
      }
    });
    gameState.statistics.bossesDefeated.push(FINAL_BOSS_ID);
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 2;
    gameState.statistics.endgameChallengeTier = 1;
    gameState.statistics.endgameChallengeCurrentStreak = 1;
    gameState.statistics.endgameChallengeBestStreak = 1;

    const activeState = getEndgameChallengeState(gameState, 'corruption-space');
    expect(activeState.active).toBe(true);
    expect(activeState.modifier).not.toBeNull();
    expect(activeState.goldMultiplier).toBeGreaterThan(1);
    expect(activeState.expMultiplier).toBeGreaterThan(1);

    const inactiveState = getEndgameChallengeState(gameState, 'bit-town');
    expect(inactiveState.active).toBe(false);
    expect(inactiveState.modifier).toBeNull();
    expect(inactiveState.expMultiplier).toBe(1);
  });

  it('should scale monster stats and rewards with active modifier', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'corruption-space',
        level: 30
      }
    });
    gameState.statistics.bossesDefeated.push(FINAL_BOSS_ID);
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 4;
    gameState.statistics.endgameChallengeTier = 2;
    gameState.statistics.endgameChallengeCurrentStreak = 3;
    gameState.statistics.endgameChallengeBestStreak = 3;

    const challengeState = getEndgameChallengeState(gameState, 'corruption-space');
    const monster = createTestMonster({
      id: 'modifier-test',
      name: 'Modifier Target',
      level: 12,
      expReward: 120
    });

    const scaledMonster = scaleMonsterForEndgame(monster, challengeState);

    expect(scaledMonster.name).toContain(`[심연 T${challengeState.tier}]`);
    expect(scaledMonster.level).toBeGreaterThan(monster.level);
    expect(scaledMonster.stats.maxHp).toBeGreaterThan(monster.stats.maxHp);
    expect(scaledMonster.dropTable.minGold).toBeGreaterThan(monster.dropTable.minGold);
    expect(scaledMonster.expReward).toBeGreaterThan(monster.expReward);
  });

  it('should trigger deterministic modifier bonus rewards on cycle clears', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'corruption-space',
        level: 30
      }
    });
    gameState.statistics.bossesDefeated.push(FINAL_BOSS_ID);
    gameState.statistics.endgameChallengeUnlocked = true;

    let challengeState = getEndgameChallengeState(gameState, 'corruption-space');
    let matched = false;

    for (let clears = 0; clears < 40; clears += 1) {
      gameState.statistics.endgameChallengeClears = clears;
      gameState.statistics.endgameChallengeCurrentStreak = 0;
      gameState.statistics.endgameChallengeBestStreak = 0;
      gameState.statistics.endgameChallengeTier = 1;

      challengeState = getEndgameChallengeState(gameState, 'corruption-space');
      if (
        challengeState.modifier &&
        (clears + 1) % challengeState.modifier.bonusRewardEveryClears === 0
      ) {
        matched = true;
        break;
      }
    }

    expect(matched).toBe(true);

    const progress = applyEndgameChallengeVictory(gameState, challengeState);
    expect(progress).not.toBeNull();
    expect(progress?.modifierBonusTriggered).toBe(true);
    expect((progress?.grantedItems.length ?? 0) + (progress?.failedItems.length ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
