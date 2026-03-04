import {
  applyLocationFirstClearRewards,
  applyActClearRewards
} from '../src/systems/locationRewards';
import { createTestPlayer } from './helpers/gameStateFactory';

describe('Location Rewards', () => {
  it('should apply first-clear rewards including level up and skill points', () => {
    const player = createTestPlayer({
      name: 'RewardTester',
      level: 1,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });

    const result = applyLocationFirstClearRewards(player, {
      exp: 150,
      gold: 200,
      items: ['health-potion', 'mana-potion'],
      skillPoints: 2
    });

    expect(result.expGained).toBe(150);
    expect(result.goldGained).toBe(200);
    expect(result.rewardSkillPointsGained).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.levelUpSkillPointsGained).toBe(1);
    expect(result.itemsAdded).toEqual(['health-potion', 'mana-potion']);
    expect(result.itemsFailed).toEqual([]);

    expect(player.level).toBe(2);
    expect(player.gold).toBe(300);
    expect(player.skillPoints).toBe(3);
  });

  it('should report failed item rewards when inventory is full', () => {
    const player = createTestPlayer({
      name: 'RewardTester',
      level: 1,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });
    player.maxInventorySize = 0;

    const result = applyLocationFirstClearRewards(player, {
      exp: 0,
      gold: 0,
      items: ['health-potion', 'mana-potion']
    });

    expect(result.itemsAdded).toEqual([]);
    expect(result.itemsFailed).toEqual(['health-potion', 'mana-potion']);
  });

  it('should apply act clear rewards', () => {
    const player = createTestPlayer({
      name: 'RewardTester',
      level: 1,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });
    player.skillPoints = 1;

    const result = applyActClearRewards(player, {
      skillPoints: 5,
      saveTokens: 2
    });

    expect(result.rewardSkillPointsGained).toBe(5);
    expect(result.saveTokensAdded).toBe(2);
    expect(result.saveTokensFailed).toBe(0);
    expect(player.skillPoints).toBe(6);
    expect(player.inventory.filter(itemId => itemId === 'save-token')).toHaveLength(2);
  });

  it('should report failed save token rewards when inventory is full', () => {
    const player = createTestPlayer({
      name: 'RewardTester',
      level: 1,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });
    player.maxInventorySize = 0;

    const result = applyActClearRewards(player, {
      saveTokens: 2
    });

    expect(result.saveTokensAdded).toBe(0);
    expect(result.saveTokensFailed).toBe(2);
  });
});
