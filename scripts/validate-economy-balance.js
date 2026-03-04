import { getAllLocations } from '../dist/data/locations.js';
import { getSampleMonsters } from '../dist/data/monsters.js';
import { getDefaultQuests } from '../dist/data/quests.js';
import { getShops, getShopInventory } from '../dist/systems/shop.js';
import { getInnRestCost } from '../dist/systems/economy.js';

const TARGETS = {
  minInnCostToCombatGoldRatio: 0.35,
  maxInnCostToCombatGoldRatio: 1.3,
  maxQuestGoldToCombatGoldRatio: 4.0,
  minProgressionItemsPerAct: 4,
  minMedianPriceGrowthRatio: 1.08
};

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getActLevelRange(locations) {
  const minLevel = Math.min(...locations.map(location => location.recommendedLevel[0]));
  const maxLevel = Math.max(...locations.map(location => location.recommendedLevel[1]));
  return { minLevel, maxLevel };
}

function getExpectedCombatGold(locations, monsters, errors) {
  const locationMeans = [];

  for (const location of locations) {
    const candidateGoldValues = [];

    for (const monsterId of location.monsters ?? []) {
      const monster = monsters[monsterId];
      if (!monster) {
        errors.push(`[economy] ${location.id} references missing monster '${monsterId}'`);
        continue;
      }
      candidateGoldValues.push(
        (monster.dropTable.minGold + monster.dropTable.maxGold) / 2
      );
    }

    if (candidateGoldValues.length > 0) {
      locationMeans.push(average(candidateGoldValues));
    }
  }

  return average(locationMeans);
}

function getQuestGoldAverageByAct(quests, minLevel, maxLevel) {
  const matched = quests.filter(
    quest => quest.requiredLevel >= minLevel && quest.requiredLevel <= maxLevel
  );
  if (matched.length === 0) {
    return { count: 0, averageGold: 0 };
  }

  const averageGold = average(matched.map(quest => quest.rewards.gold));
  return { count: matched.length, averageGold };
}

function getActProgressionPrices(shops, maxLevel, minLevel) {
  const prices = [];

  for (const shopId of Object.keys(shops)) {
    const inventory = getShopInventory(shopId, maxLevel);
    for (const entry of inventory) {
      if (
        entry.requiredLevel >= minLevel &&
        entry.requiredLevel <= maxLevel
      ) {
        prices.push(entry.buyPrice);
      }
    }
  }

  return prices.sort((a, b) => a - b);
}

function formatActLine(metrics) {
  return [
    `Act ${metrics.act}`,
    `Lv ${metrics.minLevel}-${metrics.maxLevel}`,
    `combatGold=${round(metrics.expectedCombatGold)}`,
    `innCost=${metrics.innCost}`,
    `questAvg=${round(metrics.questGoldAverage)}`,
    `progressionItems=${metrics.progressionItemCount}`,
    `medianPrice=${metrics.medianPrice}`
  ].join(' | ');
}

function main() {
  const locations = getAllLocations();
  const monsters = getSampleMonsters();
  const quests = Object.values(getDefaultQuests());
  const shops = getShops();

  const errors = [];
  const warnings = [];

  const actNumbers = Array.from(
    new Set(locations.map(location => location.act))
  ).sort((a, b) => a - b);

  const metricsByAct = [];

  for (const act of actNumbers) {
    const actLocations = locations.filter(location => location.act === act);
    if (actLocations.length === 0) {
      continue;
    }

    const { minLevel, maxLevel } = getActLevelRange(actLocations);
    const expectedCombatGold = getExpectedCombatGold(actLocations, monsters, errors);
    const midLevel = Math.floor((minLevel + maxLevel) / 2);
    const innCost = getInnRestCost(midLevel);
    const innCostRatio = expectedCombatGold > 0 ? innCost / expectedCombatGold : 0;

    const { count: questCount, averageGold: questGoldAverage } =
      getQuestGoldAverageByAct(quests, minLevel, maxLevel);
    const questGoldRatio = expectedCombatGold > 0
      ? questGoldAverage / expectedCombatGold
      : 0;

    const progressionPrices = getActProgressionPrices(shops, maxLevel, minLevel);
    const progressionItemCount = progressionPrices.length;
    const medianPrice = median(progressionPrices);

    if (expectedCombatGold <= 0) {
      errors.push(`[economy] Act ${act} has non-positive expected combat gold`);
    }

    if (expectedCombatGold > 0 && innCostRatio < TARGETS.minInnCostToCombatGoldRatio) {
      errors.push(
        `[economy] Act ${act} inn cost is too low vs combat gold ` +
        `(${round(innCostRatio)} < ${TARGETS.minInnCostToCombatGoldRatio})`
      );
    }

    if (expectedCombatGold > 0 && innCostRatio > TARGETS.maxInnCostToCombatGoldRatio) {
      warnings.push(
        `[economy] Act ${act} inn cost may be too high vs combat gold ` +
        `(${round(innCostRatio)} > ${TARGETS.maxInnCostToCombatGoldRatio})`
      );
    }

    if (questCount > 0 && expectedCombatGold > 0 && questGoldRatio > TARGETS.maxQuestGoldToCombatGoldRatio) {
      warnings.push(
        `[economy] Act ${act} quest gold may be too high vs combat gold ` +
        `(${round(questGoldRatio)} > ${TARGETS.maxQuestGoldToCombatGoldRatio})`
      );
    }

    if (progressionItemCount < TARGETS.minProgressionItemsPerAct) {
      const message =
        `[economy] Act ${act} progression item count is low ` +
        `(${progressionItemCount} < ${TARGETS.minProgressionItemsPerAct})`;
      if (act <= 2) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }

    metricsByAct.push({
      act,
      minLevel,
      maxLevel,
      expectedCombatGold,
      innCost,
      questGoldAverage,
      progressionItemCount,
      medianPrice
    });
  }

  const actsWithMedianPrice = metricsByAct.filter(metric => metric.medianPrice > 0);
  for (let index = 1; index < actsWithMedianPrice.length; index += 1) {
    const previous = actsWithMedianPrice[index - 1];
    const current = actsWithMedianPrice[index];

    if (current.medianPrice <= previous.medianPrice) {
      errors.push(
        `[economy] median progression price did not increase from Act ${previous.act} to Act ${current.act} ` +
        `(${current.medianPrice} <= ${previous.medianPrice})`
      );
      continue;
    }

    const growthRatio = current.medianPrice / previous.medianPrice;
    if (growthRatio < TARGETS.minMedianPriceGrowthRatio) {
      warnings.push(
        `[economy] median progression price growth is shallow between Act ${previous.act} and Act ${current.act} ` +
        `(${round(growthRatio)} < ${TARGETS.minMedianPriceGrowthRatio})`
      );
    }
  }

  console.log('Economy balance metrics:');
  for (const metric of metricsByAct) {
    console.log(`- ${formatActLine(metric)}`);
  }

  if (warnings.length > 0) {
    console.log(`\nEconomy balance warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\nEconomy balance validation failed: ${errors.length} issue(s)`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Economy balance validation passed.');
}

main();
