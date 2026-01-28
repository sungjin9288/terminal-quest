/**
 * Terminal Quest - Shop UI
 * Handles display of shop interface, buy/sell menus
 */

import { AnyItem, ItemRarity } from '../types/item.js';
import {
  ShopInventoryItem,
  getItemTypeIcon,
  getItemStatDescription,
  getRarityName,
  formatGold
} from '../systems/shop.js';

/**
 * Shop display configuration
 */
export interface ShopDisplayConfig {
  showRarity: boolean;
  showLevel: boolean;
  showStats: boolean;
  maxItemsPerPage: number;
}

export const DEFAULT_SHOP_CONFIG: ShopDisplayConfig = {
  showRarity: true,
  showLevel: true,
  showStats: true,
  maxItemsPerPage: 10
};

/**
 * Shop menu option
 */
export interface ShopMenuOption {
  id: string;
  label: string;
  icon: string;
  disabled: boolean;
  disabledReason?: string;
}

/**
 * Formatted shop display data
 */
export interface ShopDisplay {
  header: string;
  ownerGreeting: string;
  playerGold: string;
  items: string[];
  menuOptions: ShopMenuOption[];
  footer: string;
}

/**
 * Show shop header
 */
export function showShopHeader(
  shopName: string,
  shopIcon: string,
  ownerName: string,
  ownerIcon: string,
  greeting: string
): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${shopIcon} ${shopName}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${ownerIcon} ${ownerName}: "${greeting}"`,
    ''
  ];
  return lines.join('\n');
}

/**
 * Show player gold
 */
export function showPlayerGold(gold: number): string {
  return `💰 소지 골드: ${formatGold(gold)}`;
}

/**
 * Show shop inventory item
 */
export function showShopItem(
  item: ShopInventoryItem,
  index: number,
  config: ShopDisplayConfig = DEFAULT_SHOP_CONFIG
): string {
  const icon = getItemTypeIcon(item.item);
  const name = item.item.name;
  const stats = config.showStats ? getItemStatDescription(item.item) : '';
  const price = formatGold(item.buyPrice);

  // Build status indicators
  const indicators: string[] = [];

  if (!item.meetsLevelReq) {
    indicators.push(`[Lv.${item.requiredLevel}]`);
  }

  if (!item.canAfford) {
    indicators.push('[골드 부족]');
  }

  if (item.isSpecial) {
    indicators.push('[특가]');
  }

  const statusStr = indicators.length > 0 ? ' ' + indicators.join(' ') : '';
  const statsStr = stats ? ` (${stats})` : '';

  // Format based on affordability
  if (!item.canAfford || !item.meetsLevelReq) {
    return `  ${index}. ${icon} ${name}${statsStr} - ${price}${statusStr}`;
  }

  return `  ${index}. ${icon} ${name}${statsStr} - ${price}`;
}

/**
 * Show buy menu
 */
export function showBuyMenu(
  shopName: string,
  shopIcon: string,
  ownerName: string,
  ownerIcon: string,
  greeting: string,
  playerGold: number,
  inventory: ShopInventoryItem[],
  config: ShopDisplayConfig = DEFAULT_SHOP_CONFIG
): string {
  const lines: string[] = [
    showShopHeader(shopName, shopIcon, ownerName, ownerIcon, greeting),
    showPlayerGold(playerGold),
    '',
    '[판매 중]'
  ];

  // Show items
  if (inventory.length === 0) {
    lines.push('  현재 판매 중인 아이템이 없습니다.');
  } else {
    inventory.forEach((item, index) => {
      lines.push(showShopItem(item, index + 1, config));
    });
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('  [번호] 구매  |  [S] 판매  |  [Q] 나가기');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

/**
 * Show sell menu
 */
export function showSellMenu(
  playerGold: number,
  sellableItems: ShopInventoryItem[]
): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '💰 아이템 판매',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    showPlayerGold(playerGold),
    '',
    '[판매 가능 아이템]'
  ];

  if (sellableItems.length === 0) {
    lines.push('  판매 가능한 아이템이 없습니다.');
  } else {
    sellableItems.forEach((item, index) => {
      const icon = getItemTypeIcon(item.item);
      const name = item.item.name;
      const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
      const price = formatGold(item.sellPrice);

      lines.push(`  ${index + 1}. ${icon} ${name}${quantity} - ${price}`);
    });
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('  [번호] 판매  |  [B] 구매  |  [Q] 나가기');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

/**
 * Show purchase confirmation
 */
export function showPurchaseConfirmation(
  item: AnyItem,
  quantity: number,
  totalCost: number,
  playerGold: number
): string {
  const icon = getItemTypeIcon(item);
  const canAfford = playerGold >= totalCost;

  const lines: string[] = [
    '┌─────────────────────────────────────┐',
    '│          구매 확인                  │',
    '├─────────────────────────────────────┤',
    `│  ${icon} ${item.name.padEnd(28)}│`,
    `│  수량: ${quantity.toString().padEnd(27)}│`,
    `│  가격: ${formatGold(totalCost).padEnd(27)}│`,
    '├─────────────────────────────────────┤',
    `│  현재 골드: ${formatGold(playerGold).padEnd(22)}│`,
    `│  구매 후:   ${formatGold(playerGold - totalCost).padEnd(22)}│`,
    '└─────────────────────────────────────┘'
  ];

  if (!canAfford) {
    lines.push('');
    lines.push('  ⚠️  골드가 부족합니다!');
  } else {
    lines.push('');
    lines.push('  [Y] 구매  |  [N] 취소');
  }

  return lines.join('\n');
}

/**
 * Show sale confirmation
 */
export function showSaleConfirmation(
  item: AnyItem,
  quantity: number,
  totalEarnings: number,
  playerGold: number
): string {
  const icon = getItemTypeIcon(item);

  const lines: string[] = [
    '┌─────────────────────────────────────┐',
    '│          판매 확인                  │',
    '├─────────────────────────────────────┤',
    `│  ${icon} ${item.name.padEnd(28)}│`,
    `│  수량: ${quantity.toString().padEnd(27)}│`,
    `│  판매가: ${formatGold(totalEarnings).padEnd(25)}│`,
    '├─────────────────────────────────────┤',
    `│  현재 골드: ${formatGold(playerGold).padEnd(22)}│`,
    `│  판매 후:   ${formatGold(playerGold + totalEarnings).padEnd(22)}│`,
    '└─────────────────────────────────────┘',
    '',
    '  [Y] 판매  |  [N] 취소'
  ];

  return lines.join('\n');
}

/**
 * Show transaction result
 */
export function showTransactionResult(
  success: boolean,
  message: string,
  newGold?: number
): string {
  const icon = success ? '✅' : '❌';
  const lines: string[] = [
    '',
    `${icon} ${message}`
  ];

  if (success && newGold !== undefined) {
    lines.push(`💰 현재 골드: ${formatGold(newGold)}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Show item details popup
 */
