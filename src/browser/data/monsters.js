import { monsters } from '../generated/browserData.generated.js';

export function getSampleMonsters() {
  return monsters;
}

export function getRandomMonster(minLevel = 1, maxLevel = Number.MAX_SAFE_INTEGER, includeBosses = false) {
  const pool = Object.values(getSampleMonsters())
    .filter(monster => monster.level >= minLevel && monster.level <= maxLevel)
    .filter(monster => includeBosses || !monster.isBoss);

  if (pool.length === 0) {
    return Object.values(getSampleMonsters())
      .filter(monster => includeBosses || !monster.isBoss)
      .sort((left, right) => left.level - right.level)[0] ?? null;
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
