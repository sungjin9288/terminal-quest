/**
 * Inventory UI for Terminal Quest
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { Player, EquipmentSlot } from '../types/character.js';
import {
  AnyItem,
  Weapon,
  Armor,
  Consumable,
  ItemType,
  ItemRarity
} from '../types/item.js';
import { getOrganizedInventory, InventorySlot } from '../systems/inventory.js';
import { getItemById } from '../data/items.js';
import { showSeparator, showMessage } from './display.js';

/**
 * Get rarity color
 */
function getRarityColor(rarity: ItemRarity): (text: string) => string {
  switch (rarity) {
    case ItemRarity.Mythic:
      return chalk.magenta.bold;
    case ItemRarity.Legendary:
      return chalk.yellow.bold;
    case ItemRarity.Epic:
      return chalk.hex('#9146FF');
    case ItemRarity.Rare:
      return chalk.blue;
    case ItemRarity.Uncommon:
      return chalk.green;
    case ItemRarity.Common:
    default:
      return chalk.white;
  }
}

/**
 * Get item type label
 */
function getItemTypeLabel(type: ItemType): string {
  const labels: Record<ItemType, string> = {
    [ItemType.Weapon]: '무기',
    [ItemType.Armor]: '방어구',
    [ItemType.Consumable]: '소모품',
    [ItemType.Material]: '재료',
    [ItemType.QuestItem]: '퀘스트'
  };
  return labels[type] || type;
}

/**
 * Display inventory
 */
export async function showInventory(player: Player): Promise<void> {
  console.clear();
  console.log();
  showSeparator(60);
  console.log(chalk.cyan.bold('📦 인벤토리'));
  showSeparator(60);
  console.log();

  const slots = getOrganizedInventory(player);

  if (slots.length === 0) {
    console.log(chalk.gray('  인벤토리가 비어있습니다.'));
    console.log();
    return;
  }

  // Group by type
  const groups: Record<ItemType, InventorySlot[]> = {
    [ItemType.Weapon]: [],
    [ItemType.Armor]: [],
    [ItemType.Consumable]: [],
    [ItemType.Material]: [],
    [ItemType.QuestItem]: []
  };

  slots.forEach(slot => {
    groups[slot.item.type].push(slot);
  });

  // Display each group
  Object.entries(groups).forEach(([type, items]) => {
    if (items.length === 0) return;

    console.log(chalk.yellow.bold(`[${getItemTypeLabel(type as ItemType)}]`));

    const table = new Table({
      head: [
        chalk.white('아이템'),
        chalk.white('수량'),
        chalk.white('가치')
      ],
      colWidths: [40, 10, 10],
      style: {
        head: [],
        border: ['gray']
      }
    });

    items.forEach(slot => {
      const rarityColor = getRarityColor(slot.item.rarity);
      const itemName = `${slot.item.icon} ${rarityColor(slot.item.name)}`;
      const quantity = slot.item.stackable ? `×${slot.quantity}` : '-';
      const value = slot.item.value > 0 ? `${slot.item.value}G` : '-';

      table.push([itemName, quantity, value]);
    });

    console.log(table.toString());
    console.log();
  });

  // Show stats
  const totalItems = player.inventory.length;
  const maxItems = player.maxInventorySize;
  const percentage = Math.floor((totalItems / maxItems) * 100);

  let capacityColor = chalk.green;
  if (percentage > 80) capacityColor = chalk.red;
  else if (percentage > 60) capacityColor = chalk.yellow;

  console.log(chalk.white(`용량: ${capacityColor(`${totalItems}/${maxItems}`)} (${percentage}%)`));
  console.log(chalk.yellow(`💰 골드: ${player.gold.toLocaleString()}`));
  console.log();
}

/**
 * Display equipment
 */
export async function showEquipment(player: Player): Promise<void> {
  console.clear();
  console.log();
  showSeparator(60);
  console.log(chalk.cyan.bold('⚔️  장착 장비'));
  showSeparator(60);
  console.log();

  const table = new Table({
    head: [
      chalk.white('슬롯'),
      chalk.white('장비'),
      chalk.white('효과')
    ],
    colWidths: [15, 30, 30],
    style: {
      head: [],
      border: ['gray']
    }
  });

  const slots = [
    { slot: EquipmentSlot.Weapon, name: '무기' },
    { slot: EquipmentSlot.Helmet, name: '투구' },
    { slot: EquipmentSlot.Armor, name: '갑옷' },
    { slot: EquipmentSlot.Gloves, name: '장갑' },
    { slot: EquipmentSlot.Boots, name: '신발' },
    { slot: EquipmentSlot.Accessory1, name: '장신구 1' },
    { slot: EquipmentSlot.Accessory2, name: '장신구 2' }
  ];

  slots.forEach(({ slot, name }) => {
    const itemId = player.equipment[slot];
    if (itemId) {
      const item = getItemById(itemId);
      if (item) {
        const rarityColor = getRarityColor(item.rarity);
        const itemName = `${item.icon} ${rarityColor(item.name)}`;

        let effect = '';
        if (item.type === ItemType.Weapon) {
          const weapon = item as Weapon;
          effect = `공격 +${weapon.attackPower}`;
        } else if (item.type === ItemType.Armor) {
          const armor = item as Armor;
          effect = `방어 +${armor.defense}`;
        }

        table.push([chalk.cyan(name), itemName, chalk.white(effect)]);
      }
    } else {
      table.push([chalk.gray(name), chalk.gray('-없음-'), chalk.gray('-')]);
    }
  });

  console.log(table.toString());
  console.log();

  // Show total stats
  console.log(chalk.yellow.bold('총 능력치:'));
  console.log(chalk.white(`  공격력: ${player.stats.attack}`));
  console.log(chalk.white(`  방어력: ${player.stats.defense}`));
  console.log(chalk.white(`  마력: ${player.stats.magicPower}`));
  console.log(chalk.white(`  마법방어: ${player.stats.magicDefense}`));
  console.log(chalk.white(`  속도: ${player.stats.speed}`));
  console.log(chalk.white(`  치명타율: ${player.stats.critChance}%`));
  console.log(chalk.white(`  회피율: ${player.stats.evasion}%`));
  console.log();
}

