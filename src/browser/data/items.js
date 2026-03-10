import { items } from '../generated/browserData.generated.js';

export function getSampleItems() {
  return items;
}

export function getItemById(itemId) {
  return getSampleItems()[itemId] ?? null;
}

export function getItemsByType(type) {
  return Object.values(getSampleItems()).filter(item => item.type === type);
}

export function getItemsByRarity(rarity) {
  return Object.values(getSampleItems()).filter(item => item.rarity === rarity);
}
