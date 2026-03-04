/**
 * Display and visual output utilities for Terminal Quest
 */

import chalk from 'chalk';
import figlet from 'figlet';
import Table from 'cli-table3';
import { Player } from '../types/index.js';
import { getLevelProgress } from '../systems/leveling.js';
import { getLoadingProfile } from '../runtime/settings.js';
import { withSignalLabel } from './accessibility.js';

/**
 * Clear the terminal screen
 */
export function clearScreen(): void {
  console.clear();
}

/**
 * Display the game title using ASCII art
 */
export async function showTitle(): Promise<void> {
  return new Promise((resolve, reject) => {
    figlet.text(
      'Terminal Quest',
      {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(chalk.cyan(data));
        console.log(chalk.gray('═'.repeat(60)));
        console.log(chalk.yellow('    A Terminal-based RPG Adventure'));
        console.log(chalk.gray('═'.repeat(60)));
        console.log();
        resolve();
      }
    );
  });
}

/**
 * Display a message with optional color
 */
export function showMessage(message: string, color?: 'info' | 'success' | 'warning' | 'error'): void {
  const displayMessage = color ? withSignalLabel(message, color) : message;
  let coloredMessage = message;

  switch (color) {
    case 'info':
      coloredMessage = chalk.cyan(displayMessage);
      break;
    case 'success':
      coloredMessage = chalk.green(displayMessage);
      break;
    case 'warning':
      coloredMessage = chalk.yellow(displayMessage);
      break;
    case 'error':
      coloredMessage = chalk.red(displayMessage);
      break;
    default:
      coloredMessage = chalk.white(displayMessage);
  }

  console.log(coloredMessage);
}

/**
 * Display a separator line
 */
export function showSeparator(length: number = 60): void {
  console.log(chalk.gray('─'.repeat(length)));
}

/**
 * Display player stats in a formatted table
 */
export function showStats(player: Player): void {
  console.log();
  console.log(chalk.cyan.bold(`⚔️  ${player.name} - Level ${player.level} ${player.class}`));
  showSeparator();

  const statsTable = new Table({
    head: [chalk.yellow('Stat'), chalk.yellow('Value')],
    colWidths: [20, 15],
    style: {
      head: [],
      border: ['gray']
    }
  });

  statsTable.push(
    ['❤️  HP', `${player.stats.hp} / ${player.stats.maxHp}`],
    ['💙 MP', `${player.stats.mp} / ${player.stats.maxMp}`],
    ['⚔️  Attack', player.stats.attack.toString()],
    ['🛡️  Defense', player.stats.defense.toString()],
    ['✨ Magic Power', player.stats.magicPower.toString()],
    ['🌟 Magic Defense', player.stats.magicDefense.toString()],
    ['⚡ Speed', player.stats.speed.toString()],
    ['🎯 Crit Chance', `${player.stats.critChance}%`],
    ['💥 Crit Damage', `${player.stats.critDamage}x`]
  );

  console.log(statsTable.toString());

  const infoTable = new Table({
    head: [chalk.yellow('Info'), chalk.yellow('Value')],
    colWidths: [20, 15],
    style: {
      head: [],
      border: ['gray']
    }
  });

  const expProgress = getLevelProgress(player);
  const expBar = createExpBar(player.experience, player.experienceToNextLevel);

  infoTable.push(
    ['💰 Gold', player.gold.toString()],
    ['⭐ Experience', `${player.experience} / ${player.experienceToNextLevel}`],
    ['📊 Progress', `${expBar} ${expProgress}%`],
    ['🎒 Inventory', `${player.inventory.length} / ${player.maxInventorySize}`],
    ['🗡️  Enemies Defeated', player.enemiesDefeated.toString()],
    ['💀 Deaths', player.deaths.toString()]
  );

  console.log(infoTable.toString());
  console.log();
}

/**
 * Create experience progress bar
 */
function createExpBar(current: number, max: number): string {
  const barLength = 10;
  const percentage = current / max;
  const filledLength = Math.floor(percentage * barLength);
  const emptyLength = barLength - filledLength;

  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);

  return `[${chalk.cyan(filled)}${chalk.gray(empty)}]`;
}

/**
 * Display a simple stat bar (e.g., HP/MP bar)
 */
export function showStatBar(current: number, max: number, label: string, color: 'red' | 'blue' | 'green' = 'red'): void {
  const percentage = Math.floor((current / max) * 100);
  const barLength = 20;
  const filledLength = Math.floor((current / max) * barLength);
  const emptyLength = barLength - filledLength;

  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);

  let colorFunc = chalk.red;
  if (color === 'blue') colorFunc = chalk.blue;
  if (color === 'green') colorFunc = chalk.green;

  const bar = colorFunc(filled) + chalk.gray(empty);
  const text = `${label}: ${bar} ${current}/${max} (${percentage}%)`;

  console.log(text);
}

/**
 * Display loading animation
 */
export async function showLoading(message: string, duration: number = 1000): Promise<void> {
  const loadingProfile = getLoadingProfile();
  const effectiveDuration = Math.max(
    120,
    Math.floor(duration * loadingProfile.durationMultiplier)
  );
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} ${message}...`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, loadingProfile.frameIntervalMs);

    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(message.length + 10) + '\r');
      resolve();
    }, effectiveDuration);
  });
}

/**
 * Display a box with text
 */
export function showBox(text: string, title?: string): void {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length), title ? title.length : 0);
  const width = maxLength + 4;

  console.log();
  console.log(chalk.gray('┌' + '─'.repeat(width - 2) + '┐'));

  if (title) {
    const padding = Math.floor((width - title.length - 2) / 2);
    console.log(chalk.gray('│') + ' '.repeat(padding) + chalk.yellow.bold(title) + ' '.repeat(width - padding - title.length - 2) + chalk.gray('│'));
    console.log(chalk.gray('├' + '─'.repeat(width - 2) + '┤'));
  }

  lines.forEach(line => {
    const padding = width - line.length - 2;
    console.log(chalk.gray('│') + ' ' + line + ' '.repeat(padding - 1) + chalk.gray('│'));
  });

  console.log(chalk.gray('└' + '─'.repeat(width - 2) + '┘'));
  console.log();
}

/**
 * Wait for user to press enter
 */
export async function pressEnterToContinue(): Promise<void> {
  const { default: inquirer } = await import('inquirer');
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('Press Enter to continue...')
    }
  ]);
}

/**
 * Display combat header
 */
export function showCombatHeader(enemyName: string, enemyLevel: number): void {
  console.log();
  console.log(chalk.red.bold('⚔️  COMBAT ENCOUNTER!'));
  showSeparator();
  console.log(chalk.red(`💀 ${enemyName} (Level ${enemyLevel}) appears!`));
  showSeparator();
  console.log();
}

/**
 * Display level up message
 */
export function showLevelUp(level: number): void {
  console.log();
  console.log(chalk.yellow.bold('🌟 LEVEL UP! 🌟'));
  console.log(chalk.green(`You are now level ${level}!`));
  showMessage('Your stats have increased!', 'success');
  console.log();
}

/**
 * Display game over screen
 */
export function showGameOver(): void {
  console.log();
  console.log(chalk.red.bold('💀 GAME OVER 💀'));
  showSeparator();
  console.log(chalk.gray('You have fallen in battle...'));
  console.log();
}

/**
 * Display victory message
 */
export function showVictory(exp: number, gold: number): void {
  console.log();
  console.log(chalk.green.bold('🎉 VICTORY! 🎉'));
  showSeparator();
  console.log(chalk.green(`+${exp} EXP`));
  console.log(chalk.yellow(`+${gold} Gold`));
  console.log();
}
