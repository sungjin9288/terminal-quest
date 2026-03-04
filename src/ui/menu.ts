/**
 * Menu system for Terminal Quest
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { GameMode, CharacterClass } from '../types/index.js';
import { showMessage, showSeparator } from './display.js';
import {
  getRuntimeSettings,
  getSettingsSummary,
  updateRuntimeSettings,
  type ContinueAutoPace,
  type ColorMode,
  type ContinuePromptMode,
  type TextSpeed
} from '../runtime/settings.js';

/**
 * Main menu option
 */
export type MainMenuOption = 'new-game' | 'load-game' | 'settings' | 'exit';

/**
 * In-game menu option
 */
export type InGameMenuOption = 'continue' | 'inventory' | 'stats' | 'skills' | 'save' | 'main-menu' | 'exit';

function showListNavigationHint(): void {
  if (!getRuntimeSettings().showKeyHints) {
    return;
  }
  console.log(chalk.gray('안내: 방향키로 이동하고 Enter로 선택하세요.'));
}

function showInputHint(): void {
  if (!getRuntimeSettings().showKeyHints) {
    return;
  }
  console.log(chalk.gray('안내: 입력 후 Enter를 누르세요.'));
}

function getTextSpeedLabel(value: TextSpeed): string {
  if (value === 'slow') return '느림';
  if (value === 'fast') return '빠름';
  return '보통';
}

function getColorModeLabel(value: ColorMode): string {
  return value === 'mono' ? '단색' : '컬러';
}

function getContinuePromptModeLabel(value: ContinuePromptMode): string {
  return value === 'classic' ? '항상 확인' : '간소화';
}

function getContinueAutoPaceLabel(value: ContinueAutoPace): string {
  if (value === 'snappy') return '빠르게';
  if (value === 'cinematic') return '몰입형';
  return '균형형';
}

function getContextHintsLabel(value: boolean): string {
  return value ? '켜짐' : '꺼짐';
}

type SettingsMenuOption =
  | 'text-speed'
  | 'color-mode'
  | 'continue-mode'
  | 'continue-pace'
  | 'key-hints'
  | 'context-hints'
  | 'back';
type ExtendedSettingsMenuOption = SettingsMenuOption | 'telemetry';

