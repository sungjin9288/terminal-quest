import { getSampleMonsters } from '../../src/data/monsters';
import { getHubTown, getLocationById, type GameLocation, type HubTown } from '../../src/data/locations';
import { type Monster } from '../../src/types/index';

function cloneMonster(monster: Monster): Monster {
  return {
    ...monster,
    stats: { ...monster.stats },
    resistances: { ...monster.resistances },
    skills: [...monster.skills],
    dropTable: {
      guaranteed: monster.dropTable.guaranteed.map(entry => ({ ...entry })),
      possible: monster.dropTable.possible.map(entry => ({ ...entry })),
      rare: monster.dropTable.rare.map(entry => ({ ...entry })),
      minGold: monster.dropTable.minGold,
      maxGold: monster.dropTable.maxGold
    },
    statusEffects: [...monster.statusEffects]
  };
}

function cloneGameLocation(location: GameLocation): GameLocation {
  return {
    ...location,
    recommendedLevel: [location.recommendedLevel[0], location.recommendedLevel[1]],
    monsters: [...location.monsters],
    miniBoss: Array.isArray(location.miniBoss) ? [...location.miniBoss] : location.miniBoss,
    savePoints: location.savePoints.map(savePoint => ({ ...savePoint })),
    connections: [...location.connections],
    rewards: {
      ...location.rewards,
      firstClear: location.rewards.firstClear
        ? {
          ...location.rewards.firstClear,
          items: [...location.rewards.firstClear.items]
        }
        : undefined
    },
    environmentEffects: [...location.environmentEffects],
    sections: location.sections ? [...location.sections] : undefined
  };
}

function getRequiredGameLocation(locationId: string): GameLocation {
  const location = getLocationById(locationId);
  if (!location || !('boss' in location)) {
    throw new Error(`Expected game location for ${locationId}`);
  }
  return cloneGameLocation(location);
}

function getRequiredMonster(monsterId: string): Monster {
  const monster = getSampleMonsters()[monsterId];
  if (!monster) {
    throw new Error(`Expected sample monster "${monsterId}" to exist`);
  }
  return cloneMonster(monster);
}

export function createTestMonster(
  overrides: Partial<Monster> = {},
  baseMonsterId: string = 'slime'
): Monster {
  return {
    ...getRequiredMonster(baseMonsterId),
    ...overrides
  };
}

export function createTestGameLocation(
  locationId: string = 'memory-forest',
  overrides: Partial<GameLocation> = {}
): GameLocation {
  return {
    ...getRequiredGameLocation(locationId),
    ...overrides
  };
}

export function createTestHubTown(overrides: Partial<HubTown> = {}): HubTown {
  const hub = getHubTown();
  return {
    ...hub,
    facilities: [...hub.facilities],
    connections: [...hub.connections],
    ...overrides
  };
}
