/**
 * Combat UI for Terminal Quest
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { Player, MonsterInstance } from '../types/index.js';
import { BattleRewards, CombatActionResult } from '../systems/combat.js';
import { showSeparator } from './display.js';
import {
  getHealthFillCharacter,
  getHealthStateLabel,
  withSignalLabel
} from './accessibility.js';

/**
 * Display battle screen with player and monster stats
 */
export function showBattleScreen(player: Player, monster: MonsterInstance): void {
  console.log();
  console.log(chalk.red.bold('━'.repeat(60)));
  console.log(chalk.red.bold('⚔️  BATTLE!'));
  console.log(chalk.red.bold('━'.repeat(60)));
  console.log();

  // Player info
  const playerHpBar = createHealthBar(player.stats.hp, player.stats.maxHp);
  const playerMpBar = createManaBar(player.stats.mp, player.stats.maxMp);

  console.log(chalk.cyan.bold(`🧑 ${player.name} (Lv ${player.level})`));
  console.log(`   HP: ${playerHpBar} ${player.stats.hp}/${player.stats.maxHp}`);
  console.log(`   MP: ${playerMpBar} ${player.stats.mp}/${player.stats.maxMp}`);
  console.log();

  // Monster info
  const monsterHpBar = createHealthBar(monster.currentHp, monster.stats.maxHp);

  const monsterPrefix = monster.prefix ? chalk.magenta(`[${monster.prefix.name}] `) : '';
  console.log(chalk.red.bold(`${monster.icon} ${monsterPrefix}${monster.name} (Lv ${monster.level})`));
  console.log(`   HP: ${monsterHpBar} ${monster.currentHp}/${monster.stats.maxHp}`);

  if (monster.prefix) {
    console.log(chalk.gray(`   ${monster.prefix.description}`));
  }

  console.log();
  console.log(chalk.gray('━'.repeat(60)));
}

/**
 * Create a health bar
 */
function createHealthBar(current: number, max: number): string {
  const barLength = 10;
  const percentage = current / max;
  const filledLength = Math.floor(percentage * barLength);
  const emptyLength = barLength - filledLength;

  const filled = getHealthFillCharacter(percentage).repeat(filledLength);
  const empty = '░'.repeat(emptyLength);

  let color = chalk.green;
  if (percentage < 0.3) {
    color = chalk.red;
  } else if (percentage < 0.6) {
    color = chalk.yellow;
  }

  return `[${color(filled)}${chalk.gray(empty)}] ${getHealthStateLabel(percentage)}`;
}

/**
 * Create a mana bar
 */
function createManaBar(current: number, max: number): string {
  const barLength = 10;
  const percentage = current / max;
  const filledLength = Math.floor(percentage * barLength);
  const emptyLength = barLength - filledLength;

  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);

  return `[${chalk.blue(filled)}${chalk.gray(empty)}]`;
}

/**
 * Display combat log message
 */
export function showBattleLog(message: string, type: 'info' | 'damage' | 'heal' | 'critical' | 'miss' = 'info'): void {
  const taggedMessage = withSignalLabel(message, type);
  let coloredMessage = message;

  switch (type) {
    case 'damage':
      coloredMessage = chalk.red(`💥 ${taggedMessage}`);
      break;
    case 'heal':
      coloredMessage = chalk.green(`💚 ${taggedMessage}`);
      break;
    case 'critical':
      coloredMessage = chalk.yellow.bold(`⚡ ${taggedMessage}`);
      break;
    case 'miss':
      coloredMessage = chalk.gray(`💨 ${taggedMessage}`);
      break;
    default:
      coloredMessage = chalk.white(`ℹ️  ${taggedMessage}`);
  }

  console.log(coloredMessage);
}

/**
 * Display action result
 */
export function showActionResult(result: CombatActionResult): void {
  if (result.missed) {
    showBattleLog(result.message, 'miss');
  } else if (result.critical) {
    showBattleLog(result.message, 'critical');
  } else if (result.damage) {
    showBattleLog(result.message, 'damage');
  } else if (result.healing) {
    showBattleLog(result.message, 'heal');
  } else {
    showBattleLog(result.message, 'info');
  }
}

/**
 * Display battle result (victory or defeat)
 */
