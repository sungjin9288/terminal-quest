/**
 * Menu system for Terminal Quest
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { GameMode, CharacterClass } from '../types/index.js';
import { showMessage, showSeparator } from './display.js';

/**
 * Main menu option
 */
export type MainMenuOption = 'new-game' | 'load-game' | 'exit';

/**
 * In-game menu option
 */
export type InGameMenuOption = 'continue' | 'inventory' | 'stats' | 'save' | 'main-menu' | 'exit';

/**
 * Display and handle main menu
 */
export async function showMainMenu(): Promise<MainMenuOption> {
  console.log();
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        {
          name: chalk.green('🎮 New Game'),
          value: 'new-game'
        },
        {
          name: chalk.blue('📂 Load Game'),
          value: 'load-game'
        },
        {
          name: chalk.red('🚪 Exit'),
          value: 'exit'
        }
      ]
    }
  ]);

  return answer.choice as MainMenuOption;
}

/**
 * Display game mode selection menu
 */
export async function showGameModeSelect(): Promise<GameMode> {
  console.log();
  showMessage('Select your difficulty:', 'info');
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: chalk.cyan('Choose game mode:'),
      choices: [
        {
          name: chalk.green('📖 Story Mode') + chalk.gray(' - Balanced for story experience'),
          value: GameMode.Story
        },
        {
          name: chalk.blue('⚔️  Adventure Mode') + chalk.gray(' - Standard challenge'),
          value: GameMode.Adventure
        },
        {
          name: chalk.yellow('🔥 Challenge Mode') + chalk.gray(' - Increased difficulty'),
          value: GameMode.Challenge
        },
        {
          name: chalk.red('💀 Hardcore Mode') + chalk.gray(' - Permadeath enabled!'),
          value: GameMode.Hardcore
        }
      ]
    }
  ]);

  return answer.mode as GameMode;
}

/**
 * Character creation menu
 */
export interface CharacterCreationData {
  name: string;
  class: CharacterClass;
}

/**
 * Display character creation menu
 */
export async function showCharacterCreation(): Promise<CharacterCreationData> {
  console.log();
  showMessage('Character Creation', 'success');
  showSeparator();

  const nameAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('Enter your character name:'),
      validate: (input: string) => {
        if (input.trim().length < 2) {
          return 'Name must be at least 2 characters long';
        }
        if (input.trim().length > 20) {
          return 'Name must be less than 20 characters';
        }
        return true;
      }
    }
  ]);

  console.log();
  showMessage('Choose your class:', 'info');
  console.log();
  console.log(chalk.yellow('⚔️  Warrior') + chalk.gray(' - High HP and defense, melee specialist'));
  console.log(chalk.magenta('🔮 Mage') + chalk.gray(' - Powerful magic, low defense'));
  console.log(chalk.green('🗡️  Rogue') + chalk.gray(' - High speed and critical hits'));
  console.log(chalk.cyan('✨ Cleric') + chalk.gray(' - Healing and support abilities'));
  console.log(chalk.blue('🏹 Ranger') + chalk.gray(' - Ranged attacks, balanced stats'));
  console.log();

  const classAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'class',
      message: chalk.cyan('Select your class:'),
      choices: [
        {
          name: chalk.yellow('⚔️  Warrior'),
          value: CharacterClass.Warrior
        },
        {
          name: chalk.magenta('🔮 Mage'),
          value: CharacterClass.Mage
        },
        {
          name: chalk.green('🗡️  Rogue'),
          value: CharacterClass.Rogue
        },
        {
          name: chalk.cyan('✨ Cleric'),
          value: CharacterClass.Cleric
        },
        {
          name: chalk.blue('🏹 Ranger'),
          value: CharacterClass.Ranger
        }
      ]
    }
  ]);

  return {
    name: nameAnswer.name.trim(),
    class: classAnswer.class as CharacterClass
  };
}

/**
 * Display in-game menu
 */
export async function showInGameMenu(): Promise<InGameMenuOption> {
  console.log();
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        {
          name: chalk.green('▶️  Continue Adventure'),
          value: 'continue'
        },
        {
          name: chalk.blue('🎒 Inventory'),
          value: 'inventory'
        },
        {
          name: chalk.yellow('📊 Character Stats'),
          value: 'stats'
        },
        {
          name: chalk.cyan('💾 Save Game'),
          value: 'save'
        },
        {
          name: chalk.gray('🏠 Return to Main Menu'),
          value: 'main-menu'
        },
        {
          name: chalk.red('🚪 Exit Game'),
          value: 'exit'
        }
      ]
    }
  ]);

  return answer.choice as InGameMenuOption;
}

/**
 * Display exploration menu
 */
export type ExplorationOption = 'explore' | 'rest' | 'travel' | 'quest' | 'menu';

export async function showExplorationMenu(locationName: string): Promise<ExplorationOption> {
  console.log();
  console.log(chalk.cyan.bold(`📍 Current Location: ${locationName}`));
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('What would you like to do?'),
      choices: [
        {
          name: chalk.green('🚶 Explore'),
          value: 'explore'
        },
        {
          name: chalk.blue('😴 Rest (Restore HP/MP)'),
          value: 'rest'
        },
        {
          name: chalk.yellow('🗺️  Travel'),
          value: 'travel'
        },
        {
          name: chalk.magenta('📜 Quests'),
          value: 'quest'
        },
        {
          name: chalk.gray('⚙️  Menu'),
          value: 'menu'
        }
      ]
    }
  ]);

  return answer.choice as ExplorationOption;
}

/**
 * Display combat menu
 */
export type CombatOption = 'attack' | 'skill' | 'item' | 'defend' | 'escape';

export async function showCombatMenu(): Promise<CombatOption> {
  console.log();
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Choose your action:'),
      choices: [
        {
          name: chalk.red('⚔️  Attack'),
          value: 'attack'
        },
        {
          name: chalk.magenta('✨ Use Skill'),
          value: 'skill'
        },
        {
          name: chalk.green('🎒 Use Item'),
          value: 'item'
        },
        {
          name: chalk.blue('🛡️  Defend'),
          value: 'defend'
        },
        {
          name: chalk.yellow('🏃 Escape'),
          value: 'escape'
        }
      ]
    }
  ]);

  return answer.choice as CombatOption;
}

/**
 * Confirm action
 */
export async function confirmAction(message: string): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow(message),
      default: false
    }
  ]);

  return answer.confirmed;
}

/**
 * Display save file list
 */
export interface SaveFileChoice {
  fileName: string;
  isNew: boolean;
}

export async function showSaveFileList(saveFiles: string[]): Promise<SaveFileChoice> {
  const choices = saveFiles.map(file => ({
    name: chalk.blue(`📁 ${file}`),
    value: file
  }));

  choices.push({
    name: chalk.green('➕ New Save File'),
    value: '__new__'
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'file',
      message: chalk.cyan('Select a save file:'),
      choices
    }
  ]);

  if (answer.file === '__new__') {
    const newFileAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'fileName',
        message: chalk.cyan('Enter save file name:'),
        validate: (input: string) => {
          if (input.trim().length < 1) {
            return 'File name cannot be empty';
          }
          return true;
        }
      }
    ]);

    return {
      fileName: newFileAnswer.fileName.trim(),
      isNew: true
    };
  }

  return {
    fileName: answer.file,
    isNew: false
  };
}
