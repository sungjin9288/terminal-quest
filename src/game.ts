/**
 * Main game loop and state management for Terminal Quest
 * Integrated version with all systems connected
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  GameState,
  GameMode,
  GameStateType,
  Player,
  CharacterClass,
  Stats
} from './types/index.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  showStats,
  showLoading,
  showBox,
  pressEnterToContinue
} from './ui/display.js';
import {
  showGameModeSelect,
  showCharacterCreation,
  showInGameMenu,
  confirmAction
} from './ui/menu.js';
import { getSampleMonsters, getRandomMonster } from './data/monsters.js';
import { runBattle } from './systems/battle.js';
import { addItem } from './systems/inventory.js';
import {
  showInventory,
  showEquipment,
  showInventoryMenu,
  selectItemFromInventory,
  selectItemAction,
  showItemDetail
} from './ui/inventory.js';
import { equipItem, useItem, sortInventory } from './systems/inventory.js';
import { getExpForNextLevel } from './systems/leveling.js';
import {
  saveGame as saveToFile,
  loadGame as loadFromFile,
  listSaves,
  getSaveMetadata,
  deleteSave
} from './systems/save.js';
import {
  showSaveSlots,
  selectSaveSlot,
  confirmSaveOverwrite,
  confirmDelete,
  showSaveSuccess,
  showLoadSuccess
} from './ui/save.js';
import {
  canSaveAtLocation,
  getSaveTokenCount,
  useSaveToken as consumeSaveToken,
  isAutoSaveLocation
} from './systems/savePoint.js';
import { SaveType } from './types/save.js';

// New imports for integrated systems
import {
  getLocationDisplayName,
  isTownLocation,
  getHubTown,
  getLocationMonsters,
  isLocationUnlocked
} from './data/locations.js';
import {
  showTravelMenu,
  showTravelAnimation,
  showLocationArrival,
  showTownMenu,
  showDungeonMenu
} from './ui/travel.js';
import {
  handleDeath,
  respawnPlayer,
  getGameModeName
} from './systems/death.js';
import {
  showDeathScreen,
  showGameOver
} from './ui/death.js';
import {
  getShopInventory,
  buyItem,
  sellItem,
  getPlayerSellableItems
} from './systems/shop.js';
import {
  showBuyMenu,
  showSellMenu
} from './ui/shop.js';

/**
 * Create initial player stats based on class
 */
function createInitialStats(characterClass: CharacterClass): Stats {
  const baseStats: Record<CharacterClass, Stats> = {
    [CharacterClass.Warrior]: {
      hp: 120, maxHp: 120, mp: 30, maxMp: 30,
      attack: 15, defense: 12, magicPower: 5, magicDefense: 8,
      speed: 8, critChance: 10, critDamage: 1.5, evasion: 5
    },
    [CharacterClass.Mage]: {
      hp: 70, maxHp: 70, mp: 100, maxMp: 100,
      attack: 5, defense: 5, magicPower: 20, magicDefense: 15,
      speed: 10, critChance: 8, critDamage: 2.0, evasion: 8
    },
    [CharacterClass.Rogue]: {
      hp: 90, maxHp: 90, mp: 50, maxMp: 50,
      attack: 18, defense: 7, magicPower: 8, magicDefense: 7,
      speed: 18, critChance: 25, critDamage: 2.5, evasion: 20
    },
    [CharacterClass.Cleric]: {
      hp: 100, maxHp: 100, mp: 80, maxMp: 80,
      attack: 8, defense: 10, magicPower: 15, magicDefense: 12,
      speed: 9, critChance: 5, critDamage: 1.5, evasion: 7
    },
    [CharacterClass.Ranger]: {
      hp: 95, maxHp: 95, mp: 60, maxMp: 60,
      attack: 14, defense: 9, magicPower: 10, magicDefense: 10,
      speed: 14, critChance: 15, critDamage: 2.0, evasion: 12
    }
  };
  return baseStats[characterClass];
}

/**
 * Create a new player
 */