export async function showSettingsMenu(): Promise<void> {
  let editing = true;

  while (editing) {
    const settings = getRuntimeSettings();

    console.log();
    showMessage('게임 설정', 'info');
    showSeparator();
    console.log(chalk.gray(getSettingsSummary(settings)));
    console.log();
    showListNavigationHint();

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.cyan('설정을 조정하세요:'),
        choices: [
          {
            name: `⏱️  텍스트 속도: ${getTextSpeedLabel(settings.textSpeed)}`,
            value: 'text-speed'
          },
          {
            name: `🎨 색상 모드: ${getColorModeLabel(settings.colorMode)}`,
            value: 'color-mode'
          },
          {
            name: `⏩ 진행 템포: ${getContinuePromptModeLabel(settings.continuePromptMode)}`,
            value: 'continue-mode'
          },
          {
            name: `⏱️  자동 진행 속도: ${getContinueAutoPaceLabel(settings.continueAutoPace)}`,
            value: 'continue-pace'
          },
          {
            name: `⌨️  키 힌트: ${settings.showKeyHints ? '켜짐' : '꺼짐'}`,
            value: 'key-hints'
          },
          {
            name: `🧭 추천 가이드: ${getContextHintsLabel(settings.showContextHints)}`,
            value: 'context-hints'
          },
          {
            name: `📊 익명 텔레메트리: ${settings.telemetryOptIn ? '켜짐' : '꺼짐'}`,
            value: 'telemetry'
          },
          {
            name: '← 돌아가기',
            value: 'back'
          }
        ]
      }
    ]);

    switch (answer.action as ExtendedSettingsMenuOption) {
      case 'text-speed': {
        showListNavigationHint();
        const speedAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'textSpeed',
            message: chalk.cyan('텍스트 속도를 선택하세요:'),
            choices: [
              { name: '느림', value: 'slow' },
              { name: '보통', value: 'normal' },
              { name: '빠름', value: 'fast' }
            ],
            default: settings.textSpeed
          }
        ]);
        const updated = updateRuntimeSettings({
          textSpeed: speedAnswer.textSpeed as TextSpeed
        });
        showMessage(`텍스트 속도를 ${getTextSpeedLabel(updated.textSpeed)}으로 설정했습니다.`, 'success');
        break;
      }
      case 'color-mode': {
        showListNavigationHint();
        const colorAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'colorMode',
            message: chalk.cyan('색상 모드를 선택하세요:'),
            choices: [
              { name: '컬러', value: 'full' },
              { name: '단색', value: 'mono' }
            ],
            default: settings.colorMode
          }
        ]);
        const updated = updateRuntimeSettings({
          colorMode: colorAnswer.colorMode as ColorMode
        });
        showMessage(`색상 모드를 ${getColorModeLabel(updated.colorMode)}으로 설정했습니다.`, 'success');
        break;
      }
      case 'continue-mode': {
        showListNavigationHint();
        const continueAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'continuePromptMode',
            message: chalk.cyan('진행 템포를 선택하세요:'),
            choices: [
              { name: '간소화 (자동 진행 중심)', value: 'streamlined' },
              { name: '항상 확인 (안내마다 Enter)', value: 'classic' }
            ],
            default: settings.continuePromptMode
          }
        ]);
        const updated = updateRuntimeSettings({
          continuePromptMode: continueAnswer.continuePromptMode as ContinuePromptMode
        });
        showMessage(
          `진행 템포를 ${getContinuePromptModeLabel(updated.continuePromptMode)}로 설정했습니다.`,
          'success'
        );
        break;
      }
      case 'continue-pace': {
        showListNavigationHint();
        const paceAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'continueAutoPace',
            message: chalk.cyan('자동 진행 속도를 선택하세요:'),
            choices: [
              { name: '빠르게 (짧은 대기)', value: 'snappy' },
              { name: '균형형 (기본 추천)', value: 'balanced' },
              { name: '몰입형 (긴 대기)', value: 'cinematic' }
            ],
            default: settings.continueAutoPace
          }
        ]);
        const updated = updateRuntimeSettings({
          continueAutoPace: paceAnswer.continueAutoPace as ContinueAutoPace
        });
        showMessage(
          `자동 진행 속도를 ${getContinueAutoPaceLabel(updated.continueAutoPace)}으로 설정했습니다.`,
          'success'
        );
        break;
      }
      case 'key-hints': {
        const updated = updateRuntimeSettings({
          showKeyHints: !settings.showKeyHints
        });
        showMessage(
          `키 힌트를 ${updated.showKeyHints ? '켰습니다' : '껐습니다'}.`,
          'success'
        );
        break;
      }
      case 'context-hints': {
        const updated = updateRuntimeSettings({
          showContextHints: !settings.showContextHints
        });
        showMessage(
          `추천 가이드를 ${getContextHintsLabel(updated.showContextHints)}으로 설정했습니다.`,
          'success'
        );
        break;
      }
      case 'telemetry': {
        const updated = updateRuntimeSettings({
          telemetryOptIn: !settings.telemetryOptIn
        });
        showMessage(
          `익명 텔레메트리를 ${updated.telemetryOptIn ? '켰습니다' : '껐습니다'}.`,
          'success'
        );
        break;
      }
      case 'back':
        editing = false;
        break;
    }
  }
}

/**
 * Display and handle main menu
 */
