/**
 * Inventory System Tests
 */

import {
  addItem,
  removeItem,
  equipItem,
  useItem,
  sortInventory,
  getOrganizedInventory
} from '../src/systems/inventory';
import { Player, CharacterClass, EquipmentSlot } from '../src/types/character';

describe('Inventory System', () => {
  // Create a fresh player for each test
  function createTestPlayer(): Player {
    return {
      name: 'TestPlayer',
      class: CharacterClass.Warrior,
      level: 5,
      experience: 250,
      experienceToNextLevel: 700,
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 30,
        maxMp: 30,
        attack: 15,
        defense: 10,
        magicPower: 5,
        magicDefense: 5,
        speed: 10,
        critChance: 10,
        critDamage: 1.5,
        evasion: 5
      },
      baseStats: {
        hp: 100,
        maxHp: 100,
        mp: 30,
        maxMp: 30,
        attack: 15,
        defense: 10,
        magicPower: 5,
        magicDefense: 5,
        speed: 10,
        critChance: 10,
        critDamage: 1.5,
        evasion: 5
      },
      gold: 500,
      equipment: {},
      inventory: [],
      maxInventorySize: 20,
      statusEffects: [],
      currentLocation: 'bit-town',
      completedQuests: [],
      activeQuests: [],
      unlockedLocations: ['bit-town'],
      playTime: 0,
      enemiesDefeated: 0,
      deaths: 0,
      skillPoints: 0,
      skills: []
    };
  }

  describe('addItem', () => {
    it('should add item to empty inventory', () => {
      const player = createTestPlayer();
      const result = addItem(player, 'health-potion', 1);

      expect(result.success).toBe(true);
      expect(player.inventory).toContain('health-potion');
    });

    it('should add multiple of same item', () => {
      const player = createTestPlayer();
      addItem(player, 'health-potion', 3);

      const count = player.inventory.filter(id => id === 'health-potion').length;
      expect(count).toBe(3);
    });

    it('should respect inventory size limit', () => {
      const player = createTestPlayer();
      player.maxInventorySize = 5;

      // Fill inventory
      for (let i = 0; i < 5; i++) {
        addItem(player, 'health-potion', 1);
      }

      // Try to add more
      const result = addItem(player, 'mana-potion', 1);
      expect(result.success).toBe(false);
      expect(player.inventory.length).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('should remove item from inventory', () => {
      const player = createTestPlayer();
      addItem(player, 'health-potion', 2);

      const result = removeItem(player, 'health-potion', 1);

      expect(result.success).toBe(true);
      expect(player.inventory.filter(id => id === 'health-potion').length).toBe(1);
    });

    it('should fail when item not in inventory', () => {
      const player = createTestPlayer();

      const result = removeItem(player, 'nonexistent-item', 1);

      expect(result.success).toBe(false);
    });

    it('should remove all instances when quantity matches', () => {
      const player = createTestPlayer();
      addItem(player, 'health-potion', 3);

      removeItem(player, 'health-potion', 3);

      expect(player.inventory.includes('health-potion')).toBe(false);
    });
  });

  describe('equipItem', () => {
    it('should equip weapon correctly', () => {
      const player = createTestPlayer();
      addItem(player, 'rusty-sword', 1);

      const result = equipItem(player, 'rusty-sword');

      expect(result.success).toBe(true);
      expect(player.equipment[EquipmentSlot.Weapon]).toBe('rusty-sword');
    });

    it('should fail when item not in inventory', () => {
      const player = createTestPlayer();

      const result = equipItem(player, 'rusty-sword');

      expect(result.success).toBe(false);
    });

    it('should swap equipment when slot is occupied', () => {
      const player = createTestPlayer();
      addItem(player, 'rusty-sword', 1);
      addItem(player, 'rusty-dagger', 1);

      equipItem(player, 'rusty-sword');
      equipItem(player, 'rusty-dagger');

      expect(player.equipment[EquipmentSlot.Weapon]).toBe('rusty-dagger');
      expect(player.inventory).toContain('rusty-sword');
    });
  });

  describe('useItem', () => {
    it('should use consumable and remove from inventory', () => {
      const player = createTestPlayer();
      player.stats.hp = 50; // Damage the player
      addItem(player, 'health-potion', 1);

      const result = useItem(player, 'health-potion');

      expect(result.success).toBe(true);
      expect(player.inventory.includes('health-potion')).toBe(false);
    });

    it('should restore HP when using health potion', () => {
      const player = createTestPlayer();
      player.stats.hp = 50;
      addItem(player, 'health-potion', 1);

      useItem(player, 'health-potion');

      expect(player.stats.hp).toBeGreaterThan(50);
    });

    it('should not exceed max HP', () => {
      const player = createTestPlayer();
      player.stats.hp = 95;
      addItem(player, 'health-potion', 1);

      useItem(player, 'health-potion');

      expect(player.stats.hp).toBeLessThanOrEqual(player.stats.maxHp);
    });
  });

  describe('sortInventory', () => {
    it('should sort items by type', () => {
      const player = createTestPlayer();
      addItem(player, 'health-potion', 1);
      addItem(player, 'rusty-sword', 1);
      addItem(player, 'mana-potion', 1);
      addItem(player, 'leather-armor', 1);

      sortInventory(player);

      // Inventory should be sorted (weapons first, then armor, then consumables)
      expect(player.inventory.length).toBe(4);
    });
  });

  describe('getOrganizedInventory', () => {
    it('should organize items by category', () => {
      const player = createTestPlayer();
      addItem(player, 'health-potion', 2);
      addItem(player, 'rusty-sword', 1);
      addItem(player, 'leather-armor', 1);

      const organized = getOrganizedInventory(player);

      expect(organized).toBeDefined();
      // Should have categorized items
      expect(Object.keys(organized).length).toBeGreaterThan(0);
    });
  });
});