function createPlayer(name: string, characterClass: CharacterClass, _gameMode: GameMode): Player {
  const stats = createInitialStats(characterClass);

  const player: Player = {
    name,
    class: characterClass,
    level: 1,
    experience: 0,
    experienceToNextLevel: getExpForNextLevel(1),
    stats,
    baseStats: { ...stats },
    gold: 100,
    equipment: {},
    inventory: [],
    maxInventorySize: 20,
    statusEffects: [],
    currentLocation: 'bit-town',
    completedQuests: [],
    activeQuests: [],
    unlockedLocations: ['bit-town', 'memory-forest'],
    playTime: 0,
    enemiesDefeated: 0,
    deaths: 0,
    skillPoints: 0,
    skills: []
  };

  // Give starting items based on class
  switch (characterClass) {
    case CharacterClass.Warrior:
      addItem(player, 'rusty-sword');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Mage:
      addItem(player, 'debugger-staff');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Rogue:
      addItem(player, 'rusty-dagger');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Cleric:
      addItem(player, 'rusty-sword');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Ranger:
      addItem(player, 'rusty-dagger');
      addItem(player, 'leather-armor');
      break;
  }

  // Give starting consumables
  addItem(player, 'health-potion', 5);
  addItem(player, 'mana-potion', 3);
  addItem(player, 'save-token', 3);

  return player;
}

/**
 * Start a new game
 */
export async function startNewGame(): Promise<GameState> {
  clearScreen();
  await showTitle();

  const gameMode = await showGameModeSelect();
  showMessage(`${getGameModeName(gameMode)} 선택됨`, 'success');
  await showLoading('게임 초기화 중', 1000);

  clearScreen();
  await showTitle();

  const characterData = await showCharacterCreation();
  showMessage(`환영합니다, ${characterData.class} ${characterData.name}!`, 'success');
  await showLoading('캐릭터 생성 중', 1500);

  const player = createPlayer(characterData.name, characterData.class, gameMode);

  const gameState: GameState = {
    stateType: GameStateType.Exploration,
    gameMode,
    player,
    position: { locationId: 'bit-town', stepsTaken: 0 },
    items: {},
    monsters: {},
    locations: {},
    savePoints: {},
    quests: {},
    fastTravelPoints: [],
    statistics: {
      totalPlayTime: 0,
      enemiesDefeated: {},
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      bossesDefeated: [],
      questsCompleted: 0,
      itemsCollected: 0,
      locationsDiscovered: 2,
      goldEarned: 100,
      goldSpent: 0,
      deaths: 0,
      highestLevel: 1
    },
    flags: {},
    gameVersion: '1.0.0'
  };

  // Show intro
  clearScreen();
  await showTitle();

  const hub = getHubTown();
  showBox(
    `당신은 ${hub.name}에서 눈을 떴습니다.\n` +
    `평화로운 마을에 햇살이 내리쬐고, 주민들이 분주히 움직입니다.\n` +
    `하지만 어둠의 소문이 퍼지고 있습니다...\n` +
    `주변 숲에서 몬스터들이 나타나기 시작했다고 합니다.\n\n` +
    `당신의 모험이 시작됩니다, ${player.name}!`,
    '프롤로그'
  );

  await pressEnterToContinue();

  return gameState;
}

/**
 * Load an existing game
 */
export async function loadGame(): Promise<GameState | null> {
  clearScreen();
  await showTitle();

  const saves = listSaves();
  showSaveSlots(saves);

  const action = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '불러오기 메뉴:',
      choices: [
        { name: '📂 불러오기', value: 'load' },
        { name: '🗑️  삭제', value: 'delete' },
        { name: chalk.gray('← 취소'), value: 'cancel' }
      ]
    }
  ]);

  if (action.action === 'cancel') return null;

  if (action.action === 'delete') {
    const slotNumber = await selectSaveSlot(saves, 'delete');
    if (slotNumber) {
      const metadata = getSaveMetadata(slotNumber);
      if (metadata && metadata.exists) {
        const confirmed = await confirmDelete(metadata);
        if (confirmed) {
          const result = deleteSave(slotNumber);
          showMessage(result.message, result.success ? 'success' : 'error');
        }
      }
    }
    await pressEnterToContinue();
    return null;
  }

  if (action.action === 'load') {
    const slotNumber = await selectSaveSlot(saves, 'load');
    if (!slotNumber) return null;

    const result = loadFromFile(slotNumber);
    if (result.success && result.gameState) {
      const metadata = getSaveMetadata(slotNumber);
      if (metadata) showLoadSuccess(metadata);
      await pressEnterToContinue();
      return result.gameState;
    } else {
      showMessage(result.message, 'error');
      await pressEnterToContinue();
      return null;
    }
  }

  return null;
}

