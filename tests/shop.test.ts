import { getShopInventory, buyItem } from '../src/systems/shop';
import { createTestPlayer } from './helpers/gameStateFactory';

describe('Shop System', () => {
  it('should load inventory for binary-weapons shop', () => {
    const inventory = getShopInventory('binary-weapons', 1);

    expect(inventory.length).toBeGreaterThan(0);
  });

  it('should unlock endgame inventory tier at level 30', () => {
    const weaponInventory = getShopInventory('binary-weapons', 30);
    const armorInventory = getShopInventory('armor-code', 30);
    const potionInventory = getShopInventory('buffer-potions', 30);

    expect(weaponInventory.map(entry => entry.item.id)).toContain('singularity-bow');
    expect(armorInventory.map(entry => entry.item.id)).toContain('root-crown');
    expect(potionInventory.map(entry => entry.item.id)).toContain('stability-draught');
  });

  it('should buy an item from valid shop', () => {
    const player = createTestPlayer({
      name: 'ShopTester',
      level: 10,
      gold: 1000,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });

    const result = buyItem(player, 'rusty-sword', 'binary-weapons', 1);

    expect(result.success).toBe(true);
    expect(player.inventory).toContain('rusty-sword');
    expect(player.gold).toBeLessThan(1000);
  });

  it('should fail when shop does not exist', () => {
    const player = createTestPlayer({
      name: 'ShopTester',
      level: 10,
      gold: 1000,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });

    const result = buyItem(player, 'rusty-sword', 'missing-shop', 1);

    expect(result.success).toBe(false);
  });
});
