import { readFileSync } from 'fs';
import { join } from 'path';
import { getSampleItems } from '../src/data/items';
import { getSampleMonsters } from '../src/data/monsters';

interface LocationDataFile {
  hub: { id: string };
  locations: Array<{
    id: string;
    monsters: string[];
    boss: string;
  }>;
}

describe('Data Integration', () => {
  function getLocationsData(): LocationDataFile {
    const filePath = join(process.cwd(), 'data', 'locations.json');
    return JSON.parse(readFileSync(filePath, 'utf-8')) as LocationDataFile;
  }

  it('should provide all location monsters and bosses in runtime monster dataset', () => {
    const monsters = getSampleMonsters();
    const monsterIds = new Set(Object.keys(monsters));
    const locations = getLocationsData();

    for (const location of locations.locations) {
      expect(monsterIds.has(location.boss)).toBe(true);

      for (const monsterId of location.monsters) {
        expect(monsterIds.has(monsterId)).toBe(true);
      }
    }
  });

  it('should resolve all monster drop item IDs in runtime item dataset', () => {
    const items = getSampleItems();
    const itemIds = new Set(Object.keys(items));
    const monsters = getSampleMonsters();

    for (const monster of Object.values(monsters)) {
      for (const group of ['guaranteed', 'possible', 'rare'] as const) {
        for (const drop of monster.dropTable[group]) {
          expect(itemIds.has(drop.itemId)).toBe(true);
        }
      }
    }
  });
});
