/**
 * Terminal Quest - Travel UI
 * Display functions for location travel and map navigation
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  GameLocation,
  HubTown,
  getLocationById,
  getConnectedLocations,
  isLocationUnlocked,
  getLocationDisplayName,
  isTownLocation,
  isLevelAppropriate,
  getHubTown
} from '../data/locations.js';
import { showSeparator, showMessage } from './display.js';

/**
 * Travel menu result
 */
export interface TravelResult {
  traveled: boolean;
  destination: string | null;
}

/**
 * Show travel menu with available destinations
 */
export async function showTravelMenu(
  currentLocationId: string,
  playerLevel: number,
  defeatedBosses: string[] = [],
  completedActs: number[] = []
): Promise<TravelResult> {
  console.log();
  const currentName = getLocationDisplayName(currentLocationId);
  console.log(chalk.cyan.bold(`📍 현재 위치: ${currentName}`));
  showSeparator();

  // Get connected locations
  const connectedLocations = getConnectedLocations(currentLocationId);

  if (connectedLocations.length === 0) {
    showMessage('이동할 수 있는 장소가 없습니다.', 'warning');
    return { traveled: false, destination: null };
  }

  // Build choices
  const choices: Array<{ name: string; value: string; disabled?: string }> = [];

  for (const location of connectedLocations) {
    const isUnlocked = isLocationUnlocked(location.id, defeatedBosses, completedActs);
    const isTown = isTownLocation(location.id);

    let displayName = location.name;
    let levelInfo = '';
    let statusIcon = '';

    if (isTown) {
      statusIcon = '🏠 ';
      levelInfo = chalk.green(' [안전 지역]');
    } else if ('recommendedLevel' in location) {
      const recommended = (location as GameLocation).recommendedLevel;
      const appropriateness = isLevelAppropriate(playerLevel, location.id);

      levelInfo = chalk.gray(` [Lv.${recommended[0]}-${recommended[1]}]`);

      if (appropriateness === 'under') {
        statusIcon = '⚠️ ';
        levelInfo += chalk.red(' (위험!)');
      } else if (appropriateness === 'over') {
        statusIcon = '✓ ';
        levelInfo += chalk.green(' (쉬움)');
      } else {
        statusIcon = '→ ';
      }
    }

    if (!isUnlocked) {
      choices.push({
        name: chalk.gray(`🔒 ${displayName} [잠김]`),
        value: location.id,
        disabled: '해금 조건을 충족하지 않았습니다'
      });
    } else {
      choices.push({
        name: `${statusIcon}${displayName}${levelInfo}`,
        value: location.id
      });
    }
  }

  // Add cancel option
  choices.push({
    name: chalk.gray('← 취소'),
    value: 'cancel'
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'destination',
      message: chalk.cyan('어디로 이동하시겠습니까?'),
      choices
    }
  ]);

  if (answer.destination === 'cancel') {
    return { traveled: false, destination: null };
  }

  return { traveled: true, destination: answer.destination };
}

/**
 * Show location info
 */
export function showLocationInfo(locationId: string): void {
  const location = getLocationById(locationId);
  if (!location) {
    showMessage('위치 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  console.log();
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log(chalk.yellow.bold(`  📍 ${location.name}`));
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log();
  console.log(chalk.white(location.description));
  console.log();

  if ('recommendedLevel' in location) {
    const gameLocation = location as GameLocation;
    console.log(chalk.gray(`권장 레벨: ${gameLocation.recommendedLevel[0]} - ${gameLocation.recommendedLevel[1]}`));
    console.log(chalk.gray(`난이도: ${getDifficultyDisplay(gameLocation.difficulty)}`));
    console.log(chalk.gray(`예상 플레이 시간: ${gameLocation.targetPlaytime}`));

    if (gameLocation.boss) {
      console.log(chalk.red(`보스: ${gameLocation.boss}`));
    }
  } else {
    const hubLocation = location as HubTown;
    console.log(chalk.green('시설:'));
    hubLocation.facilities.forEach(facility => {
      console.log(chalk.green(`  • ${getFacilityDisplay(facility)}`));
    });
  }

  console.log(chalk.cyan.bold('═'.repeat(50)));
}

/**
 * Show map overview
 */
export function showMapOverview(
  currentLocationId: string,
  unlockedLocations: string[],
  defeatedBosses: string[]
): void {
  console.log();
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log(chalk.yellow.bold('  🗺️  월드 맵'));
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log();

  // Show hub
  const hub = getHubTown();
  const hubMarker = currentLocationId === hub.id ? chalk.green('► ') : '  ';
  console.log(`${hubMarker}${chalk.yellow('🏠 ' + hub.name)}`);
  console.log(chalk.gray('    └── Act 1 ──'));

  // Act 1 locations
  const act1Order = ['memory-forest', 'cache-cave', 'bit-plains'];
  for (const locId of act1Order) {
    const location = getLocationById(locId);
    if (!location) continue;

    const isUnlocked = unlockedLocations.includes(locId) ||
      isLocationUnlocked(locId, defeatedBosses, []);
    const isCurrent = currentLocationId === locId;
    const bossDefeated = 'boss' in location && defeatedBosses.includes((location as GameLocation).boss);

    let marker = '        ';
    let icon = '📍';
    let style = chalk.white;

    if (isCurrent) {
      marker = chalk.green('    ►   ');
      style = chalk.green;
    } else if (!isUnlocked) {
      icon = '🔒';
      style = chalk.gray;
    } else if (bossDefeated) {
      icon = '✓';
      style = chalk.green;
    }

    console.log(`${marker}${style(`${icon} ${location.name}`)}`);
  }

  console.log();
  console.log(chalk.cyan.bold('═'.repeat(50)));
}

/**
 * Show travel confirmation
 */
export async function confirmTravel(
  fromLocation: string,
  toLocation: string,
  playerLevel: number
): Promise<boolean> {
  const destination = getLocationById(toLocation);
  if (!destination) return false;

  const fromName = getLocationDisplayName(fromLocation);
  const toName = destination.name;

  console.log();
  console.log(chalk.yellow('━'.repeat(40)));
  console.log(chalk.cyan(`  ${fromName}`));
  console.log(chalk.yellow('        ↓'));
  console.log(chalk.cyan(`  ${toName}`));
  console.log(chalk.yellow('━'.repeat(40)));

  // Show warning if underleveled
  if ('recommendedLevel' in destination) {
    const recommended = (destination as GameLocation).recommendedLevel;
    if (playerLevel < recommended[0]) {
      console.log();
      console.log(chalk.red.bold('⚠️  경고: 이 지역은 당신에게 너무 위험합니다!'));
      console.log(chalk.red(`    권장 레벨: ${recommended[0]}-${recommended[1]}`));
      console.log(chalk.red(`    현재 레벨: ${playerLevel}`));
    }
  }

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `${toName}(으)로 이동하시겠습니까?`,
      default: true
    }
  ]);

  return answer.confirm;
}

