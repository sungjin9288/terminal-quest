import './helpers/moduleMocks';
import {
  canAffordCost,
  getInnRestCost
} from '../src/systems/economy';

describe('Economy System', () => {
  it('should scale inn rest cost by player level', () => {
    expect(getInnRestCost(1)).toBe(18);
    expect(getInnRestCost(5)).toBe(34);
    expect(getInnRestCost(10)).toBe(54);
  });

  it('should clamp inn rest cost level input to minimum 1', () => {
    expect(getInnRestCost(0)).toBe(18);
    expect(getInnRestCost(-99)).toBe(18);
  });

  it('should evaluate affordability with normalized cost', () => {
    expect(canAffordCost(100, 50)).toBe(true);
    expect(canAffordCost(49, 50)).toBe(false);
    expect(canAffordCost(0, -10)).toBe(true);
  });
});