/**
 * Save the current game
 */
export async function saveGame(gameState: GameState): Promise<boolean> {
  clearScreen();
  await showTitle();

  const tokenCount = getSaveTokenCount(gameState.player);
  const canSave = canSaveAtLocation(
    gameState.player.currentLocation,
    false,
    tokenCount > 0
  );

  if (!canSave.canSave) {
    showMessage(canSave.reason, 'warning');
    await pressEnterToContinue();
    return false;
  }

  const saves = listSaves();
  showSaveSlots(saves);

  const slotNumber = await selectSaveSlot(saves, 'save');
  if (!slotNumber) return false;

  const metadata = getSaveMetadata(slotNumber);
  if (metadata && metadata.exists) {
    const confirmed = await confirmSaveOverwrite(slotNumber, metadata);
    if (!confirmed) return false;
  }

  let saveType = SaveType.Manual;
  let useToken = false;

  if (canSave.requiresToken) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `세이브 토큰 1개를 사용하여 긴급 저장하시겠습니까? (보유: ${tokenCount}개)`,
        default: true
      }
    ]);

    if (!answer.confirm) return false;
    saveType = SaveType.Emergency;
    useToken = true;
  } else if (isAutoSaveLocation(gameState.player.currentLocation)) {
    saveType = SaveType.Auto;
  }

  if (useToken) {
    if (!consumeSaveToken(gameState.player)) {
      showMessage('세이브 토큰이 부족합니다!', 'error');
      await pressEnterToContinue();
      return false;
    }
  }

  const result = saveToFile(gameState, slotNumber, saveType);

  if (result.success) {
    showSaveSuccess(slotNumber, saveType);
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue();
  return result.success;
}

/**
 * Handle player death
 */
async function handlePlayerDeath(gameState: GameState): Promise<boolean> {
  const deathResult = handleDeath(
    gameState.player,
    gameState.gameMode,
    gameState.player.currentLocation
  );

  clearScreen();
  await showTitle();

  // Show death screen
  const deathScreen = showDeathScreen(gameState.player, deathResult);
  console.log(deathScreen);

  await pressEnterToContinue();

  // Hardcore mode - game over
  if (deathResult.isGameOver) {
    clearScreen();
    const gameOverScreen = showGameOver(gameState.player, deathResult.penalty.soulEssence);
    console.log(gameOverScreen);
    await pressEnterToContinue();
    return false; // Return to main menu
  }

  // Apply death penalty and respawn
  gameState.player = respawnPlayer(
    gameState.player,
    deathResult.respawnLocation || 'bit-town',
    deathResult.penalty
  );

  // Update statistics
  gameState.statistics.deaths++;

  showMessage(`${getLocationDisplayName(gameState.player.currentLocation)}에서 부활했습니다.`, 'info');
  await pressEnterToContinue();

  return true; // Continue game
}

/**
 * Run a battle encounter
 */
async function runEncounter(gameState: GameState): Promise<'victory' | 'defeat' | 'escape'> {
  const monsters = getSampleMonsters();
  const locationMonsters = getLocationMonsters(gameState.player.currentLocation);

  // Get player level appropriate monster
  const playerLevel = gameState.player.level;
  const minLevel = Math.max(1, playerLevel - 1);
  const maxLevel = playerLevel + 2;

  // Try to get location-specific monster first
  let monster = null;
  if (locationMonsters.length > 0) {
    const monsterIds = Object.keys(monsters).filter(id =>
      locationMonsters.some(locMon => id.includes(locMon.toLowerCase().replace(/\s+/g, '-')))
    );
    if (monsterIds.length > 0) {
      const randomId = monsterIds[Math.floor(Math.random() * monsterIds.length)];
      monster = monsters[randomId];
    }
  }

  // Fallback to random monster by level
  if (!monster) {
    monster = getRandomMonster(monsters, minLevel, maxLevel);
  }

  if (!monster) {
    showMessage('아무것도 나타나지 않았습니다...', 'info');
    gameState.player.gold += 10;
    showMessage('10 골드를 발견했습니다!', 'success');
    return 'victory';
  }

  clearScreen();
  await showTitle();

  showBox(
    `${monster.name}이(가) 나타났다!\n\n${monster.description}`,
    '전투!'
  );

  await pressEnterToContinue();

  const battleResult = await runBattle(gameState.player, monster);

  if (battleResult.won) {
    gameState.player.enemiesDefeated++;
    gameState.statistics.enemiesDefeated[monster.id] =
      (gameState.statistics.enemiesDefeated[monster.id] || 0) + 1;
    return 'victory';
  } else if (battleResult.escaped) {
    return 'escape';
  } else {
    return 'defeat';
  }
}

