/**
 * Level up UI for Terminal Quest
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { Stats } from '../types/character.js';
import { LevelUpResult } from '../systems/leveling.js';

/**
 * Show level up animation
 */
export function showLevelUpAnimation(oldLevel: number, newLevel: number): void {
  console.log();
  console.log(chalk.yellow('✨'.repeat(30)));
  console.log();
  console.log(chalk.yellow.bold('           ╔═══════════════════════════════╗'));
  console.log(chalk.yellow.bold('           ║                               ║'));
  console.log(chalk.yellow.bold('           ║        🌟 LEVEL UP! 🌟        ║'));
  console.log(chalk.yellow.bold('           ║                               ║'));
  console.log(chalk.yellow.bold('           ╚═══════════════════════════════╝'));
  console.log();
  console.log(chalk.cyan.bold(`                Lv ${oldLevel} → Lv ${newLevel}`));
  console.log();
  console.log(chalk.yellow('✨'.repeat(30)));
  console.log();
}

/**
 * Show stat increases
 */
export function showStatIncrease(oldStats: Stats, newStats: Stats, increases: Partial<Stats>): void {
  console.log(chalk.green.bold('📈 스탯 증가:'));
  console.log();

  const table = new Table({
    head: [
      chalk.white('능력치'),
      chalk.white('변경 전'),
      chalk.white('증가량'),
      chalk.white('변경 후')
    ],
    colWidths: [20, 15, 15, 15],
    style: {
      head: [],
      border: ['yellow']
    }
  });

  const statLabels: Record<string, string> = {
    maxHp: 'HP',
    maxMp: 'MP',
    attack: '공격력',
    defense: '방어력',
    magicPower: '마력',
    magicDefense: '마법방어',
    speed: '속도',
    critChance: '치명타율',
    critDamage: '치명타 데미지',
    evasion: '회피율'
  };

  // Show stats with increases
  Object.keys(increases).forEach(key => {
    const statKey = key as keyof Stats;
    const increase = increases[statKey];

    if (increase !== undefined && increase !== 0) {
      const oldValue = oldStats[statKey];
      const newValue = newStats[statKey];
      const label = statLabels[key] || key;

      let displayOld: string;
      let displayNew: string;
      let displayIncrease: string;

      // Format based on stat type
      if (key === 'critChance' || key === 'evasion') {
        displayOld = `${oldValue.toFixed(1)}%`;
        displayNew = `${newValue.toFixed(1)}%`;
        displayIncrease = chalk.green(`+${increase.toFixed(1)}%`);
      } else if (key === 'critDamage') {
        displayOld = `×${oldValue.toFixed(2)}`;
        displayNew = `×${newValue.toFixed(2)}`;
        displayIncrease = chalk.green(`+${increase.toFixed(2)}`);
      } else {
        displayOld = `${Math.floor(oldValue)}`;
        displayNew = `${Math.floor(newValue)}`;
        displayIncrease = chalk.green(`+${Math.floor(increase)}`);
      }

      table.push([
        chalk.cyan(label),
        chalk.white(displayOld),
        displayIncrease,
        chalk.yellow.bold(displayNew)
      ]);
    }
  });

  console.log(table.toString());
  console.log();
}

/**
 * Show skill point gain
 */
export function showSkillPointGain(totalPoints: number, gained: number = 1): void {
  console.log(chalk.magenta.bold(`⭐ 스킬 포인트 +${gained}`));
  console.log(chalk.white(`   보유 스킬 포인트: ${chalk.yellow.bold(totalPoints)}`));
  console.log();
}

/**
 * Show HP/MP restoration message
 */
export function showRestoration(): void {
  console.log(chalk.green.bold('💚 체력과 마나가 완전히 회복되었습니다!'));
  console.log();
}

/**
 * Show complete level up screen
 */
export function showLevelUp(result: LevelUpResult): void {
  const levelsGained = result.levelsGained;

  // Show animation
  showLevelUpAnimation(result.oldLevel, result.newLevel);

  // Show stat increases
  showStatIncrease(result.oldStats, result.newStats, result.statIncreases);

  // Show restoration
  showRestoration();

  // Show skill points
  showSkillPointGain(result.skillPoints, levelsGained);

  // Bonus message for milestone levels
  if (result.newLevel % 10 === 0) {
    console.log(chalk.yellow.bold('🎊 축하합니다! 레벨 ' + result.newLevel + ' 달성!'));
    console.log(chalk.white('   특별한 보상을 받았습니다!'));
    console.log();
  } else if (result.newLevel % 5 === 0) {
    console.log(chalk.cyan.bold('✨ 레벨 ' + result.newLevel + ' 달성!'));
    console.log(chalk.white('   보너스 스탯을 받았습니다!'));
    console.log();
  }
}

/**
 * Show experience gain message
 */
export function showExpGain(amount: number, currentExp: number, requiredExp: number): void {
  const percentage = Math.floor((currentExp / requiredExp) * 100);
  const barLength = 20;
  const filledLength = Math.floor((currentExp / requiredExp) * barLength);
  const emptyLength = barLength - filledLength;

  const bar = chalk.green('█'.repeat(filledLength)) + chalk.gray('░'.repeat(emptyLength));

  console.log(chalk.cyan(`⭐ 경험치 +${amount}`));
  console.log(`   [${bar}] ${currentExp}/${requiredExp} (${percentage}%)`);
}

/**
 * Show compact level up notification (for battle)
 */
export function showCompactLevelUp(oldLevel: number, newLevel: number): void {
  console.log();
  console.log(chalk.yellow('═'.repeat(60)));
  console.log(chalk.yellow.bold('        🌟 LEVEL UP! 🌟'));
  console.log(chalk.yellow.bold('═'.repeat(60)));
  console.log(chalk.cyan(`레벨 ${oldLevel} → ${chalk.yellow.bold('레벨 ' + newLevel)}!`));
  console.log(chalk.green('HP와 MP가 완전히 회복되었습니다!'));
  console.log(chalk.yellow('═'.repeat(60)));
  console.log();
}

/**
 * Show experience bar (compact)
 */
export function showExpBar(currentExp: number, requiredExp: number, level: number): void {
  const percentage = Math.floor((currentExp / requiredExp) * 100);
  const barLength = 30;
  const filledLength = Math.floor((currentExp / requiredExp) * barLength);
  const emptyLength = barLength - filledLength;

  const bar = chalk.cyan('█'.repeat(filledLength)) + chalk.gray('░'.repeat(emptyLength));

  console.log(chalk.white(`레벨 ${level} [${bar}] ${percentage}%`));
  console.log(chalk.gray(`EXP: ${currentExp}/${requiredExp}`));
}
