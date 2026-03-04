/**
 * Terminal Quest - Shop System
 * Handles buying, selling, and shop inventory management
 */

import { Player } from '../types/character.js';
import { AnyItem, ItemRarity, ItemType, Weapon, Armor, Consumable } from '../types/item.js';
import { getSampleItems } from '../data/items.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Shop type enumeration
 */
export enum ShopType {
  Weapon = 'weapon',
  Armor = 'armor',
  Consumable = 'consumable',
  General = 'general'
}

/**
 * Shop data structure
 */
export interface Shop {
  id: string;
  name: string;
  type: ShopType;
  ownerName: string;
  ownerIcon: string;
  greeting: string;
  farewell: string;
  buyMessage: string;
  sellMessage: string;
  noMoneyMessage: string;
  icon: string;
  buyPriceMultiplier: number;
  sellPriceMultiplier: number;
  inventory: string[];
  specialStock?: ShopSpecialStock[];
}

/**
 * Special rotating stock item
 */
export interface ShopSpecialStock {
  itemId: string;
  quantity: number;
  expiresAt: number;
}

/**
 * Purchase result
 */
export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: AnyItem;
  cost?: number;
  newGold?: number;
}

/**
 * Sale result
 */
export interface SaleResult {
  success: boolean;
  message: string;
  item?: AnyItem;
  earnings?: number;
  newGold?: number;
}

/**
 * Shop inventory item with price info
 */
export interface ShopInventoryItem {
  item: AnyItem;
  buyPrice: number;
  sellPrice: number;
  inStock: boolean;
  quantity: number;
  isSpecial: boolean;
  requiredLevel: number;
  canAfford: boolean;
  meetsLevelReq: boolean;
}

/**
 * Level thresholds for unlocking items
 */
const LEVEL_THRESHOLDS = {
  always: 1,
  level5: 5,
  level10: 10,
  level15: 15,
  level20: 20,
  level25: 25
};

/**
 * Shop data store
 */
interface ShopDataStore {
  shops: Record<string, ShopData>;
  shopConfig: {
    baseSellMultiplier: number;
    levelUnlockThresholds: number[];
    [key: string]: unknown;
  };
}

interface ShopData {
  id: string;
  name: string;
  type: string;
  ownerName: string;
  ownerIcon: string;
  greeting: string;
  farewell: string;
  buyMessage: string;
  sellMessage: string;
  noMoneyMessage: string;
  icon: string;
  buyPriceMultiplier: number;
  sellPriceMultiplier: number;
  inventory: Record<string, string[]>;
  specialStock?: {
    enabled: boolean;
    refreshTime: number;
    slots: number;
    rarityWeights: Record<string, number>;
  };
  bulkDiscounts?: {
    enabled: boolean;
    tiers: { quantity: number; discount: number }[];
  };
}

let shopData: ShopDataStore | null = null;

/**
 * Default shop data fallback
 */
function getDefaultShopData(): ShopDataStore {
  return {
    shops: {},
    shopConfig: {
      baseSellMultiplier: 0.5,
      levelUnlockThresholds: [1, 5, 10, 15, 20, 25]
    }
  };
}

/**
 * Ensure shop data is loaded from local JSON file
 */
