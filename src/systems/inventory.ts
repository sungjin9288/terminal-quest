/**
 * Inventory management system for Terminal Quest
 */

import { Player, EquipmentSlot } from '../types/character.js';
import {
  AnyItem,
  Weapon,
  Armor,
  Consumable,
  ItemType,
  ArmorType
} from '../types/item.js';
import { getItemById } from '../data/items.js';

/**
 * Result of an inventory operation
 */
export interface InventoryResult {
  success: boolean;
  message: string;
  item?: AnyItem;
}

/**
 * Inventory item with quantity
 */
export interface InventorySlot {
  itemId: string;
  item: AnyItem;
  quantity: number;
}

/**
 * Add item to inventory
 */
export function addItem(player: Player, itemId: string, quantity: number = 1): InventoryResult {
  const item = getItemById(itemId);

  if (!item) {
    return {
      success: false,
      message: `Item ${itemId} not found`
    };
  }

  // Check if inventory is full (for non-stackable items)
  if (!item.stackable && player.inventory.length >= player.maxInventorySize) {
    return {
      success: false,
      message: 'Inventory is full!'
    };
  }

  // Add items
  for (let i = 0; i < quantity; i++) {
    if (player.inventory.length < player.maxInventorySize) {
      player.inventory.push(itemId);
    } else {
      return {
        success: false,
        message: `Only added ${i} items. Inventory is full!`,
        item
      };
    }
  }

  return {
    success: true,
    message: `Added ${quantity}x ${item.name} to inventory`,
    item
  };
}

/**
 * Remove item from inventory
 */
export function removeItem(player: Player, itemId: string, quantity: number = 1): InventoryResult {
  const item = getItemById(itemId);

  if (!item) {
    return {
      success: false,
      message: `Item ${itemId} not found`
    };
  }

  // Count how many we have
  const count = player.inventory.filter(id => id === itemId).length;

  if (count < quantity) {
    return {
      success: false,
      message: `Not enough ${item.name}. Have ${count}, need ${quantity}`
    };
  }

  // Remove items
  for (let i = 0; i < quantity; i++) {
    const index = player.inventory.indexOf(itemId);
    if (index > -1) {
      player.inventory.splice(index, 1);
    }
  }

  return {
    success: true,
    message: `Removed ${quantity}x ${item.name} from inventory`,
    item
  };
}

/**
 * Get equipment slot for armor type
 */
function getSlotForArmorType(armorType: ArmorType): EquipmentSlot | null {
  switch (armorType) {
    case ArmorType.Helmet:
      return EquipmentSlot.Helmet;
    case ArmorType.Chest:
      return EquipmentSlot.Armor;
    case ArmorType.Gloves:
      return EquipmentSlot.Gloves;
    case ArmorType.Boots:
      return EquipmentSlot.Boots;
    case ArmorType.Accessory:
      // Try to equip in first available accessory slot
      return EquipmentSlot.Accessory1;
    default:
      return null;
  }
}

/**
 * Equip an item
 */
export function equipItem(player: Player, itemId: string): InventoryResult {
  const item = getItemById(itemId);

  if (!item) {
    return {
      success: false,
      message: `Item ${itemId} not found`
    };
  }

  // Check if player has the item
  if (!player.inventory.includes(itemId)) {
    return {
      success: false,
      message: `You don't have ${item.name}`
    };
  }

  // Check level requirement
  if (player.level < item.requiredLevel) {
    return {
      success: false,
      message: `Requires level ${item.requiredLevel}`
    };
  }

  let slot: EquipmentSlot | null = null;

  // Determine equipment slot
  if (item.type === ItemType.Weapon) {
    slot = EquipmentSlot.Weapon;
  } else if (item.type === ItemType.Armor) {
    const armor = item as Armor;
    slot = getSlotForArmorType(armor.armorType);

    // For accessories, try second slot if first is occupied
    if (armor.armorType === ArmorType.Accessory && player.equipment[EquipmentSlot.Accessory1]) {
      slot = EquipmentSlot.Accessory2;
    }
  } else {
    return {
      success: false,
      message: `Cannot equip ${item.name}`
    };
  }

  if (!slot) {
    return {
      success: false,
      message: `Cannot equip ${item.name}`
    };
  }

  // Unequip current item in slot if any
  const currentItem = player.equipment[slot];
  if (currentItem) {
    const unequipResult = unequipItem(player, slot);
    if (!unequipResult.success) {
      return unequipResult;
    }
  }

  // Remove from inventory
  const index = player.inventory.indexOf(itemId);
  if (index > -1) {
    player.inventory.splice(index, 1);
  }

  // Equip item
  player.equipment[slot] = itemId;

  // Apply stat bonuses
  recalculateStats(player);

  return {
    success: true,
    message: `Equipped ${item.name}`,
    item
  };
}

/**
 * Unequip an item
 */
export function unequipItem(player: Player, slot: EquipmentSlot): InventoryResult {
  const itemId = player.equipment[slot];

  if (!itemId) {
    return {
      success: false,
      message: 'No item equipped in that slot'
    };
  }

  const item = getItemById(itemId);

  if (!item) {
    return {
      success: false,
      message: 'Equipped item not found in database'
    };
  }

  // Check if inventory has space
  if (player.inventory.length >= player.maxInventorySize) {
    return {
      success: false,
      message: 'Inventory is full! Cannot unequip.'
    };
  }

  // Remove from equipment
  delete player.equipment[slot];

  // Add to inventory
  player.inventory.push(itemId);

  // Recalculate stats
  recalculateStats(player);

  return {
    success: true,
    message: `Unequipped ${item.name}`,
    item
  };
}

