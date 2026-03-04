/**
 * Display and visual output utilities for Terminal Quest
 */

import chalk from 'chalk';
import figlet from 'figlet';
import Table from 'cli-table3';
import { Player } from '../types/index.js';
import { getLevelProgress } from '../systems/leveling.js';
import { getLoadingProfile, getRuntimeSettings } from '../runtime/settings.js';
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
        console.log(chalk.yellow('      터미널 기반 RPG 어드벤처'));
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
    head: [chalk.yellow('능력치'), chalk.yellow('수치')],
    colWidths: [20, 15],
    style: {
      head: [],
      border: ['gray']
    }
  });

  statsTable.push(
    ['❤️  HP', `${player.stats.hp} / ${player.stats.maxHp}`],
    ['💙 MP', `${player.stats.mp} / ${player.stats.maxMp}`],
    ['⚔️  공격력', player.stats.attack.toString()],
    ['🛡️  방어력', player.stats.defense.toString()],
    ['✨ 마법 공격', player.stats.magicPower.toString()],
    ['🌟 마법 방어', player.stats.magicDefense.toString()],
    ['⚡ 속도', player.stats.speed.toString()],
    ['🎯 치명타 확률', `${player.stats.critChance}%`],
    ['💥 치명타 배율', `${player.stats.critDamage}x`]
  );

  console.log(statsTable.toString());

  const infoTable = new Table({
    head: [chalk.yellow('정보'), chalk.yellow('수치')],
    colWidths: [20, 15],
    style: {
      head: [],
      border: ['gray']
    }
  });

  const expProgress = getLevelProgress(player);
  const expBar = createExpBar(player.experience, player.experienceToNextLevel);

  infoTable.push(
    ['💰 골드', player.gold.toString()],
    ['⭐ 경험치', `${player.experience} / ${player.experienceToNextLevel}`],
    ['📊 진행도', `${expBar} ${expProgress}%`],
    ['🎒 인벤토리', `${player.inventory.length} / ${player.maxInventorySize}`],
    ['🗡️  처치 수', player.enemiesDefeated.toString()],
    ['💀 사망 수', player.deaths.toString()]
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
export type ContinuePromptPriority = 'normal' | 'important' | 'critical';

function getAutoContinueDelayMs(priority: ContinuePromptPriority): number {
  const settings = getRuntimeSettings();
  if (priority === 'critical') {
    return 0;
  }

  const baseDelayByPace = {
    snappy: 140,
    balanced: 260,
    cinematic: 460
  } as const;

  const speedMultiplier = settings.textSpeed === 'slow'
    ? 1.35
    : settings.textSpeed === 'fast'
      ? 0.72
      : 1.0;
  const priorityMultiplier = priority === 'important' ? 1.65 : 1.0;

  const baseDelay = baseDelayByPace[settings.continueAutoPace];
  const adjustedDelay = Math.round(baseDelay * speedMultiplier * priorityMultiplier);
  return Math.max(90, Math.min(1200, adjustedDelay));
}

export async function pressEnterToContinue(
  priority: ContinuePromptPriority = 'normal'
): Promise<void> {
  const settings = getRuntimeSettings();
  if (settings.continuePromptMode === 'streamlined' && priority !== 'critical') {
    await new Promise(resolve => setTimeout(resolve, getAutoContinueDelayMs(priority)));
    return;
  }

  const { default: inquirer } = await import('inquirer');
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('계속하려면 Enter를 누르세요...')
    }
  ]);
}

/**
 * Display combat header
 */
export function showCombatHeader(enemyName: string, enemyLevel: number): void {
  console.log();
  console.log(chalk.red.bold('⚔️  전투 발생!'));
  showSeparator();
  console.log(chalk.red(`💀 ${enemyName} (Lv ${enemyLevel}) 등장!`));
  showSeparator();
  console.log();
}

/**
 * Display level up message
 */
export function showLevelUp(level: number): void {
  console.log();
  console.log(chalk.yellow.bold('🌟 레벨 업! 🌟'));
  console.log(chalk.green(`현재 레벨: ${level}`));
  showMessage('능력치가 상승했습니다!', 'success');
  console.log();
}

/**
 * Display game over screen
 */
export function showGameOver(): void {
  console.log();
  console.log(chalk.red.bold('💀 게임 오버 💀'));
  showSeparator();
  console.log(chalk.gray('전투에서 쓰러졌습니다...'));
  console.log();
}

/**
 * Display victory message
 */
export function showVictory(exp: number, gold: number): void {
  console.log();
  console.log(chalk.green.bold('🎉 승리! 🎉'));
  showSeparator();
  console.log(chalk.green(`+${exp} EXP`));
  console.log(chalk.yellow(`+${gold} 골드`));
  console.log();
}