export function showBattleResult(won: boolean, rewards?: BattleRewards): void {
  console.log();
  showSeparator(60);

  if (won && rewards) {
    console.log(chalk.green.bold('🎉 VICTORY! 🎉'));
    showSeparator(60);
    console.log();

    const rewardTable = new Table({
      head: [chalk.yellow('Reward'), chalk.yellow('Amount')],
      colWidths: [30, 20],
      style: {
        head: [],
        border: ['gray']
      }
    });

    rewardTable.push(
      [chalk.cyan('⭐ Experience'), chalk.white(`+${rewards.experience} EXP`)],
      [chalk.yellow('💰 Gold'), chalk.white(`+${rewards.gold} Gold`)]
    );

    if (rewards.items.length > 0) {
      rewardTable.push([
        chalk.magenta('🎁 Items'),
        chalk.white(`${rewards.items.length} item(s)`)
      ]);
    }

    console.log(rewardTable.toString());
    console.log();
  } else {
    console.log(chalk.red.bold('💀 DEFEAT 💀'));
    showSeparator(60);
    console.log(chalk.gray('You have been defeated...'));
    console.log();
  }
}

/**
 * Display turn indicator
 */
export function showTurnIndicator(isPlayerTurn: boolean, turnNumber: number): void {
  console.log();
  if (isPlayerTurn) {
    console.log(chalk.cyan.bold(`▶️  Turn ${turnNumber} - Your Turn`));
  } else {
    console.log(chalk.red.bold(`▶️  Turn ${turnNumber} - Enemy Turn`));
  }
  console.log();
}

/**
 * Display level up notification
 */
export function showLevelUpInBattle(player: Player): void {
  console.log();
  console.log(chalk.yellow.bold('═'.repeat(60)));
  console.log(chalk.yellow.bold('        🌟 LEVEL UP! 🌟'));
  console.log(chalk.yellow.bold('═'.repeat(60)));
  console.log(chalk.green(`You are now level ${player.level}!`));
  console.log(chalk.cyan('Your stats have increased!'));
  console.log(chalk.green('HP and MP fully restored!'));
  console.log(chalk.yellow.bold('═'.repeat(60)));
  console.log();
}

/**
 * Display compact battle summary
 */
export function showBattleSummary(
  player: Player,
  monster: MonsterInstance,
  turnNumber: number
): void {
  const playerHpBar = createHealthBar(player.stats.hp, player.stats.maxHp);
  const monsterHpBar = createHealthBar(monster.currentHp, monster.stats.maxHp);

  console.log();
  console.log(chalk.gray(`--- Turn ${turnNumber} Summary ---`));
  console.log(
    chalk.cyan(`🧑 ${player.name}: `) +
    playerHpBar +
    chalk.white(` ${player.stats.hp}/${player.stats.maxHp}`)
  );
  console.log(
    chalk.red(`${monster.icon} ${monster.name}: `) +
    monsterHpBar +
    chalk.white(` ${monster.currentHp}/${monster.stats.maxHp}`)
  );
  console.log();
}

/**
 * Show status effects
 */
export function showStatusEffects(player: Player, monster: MonsterInstance): void {
  if (player.statusEffects.length > 0) {
    const effects = player.statusEffects
      .map(e => `${e.type}(${e.duration})`)
      .join(', ');
    console.log(chalk.magenta(`🧑 Status: ${effects}`));
  }

  if (monster.statusEffects.length > 0) {
    const effects = monster.statusEffects
      .map(e => `${e.type}(${e.duration})`)
      .join(', ');
    console.log(chalk.magenta(`${monster.icon} Status: ${effects}`));
  }

  if (player.statusEffects.length > 0 || monster.statusEffects.length > 0) {
    console.log();
  }
}

/**
 * Display escape attempt result
 */
export function showEscapeAttempt(success: boolean): void {
  if (success) {
    console.log();
    console.log(chalk.yellow('🏃 You successfully escaped from battle!'));
    console.log();
  } else {
    console.log();
    console.log(chalk.red('❌ Failed to escape!'));
    console.log();
  }
}

/**
 * Display monster attack warning
 */
export function showMonsterAttackWarning(monsterName: string): void {
  console.log(chalk.red(`⚠️  ${monsterName} is preparing to attack!`));
}

/**
 * Display damage numbers with animation effect
 */
export function showDamageNumber(damage: number, isCritical: boolean = false): void {
  if (isCritical) {
    console.log(chalk.yellow.bold(`     ⚡ ${damage} ⚡`));
  } else {
    console.log(chalk.red(`     -${damage}`));
  }
}

/**
 * Display healing numbers
 */
export function showHealingNumber(healing: number): void {
  console.log(chalk.green(`     +${healing}`));
}

/**
 * Wait for animation (simulate combat pace)
 */
export async function waitForAnimation(ms: number = 800): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
