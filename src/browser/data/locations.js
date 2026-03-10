import {
  actSummary,
  hub,
  locations
} from '../generated/browserData.generated.js';

function loadLocationData() {
  return {
    hub,
    locations,
    actSummary
  };
}

export function getHubTown() {
  return loadLocationData().hub;
}

export function getAllLocations() {
  return loadLocationData().locations;
}

export function getLocationById(id) {
  const data = loadLocationData();
  if (data.hub.id === id) {
    return data.hub;
  }

  return data.locations.find(location => location.id === id) ?? null;
}

export function getLocationsByAct(act) {
  return loadLocationData().locations.filter(location => location.act === act);
}

export function getConnectedLocations(locationId) {
  const data = loadLocationData();

  if (data.hub.id === locationId) {
    return data.locations.filter(location => data.hub.connections.includes(location.id));
  }

  const location = data.locations.find(entry => entry.id === locationId);
  if (!location) {
    return [];
  }

  return location.connections
    .map(connectionId => connectionId === data.hub.id
      ? data.hub
      : data.locations.find(entry => entry.id === connectionId))
    .filter(Boolean);
}

export function isLocationUnlocked(locationId, defeatedBosses, completedActs, completedQuests = []) {
  const data = loadLocationData();
  if (data.hub.id === locationId) {
    return true;
  }

  const location = data.locations.find(entry => entry.id === locationId);
  if (!location) {
    return false;
  }

  if (!location.unlockCondition) {
    return true;
  }

  switch (location.unlockCondition.type) {
    case 'boss-defeated':
      return defeatedBosses.includes(location.unlockCondition.target);
    case 'act-complete':
      return completedActs.includes(location.unlockCondition.target);
    case 'quest-complete':
      return completedQuests.includes(location.unlockCondition.target);
    default:
      return false;
  }
}

export function getLocationDisplayName(locationId) {
  return getLocationById(locationId)?.name ?? locationId;
}

export function getLocationMonsters(locationId) {
  const location = getLocationById(locationId);
  return location && 'monsters' in location ? location.monsters : [];
}

export function getLocationDifficulty(locationId) {
  const location = getLocationById(locationId);
  return location && 'difficulty' in location ? location.difficulty : 'safe';
}

export function getLocationBoss(locationId) {
  const location = getLocationById(locationId);
  return location && 'boss' in location ? location.boss : null;
}

export function isTownLocation(locationId) {
  return loadLocationData().hub.id === locationId;
}

export function getActSummary(act) {
  return loadLocationData().actSummary[`act${act}`] ?? null;
}

export function getAct1Locations() {
  return getLocationsByAct(1);
}

export function getRecommendedLevel(locationId) {
  const location = getLocationById(locationId);
  return location && 'recommendedLevel' in location ? location.recommendedLevel : null;
}

export function isLevelAppropriate(playerLevel, locationId) {
  const recommended = getRecommendedLevel(locationId);
  if (!recommended) {
    return 'appropriate';
  }

  if (playerLevel < recommended[0]) {
    return 'under';
  }
  if (playerLevel > recommended[1] + 3) {
    return 'over';
  }
  return 'appropriate';
}
