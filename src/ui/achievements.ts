import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  AchievementTrackingHistoryEntry,
  AchievementTrackingMode,
  AchievementView,
  GameState
} from '../types/index.js';
import {
  ensureAchievementTrackingState,
  getAchievementSummary,
  getNextAchievement,
  getTrackedAchievement
} from '../systems/achievements.js';
import { showSeparator } from './display.js';

export type AchievementMenuOption =
  | 'track'
  | 'mode'
  | 'next'
  | 'clear'
  | 'history'
  | 'back';

function formatProgress(entry: AchievementView): string {
  return `${entry.progress.current}/${entry.progress.target}`;
}

function getModeLabel(mode: AchievementTrackingMode): string {
  return mode === 'pinned' ? '핀 고정' : '자동 전환';
}

function getAchievementStatusLabel(entry: AchievementView): string {
  if (entry.unlocked) {
    return '해금 완료';
  }

  return `${Math.max(0, Math.min(100, Math.round((entry.progress.current / entry.progress.target) * 100)))}%`;
}

export function showAchievementPanel(gameState: GameState): void {
  const summary = getAchievementSummary(gameState);
  const trackingState = ensureAchievementTrackingState(gameState);
  const trackedAchievement = getTrackedAchievement(gameState);
  const nextAchievement = getNextAchievement(gameState);

  console.log();
  showSeparator(68);
  console.log(chalk.magenta.bold('🏆 업적 지휘실'));
  showSeparator(68);
  console.log(chalk.white(`해금 진행: ${summary.unlockedCount}/${summary.totalCount}`));
  console.log(chalk.yellow(`추적 모드: ${getModeLabel(trackingState.mode)}`));
  console.log(chalk.cyan(`현재 추적: ${trackedAchievement ? `${trackedAchievement.title} (${formatProgress(trackedAchievement)})` : '없음'}`));
  console.log(chalk.gray(`다음 후보: ${nextAchievement ? `${nextAchievement.title} (${formatProgress(nextAchievement)})` : '전체 해금 완료'}`));

  const latestHistory = trackingState.history[0];
  if (latestHistory) {
    console.log(chalk.blue(`최근 기록: ${latestHistory.message}`));
  }

  console.log();
  for (const entry of summary.entries) {
    const definitionReward = entry.rewardPreview ? ` / 보상 ${entry.rewardPreview}` : '';
    const line = entry.unlocked
      ? `${chalk.green('●')} ${chalk.white(entry.title)} ${chalk.gray(`(${getAchievementStatusLabel(entry)})`)}`
      : `${chalk.yellow('○')} ${chalk.white(entry.title)} ${chalk.gray(`(${formatProgress(entry)})`)}`;
    console.log(line);
    console.log(chalk.gray(`   ${entry.description}${definitionReward}`));
    if (trackedAchievement?.id === entry.id) {
      console.log(chalk.magenta('   현재 추적 대상'));
    }
  }
  console.log();
}

export async function promptAchievementMenuAction(
  gameState: GameState
): Promise<AchievementMenuOption> {
  const trackingState = ensureAchievementTrackingState(gameState);
  const trackedAchievement = getTrackedAchievement(gameState);
  const nextAchievement = getNextAchievement(gameState);

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('업적 메뉴:'),
      choices: [
        {
          name: `🎯 업적 직접 추적${trackedAchievement ? ` (${trackedAchievement.title})` : ''}`,
          value: 'track'
        },
        {
          name: `🔁 추적 모드 변경 (${getModeLabel(trackingState.mode)})`,
          value: 'mode'
        },
        {
          name: `⏭ 다음 후보로 전환${nextAchievement ? ` (${nextAchievement.title})` : ''}`,
          value: 'next',
          disabled: nextAchievement ? false : '전환할 후보 없음'
        },
        {
          name: '🧹 추적 해제',
          value: 'clear',
          disabled: trackedAchievement ? false : '현재 추적 대상 없음'
        },
        {
          name: '🕘 최근 추적 기록 보기',
          value: 'history',
          disabled: trackingState.history.length > 0 ? false : '기록 없음'
        },
        {
          name: chalk.gray('← 돌아가기'),
          value: 'back'
        }
      ]
    }
  ]);

  return answer.choice as AchievementMenuOption;
}

export async function promptAchievementTrackingMode(
  currentMode: AchievementTrackingMode
): Promise<AchievementTrackingMode | null> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: chalk.cyan('추적 모드를 선택하세요:'),
      choices: [
        {
          name: '자동 전환 - 행동 후 가장 가까운 업적으로 자동 이동',
          value: 'auto'
        },
        {
          name: '핀 고정 - 선택한 업적을 끝까지 유지',
          value: 'pinned'
        },
        {
          name: chalk.gray('← 취소'),
          value: 'cancel'
        }
      ],
      default: currentMode
    }
  ]);

  if (answer.mode === 'cancel') {
    return null;
  }

  return answer.mode as AchievementTrackingMode;
}

export async function promptAchievementTrackTarget(
  gameState: GameState
): Promise<string | null> {
  const entries = getAchievementSummary(gameState).entries
    .filter(entry => !entry.unlocked)
    .sort((left, right) => {
      const leftRatio = left.progress.target > 0 ? left.progress.current / left.progress.target : 0;
      const rightRatio = right.progress.target > 0 ? right.progress.current / right.progress.target : 0;
      if (leftRatio !== rightRatio) {
        return rightRatio - leftRatio;
      }
      return left.title.localeCompare(right.title, 'ko-KR');
    });

  if (entries.length === 0) {
    return null;
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'achievementId',
      message: chalk.cyan('추적할 업적을 선택하세요:'),
      choices: [
        ...entries.map(entry => ({
          name: `${entry.title} (${formatProgress(entry)})${entry.rewardPreview ? ` - 보상 ${entry.rewardPreview}` : ''}`,
          value: entry.id
        })),
        {
          name: chalk.gray('← 취소'),
          value: 'cancel'
        }
      ]
    }
  ]);

  return answer.achievementId === 'cancel'
    ? null
    : answer.achievementId;
}

export function showAchievementTrackingHistory(
  history: AchievementTrackingHistoryEntry[]
): void {
  console.log();
  showSeparator(68);
  console.log(chalk.blue.bold('🕘 추적 기록'));
  showSeparator(68);

  for (const entry of history) {
    const timestamp = new Date(entry.timestamp).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    console.log(chalk.white(`${timestamp} · ${entry.message}`));
  }

  console.log();
}