export function showItemDetails(item: AnyItem, buyPrice: number, sellPrice: number): string {
  const icon = getItemTypeIcon(item);
  const rarity = getRarityName(item.rarity);
  const stats = getItemStatDescription(item);

  const lines: string[] = [
    '╔═══════════════════════════════════════╗',
    `║ ${icon} ${item.name.padEnd(33)}║`,
    '╠═══════════════════════════════════════╣',
    `║ 등급: ${rarity.padEnd(30)}║`,
    `║ 필요 레벨: ${item.requiredLevel.toString().padEnd(25)}║`
  ];

  if (stats) {
    lines.push(`║ 효과: ${stats.padEnd(30)}║`);
  }

  lines.push('╠═══════════════════════════════════════╣');
  lines.push(`║ ${item.description.substring(0, 35).padEnd(35)}║`);
  lines.push('╠═══════════════════════════════════════╣');
  lines.push(`║ 구매가: ${formatGold(buyPrice).padEnd(28)}║`);
  lines.push(`║ 판매가: ${formatGold(sellPrice).padEnd(28)}║`);
  lines.push('╚═══════════════════════════════════════╝');

  return lines.join('\n');
}

/**
 * Show shop main menu
 */
export function showShopMainMenu(
  shopName: string,
  shopIcon: string,
  ownerName: string,
  ownerIcon: string,
  greeting: string,
  playerGold: number
): string {
  const lines: string[] = [
    showShopHeader(shopName, shopIcon, ownerName, ownerIcon, greeting),
    showPlayerGold(playerGold),
    '',
    '┌─────────────────────────────────────┐',
    '│                                     │',
    '│   > 구매                            │',
    '│     판매                            │',
    '│     나가기                          │',
    '│                                     │',
    '└─────────────────────────────────────┘'
  ];

  return lines.join('\n');
}

