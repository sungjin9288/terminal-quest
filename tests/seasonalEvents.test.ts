import { createTestGameState } from './helpers/gameStateFactory';
import { createTestMonster } from './helpers/dataFixtureFactory';
import {
  buildSeasonalQuestBonus,
  getActiveSeasonalEvent,
  refreshSeasonalEventState,
  scaleMonsterForSeasonalEvent
} from '../src/systems/seasonalEvents';

describe('Seasonal Events', () => {
  it('should resolve active seasonal event from date and persist flag', () => {
    const gameState = createTestGameState();
    const event = refreshSeasonalEventState(gameState, new Date('2026-07-15T00:00:00Z'));

    expect(event.id).toBe('summer-overclock-rush');
    expect(gameState.flags['seasonal-event-summer-overclock-rush']).toBe(true);
    expect(getActiveSeasonalEvent(gameState)?.id).toBe('summer-overclock-rush');
  });

  it('should scale monster rewards and stats when seasonal event is active', () => {
    const gameState = createTestGameState();
    const activeEvent = refreshSeasonalEventState(gameState, new Date('2026-10-05T00:00:00Z'));
    const monster = createTestMonster({
      id: 'seasonal-target',
      expReward: 100
    });

    const scaled = scaleMonsterForSeasonalEvent(monster, activeEvent);

    expect(scaled.expReward).toBeGreaterThan(monster.expReward);
    expect(scaled.dropTable.minGold).toBeGreaterThan(monster.dropTable.minGold);
    expect(scaled.stats.maxHp).toBeGreaterThan(monster.stats.maxHp);
  });

  it('should provide deterministic quest bonus and cycle reward trigger', () => {
    const gameState = createTestGameState();
    refreshSeasonalEventState(gameState, new Date('2026-03-04T00:00:00Z'));
    gameState.statistics.questsCompleted = 2;

    const bonus = buildSeasonalQuestBonus(gameState, 100, 90);

    expect(bonus).not.toBeNull();
    expect(bonus?.expBonus).toBeGreaterThan(0);
    expect(bonus?.goldBonus).toBeGreaterThan(0);
    expect(bonus?.bonusItemTriggered).toBe(true);
    expect(bonus?.bonusItemId).toBe('save-token');
  });
});