function ensureShopDataLoaded(): ShopDataStore {
  if (shopData) {
    return shopData;
  }

  try {
    const dataPath = join(process.cwd(), 'data', 'shops.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    shopData = JSON.parse(rawData) as ShopDataStore;
    return shopData;
  } catch {
    shopData = getDefaultShopData();
    return shopData;
  }
}

/**
 * Load shop data
 */
export async function loadShopData(): Promise<ShopDataStore> {
  return ensureShopDataLoaded();
}

/**
 * Set shop data directly (for testing or pre-loaded data)
 */
export function setShopData(data: ShopDataStore): void {
  shopData = data;
}

/**
 * Get all available shops
 */
export function getShops(): Record<string, ShopData> {
  return ensureShopDataLoaded().shops;
}

/**
 * Get a specific shop by ID
 */
export function getShop(shopId: string): ShopData | null {
  return ensureShopDataLoaded().shops[shopId] ?? null;
}

/**
 * Calculate buy price for an item
 */
export function calculateBuyPrice(
  item: AnyItem,
  shopMultiplier: number = 1.0
): number {
  return Math.floor(item.value * shopMultiplier);
}

/**
 * Calculate sell price for an item
 */
export function calculateSellPrice(
  item: AnyItem,
  shopMultiplier: number = 0.5
): number {
  if (!item.sellable) {
    return 0;
  }
  return Math.floor(item.value * shopMultiplier);
}

/**
 * Get shop inventory based on player level
 */
export function getShopInventory(
  shopId: string,
  playerLevel: number
): ShopInventoryItem[] {
  const shop = getShop(shopId);
  if (!shop) {
    return [];
  }

  const items = getSampleItems();
  const inventory: ShopInventoryItem[] = [];
  const addedItems = new Set<string>();

  // Add items from each level tier
  for (const [tierKey, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
    if (playerLevel >= threshold) {
      const tierItems = shop.inventory[tierKey] ?? [];
      for (const itemId of tierItems) {
        if (addedItems.has(itemId)) continue;

        const item = items[itemId];
        if (!item) continue;

        addedItems.add(itemId);
        inventory.push(createShopInventoryItem(
          item,
          shop.buyPriceMultiplier,
          shop.sellPriceMultiplier,
          playerLevel,
          false
        ));
      }
    }
  }

  return inventory;
}

/**
 * Create a shop inventory item with computed prices
 */
function createShopInventoryItem(
  item: AnyItem,
  buyMultiplier: number,
  sellMultiplier: number,
  playerLevel: number,
  isSpecial: boolean
): ShopInventoryItem {
  const buyPrice = calculateBuyPrice(item, buyMultiplier);
  const sellPrice = calculateSellPrice(item, sellMultiplier);

  return {
    item,
    buyPrice,
    sellPrice,
    inStock: true,
    quantity: -1, // -1 means unlimited
    isSpecial,
    requiredLevel: item.requiredLevel,
    canAfford: false, // Set by caller based on player gold
    meetsLevelReq: playerLevel >= item.requiredLevel
  };
}

/**
 * Update inventory items with player's affordability
 */
export function updateAffordability(
  inventory: ShopInventoryItem[],
  playerGold: number
): ShopInventoryItem[] {
  return inventory.map(item => ({
    ...item,
    canAfford: playerGold >= item.buyPrice
  }));
}

/**
 * Buy an item from a shop
 */
export function buyItem(
  player: Player,
  itemId: string,
  shopId: string,
  quantity: number = 1
): PurchaseResult {
  const shop = getShop(shopId);
  if (!shop) {
    return {
      success: false,
      message: '상점을 찾을 수 없습니다.'
    };
  }

  const items = getSampleItems();
  const item = items[itemId];
  if (!item) {
    return {
      success: false,
      message: '아이템을 찾을 수 없습니다.'
    };
  }

  // Check level requirement
  if (player.level < item.requiredLevel) {
    return {
      success: false,
      message: `레벨이 부족합니다. (필요 레벨: ${item.requiredLevel})`
    };
  }

  // Calculate total cost
  const unitPrice = calculateBuyPrice(item, shop.buyPriceMultiplier);
  let totalCost = unitPrice * quantity;

  // Apply bulk discount if applicable
  if (shop.bulkDiscounts?.enabled && item.stackable) {
    const discount = getBulkDiscount(shop.bulkDiscounts.tiers, quantity);
    totalCost = Math.floor(totalCost * (1 - discount));
  }

  // Check if player has enough gold
  if (player.gold < totalCost) {
    return {
      success: false,
      message: shop.noMoneyMessage,
      cost: totalCost
    };
  }

  // Check inventory space
  if (player.inventory.length >= player.maxInventorySize && !item.stackable) {
    return {
      success: false,
      message: '인벤토리가 가득 찼습니다!'
    };
  }

  // Process purchase
  player.gold -= totalCost;

  // Add item to inventory
  if (item.stackable) {
    // For stackable items, add multiple copies or increase stack
    for (let i = 0; i < quantity; i++) {
      player.inventory.push(itemId);
    }
  } else {
    player.inventory.push(itemId);
  }

  return {
    success: true,
    message: shop.buyMessage,
    item: item,
    cost: totalCost,
    newGold: player.gold
  };
}

/**
 * Get bulk discount based on quantity
 */
function getBulkDiscount(
  tiers: { quantity: number; discount: number }[],
  quantity: number
): number {
  let discount = 0;
  for (const tier of tiers) {
    if (quantity >= tier.quantity) {
      discount = tier.discount;
    }
  }
  return discount;
}

/**
 * Sell an item to a shop
 */
export function sellItem(
  player: Player,
  itemId: string,
  quantity: number = 1
): SaleResult {
  const items = getSampleItems();
  const item = items[itemId];
  if (!item) {
    return {
      success: false,
      message: '아이템을 찾을 수 없습니다.'
    };
  }

  // Check if item is sellable
  if (!item.sellable) {
    return {
      success: false,
      message: '이 아이템은 판매할 수 없습니다.'
    };
  }

  // Check if player has the item
  const itemCount = player.inventory.filter(id => id === itemId).length;
  if (itemCount < quantity) {
    return {
      success: false,
      message: `아이템이 부족합니다. (보유: ${itemCount}개)`
    };
  }

  // Calculate sell price
  const unitPrice = calculateSellPrice(item, 0.5);
  const totalEarnings = unitPrice * quantity;

  // Remove items from inventory
  let removed = 0;
  player.inventory = player.inventory.filter(id => {
    if (id === itemId && removed < quantity) {
      removed++;
      return false;
    }
    return true;
  });

  // Add gold
  player.gold += totalEarnings;

  return {
    success: true,
    message: `${item.name}을(를) ${totalEarnings}G에 판매했습니다.`,
    item: item,
    earnings: totalEarnings,
    newGold: player.gold
  };
}

/**
 * Get player's sellable items
 */
export function getPlayerSellableItems(player: Player): ShopInventoryItem[] {
  const items = getSampleItems();
  const sellableItems: ShopInventoryItem[] = [];
  const itemCounts = new Map<string, number>();

  // Count items in inventory
  for (const itemId of player.inventory) {
    const count = itemCounts.get(itemId) ?? 0;
    itemCounts.set(itemId, count + 1);
  }

  // Create sellable item list
  for (const [itemId, quantity] of itemCounts) {
    const item = items[itemId];
    if (!item || !item.sellable) continue;

    sellableItems.push({
      item,
      buyPrice: calculateBuyPrice(item),
      sellPrice: calculateSellPrice(item),
      inStock: true,
      quantity,
      isSpecial: false,
      requiredLevel: item.requiredLevel,
      canAfford: true,
      meetsLevelReq: true
    });
  }

  return sellableItems;
}

/**
 * Get item type icon
 */
export function getItemTypeIcon(item: AnyItem): string {
  if (item.type === ItemType.Weapon) {
    return (item as Weapon).icon || '⚔️';
  } else if (item.type === ItemType.Armor) {
    return (item as Armor).icon || '🛡️';
  } else if (item.type === ItemType.Consumable) {
    return (item as Consumable).icon || '🧪';
  }
  return '📦';
}

/**
 * Get item stat description
 */
export function getItemStatDescription(item: AnyItem): string {
  if (item.type === ItemType.Weapon) {
    const weapon = item as Weapon;
    return `+${weapon.attackPower} 공격력`;
  } else if (item.type === ItemType.Armor) {
    const armor = item as Armor;
    return `+${armor.defense} 방어력`;
  } else if (item.type === ItemType.Consumable) {
    const consumable = item as Consumable;
    if (consumable.effects.length > 0) {
      const effect = consumable.effects[0];
      if (effect.type === 'heal') {
        return `HP +${effect.power}`;
      } else if (effect.type === 'restore-mp') {
        return `MP +${effect.power}`;
      } else if (effect.type === 'buff') {
        return `버프 (${effect.duration}턴)`;
      }
    }
  }
  return '';
}

/**
 * Get rarity color code
 */
export function getRarityColor(rarity: ItemRarity): string {
  const colors: Record<ItemRarity, string> = {
    [ItemRarity.Common]: '#FFFFFF',
    [ItemRarity.Uncommon]: '#00FF00',
    [ItemRarity.Rare]: '#0080FF',
    [ItemRarity.Epic]: '#A020F0',
    [ItemRarity.Legendary]: '#FF8000',
    [ItemRarity.Mythic]: '#FF0080'
  };
  return colors[rarity];
}

/**
 * Get rarity display name
 */
export function getRarityName(rarity: ItemRarity): string {
  const names: Record<ItemRarity, string> = {
    [ItemRarity.Common]: '일반',
    [ItemRarity.Uncommon]: '고급',
    [ItemRarity.Rare]: '희귀',
    [ItemRarity.Epic]: '영웅',
    [ItemRarity.Legendary]: '전설',
    [ItemRarity.Mythic]: '신화'
  };
  return names[rarity];
}

/**
 * Format gold amount with commas
 */
export function formatGold(amount: number): string {
  return amount.toLocaleString() + 'G';
}

/**
 * Check if player can afford an item
 */
export function canAfford(player: Player, price: number): boolean {
  return player.gold >= price;
}

/**
 * Check if player meets level requirement
 */
export function meetsLevelRequirement(player: Player, requiredLevel: number): boolean {
  return player.level >= requiredLevel;
}