/**
 * Show travel animation
 */
export async function showTravelAnimation(
  _fromLocation: string,
  toLocation: string
): Promise<void> {
  const destination = getLocationById(toLocation);
  const destName = destination?.name ?? toLocation;

  console.log();
  console.log(chalk.cyan('이동 중...'));

  const frames = ['🚶 .', '🚶 ..', '🚶 ...', '🚶 ....'];
  for (const frame of frames) {
    process.stdout.write(`\r${chalk.yellow(frame)}`);
    await sleep(300);
  }

  console.log();
  console.log(chalk.green.bold(`\n✓ ${destName}에 도착했습니다!`));
  console.log();
}

/**
 * Show location arrival message
 */
export function showLocationArrival(locationId: string): void {
  const location = getLocationById(locationId);
  if (!location) return;

  console.log();
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log(chalk.yellow.bold(`  📍 ${location.name}`));
  console.log(chalk.cyan.bold('═'.repeat(50)));
  console.log();
  console.log(chalk.italic(location.description));
  console.log();

  if (isTownLocation(locationId)) {
    const hub = location as HubTown;
    console.log(chalk.green('이용 가능한 시설:'));
    hub.facilities.forEach(facility => {
      console.log(chalk.green(`  • ${getFacilityDisplay(facility)}`));
    });
  } else {
    const gameLocation = location as GameLocation;
    console.log(chalk.yellow(`권장 레벨: Lv.${gameLocation.recommendedLevel[0]}-${gameLocation.recommendedLevel[1]}`));
    console.log(chalk.gray(`난이도: ${getDifficultyDisplay(gameLocation.difficulty)}`));
  }

  console.log();
}

/**
 * Get difficulty display text
 */
function getDifficultyDisplay(difficulty: string): string {
  const displays: Record<string, string> = {
    'easy': chalk.green('쉬움'),
    'medium': chalk.yellow('보통'),
    'hard': chalk.red('어려움'),
    'very-hard': chalk.red.bold('매우 어려움'),
    'extreme': chalk.magenta.bold('극한')
  };
  return displays[difficulty] || difficulty;
}

/**
 * Get facility display text
 */
function getFacilityDisplay(facility: string): string {
  const displays: Record<string, string> = {
    'shop': '🏪 상점',
    'inn': '🛏️ 여관',
    'save-point': '💾 세이브 포인트',
    'quest-board': '📋 퀘스트 게시판',
    'blacksmith': '🔨 대장장이'
  };
  return displays[facility] || facility;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show town menu
 */
export type TownMenuOption = 'shop' | 'inn' | 'save' | 'explore' | 'travel' | 'menu';

export async function showTownMenu(locationName: string): Promise<TownMenuOption> {
  console.log();
  console.log(chalk.cyan.bold(`🏠 ${locationName}`));
  showSeparator();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('무엇을 하시겠습니까?'),
      choices: [
        { name: chalk.yellow('🏪 상점'), value: 'shop' },
        { name: chalk.blue('🛏️  여관 (휴식)'), value: 'inn' },
        { name: chalk.green('💾 세이브'), value: 'save' },
        { name: chalk.magenta('🚶 주변 탐색'), value: 'explore' },
        { name: chalk.cyan('🗺️  이동'), value: 'travel' },
        { name: chalk.gray('⚙️  메뉴'), value: 'menu' }
      ]
    }
  ]);

  return answer.choice as TownMenuOption;
}

/**
 * Show dungeon menu
 */
export type DungeonMenuOption = 'explore' | 'rest' | 'travel' | 'menu';

export async function showDungeonMenu(
  locationName: string,
  canRest: boolean = true
): Promise<DungeonMenuOption> {
  console.log();
  console.log(chalk.cyan.bold(`📍 ${locationName}`));
  showSeparator();

  const choices = [
    { name: chalk.red('⚔️  탐색 (전투)'), value: 'explore' }
  ];

  if (canRest) {
    choices.push({ name: chalk.blue('😴 휴식'), value: 'rest' });
  }

  choices.push(
    { name: chalk.yellow('🗺️  이동'), value: 'travel' },
    { name: chalk.gray('⚙️  메뉴'), value: 'menu' }
  );

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('무엇을 하시겠습니까?'),
      choices
    }
  ]);

  return answer.choice as DungeonMenuOption;
}
