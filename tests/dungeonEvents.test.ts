import { getDefaultQuests } from '../src/data/quests';
import { runDungeonEvent } from '../src/systems/dungeonEvents';
import { createTestGameState } from './helpers/gameStateFactory';

describe('Dungeon events', () => {
  it('should grant supplies from a cache event', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 5
      }
    });
    gameState.player.stats.hp = 20;

    const result = runDungeonEvent(gameState, jest.fn(() => 0.1));

    expect(result.id).toBe('supply-cache');
    expect(gameState.player.inventory).toContain('health-potion');
  });

  it('should convert memory echoes into narrative flavor and salvage gold', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 5
      }
    });
    gameState.quests = getDefaultQuests();
    const startingGold = gameState.player.gold;

    const random = jest.fn()
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.4);
    const result = runDungeonEvent(gameState, random);

    expect(result.id).toBe('memory-echo');
    expect(gameState.player.gold).toBeGreaterThan(startingGold);
    expect(result.messages.some(message => message.text.includes('잔향'))).toBe(true);
  });

  it('should advance boss progress through a route scan event', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 5
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 8;

    const random = jest.fn()
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5);
    const result = runDungeonEvent(gameState, random);

    expect(result.id).toBe('route-scan');
    expect(gameState.position.stepsTaken).toBe(9);
    expect(result.messages.some(message => message.text.includes('1회 남았습니다'))).toBe(true);
  });

  it('should honor a preferred event id from the encounter director', () => {
    const gameState = createTestGameState({
      playerOptions: {
        currentLocation: 'memory-forest',
        level: 5
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 8;

    const result = runDungeonEvent(gameState, jest.fn(() => 0.4), {
      preferredEventId: 'route-scan'
    });

    expect(result.id).toBe('route-scan');
    expect(gameState.position.stepsTaken).toBeGreaterThan(8);
  });
});
