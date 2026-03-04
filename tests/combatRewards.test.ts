import { calculateRewards, createMonsterInstance } from '../src/systems/combat';
import { getSampleMonsters } from '../src/data/monsters';
import { createTestPlayer } from './helpers/gameStateFactory';

describe('Combat Rewards', () => {
  it('should ignore unknown drop item IDs', () => {
    const monsters = getSampleMonsters();
    const monster = createMonsterInstance(monsters.slime);
    const player = createTestPlayer({
      name: 'RewardTester',
      level: 5,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });

    monster.dropTable.guaranteed = [
      { itemId: 'health-potion', chance: 1.0, minQuantity: 1, maxQuantity: 1 },
      { itemId: 'missing-item-id', chance: 1.0, minQuantity: 1, maxQuantity: 1 }
    ];
    monster.dropTable.possible = [];
    monster.dropTable.rare = [];

    const rewards = calculateRewards(monster, player);

    expect(rewards.items).toContain('health-potion');
    expect(rewards.items).not.toContain('missing-item-id');
  });
});
