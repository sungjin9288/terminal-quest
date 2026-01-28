/**
 * Battle loop system for Terminal Quest
 */

import { Player, Monster, CombatState } from '../types/index.js';
import {
  createMonsterInstance,
  playerAttack,
  monsterAttack,
  playerDefend,
  attemptEscape,
  calculateRewards,
  determineTurnOrder,
  monsterAI,
  BattleRewards
} from './combat.js';
import {
  showBattleScreen,
  showBattleLog,
  showActionResult,
  showBattleResult,
  showTurnIndicator,
  waitForAnimation
} from '../ui/combat.js';
import { showCombatMenu } from '../ui/menu.js';
import { clearScreen, showTitle, pressEnterToContinue } from '../ui/display.js';
import { selectItemFromInventory } from '../ui/inventory.js';
import { useItem as useInventoryItem, getOrganizedInventory } from '../systems/inventory.js';
import { ItemType } from '../types/item.js';
import { gainExp, calculateMonsterExp } from './leveling.js';
import { showLevelUp, showExpGain } from '../ui/levelup.js';

/**
 * Battle result
 */
export interface BattleResult {
  won: boolean;
  escaped: boolean;
  rewards?: BattleRewards;
  leveledUp: boolean;
}

/**
 * Run a complete battle
 */
export async function runBattle(player: Player, monster: Monster): Promise<BattleResult> {
  const monsterInstance = createMonsterInstance(monster);
  let turnNumber = 1;
  let battleState: CombatState = CombatState.PlayerTurn;
  let playerDefending = false;
  let leveledUp = false;

  // Determine first turn
  const firstTurn = determineTurnOrder(player.stats.speed, monster.stats.speed);
  if (firstTurn === 'monster') {
    battleState = CombatState.EnemyTurn;
  }

  // Battle loop
  while (battleState !== CombatState.Victory && battleState !== CombatState.Defeat && battleState !== CombatState.Escaped) {
    clearScreen();
    await showTitle();

    // Show battle screen
    showBattleScreen(player, monsterInstance);

    if (battleState === CombatState.PlayerTurn) {
      // Player's turn
      showTurnIndicator(true, turnNumber);

      const action = await showCombatMenu();

      await waitForAnimation(300);

      switch (action) {
        case 'attack': {
          const result = playerAttack(player, monsterInstance, false);
          showActionResult(result);

          if (result.targetDefeated) {
            battleState = CombatState.Victory;
          } else {
            battleState = CombatState.EnemyTurn;
          }
          break;
        }

        case 'skill': {
          showBattleLog('Skills system coming soon!', 'info');
          showBattleLog('Using basic attack instead...', 'info');
          await waitForAnimation(800);

          const result = playerAttack(player, monsterInstance, true);
          showActionResult(result);

          if (result.targetDefeated) {
            battleState = CombatState.Victory;
          } else {
            battleState = CombatState.EnemyTurn;
          }
          break;
        }

        case 'item': {
          // Check if player has any consumables
          const consumables = getOrganizedInventory(player).filter(
            slot => slot.item.type === ItemType.Consumable
          );

          if (consumables.length === 0) {
            showBattleLog('No items available!', 'info');
            await waitForAnimation(1000);
            // Don't consume turn if no items
            continue;
          }

          const selectedSlot = await selectItemFromInventory(
            player,
            item => item.type === ItemType.Consumable
          );

          if (!selectedSlot) {
            // Player cancelled - don't consume turn
            continue;
          }

          const itemResult = useInventoryItem(player, selectedSlot.itemId);
          showBattleLog(itemResult.message, itemResult.success ? 'heal' : 'info');
          await waitForAnimation(1000);

          if (itemResult.success) {
            battleState = CombatState.EnemyTurn;
          }
          break;
        }

        case 'defend': {
          const result = playerDefend(player);
          showActionResult(result);
          playerDefending = true;
          await waitForAnimation(800);
          battleState = CombatState.EnemyTurn;
          break;
        }

        case 'escape': {
          const result = attemptEscape(player, monsterInstance, monster.isBoss);
          showActionResult(result);

          if (result.success) {
            battleState = CombatState.Escaped;
          } else {
            battleState = CombatState.EnemyTurn;
          }

          await waitForAnimation(1000);
          break;
        }
      }

      if (battleState === CombatState.EnemyTurn) {
        await waitForAnimation(1000);
      }
    }

    if (battleState === CombatState.EnemyTurn) {
      // Monster's turn
      showTurnIndicator(false, turnNumber);

      await waitForAnimation(800);

      // Simple AI
      const monsterAction = monsterAI(monsterInstance);

      if (monsterAction === 'attack') {
        let result = monsterAttack(monsterInstance, player);

        // Reduce damage if player is defending
        if (playerDefending && result.damage) {
          result.damage = Math.floor(result.damage * 0.5);
          player.stats.hp += Math.floor(result.damage * 0.5); // Refund the reduced damage
          result.message += ' (Reduced by defense)';
        }

        showActionResult(result);

        if (result.targetDefeated) {
          battleState = CombatState.Defeat;
        } else {
          battleState = CombatState.PlayerTurn;
          turnNumber++;
        }
      }

      playerDefending = false;

      await waitForAnimation(1500);
    }

    // Show quick summary between turns
    if (battleState === CombatState.PlayerTurn && turnNumber > 1) {
      await pressEnterToContinue();
    }
  }

  // Battle end
  clearScreen();
  await showTitle();

  if (battleState === CombatState.Victory) {
    const rewards = calculateRewards(monsterInstance, player);

    showBattleResult(true, rewards);

    // Apply gold
    player.gold += rewards.gold;

    // Apply items (simplified - just add to inventory for now)
    rewards.items.forEach(itemId => {
      if (player.inventory.length < player.maxInventorySize) {
        player.inventory.push(itemId);
      }
    });

    // Update statistics
    player.enemiesDefeated++;

    await pressEnterToContinue();

    // Apply experience with new system
    const expAmount = calculateMonsterExp(
      monsterInstance.level,
      player.level,
      monster.isBoss,
      !!monsterInstance.prefix
    );

    console.log();
    showExpGain(expAmount, player.experience, player.experienceToNextLevel);
    console.log();

    const levelUpResult = gainExp(player, expAmount);

    if (levelUpResult.leveledUp) {
      await pressEnterToContinue();
      clearScreen();
      await showTitle();

      showLevelUp(levelUpResult);
      leveledUp = true;

      await pressEnterToContinue();
    } else {
      await pressEnterToContinue();
    }

    return {
      won: true,
      escaped: false,
      rewards,
      leveledUp
    };
  } else if (battleState === CombatState.Defeat) {
    showBattleResult(false);

    player.deaths++;

    // Respawn with half HP
    player.stats.hp = Math.floor(player.stats.maxHp * 0.5);

    // Lose some gold
    const goldLost = Math.floor(player.gold * 0.1);
    player.gold -= goldLost;

    showBattleLog(`You lost ${goldLost} gold...`, 'info');

    await pressEnterToContinue();

    return {
      won: false,
      escaped: false,
      leveledUp: false
    };
  } else if (battleState === CombatState.Escaped) {
    showBattleLog('You escaped from battle!', 'info');

    await pressEnterToContinue();

    return {
      won: false,
      escaped: true,
      leveledUp: false
    };
  }

  // Should never reach here
  return {
    won: false,
    escaped: false,
    leveledUp: false
  };
}