export async function showMainMenu(): Promise<MainMenuOption> {
  console.log();
  showSeparator();
  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('무엇을 하시겠습니까?'),
      choices: [
        {
          name: chalk.green('🎮 새 게임'),
          value: 'new-game'
        },
        {
          name: chalk.blue('📂 불러오기'),
          value: 'load-game'
        },
        {
          name: chalk.yellow('⚙️  설정'),
          value: 'settings'
        },
        {
          name: chalk.red('🚪 종료'),
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
  showMessage('난이도를 선택하세요:', 'info');
  showSeparator();
  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: chalk.cyan('게임 모드를 선택하세요:'),
      choices: [
        {
          name: chalk.green('📖 스토리 모드') + chalk.gray(' - 스토리 중심의 균형 난이도'),
          value: GameMode.Story
        },
        {
          name: chalk.blue('⚔️  어드벤처 모드') + chalk.gray(' - 기본 도전 난이도'),
          value: GameMode.Adventure
        },
        {
          name: chalk.yellow('🔥 챌린지 모드') + chalk.gray(' - 강화된 난이도'),
          value: GameMode.Challenge
        },
        {
          name: chalk.red('💀 하드코어 모드') + chalk.gray(' - 퍼머데스 적용'),
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
  showMessage('캐릭터 생성', 'success');
  showSeparator();
  showInputHint();

  const nameAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('캐릭터 이름을 입력하세요:'),
      validate: (input: string) => {
        if (input.trim().length < 2) {
          return '이름은 최소 2글자 이상이어야 합니다.';
        }
        if (input.trim().length > 20) {
          return '이름은 20글자 이하여야 합니다.';
        }
        return true;
      }
    }
  ]);

  console.log();
  showMessage('직업을 선택하세요:', 'info');
  console.log();
  console.log(chalk.yellow('⚔️  Warrior') + chalk.gray(' - 높은 HP/방어, 근접 특화'));
  console.log(chalk.magenta('🔮 Mage') + chalk.gray(' - 강력한 마법, 낮은 방어'));
  console.log(chalk.green('🗡️  Rogue') + chalk.gray(' - 높은 속도와 치명타'));
  console.log(chalk.cyan('✨ Cleric') + chalk.gray(' - 회복/지원 특화'));
  console.log(chalk.blue('🏹 Ranger') + chalk.gray(' - 원거리 공격, 균형형'));
  console.log();
  showListNavigationHint();

  const classAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'class',
      message: chalk.cyan('직업을 선택하세요:'),
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
  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('무엇을 하시겠습니까?'),
      choices: [
        {
          name: chalk.green('▶️  모험 계속하기'),
          value: 'continue'
        },
        {
          name: chalk.blue('🎒 인벤토리'),
          value: 'inventory'
        },
        {
          name: chalk.yellow('📊 캐릭터 정보'),
          value: 'stats'
        },
        {
          name: chalk.magenta('✨ 스킬'),
          value: 'skills'
        },
        {
          name: chalk.cyan('💾 저장'),
          value: 'save'
        },
        {
          name: chalk.gray('🏠 메인 메뉴로'),
          value: 'main-menu'
        },
        {
          name: chalk.red('🚪 게임 종료'),
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
  console.log(chalk.cyan.bold(`📍 현재 위치: ${locationName}`));
  showSeparator();
  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('무엇을 하시겠습니까?'),
      choices: [
        {
          name: chalk.green('🚶 탐험'),
          value: 'explore'
        },
        {
          name: chalk.blue('😴 휴식 (HP/MP 회복)'),
          value: 'rest'
        },
        {
          name: chalk.yellow('🗺️  이동'),
          value: 'travel'
        },
        {
          name: chalk.magenta('📜 퀘스트'),
          value: 'quest'
        },
        {
          name: chalk.gray('⚙️  메뉴'),
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
  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('행동을 선택하세요:'),
      choices: [
        {
          name: chalk.red('⚔️  공격'),
          value: 'attack'
        },
        {
          name: chalk.magenta('✨ 스킬 사용'),
          value: 'skill'
        },
        {
          name: chalk.green('🎒 아이템 사용'),
          value: 'item'
        },
        {
          name: chalk.blue('🛡️  방어'),
          value: 'defend'
        },
        {
          name: chalk.yellow('🏃 도주'),
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
  showListNavigationHint();
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
    name: chalk.green('➕ 새 저장 파일'),
    value: '__new__'
  });

  showListNavigationHint();

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'file',
      message: chalk.cyan('저장 파일을 선택하세요:'),
      choices
    }
  ]);

  if (answer.file === '__new__') {
    showInputHint();
    const newFileAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'fileName',
        message: chalk.cyan('새 저장 파일 이름을 입력하세요:'),
        validate: (input: string) => {
          if (input.trim().length < 1) {
            return '파일 이름은 비워둘 수 없습니다.';
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