/**
 * Shop menu
 */
async function shopMenu(gameState: GameState): Promise<void> {
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

    if (answer.choice === 'exit') break;

    await visitShop(gameState, answer.choice);
  }
}

/**
 * Visit a specific shop
 */
async function visitShop(gameState: GameState, shopId: string): Promise<void> {
  const shopNames: Record<string, { name: string; icon: string; owner: string; greeting: string }> = {
    'binary-weapons': {
      name: '무기상 바이너리',
      icon: '⚔️',
      owner: '캐시',
      greeting: '어서오게, 모험가! 최고의 무기들이 자네를 기다리고 있다네.'
    },
    'armor-code': {
      name: '방어구상 아머 코드',
      icon: '🛡️',
      owner: '버퍼',
      greeting: '방어구를 찾나? 내 물건이라면 어떤 공격도 막아낼 수 있지!'
    },
    'buffer-potions': {
      name: '포션상 버퍼',
      icon: '🧪',
      owner: '힙',
      greeting: '포션이 필요한가? 내 특제 조합은 최고라네!'
    }
  };

  const shop = shopNames[shopId];
  if (!shop) return;

  while (true) {
    clearScreen();
    await showTitle();

    const inventory = getShopInventory(shopId, gameState.player.level);

    // Show shop UI
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

    if (action.action === 'exit') break;

    if (action.action === 'buy') {
      await buyFromShop(gameState, shopId, inventory);
    } else if (action.action === 'sell') {
      await sellToShop(gameState);
    }
  }
}

/**
 * Buy from shop
 */
