/**
 * Leveling System Tests
 */

import {
  getExpForNextLevel,
  calculateStatGrowth,
  gainExp,
  canLevelUp,
  getLevelProgress,
  calculateMonsterExp
} from '../src/systems/leveling';
import { CharacterClass } from '../src/types/character';
import { createTestPlayer as createPlayerFixture } from './helpers/gameStateFactory';

describe('Leveling System', () => {
  // Create a fresh player for testing
  function createTestPlayer(level: number = 1) {
    const player = createPlayerFixture({
      name: 'TestPlayer',
      characterClass: CharacterClass.Warrior,
      level,
      gold: 100,
      currentLocation: 'bit-town',
      unlockedLocations: ['bit-town']
    });
    player.experienceToNextLevel = getExpForNextLevel(level);
    player.stats.mp = 30;
    player.stats.maxMp = 30;
    player.stats.attack = 15;
    player.stats.defense = 10;
    player.stats.magicPower = 5;
    player.stats.magicDefense = 5;
    player.stats.speed = 10;
    player.baseStats = { ...player.stats };
    return player;
  }

  describe('getExpForNextLevel', () => {
    it('should return 100 for level 1', () => {
      const exp = getExpForNextLevel(1);
      expect(exp).toBe(100);
    });

    it('should increase exp requirement with level', () => {
      const expLevel1 = getExpForNextLevel(1);
      const expLevel5 = getExpForNextLevel(5);
      const expLevel10 = getExpForNextLevel(10);

      expect(expLevel5).toBeGreaterThan(expLevel1);
      expect(expLevel10).toBeGreaterThan(expLevel5);
    });

    it('should return positive value for any valid level', () => {
      for (let level = 1; level <= 30; level++) {
        expect(getExpForNextLevel(level)).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateMonsterExp', () => {
    it('should return base exp when player and monster level are equal', () => {
      const exp = calculateMonsterExp(5, 5);
      expect(exp).toBeGreaterThan(0);
    });

    it('should give bonus exp when fighting higher level monsters', () => {
      const bonusExp = calculateMonsterExp(8, 5); // monster level 8, player level 5
      const normalExp = calculateMonsterExp(5, 5);
      expect(bonusExp).toBeGreaterThan(normalExp);
    });

    it('should give reduced exp when fighting lower level monsters', () => {
      const reducedExp = calculateMonsterExp(5, 10); // monster level 5, player level 10
      const normalExp = calculateMonsterExp(10, 10);
      expect(reducedExp).toBeLessThan(normalExp);
    });

    it('should give more exp for boss monsters', () => {
      const bossExp = calculateMonsterExp(5, 5, true);
      const normalExp = calculateMonsterExp(5, 5, false);
      expect(bossExp).toBeGreaterThan(normalExp);
    });

    it('should never return negative exp', () => {
      const exp = calculateMonsterExp(1, 30);
      expect(exp).toBeGreaterThanOrEqual(0);
    });
  });

  describe('canLevelUp', () => {
    it('should return true when exp exceeds threshold', () => {
      const player = createTestPlayer(1);
      player.experience = 150; // More than 100 needed

      const result = canLevelUp(player);

      expect(result).toBe(true);
    });

    it('should return false when exp is below threshold', () => {
      const player = createTestPlayer(1);
      player.experience = 50; // Less than 100 needed

      const result = canLevelUp(player);

      expect(result).toBe(false);
    });

    it('should return true when exp equals threshold', () => {
      const player = createTestPlayer(1);
      player.experience = 100; // Exactly 100 needed

      const result = canLevelUp(player);

      expect(result).toBe(true);
    });
  });

  describe('gainExp', () => {
    it('should add experience to player', () => {
      const player = createTestPlayer(1);
      const initialExp = player.experience;

      gainExp(player, 50);

      expect(player.experience).toBe(initialExp + 50);
    });

    it('should return level up info when leveling up', () => {
      const player = createTestPlayer(1);

      const result = gainExp(player, 150);

      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.levelsGained).toBe(1);
    });

    it('should not level up when exp is insufficient', () => {
      const player = createTestPlayer(1);

      const result = gainExp(player, 50);

      expect(result.leveledUp).toBe(false);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(1);
      expect(result.levelsGained).toBe(0);
    });

    it('should increase stats on level up', () => {
      const player = createTestPlayer(1);
      const initialMaxHp = player.stats.maxHp;

      gainExp(player, 150);

      expect(player.stats.maxHp).toBeGreaterThan(initialMaxHp);
    });

    it('should grant one skill point per level up', () => {
      const player = createTestPlayer(1);
      player.skillPoints = 0;

      gainExp(player, 150);

      expect(player.level).toBe(2);
      expect(player.skillPoints).toBe(1);
    });

    it('should grant multiple skill points on multiple level ups', () => {
      const player = createTestPlayer(1);
      player.skillPoints = 0;

      const result = gainExp(player, 400);

      expect(player.level).toBeGreaterThanOrEqual(3);
      expect(player.skillPoints).toBe(player.level - 1);
      expect(result.levelsGained).toBe(player.level - result.oldLevel);
    });
  });

  describe('getLevelProgress', () => {
    it('should return 0 for no exp', () => {
      const player = createTestPlayer(1);
      player.experience = 0;

      const progress = getLevelProgress(player);

      expect(progress).toBe(0);
    });

    it('should return value between 0 and 100', () => {
      const player = createTestPlayer(1);
      player.experience = 50;

      const progress = getLevelProgress(player);

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should return 50 when halfway to next level', () => {
      const player = createTestPlayer(1);
      player.experience = 50; // 50% of 100 needed

      const progress = getLevelProgress(player);

      expect(progress).toBe(50);
    });
  });

  describe('calculateStatGrowth', () => {
    it('should return class-specific stat growth', () => {
      const warriorGrowth = calculateStatGrowth(CharacterClass.Warrior, 2);
      const mageGrowth = calculateStatGrowth(CharacterClass.Mage, 2);

      expect(warriorGrowth).toBeDefined();
      expect(mageGrowth).toBeDefined();
    });

    it('should return higher HP for warriors', () => {
      const warriorGrowth = calculateStatGrowth(CharacterClass.Warrior, 2);
      const mageGrowth = calculateStatGrowth(CharacterClass.Mage, 2);

      // Warriors should have higher HP growth
      expect(warriorGrowth.maxHp || 0).toBeGreaterThanOrEqual(mageGrowth.maxHp || 0);
    });

    it('should return higher MP for mages', () => {
      const warriorGrowth = calculateStatGrowth(CharacterClass.Warrior, 2);
      const mageGrowth = calculateStatGrowth(CharacterClass.Mage, 2);

      // Mages should have higher MP growth
      expect(mageGrowth.maxMp || 0).toBeGreaterThanOrEqual(warriorGrowth.maxMp || 0);
    });

    it('should scale with level', () => {
      const lowLevelGrowth = calculateStatGrowth(CharacterClass.Warrior, 2);
      const highLevelGrowth = calculateStatGrowth(CharacterClass.Warrior, 10);

      // Stats should grow or stay similar with level
      expect(highLevelGrowth.maxHp || 0).toBeGreaterThanOrEqual(lowLevelGrowth.maxHp || 0);
    });
  });
});