/**
 * Show shop farewell message
 */
export function showShopFarewell(
  ownerName: string,
  ownerIcon: string,
  farewell: string
): string {
  return `${ownerIcon} ${ownerName}: "${farewell}"`;
}

/**
 * Format rarity indicator for display
 */
export function formatRarityIndicator(rarity: ItemRarity): string {
  const indicators: Record<ItemRarity, string> = {
    [ItemRarity.Common]: '',
    [ItemRarity.Uncommon]: '[고급]',
    [ItemRarity.Rare]: '[희귀]',
    [ItemRarity.Epic]: '[영웅]',
    [ItemRarity.Legendary]: '[전설]',
    [ItemRarity.Mythic]: '[신화]'
  };
  return indicators[rarity];
}

/**
 * Show bulk purchase menu
 */
export function showBulkPurchaseMenu(
  item: AnyItem,
  unitPrice: number,
  _maxQuantity: number,
  playerGold: number,
  discountTiers?: { quantity: number; discount: number }[]
): string {
  const icon = getItemTypeIcon(item);
  const maxAffordable = Math.floor(playerGold / unitPrice);

  const lines: string[] = [
    '┌─────────────────────────────────────┐',
    '│          대량 구매                  │',
    '├─────────────────────────────────────┤',
    `│  ${icon} ${item.name.padEnd(28)}│`,
    `│  단가: ${formatGold(unitPrice).padEnd(27)}│`,
    '├─────────────────────────────────────┤',
    `│  현재 골드: ${formatGold(playerGold).padEnd(22)}│`,
    `│  최대 구매 가능: ${maxAffordable.toString().padEnd(17)}│`
  ];

  if (discountTiers && discountTiers.length > 0) {
    lines.push('├─────────────────────────────────────┤');
    lines.push('│  대량 구매 할인:                    │');
    for (const tier of discountTiers) {
      const discountPercent = Math.round(tier.discount * 100);
      lines.push(`│    ${tier.quantity}개 이상: ${discountPercent}% 할인${''.padEnd(14)}│`);
    }
  }

  lines.push('└─────────────────────────────────────┘');
  lines.push('');
  lines.push('  구매할 수량을 입력하세요 (0: 취소):');

  return lines.join('\n');
}

/**
 * Show shop list for town
 */
export function showShopList(
  shops: { id: string; name: string; icon: string; type: string }[]
): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🏘️  비트 타운 상점가',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ''
  ];

  shops.forEach((shop, index) => {
    lines.push(`  ${index + 1}. ${shop.icon} ${shop.name}`);
  });

  lines.push('');
  lines.push('  0. 뒤로 가기');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

/**
 * Create shop display for rendering
 */
export function createShopDisplay(
  shopName: string,
  shopIcon: string,
  ownerName: string,
  ownerIcon: string,
  greeting: string,
  playerGold: number,
  inventory: ShopInventoryItem[]
): ShopDisplay {
  const header = `${shopIcon} ${shopName}`;
  const ownerGreeting = `${ownerIcon} ${ownerName}: "${greeting}"`;
  const goldDisplay = `💰 소지 골드: ${formatGold(playerGold)}`;

  const items = inventory.map((item, index) =>
    showShopItem(item, index + 1)
  );

  const menuOptions: ShopMenuOption[] = [
    { id: 'buy', label: '구매', icon: '🛒', disabled: inventory.length === 0 },
    { id: 'sell', label: '판매', icon: '💰', disabled: false },
    { id: 'exit', label: '나가기', icon: '🚪', disabled: false }
  ];

  return {
    header,
    ownerGreeting,
    playerGold: goldDisplay,
    items,
    menuOptions,
    footer: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  };
}
