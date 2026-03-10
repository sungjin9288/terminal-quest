import { ItemRarity, ItemType } from '../../types/item.js';
import { getSampleItems } from '../data/items.js';
import { shopConfig, shops as shopEntries } from '../generated/browserData.generated.js';

export const ShopType = {
  Weapon: 'weapon',
  Armor: 'armor',
  Consumable: 'consumable',
  General: 'general'
};

const LEVEL_THRESHOLDS = {
  always: 1,
  level5: 5,
  level10: 10,
  level15: 15,
  level20: 20,
  level25: 25
};

let loadedShopData = {
  shops: shopEntries,
  shopConfig
};

function normalizeDiscountPercent(discountPercent) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent)) {
    return 0;
  }

  return Math.max(0, Math.min(20, Math.floor(discountPercent)));
}

export function getUnlockedShopTiersForShop(unlockedTiers, shopId) {
  if (!Array.isArray(unlockedTiers)) {
    return [];
  }

  return Array.from(new Set(
    unlockedTiers
      .map(entry => entry.trim())
      .filter(entry => entry.startsWith(`${shopId}:`))
      .map(entry => entry.slice(shopId.length + 1))
      .filter(Boolean)
  ));
}

export async function loadShopData() {
  return loadedShopData;
}

export function setShopData(data) {
  loadedShopData = data;
}

export function getShops() {
  return loadedShopData.shops;
}

export function getShop(shopId) {
  return loadedShopData.shops[shopId] ?? null;
}

export function calculateBuyPrice(item, shopMultiplier = 1) {
  return Math.floor(item.value * shopMultiplier);
}

export function calculateSellPrice(item, shopMultiplier = 0.5) {
  if (!item.sellable) {
    return 0;
  }

  return Math.floor(item.value * shopMultiplier);
}

function createShopInventoryItem(item, buyMultiplier, sellMultiplier, playerLevel, isSpecial) {
  return {
    item,
    buyPrice: calculateBuyPrice(item, buyMultiplier),
    sellPrice: calculateSellPrice(item, sellMultiplier),
    inStock: true,
    quantity: -1,
    isSpecial,
    requiredLevel: item.requiredLevel,
    canAfford: false,
    meetsLevelReq: playerLevel >= item.requiredLevel
  };
}

export function getShopInventory(shopId, playerLevel, options = {}) {
  const shop = getShop(shopId);
  if (!shop) {
    return [];
  }

  const inventory = [];
  const addedItems = new Set();
  const extraUnlockedTiers = new Set(options.extraUnlockedTiers ?? []);
  const effectiveBuyMultiplier = shop.buyPriceMultiplier * (1 - normalizeDiscountPercent(options.discountPercent) / 100);
  const items = getSampleItems();

  for (const [tierKey, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
    if (playerLevel < threshold && !extraUnlockedTiers.has(tierKey)) {
      continue;
    }

    for (const itemId of shop.inventory[tierKey] ?? []) {
      if (addedItems.has(itemId) || !items[itemId]) {
        continue;
      }

      addedItems.add(itemId);
      inventory.push(
        createShopInventoryItem(
          items[itemId],
          effectiveBuyMultiplier,
          shop.sellPriceMultiplier,
          playerLevel,
          false
        )
      );
    }
  }

  return inventory;
}

export function updateAffordability(inventory, playerGold) {
  return inventory.map(item => ({
    ...item,
    canAfford: playerGold >= item.buyPrice
  }));
}

function getBulkDiscount(tiers, quantity) {
  let discount = 0;
  for (const tier of tiers) {
    if (quantity >= tier.quantity) {
      discount = tier.discount;
    }
  }
  return discount;
}

export function buyItem(player, itemId, shopId, quantity = 1, options = {}) {
  const shop = getShop(shopId);
  if (!shop) {
    return {
      success: false,
      message: '상점을 찾을 수 없습니다.'
    };
  }

  const item = getSampleItems()[itemId];
  if (!item) {
    return {
      success: false,
      message: '아이템을 찾을 수 없습니다.'
    };
  }

  if (player.level < item.requiredLevel) {
    return {
      success: false,
      message: `레벨이 부족합니다. (필요 레벨: ${item.requiredLevel})`
    };
  }

  const effectiveBuyMultiplier = shop.buyPriceMultiplier * (1 - normalizeDiscountPercent(options.discountPercent) / 100);
  const unitPrice = calculateBuyPrice(item, effectiveBuyMultiplier);
  let totalCost = unitPrice * quantity;

  if (shop.bulkDiscounts?.enabled && item.stackable) {
    totalCost = Math.floor(totalCost * (1 - getBulkDiscount(shop.bulkDiscounts.tiers, quantity)));
  }

  if (player.gold < totalCost) {
    return {
      success: false,
      message: shop.noMoneyMessage,
      cost: totalCost
    };
  }

  if (player.inventory.length >= player.maxInventorySize && !item.stackable) {
    return {
      success: false,
      message: '인벤토리가 가득 찼습니다!'
    };
  }

  player.gold -= totalCost;
  if (item.stackable) {
    for (let index = 0; index < quantity; index += 1) {
      player.inventory.push(itemId);
    }
  } else {
    player.inventory.push(itemId);
  }

  return {
    success: true,
    message: shop.buyMessage,
    item,
    cost: totalCost,
    newGold: player.gold
  };
}

export function getRarityColor(rarity) {
  const colors = {
    [ItemRarity.Common]: '#FFFFFF',
    [ItemRarity.Uncommon]: '#00FF00',
    [ItemRarity.Rare]: '#0080FF',
    [ItemRarity.Epic]: '#A020F0',
    [ItemRarity.Legendary]: '#FF8000',
    [ItemRarity.Mythic]: '#FF0080'
  };

  return colors[rarity];
}

export function getRarityName(rarity) {
  const names = {
    [ItemRarity.Common]: '일반',
    [ItemRarity.Uncommon]: '고급',
    [ItemRarity.Rare]: '희귀',
    [ItemRarity.Epic]: '영웅',
    [ItemRarity.Legendary]: '전설',
    [ItemRarity.Mythic]: '신화'
  };

  return names[rarity];
}

export function formatGold(amount) {
  return `${amount.toLocaleString()}G`;
}

export function canAfford(player, price) {
  return player.gold >= price;
}

export function meetsLevelRequirement(player, requiredLevel) {
  return player.level >= requiredLevel;
}

export function getItemTypeIcon(item) {
  if (item.type === ItemType.Weapon) {
    return item.icon || '⚔️';
  }
  if (item.type === ItemType.Armor) {
    return item.icon || '🛡️';
  }
  if (item.type === ItemType.Consumable) {
    return item.icon || '🧪';
  }
  return '📦';
}

export function getItemStatDescription(item) {
  if (item.type === ItemType.Weapon) {
    return `+${item.attackPower} 공격력`;
  }
  if (item.type === ItemType.Armor) {
    return `+${item.defense} 방어력`;
  }
  if (item.type === ItemType.Consumable && item.effects.length > 0) {
    const effect = item.effects[0];
    if (effect.type === 'heal') {
      return `HP +${effect.power}`;
    }
    if (effect.type === 'restore-mp') {
      return `MP +${effect.power}`;
    }
    if (effect.type === 'buff') {
      return `버프 (${effect.duration}턴)`;
    }
  }
  return '';
}