async function buyFromShop(
  gameState: GameState,
  shopId: string,
  inventory: Array<{ item: { id: string; name: string }; buyPrice: number; inStock: boolean }>
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

  if (answer.item === 'cancel') return;

  const result = buyItem(gameState.player, answer.item, shopId, 1);

  if (result.success && result.item) {
    showMessage(`${result.item.name}을(를) 구매했습니다!`, 'success');
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue();
}

/**
 * Sell to shop
 */
async function sellToShop(gameState: GameState): Promise<void> {
  const sellableItems = getPlayerSellableItems(gameState.player);

  if (sellableItems.length === 0) {
    showMessage('판매할 수 있는 아이템이 없습니다.', 'warning');
    await pressEnterToContinue();
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

  if (answer.item === 'cancel') return;

  const result = sellItem(gameState.player, answer.item, 1);

  if (result.success && result.item) {
    showMessage(`${result.item.name}을(를) ${result.earnings || 0}G에 판매했습니다!`, 'success');
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue();
}

/**
 * Town loop
 */
async function townLoop(gameState: GameState): Promise<boolean> {
  const locationName = getLocationDisplayName(gameState.player.currentLocation);

  while (true) {
    clearScreen();
    await showTitle();
    showStats(gameState.player);

    const choice = await showTownMenu(locationName);

    switch (choice) {
      case 'shop':
        await shopMenu(gameState);
        break;

      case 'inn':
        showMessage('여관에서 휴식을 취합니다...', 'info');
        await showLoading('휴식 중', 1500);
        gameState.player.stats.hp = gameState.player.stats.maxHp;
        gameState.player.stats.mp = gameState.player.stats.maxMp;
        showMessage('HP와 MP가 완전히 회복되었습니다!', 'success');
        await pressEnterToContinue();
        break;

      case 'save':
        await saveGame(gameState);
        break;

      case 'explore':
        showMessage('마을 주변을 둘러봅니다...', 'info');
        await showLoading('탐색 중', 1000);
        if (Math.random() < 0.3) {
          const goldFound = Math.floor(Math.random() * 20) + 5;
          gameState.player.gold += goldFound;
          showMessage(`${goldFound} 골드를 발견했습니다!`, 'success');
        } else {
          showMessage('특별한 것은 발견하지 못했습니다.', 'info');
        }
        await pressEnterToContinue();
        break;

      case 'travel':
        const travelResult = await handleTravel(gameState);
        if (travelResult.locationChanged) {
          if (!isTownLocation(gameState.player.currentLocation)) {
            return true; // Continue to dungeon loop
          }
        }
        break;

      case 'menu':
        const shouldContinue = await inGameMenuLoop(gameState);
        if (!shouldContinue) return false;
        break;
    }
  }
}

/**
 * Dungeon loop
 */
async function dungeonLoop(gameState: GameState): Promise<boolean> {
  const locationName = getLocationDisplayName(gameState.player.currentLocation);

  while (true) {
    clearScreen();
    await showTitle();
    showStats(gameState.player);

    const choice = await showDungeonMenu(locationName, true);

    switch (choice) {
      case 'explore':
        showMessage('앞으로 나아갑니다...', 'info');
        await showLoading('탐색 중', 1500);

        const encounterChance = Math.random();
        if (encounterChance < 0.6) {
          const result = await runEncounter(gameState);

          if (result === 'defeat') {
            const continueGame = await handlePlayerDeath(gameState);
            if (!continueGame) return false;

            // After death, might be in town
            if (isTownLocation(gameState.player.currentLocation)) {
              return true; // Go to town loop
            }
          }
        } else {
          // Random event
          const eventRoll = Math.random();
          if (eventRoll < 0.3) {
            const goldFound = Math.floor(Math.random() * 30) + 10;
            gameState.player.gold += goldFound;
            showMessage(`${goldFound} 골드를 발견했습니다!`, 'success');
          } else if (eventRoll < 0.5) {
            showMessage('체력 회복 샘을 발견했습니다!', 'success');
            gameState.player.stats.hp = Math.min(
              gameState.player.stats.hp + 30,
              gameState.player.stats.maxHp
            );
            showMessage('HP가 30 회복되었습니다.', 'info');
          } else {
            showMessage('아무것도 발견하지 못했습니다.', 'info');
          }
          await pressEnterToContinue();
        }
        break;

      case 'rest':
        if (gameState.player.stats.hp < gameState.player.stats.maxHp * 0.5) {
          showMessage('너무 위험한 상태입니다. 안전한 곳에서 쉬세요.', 'warning');
        } else {
          showMessage('잠시 휴식을 취합니다...', 'info');
          await showLoading('휴식 중', 2000);
          const hpRestore = Math.floor(gameState.player.stats.maxHp * 0.3);
          const mpRestore = Math.floor(gameState.player.stats.maxMp * 0.2);
          gameState.player.stats.hp = Math.min(
            gameState.player.stats.hp + hpRestore,
            gameState.player.stats.maxHp
          );
          gameState.player.stats.mp = Math.min(
            gameState.player.stats.mp + mpRestore,
            gameState.player.stats.maxMp
          );
          showMessage(`HP ${hpRestore}, MP ${mpRestore} 회복!`, 'success');
        }
        await pressEnterToContinue();
        break;

      case 'travel':
        const travelResult = await handleTravel(gameState);
        if (travelResult.locationChanged) {
          if (isTownLocation(gameState.player.currentLocation)) {
            return true; // Go to town loop
          }
        }
        break;

      case 'menu':
        const shouldContinue = await inGameMenuLoop(gameState);
        if (!shouldContinue) return false;
        break;
    }
  }
}

/**
 * Handle travel between locations
 */
async function handleTravel(gameState: GameState): Promise<{ locationChanged: boolean }> {
  const travelResult = await showTravelMenu(
    gameState.player.currentLocation,
    gameState.player.level,
    gameState.statistics.bossesDefeated,
    [] // completed acts
  );

  if (!travelResult.traveled || !travelResult.destination) {
    return { locationChanged: false };
  }

  // Check if destination is unlocked
  const isUnlocked = isLocationUnlocked(
    travelResult.destination,
    gameState.statistics.bossesDefeated,
    []
  );

  if (!isUnlocked) {
    showMessage('이 지역은 아직 해금되지 않았습니다.', 'warning');
    await pressEnterToContinue();
    return { locationChanged: false };
  }

  // Travel animation
  await showTravelAnimation(
    gameState.player.currentLocation,
    travelResult.destination
  );

  // Update player location
  gameState.player.currentLocation = travelResult.destination;

  // Add to unlocked locations if not already there
  if (!gameState.player.unlockedLocations.includes(travelResult.destination)) {
    gameState.player.unlockedLocations.push(travelResult.destination);
    gameState.statistics.locationsDiscovered++;
  }

  // Show arrival
  showLocationArrival(travelResult.destination);
  await pressEnterToContinue();

  return { locationChanged: true };
}

/**
 * Inventory menu loop
 */
async function inventoryMenuLoop(player: Player): Promise<void> {
  while (true) {
    clearScreen();
    await showTitle();

    const choice = await showInventoryMenu(player);

    switch (choice) {
      case 'items':
        await showInventory(player);
        await pressEnterToContinue();
        break;

      case 'equipment':
        await showEquipment(player);
        await pressEnterToContinue();
        break;

      case 'manage':
        await manageInventoryItems(player);
        break;

      case 'sort':
        sortInventory(player);
        showMessage('인벤토리를 정렬했습니다!', 'success');
        await pressEnterToContinue();
        break;

      case 'back':
        return;
    }
  }
}

/**
 * Manage inventory items
 */
async function manageInventoryItems(player: Player): Promise<void> {
  while (true) {
    clearScreen();
    await showTitle();
    await showInventory(player);

    const slot = await selectItemFromInventory(player);
    if (!slot) return;

    let continueManaging = true;

    while (continueManaging) {
      clearScreen();
      await showTitle();

      const action = await selectItemAction(slot.item, false);

      switch (action) {
        case 'details':
          showItemDetail(slot.item);
          await pressEnterToContinue();
          break;

        case 'equip':
          const equipResult = equipItem(player, slot.itemId);
          showMessage(equipResult.message, equipResult.success ? 'success' : 'error');
          await pressEnterToContinue();
          if (equipResult.success) continueManaging = false;
          break;

        case 'use':
          const useResult = useItem(player, slot.itemId);
          showMessage(useResult.message, useResult.success ? 'success' : 'error');
          await pressEnterToContinue();
          if (useResult.success) continueManaging = false;
          break;

        case 'drop':
          showMessage('아이템을 버릴 수 없습니다.', 'warning');
          await pressEnterToContinue();
          break;

        case 'back':
          continueManaging = false;
          break;
      }
    }
  }
}

/**
 * In-game menu loop
 */
async function inGameMenuLoop(gameState: GameState): Promise<boolean> {
  while (true) {
    clearScreen();
    await showTitle();

    const choice = await showInGameMenu();

    switch (choice) {
      case 'continue':
        return true;

      case 'inventory':
        await inventoryMenuLoop(gameState.player);
        break;

      case 'stats':
        clearScreen();
        await showTitle();
        showStats(gameState.player);
        await pressEnterToContinue();
        break;

      case 'save':
        await saveGame(gameState);
        break;

      case 'main-menu':
        const confirmed = await confirmAction('메인 메뉴로 돌아가시겠습니까? 저장하지 않은 진행은 사라집니다.');
        if (confirmed) return false;
        break;

      case 'exit':
        const exitConfirmed = await confirmAction('게임을 종료하시겠습니까? 저장하지 않은 진행은 사라집니다.');
        if (exitConfirmed) process.exit(0);
        break;
    }
  }
}

/**
 * Main game loop
 */
export async function gameLoop(gameState: GameState): Promise<void> {
  try {
    while (true) {
      const isTown = isTownLocation(gameState.player.currentLocation);

      if (isTown) {
        const continueGame = await townLoop(gameState);
        if (!continueGame) return;
      } else {
        const continueGame = await dungeonLoop(gameState);
        if (!continueGame) return;
      }
    }
  } catch (error) {
    console.error(chalk.red('오류 발생:'), error);
    showMessage('예기치 않은 오류가 발생했습니다. 메인 메뉴로 돌아갑니다...', 'error');
    await pressEnterToContinue();
  }
}
