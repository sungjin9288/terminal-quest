/**
 * Economy helpers for progression pacing and gold sink controls.
 */

const INN_REST_BASE_COST = 18;
const INN_REST_LEVEL_SCALING = 4;

/**
 * Calculate inn rest cost from player level.
 * Scales linearly to keep sinks relevant across acts.
 */
export function getInnRestCost(playerLevel: number): number {
  const normalizedLevel = Math.max(1, Math.floor(playerLevel));
  return INN_REST_BASE_COST + (normalizedLevel - 1) * INN_REST_LEVEL_SCALING;
}

/**
 * Check if a gold amount can cover a specific cost.
 */
export function canAffordCost(currentGold: number, cost: number): boolean {
  const normalizedCost = Math.max(0, Math.floor(cost));
  return currentGold >= normalizedCost;
}
