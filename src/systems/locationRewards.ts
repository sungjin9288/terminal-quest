/**
 * Location and act clear reward application helpers
 */

import { Player } from '../types/character.js';
import { LocationRewards, ActSummary } from '../data/locations.js';
import { addItem } from './inventory.js';
import { gainExp } from './leveling.js';

export interface LocationRewardSummary {
  expGained: number;
  goldGained: number;
  rewardSkillPointsGained: number;
  levelUpSkillPointsGained: number;
  itemsAdded: string[];
  itemsFailed: string[];
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  leveledUp: boolean;
}

export interface ActRewardSummary {
  rewardSkillPointsGained: number;
  saveTokensAdded: number;
  saveTokensFailed: number;
}

function applyItemList(player: Player, itemIds: string[]): { added: string[]; failed: string[] } {
  const added: string[] = [];
  const failed: string[] = [];

  for (const itemId of itemIds) {
    const result = addItem(player, itemId, 1);
    if (result.success) {
      added.push(itemId);
    } else {
      failed.push(itemId);
    }
  }

  return { added, failed };
}

/**
 * Apply first-clear reward block from location data to player
 */
export function applyLocationFirstClearRewards(
  player: Player,
  firstClearRewards?: LocationRewards['firstClear']
): LocationRewardSummary {
  const oldLevel = player.level;

  const summary: LocationRewardSummary = {
    expGained: 0,
    goldGained: 0,
    rewardSkillPointsGained: 0,
    levelUpSkillPointsGained: 0,
    itemsAdded: [],
    itemsFailed: [],
    oldLevel,
    newLevel: player.level,
    levelsGained: 0,
    leveledUp: false
  };

  if (!firstClearRewards) {
    return summary;
  }

  if (firstClearRewards.gold > 0) {
    player.gold += firstClearRewards.gold;
    summary.goldGained = firstClearRewards.gold;
  }

  const rewardSkillPoints = firstClearRewards.skillPoints ?? 0;
  if (rewardSkillPoints > 0) {
    player.skillPoints += rewardSkillPoints;
    summary.rewardSkillPointsGained = rewardSkillPoints;
  }

  if (firstClearRewards.items.length > 0) {
    const itemResult = applyItemList(player, firstClearRewards.items);
    summary.itemsAdded.push(...itemResult.added);
    summary.itemsFailed.push(...itemResult.failed);
  }

  if (firstClearRewards.exp > 0) {
    const levelResult = gainExp(player, firstClearRewards.exp);

    summary.expGained = firstClearRewards.exp;
    summary.newLevel = levelResult.newLevel;
    summary.levelsGained = levelResult.levelsGained;
    summary.leveledUp = levelResult.leveledUp;
    summary.levelUpSkillPointsGained = levelResult.levelsGained;
  }

  return summary;
}

/**
 * Apply act clear bonus rewards (from act summary)
 */
export function applyActClearRewards(
  player: Player,
  clearRewards?: ActSummary['clearRewards']
): ActRewardSummary {
  const summary: ActRewardSummary = {
    rewardSkillPointsGained: 0,
    saveTokensAdded: 0,
    saveTokensFailed: 0
  };

  if (!clearRewards) {
    return summary;
  }

  const rewardSkillPoints = clearRewards.skillPoints ?? 0;
  if (rewardSkillPoints > 0) {
    player.skillPoints += rewardSkillPoints;
    summary.rewardSkillPointsGained = rewardSkillPoints;
  }

  const saveTokens = clearRewards.saveTokens ?? 0;
  for (let i = 0; i < saveTokens; i++) {
    const result = addItem(player, 'save-token', 1);
    if (result.success) {
      summary.saveTokensAdded += 1;
    } else {
      summary.saveTokensFailed += 1;
    }
  }

  return summary;
}
