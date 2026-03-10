import chalk from 'chalk';
import inquirer from 'inquirer';
import { GameState } from '../types/game.js';
import {
  getShopInventory,
  buyItem,
  getUnlockedShopTiersForShop,
  sellItem,
  getPlayerSellableItems,
  type ShopInventoryItem
} from './shop.js';
import {
  updateQuestProgressOnCollect
} from './quest.js';
import {
  ensureAchievementPerkState,
  formatAchievementRewardMessage,
  formatAchievementTrackingMessage,
  formatAchievementUnlockMessage,
  getAchievementTrackingTone,
  progressAchievements,
  recordRunGoldSpent,
  recordRunItemsCollected
} from './achievements.js';
import {
  showQuestProgressUpdates,
  applyTalkQuestProgress
} from './questUi.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showBuyMenu,
  showSellMenu
} from '../ui/shop.js';

const SHOP_NPCS: Record<string, { name: string; icon: string; owner: string; greeting: string }> = {
  'binary-weapons': {
    name: '무기상 바이너리',
    icon: '⚔️',
    owner: '캐시',
    greeting: '전선에 나가기 전에 손에 맞는 무기부터 맞추시죠. 오늘 필요한 화력을 함께 보겠습니다.'
  },
  'armor-code': {
    name: '방어구상 아머 코드',
    icon: '🛡️',
    owner: '버퍼',
    greeting: '오래 버틸수록 이깁니다. 현재 작전에 맞는 방호 장비를 골라 보세요.'
  },
  'buffer-potions': {
    name: '포션상 버퍼',
    icon: '🧪',
    owner: '힙',
    greeting: '보급품은 항상 한 박자 먼저 챙기세요. 회복과 버프가 전선을 붙들어 줍니다.'
  }
};

function buildShopRewardOptions(gameState: GameState, shopId: string): {
  discountPercent: number;
  extraUnlockedTiers: string[];
} {
  const perkState = ensureAchievementPerkState(gameState);
  return {
    discountPercent: perkState.shopDiscountPercent,
    extraUnlockedTiers: getUnlockedShopTiersForShop(perkState.unlockedShopTiers, shopId)
  };
}

function showAchievementUnlocks(gameState: GameState): void {
  const achievementResult = progressAchievements(gameState, {
    recordHistory: true,
    cause: '상점 구매'
  });
  for (const achievement of achievementResult.newlyUnlocked) {
    showMessage(formatAchievementUnlockMessage(achievement), 'success');
  }
  for (const rewardGrant of achievementResult.rewardGrants) {
    showMessage(formatAchievementRewardMessage(rewardGrant), 'success');
  }
  for (const entry of achievementResult.trackingHistory) {
    showMessage(formatAchievementTrackingMessage(entry), getAchievementTrackingTone(entry));
  }
}

export async function shopMenu(gameState: GameState): Promise<void> {
  while (true) {
    clearScreen();
    await showTitle();

    console.log(chalk.yellow.bold('\n🏪 상점 거리\n'));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: '어느 상점을 방문하시겠습니까?',
        choices: [
          { name: '⚔️  무기상 바이너리', value: 'binary-weapons' },
          { name: '🛡️  방어구상 아머 코드', value: 'armor-code' },
          { name: '🧪 포션상 버퍼', value: 'buffer-potions' },
          { name: chalk.gray('← 나가기'), value: 'exit' }
        ]
      }
    ]);

    if (answer.choice === 'exit') {
      return;
    }

    await visitShop(gameState, answer.choice as string);
  }
}

async function visitShop(gameState: GameState, shopId: string): Promise<void> {
  const shop = SHOP_NPCS[shopId];
  if (!shop) {
    return;
  }

  await applyTalkQuestProgress(gameState, ['merchant', `${shopId}-owner`]);

  while (true) {
    clearScreen();
    await showTitle();

    const shopRewardOptions = buildShopRewardOptions(gameState, shopId);
    const inventory = getShopInventory(shopId, gameState.player.level, shopRewardOptions);
    const buyMenuDisplay = showBuyMenu(
      shop.name,
      shop.icon,
      shop.owner,
      '👤',
      shop.greeting,
      gameState.player.gold,
      inventory
    );
    console.log(buyMenuDisplay);

    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '무엇을 하시겠습니까?',
        choices: [
          { name: '🛒 구매', value: 'buy' },
          { name: '💰 판매', value: 'sell' },
          { name: chalk.gray('← 나가기'), value: 'exit' }
        ]
      }
    ]);

    if (action.action === 'exit') {
      return;
    }

    if (action.action === 'buy') {
      await buyFromShop(gameState, shopId, inventory);
    } else if (action.action === 'sell') {
      await sellToShop(gameState);
    }
  }
}

async function buyFromShop(
  gameState: GameState,
  shopId: string,
  inventory: ShopInventoryItem[]
): Promise<void> {
  const choices = inventory.map(inv => {
    const canAfford = gameState.player.gold >= inv.buyPrice;
    return {
      name: canAfford
        ? `${inv.item.name} - ${inv.buyPrice}G`
        : chalk.gray(`${inv.item.name} - ${inv.buyPrice}G (골드 부족)`),
      value: inv.item.id,
      disabled: !canAfford ? '골드가 부족합니다' : false
    };
  });

  choices.push({ name: chalk.gray('← 취소'), value: 'cancel', disabled: false });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'item',
      message: '구매할 아이템을 선택하세요:',
      choices
    }
  ]);

  if (answer.item === 'cancel') {
    return;
  }

  const shopRewardOptions = buildShopRewardOptions(gameState, shopId);
  const result = buyItem(gameState.player, answer.item as string, shopId, 1, {
    discountPercent: shopRewardOptions.discountPercent
  });
  if (result.success && result.item) {
    gameState.statistics.goldSpent += result.cost ?? 0;
    gameState.statistics.itemsCollected += 1;
    recordRunGoldSpent(gameState, result.cost ?? 0);
    recordRunItemsCollected(gameState, 1);
    showMessage(`${result.item.name}을(를) 구매했습니다!`, 'success');

    const questUpdates = updateQuestProgressOnCollect(gameState, answer.item as string, 1);
    if (questUpdates.length > 0) {
      showQuestProgressUpdates(gameState, questUpdates);
    }
    showAchievementUnlocks(gameState);
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue('important');
}

async function sellToShop(gameState: GameState): Promise<void> {
  const sellableItems = getPlayerSellableItems(gameState.player);
  if (sellableItems.length === 0) {
    showMessage('판매할 수 있는 아이템이 없습니다.', 'warning');
    await pressEnterToContinue('important');
    return;
  }

  const sellMenuDisplay = showSellMenu(gameState.player.gold, sellableItems);
  console.log(sellMenuDisplay);

  const choices = sellableItems.map(inv => ({
    name: `${inv.item.name} - ${inv.sellPrice}G`,
    value: inv.item.id
  }));
  choices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'item',
      message: '판매할 아이템을 선택하세요:',
      choices
    }
  ]);

  if (answer.item === 'cancel') {
    return;
  }

  const result = sellItem(gameState.player, answer.item as string, 1);
  if (result.success && result.item) {
    gameState.statistics.goldEarned += result.earnings ?? 0;
    showMessage(`${result.item.name}을(를) ${result.earnings || 0}G에 판매했습니다!`, 'success');
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue('important');
}
