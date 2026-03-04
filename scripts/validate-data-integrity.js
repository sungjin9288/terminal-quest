import { readFileSync } from 'fs';
import { join } from 'path';
import { getSampleItems } from '../dist/data/items.js';
import { getSampleMonsters } from '../dist/data/monsters.js';

function readJson(relativePath) {
  const fullPath = join(process.cwd(), relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

function main() {
  const items = getSampleItems();
  const monsters = getSampleMonsters();

  const itemIds = new Set(Object.keys(items));
  const monsterIds = new Set(Object.keys(monsters));

  const shopsData = readJson('data/shops.json');
  const locationsData = readJson('data/locations.json');

  const errors = [];

  for (const [shopId, shop] of Object.entries(shopsData.shops ?? {})) {
    for (const [tier, ids] of Object.entries(shop.inventory ?? {})) {
      for (const itemId of ids) {
        if (!itemIds.has(itemId)) {
          errors.push(`[shop] ${shopId}.${tier} -> missing item '${itemId}'`);
        }
      }
    }
  }

  for (const location of locationsData.locations ?? []) {
    for (const monsterId of location.monsters ?? []) {
      if (!monsterIds.has(monsterId)) {
        errors.push(`[location] ${location.id}.monsters -> missing monster '${monsterId}'`);
      }
    }

    if (location.boss && !monsterIds.has(location.boss)) {
      errors.push(`[location] ${location.id}.boss -> missing monster '${location.boss}'`);
    }

    for (const connectionId of location.connections ?? []) {
      const locationIds = new Set([
        locationsData.hub?.id,
        ...(locationsData.locations ?? []).map(loc => loc.id)
      ]);
      if (!locationIds.has(connectionId)) {
        errors.push(`[location] ${location.id}.connections -> unknown location '${connectionId}'`);
      }
    }
  }

  for (const monster of Object.values(monsters)) {
    for (const group of ['guaranteed', 'possible', 'rare']) {
      for (const drop of monster.dropTable[group] ?? []) {
        if (!itemIds.has(drop.itemId)) {
          errors.push(`[drop] ${monster.id}.${group} -> missing item '${drop.itemId}'`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`\nData integrity check failed: ${errors.length} issue(s)`);
    errors.slice(0, 200).forEach(error => console.error(`- ${error}`));
    if (errors.length > 200) {
      console.error(`...and ${errors.length - 200} more`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Data integrity check passed.');
  console.log(`- items: ${itemIds.size}`);
  console.log(`- monsters: ${monsterIds.size}`);
  console.log(`- locations: ${(locationsData.locations ?? []).length + 1} (including hub)`);
}

main();
