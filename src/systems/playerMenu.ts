import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  GameState,
  Player,
  ItemType
} from '../types/index.js';
import { InGameMenuDependencies } from '../types/runtime.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  showStats,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showInGameMenu,
  confirmAction
} from '../ui/menu.js';
import {
  showInventory,
  showEquipment,
  showInventoryMenu,
  selectItemFromInventory,
  selectItemAction,
  showItemDetail
} from '../ui/inventory.js';
import {
  equipItem,
  useItem,
  sortInventory,
  removeItem
} from './inventory.js';
import {
  getClassSkills,
  getSkillPointCost,
  getLearnableSkills,
  learnSkill
} from './skills.js';

export type { InGameMenuDependencies } from '../types/runtime.js';

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
          {
            const equipResult = equipItem(player, slot.itemId);
            showMessage(equipResult.message, equipResult.success ? 'success' : 'error');
            await pressEnterToContinue();
            if (equipResult.success) continueManaging = false;
          }
          break;

        case 'use':
          {
            const useResult = useItem(player, slot.itemId);
            showMessage(useResult.message, useResult.success ? 'success' : 'error');
            await pressEnterToContinue();
            if (useResult.success) continueManaging = false;
          }
          break;

        case 'drop':
          if (slot.item.type === ItemType.QuestItem) {
            showMessage('퀘스트 아이템은 버릴 수 없습니다.', 'warning');
            await pressEnterToContinue();
            break;
          }

          {
            const dropConfirmed = await confirmAction(`${slot.item.name}을(를) 1개 버리시겠습니까?`);
            if (!dropConfirmed) {
              break;
            }

            const dropResult = removeItem(player, slot.itemId, 1);
            showMessage(dropResult.message, dropResult.success ? 'success' : 'error');
            await pressEnterToContinue();

            if (dropResult.success) continueManaging = false;
          }
          break;

        case 'back':
          continueManaging = false;
          break;
      }
    }
  }
}

async function skillMenuLoop(player: Player): Promise<void> {
  while (true) {
    clearScreen();
    await showTitle();

    console.log(chalk.magenta.bold('\n✨ 스킬 관리\n'));
    console.log(chalk.white(`클래스: ${player.class}`));
    console.log(chalk.yellow(`보유 스킬 포인트: ${player.skillPoints}`));
    console.log(chalk.gray('─'.repeat(60)));

    const classSkills = getClassSkills(player.class).sort((a, b) => {
      if (a.requiredLevel !== b.requiredLevel) {
        return a.requiredLevel - b.requiredLevel;
      }
      return a.name.localeCompare(b.name);
    });

    for (const skill of classSkills) {
      const learned = player.skills.includes(skill.id);
      const cost = getSkillPointCost(skill);

      let status: string;
      if (learned) {
        status = chalk.green('습득 완료');
      } else if (player.level < skill.requiredLevel) {
        status = chalk.gray(`잠김 (Lv ${skill.requiredLevel} 필요)`);
      } else if (player.skillPoints < cost) {
        status = chalk.yellow(`포인트 부족 (SP ${cost} 필요)`);
      } else {
        status = chalk.cyan(`습득 가능 (SP ${cost})`);
      }

      const skillName = learned ? chalk.green(skill.name) : chalk.white(skill.name);
      console.log(
        `${skillName} ${chalk.gray(
          `(Lv${skill.requiredLevel}, MP ${skill.manaCost}, Cost ${cost}SP)`
        )} - ${status}`
      );
      console.log(chalk.gray(`  ${skill.description}`));
    }

    console.log(chalk.gray('─'.repeat(60)));
    console.log();

    const learnableSkills = getLearnableSkills(player);
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: '스킬 메뉴:',
        choices: [
          {
            name: '📘 스킬 습득',
            value: 'learn',
            disabled: learnableSkills.length > 0 ? false : '현재 습득 가능한 스킬 없음'
          },
          {
            name: chalk.gray('← 돌아가기'),
            value: 'back'
          }
        ]
      }
    ]);

    if (answer.choice === 'back') {
      return;
    }

    const choices = learnableSkills.map(skill => ({
      name: `${skill.name} - MP ${skill.manaCost}, SP ${getSkillPointCost(skill)}`,
      value: skill.id
    }));
    choices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

    const learnAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'skillId',
        message: '습득할 스킬 선택:',
        choices
      }
    ]);

    if (learnAnswer.skillId === 'cancel') {
      continue;
    }

    const result = learnSkill(player, learnAnswer.skillId);
    showMessage(result.message, result.success ? 'success' : 'error');
    await pressEnterToContinue();
  }
}

export async function inGameMenuLoop(
  gameState: GameState,
  dependencies: InGameMenuDependencies
): Promise<boolean> {
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

      case 'skills':
        await skillMenuLoop(gameState.player);
        break;

      case 'save':
        await dependencies.saveGame(gameState);
        break;

      case 'main-menu':
        {
          const confirmed = await confirmAction('메인 메뉴로 돌아가시겠습니까? 저장하지 않은 진행은 사라집니다.');
          if (confirmed) return false;
        }
        break;

      case 'exit':
        {
          const exitConfirmed = await confirmAction('게임을 종료하시겠습니까? 저장하지 않은 진행은 사라집니다.');
          if (exitConfirmed) process.exit(0);
        }
        break;
    }
  }
}
