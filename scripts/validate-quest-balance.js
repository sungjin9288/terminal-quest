import { readFileSync } from 'fs';
import { join } from 'path';
import { getDefaultQuests } from '../dist/data/quests.js';
import { getSampleItems } from '../dist/data/items.js';
import { getSampleMonsters } from '../dist/data/monsters.js';

const QUEST_TARGETS = {
  minQuestCount: 25,
  minBranchRoots: 4,
  minMultiObjectiveQuests: 10
};

function readJson(relativePath) {
  const fullPath = join(process.cwd(), relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

function main() {
  const quests = Object.values(getDefaultQuests());
  const questById = new Map(quests.map(quest => [quest.id, quest]));
  const itemIds = new Set(Object.keys(getSampleItems()));
  const monsterIds = new Set(Object.keys(getSampleMonsters()));
  const locationsData = readJson('data/locations.json');
  const locationIds = new Set([
    locationsData.hub?.id,
    ...(locationsData.locations ?? []).map(location => location.id)
  ]);

  const errors = [];
  const warnings = [];

  if (quests.length < QUEST_TARGETS.minQuestCount) {
    errors.push(
      `[quest] total quest count is below target ` +
      `(${quests.length} < ${QUEST_TARGETS.minQuestCount})`
    );
  }

  const prerequisiteUsage = new Map();
  for (const quest of quests) {
    for (const prerequisiteId of quest.prerequisites ?? []) {
      prerequisiteUsage.set(
        prerequisiteId,
        (prerequisiteUsage.get(prerequisiteId) ?? 0) + 1
      );
    }
  }
  const branchRootCount = Array.from(prerequisiteUsage.values())
    .filter(count => count >= 2)
    .length;
  if (branchRootCount < QUEST_TARGETS.minBranchRoots) {
    errors.push(
      `[quest] branching prerequisite roots below target ` +
      `(${branchRootCount} < ${QUEST_TARGETS.minBranchRoots})`
    );
  }

  const multiObjectiveCount = quests.filter(quest => quest.objectives.length >= 2).length;
  if (multiObjectiveCount < QUEST_TARGETS.minMultiObjectiveQuests) {
    errors.push(
      `[quest] multi-objective quest count below target ` +
      `(${multiObjectiveCount} < ${QUEST_TARGETS.minMultiObjectiveQuests})`
    );
  }

  for (const quest of quests) {
    if (!quest.id || !quest.name) {
      errors.push(`[quest] invalid identifier/name -> '${quest.id}'`);
    }

    if (quest.requiredLevel < 1 || quest.requiredLevel > 99) {
      errors.push(`[quest] ${quest.id} requiredLevel out of range: ${quest.requiredLevel}`);
    }

    if (!Array.isArray(quest.objectives) || quest.objectives.length === 0) {
      errors.push(`[quest] ${quest.id} has no objectives`);
    }

    if (quest.rewards.exp < 0 || quest.rewards.gold < 0) {
      errors.push(`[quest] ${quest.id} has negative reward`);
    }

    const maxExpectedExp = quest.requiredLevel * 300;
    const maxExpectedGold = quest.requiredLevel * 250;
    if (quest.rewards.exp > maxExpectedExp) {
      warnings.push(
        `[quest] ${quest.id} exp reward looks high (${quest.rewards.exp} > ${maxExpectedExp})`
      );
    }
    if (quest.rewards.gold > maxExpectedGold) {
      warnings.push(
        `[quest] ${quest.id} gold reward looks high (${quest.rewards.gold} > ${maxExpectedGold})`
      );
    }

    for (const prerequisiteId of quest.prerequisites ?? []) {
      const prerequisite = questById.get(prerequisiteId);
      if (!prerequisite) {
        errors.push(`[quest] ${quest.id} has unknown prerequisite '${prerequisiteId}'`);
        continue;
      }

      if (prerequisite.requiredLevel > quest.requiredLevel) {
        warnings.push(
          `[quest] ${quest.id} prerequisite '${prerequisiteId}' has higher level requirement`
        );
      }
    }

    for (const objective of quest.objectives ?? []) {
      if (objective.requiredAmount <= 0) {
        errors.push(`[quest] ${quest.id} objective '${objective.description}' has invalid amount`);
      }

      if (!objective.targetId || objective.targetId.trim().length === 0) {
        errors.push(`[quest] ${quest.id} objective '${objective.description}' has empty targetId`);
      }

      if (objective.type === 'kill' && !monsterIds.has(objective.targetId)) {
        errors.push(
          `[quest] ${quest.id} kill target '${objective.targetId}' does not exist in monster data`
        );
      }

      if (objective.type === 'collect' && !itemIds.has(objective.targetId)) {
        errors.push(
          `[quest] ${quest.id} collect target '${objective.targetId}' does not exist in item data`
        );
      }

      if (objective.type === 'explore' && !locationIds.has(objective.targetId)) {
        errors.push(
          `[quest] ${quest.id} explore target '${objective.targetId}' does not exist in location data`
        );
      }
    }
  }

  if (warnings.length > 0) {
    console.log(`Quest balance warnings: ${warnings.length}`);
    warnings.forEach(warning => console.log(`- ${warning}`));
  }

  if (errors.length > 0) {
    console.error(`\nQuest balance validation failed: ${errors.length} issue(s)`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('Quest balance validation passed.');
  console.log(`- quests: ${quests.length}`);
  console.log(`- branch roots: ${branchRootCount}`);
  console.log(`- multi-objective quests: ${multiObjectiveCount}`);
  console.log(`- referenced monsters: ${monsterIds.size}`);
  console.log(`- referenced items: ${itemIds.size}`);
  console.log(`- referenced locations: ${locationIds.size}`);
}

main();