/**
 * Display item detail
 */
export function showItemDetail(item: AnyItem): void {
  console.log();
  showSeparator(60);

  const rarityColor = getRarityColor(item.rarity);
  console.log(rarityColor(`${item.icon} ${item.name}`));
  console.log(chalk.gray(`[${item.rarity.toUpperCase()}] ${getItemTypeLabel(item.type)}`));

  showSeparator(60);
  console.log();
  console.log(chalk.white(item.description));
  console.log();

  // Show stats based on item type
  if (item.type === ItemType.Weapon) {
    const weapon = item as Weapon;
    console.log(chalk.yellow('무기 정보:'));
    console.log(chalk.white(`  공격력: +${weapon.attackPower}`));
    if (weapon.elementalDamage > 0) {
      console.log(chalk.white(`  속성 데미지: +${weapon.elementalDamage} (${weapon.element})`));
    }
    if (weapon.critChanceBonus > 0) {
      console.log(chalk.white(`  치명타율: +${weapon.critChanceBonus}%`));
    }
    if (weapon.twoHanded) {
      console.log(chalk.red('  양손 무기'));
    }
    console.log();
  } else if (item.type === ItemType.Armor) {
    const armor = item as Armor;
    console.log(chalk.yellow('방어구 정보:'));
    console.log(chalk.white(`  방어력: +${armor.defense}`));
    console.log(chalk.white(`  마법방어: +${armor.magicDefense}`));

    if (Object.keys(armor.resistances).length > 0) {
      console.log(chalk.white('  저항:'));
      Object.entries(armor.resistances).forEach(([element, value]) => {
        if (value) {
          const percentage = Math.floor(value * 100);
          console.log(chalk.white(`    ${element}: ${percentage > 0 ? '+' : ''}${percentage}%`));
        }
      });
    }
    console.log();
  } else if (item.type === ItemType.Consumable) {
    const consumable = item as Consumable;
    console.log(chalk.yellow('효과:'));
    consumable.effects.forEach(effect => {
      switch (effect.type) {
        case 'heal':
          console.log(chalk.green(`  HP 회복: +${effect.power}`));
          break;
        case 'restore-mp':
          console.log(chalk.blue(`  MP 회복: +${effect.power}`));
          break;
        case 'cure':
          console.log(chalk.white('  상태 이상 치료'));
          break;
        case 'buff':
          console.log(chalk.white(`  버프 효과 (${effect.duration}턴)`));
          break;
      }
    });
    console.log();
  }

  console.log(chalk.gray(`필요 레벨: ${item.requiredLevel}`));
  console.log(chalk.yellow(`가치: ${item.value} 골드`));
  console.log();
  showSeparator(60);
  console.log();
}

/**
 * Select item from inventory
 */
export async function selectItemFromInventory(
  player: Player,
  filter?: (item: AnyItem) => boolean
): Promise<InventorySlot | null> {
  const slots = getOrganizedInventory(player);

  let filteredSlots = slots;
  if (filter) {
    filteredSlots = slots.filter(slot => filter(slot.item));
  }

  if (filteredSlots.length === 0) {
    showMessage('해당하는 아이템이 없습니다.', 'warning');
    return null;
  }

  const choices = filteredSlots.map(slot => {
    const rarityColor = getRarityColor(slot.item.rarity);
    const quantity = slot.item.stackable ? ` ×${slot.quantity}` : '';
    return {
      name: `${slot.item.icon} ${rarityColor(slot.item.name)}${quantity}`,
      value: slot
    };
  });

  choices.push({
    name: chalk.gray('← 돌아가기'),
    value: null as any
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'item',
      message: '아이템 선택:',
      choices,
      pageSize: 15
    }
  ]);

  return answer.item;
}

/**
 * Select action for item
 */
export async function selectItemAction(item: AnyItem, equipped: boolean = false): Promise<string> {
  const actions: { name: string; value: string }[] = [];

  // Show details
  actions.push({
    name: '📋 상세 정보 보기',
    value: 'details'
  });

  // Equip/Unequip
  if (item.type === ItemType.Weapon || item.type === ItemType.Armor) {
    if (equipped) {
      actions.push({
        name: '❌ 장비 해제',
        value: 'unequip'
      });
    } else {
      actions.push({
        name: '✅ 장착',
        value: 'equip'
      });
    }
  }

  // Use
  if (item.type === ItemType.Consumable) {
    actions.push({
      name: '🍶 사용',
      value: 'use'
    });
  }

  // Drop
  actions.push({
    name: '🗑️  버리기',
    value: 'drop'
  });

  actions.push({
    name: chalk.gray('← 돌아가기'),
    value: 'back'
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '행동 선택:',
      choices: actions
    }
  ]);

  return answer.action;
}

/**
 * Show inventory menu
 */
export async function showInventoryMenu(_player: Player): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: '인벤토리 메뉴:',
      choices: [
        { name: '📦 아이템 보기', value: 'items' },
        { name: '⚔️  장착 장비 보기', value: 'equipment' },
        { name: '🔧 아이템 사용/장착', value: 'manage' },
        { name: '📊 정렬', value: 'sort' },
        { name: chalk.gray('← 돌아가기'), value: 'back' }
      ]
    }
  ]);

  return answer.choice;
}