/**
 * Use a consumable item
 */
export function useItem(player: Player, itemId: string): InventoryResult {
  const item = getItemById(itemId);

  if (!item) {
    return {
      success: false,
      message: `Item ${itemId} not found`
    };
  }

  if (item.type !== ItemType.Consumable) {
    return {
      success: false,
      message: `Cannot use ${item.name}`
    };
  }

  const consumable = item as Consumable;

  // Check if player has the item
  if (!player.inventory.includes(itemId)) {
    return {
      success: false,
      message: `You don't have ${item.name}`
    };
  }

  let message = `Used ${item.name}! `;

  // Apply effects
  consumable.effects.forEach(effect => {
    switch (effect.type) {
      case 'heal':
        const healAmount = Math.min(effect.power, player.stats.maxHp - player.stats.hp);
        player.stats.hp += healAmount;
        message += `Restored ${healAmount} HP. `;
        break;

      case 'restore-mp':
        const mpAmount = Math.min(effect.power, player.stats.maxMp - player.stats.mp);
        player.stats.mp += mpAmount;
        message += `Restored ${mpAmount} MP. `;
        break;

      case 'cure':
        player.statusEffects = [];
        message += `Cured all status effects. `;
        break;

      case 'buff':
        // Simplified buff system (would need status effect implementation)
        message += `Applied buff. `;
        break;

      case 'revive':
        if (player.stats.hp === 0) {
          player.stats.hp = Math.floor(player.stats.maxHp * 0.5);
          message += `Revived with 50% HP. `;
        }
        break;
    }
  });

  // Remove item if consumed
  if (consumable.consumeOnUse) {
    const index = player.inventory.indexOf(itemId);
    if (index > -1) {
      player.inventory.splice(index, 1);
    }
  }

  return {
    success: true,
    message,
    item
  };
}

/**
 * Sort inventory by type and rarity
 */
export function sortInventory(player: Player): void {
  const items = player.inventory.map(id => ({ id, item: getItemById(id) }));

  // Define sort order
  const typeOrder: Record<ItemType, number> = {
    [ItemType.Weapon]: 0,
    [ItemType.Armor]: 1,
    [ItemType.Consumable]: 2,
    [ItemType.Material]: 3,
    [ItemType.QuestItem]: 4
  };

  const rarityOrder: Record<string, number> = {
    'mythic': 0,
    'legendary': 1,
    'epic': 2,
    'rare': 3,
    'uncommon': 4,
    'common': 5
  };

  items.sort((a, b) => {
    if (!a.item || !b.item) return 0;

    // Sort by type first
    const typeCompare = typeOrder[a.item.type] - typeOrder[b.item.type];
    if (typeCompare !== 0) return typeCompare;

    // Then by rarity
    const rarityCompare = rarityOrder[a.item.rarity] - rarityOrder[b.item.rarity];
    if (rarityCompare !== 0) return rarityCompare;

    // Finally by name
    return a.item.name.localeCompare(b.item.name);
  });

  player.inventory = items.map(i => i.id);
}

/**
 * Get organized inventory with quantities
 */
export function getOrganizedInventory(player: Player): InventorySlot[] {
  const itemMap = new Map<string, InventorySlot>();

  player.inventory.forEach(itemId => {
    const item = getItemById(itemId);
    if (!item) return;

    if (itemMap.has(itemId)) {
      const slot = itemMap.get(itemId)!;
      slot.quantity++;
    } else {
      itemMap.set(itemId, {
        itemId,
        item,
        quantity: 1
      });
    }
  });

  return Array.from(itemMap.values());
}

/**
 * Get inventory weight (for future use)
 */
export function getInventoryWeight(_player: Player): number {
  // Placeholder - would calculate based on item weights
  return 0;
}

/**
 * Recalculate player stats based on equipment
 */
export function recalculateStats(player: Player): void {
  // Reset to base stats
  player.stats = { ...player.baseStats };

  // Apply equipment bonuses
  Object.values(player.equipment).forEach(itemId => {
    if (!itemId) return;

    const item = getItemById(itemId);
    if (!item) return;

    if (item.type === ItemType.Weapon) {
      const weapon = item as Weapon;
      player.stats.attack += weapon.attackPower;
      player.stats.critChance += weapon.critChanceBonus;
      player.stats.critDamage += weapon.critDamageBonus;

      // Apply stat bonuses
      Object.entries(weapon.statBonuses).forEach(([stat, value]) => {
        if (value && stat in player.stats) {
          (player.stats as any)[stat] += value;
        }
      });
    } else if (item.type === ItemType.Armor) {
      const armor = item as Armor;
      player.stats.defense += armor.defense;
      player.stats.magicDefense += armor.magicDefense;

      // Apply stat bonuses
      Object.entries(armor.statBonuses).forEach(([stat, value]) => {
        if (value && stat in player.stats) {
          (player.stats as any)[stat] += value;
        }
      });
    }
  });
}

/**
 * Check if player has item
 */
export function hasItem(player: Player, itemId: string, quantity: number = 1): boolean {
  const count = player.inventory.filter(id => id === itemId).length;
  return count >= quantity;
}

/**
 * Get item count
 */
export function getItemCount(player: Player, itemId: string): number {
  return player.inventory.filter(id => id === itemId).length;
}
