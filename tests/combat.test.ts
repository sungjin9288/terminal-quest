/**
 * Combat System Tests
 */

import {
  calculateDamage,
  checkCritical,
  checkMiss,
  determineTurnOrder
} from '../src/systems/combat';

describe('Combat System', () => {
  describe('calculateDamage', () => {
    it('should return positive damage value', () => {
      const damage = calculateDamage(20, 10, false);
      expect(damage).toBeGreaterThan(0);
    });

    it('should apply defense reduction', () => {
      const normalDamage = calculateDamage(20, 10, false);
      const reducedDamage = calculateDamage(20, 50, false);
      expect(reducedDamage).toBeLessThan(normalDamage);
    });

    it('should apply elemental multiplier', () => {
      // Run multiple times to get average due to variance
      const normalDamages: number[] = [];
      const boostedDamages: number[] = [];

      for (let i = 0; i < 20; i++) {
        normalDamages.push(calculateDamage(20, 10, false, 1.0));
        boostedDamages.push(calculateDamage(20, 10, false, 1.5));
      }

      const avgNormal = normalDamages.reduce((a, b) => a + b, 0) / normalDamages.length;
      const avgBoosted = boostedDamages.reduce((a, b) => a + b, 0) / boostedDamages.length;

      // Boosted damage should be higher on average
      expect(avgBoosted).toBeGreaterThan(avgNormal);
    });

    it('should never return negative damage', () => {
      const damage = calculateDamage(5, 100, false);
      expect(damage).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero attack', () => {
      const damage = calculateDamage(0, 10, false);
      expect(damage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkCritical', () => {
    it('should return boolean', () => {
      const result = checkCritical(20);
      expect(typeof result).toBe('boolean');
    });

    it('should always return true for 100% crit chance', () => {
      const result = checkCritical(100);
      expect(result).toBe(true);
    });

    it('should always return false for 0% crit chance', () => {
      const result = checkCritical(0);
      expect(result).toBe(false);
    });

    it('should return reasonable results for moderate crit chance', () => {
      // With 50% crit, run 100 times and expect roughly half to crit
      let crits = 0;
      for (let i = 0; i < 100; i++) {
        if (checkCritical(50)) crits++;
      }
      // Should be between 20 and 80 (extremely unlikely to fail)
      expect(crits).toBeGreaterThan(20);
      expect(crits).toBeLessThan(80);
    });
  });

  describe('checkMiss', () => {
    it('should return boolean', () => {
      const result = checkMiss(10);
      expect(typeof result).toBe('boolean');
    });

    it('should always return true for 100% evasion', () => {
      const result = checkMiss(100);
      expect(result).toBe(true);
    });

    it('should always return false for 0% evasion', () => {
      const result = checkMiss(0);
      expect(result).toBe(false);
    });
  });

  describe('determineTurnOrder', () => {
    it('should favor player when significantly faster', () => {
      // With large speed difference, player should go first most of the time
      let playerFirst = 0;
      for (let i = 0; i < 50; i++) {
        if (determineTurnOrder(100, 5) === 'player') playerFirst++;
      }
      // Player should go first almost always with 100 vs 5 speed
      expect(playerFirst).toBeGreaterThan(40);
    });

    it('should favor monster when significantly faster', () => {
      // With large speed difference, monster should go first most of the time
      let monsterFirst = 0;
      for (let i = 0; i < 50; i++) {
        if (determineTurnOrder(5, 100) === 'monster') monsterFirst++;
      }
      // Monster should go first almost always with 5 vs 100 speed
      expect(monsterFirst).toBeGreaterThan(40);
    });

    it('should return player or monster string', () => {
      const order = determineTurnOrder(10, 10);
      expect(['player', 'monster']).toContain(order);
    });

    it('should handle equal speeds with some randomness', () => {
      // With equal speeds, both outcomes should be possible
      let playerFirst = 0;
      let monsterFirst = 0;
      for (let i = 0; i < 100; i++) {
        const result = determineTurnOrder(10, 10);
        if (result === 'player') playerFirst++;
        else monsterFirst++;
      }
      // Both should occur at least sometimes
      expect(playerFirst).toBeGreaterThan(10);
      expect(monsterFirst).toBeGreaterThan(10);
    });
  });
});
