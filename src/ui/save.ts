/**
 * Save/Load UI for Terminal Quest
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { SaveSlotMetadata, SaveType } from '../types/save.js';
import { showSeparator } from './display.js';

/**
 * Format play time
 */
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

/**
 * Format date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Get save type icon
 */
function getSaveTypeIcon(saveType: SaveType): string {
  switch (saveType) {
    case SaveType.Auto:
      return '🔄';
    case SaveType.Manual:
      return '💾';
    case SaveType.Emergency:
      return '🆘';
    default:
      return '💾';
  }
}

function formatAchievementProgress(
  achievementCount?: number,
  achievementTotal?: number
): string | null {
  if (typeof achievementTotal !== 'number') {
    return null;
  }

  return `업적: ${achievementCount ?? 0}/${achievementTotal}`;
}

function formatResumeProgress(
  resumeTitle?: string,
  resumeHint?: string
): string | null {
  if (!resumeTitle && !resumeHint) {
    return null;
  }

  if (resumeTitle && resumeHint) {
    return `재개 힌트: ${resumeTitle} - ${resumeHint}`;
  }

  return `재개 힌트: ${resumeTitle ?? resumeHint}`;
}

function formatAchievementTrackingMode(
  achievementTrackingMode?: SaveSlotMetadata['achievementTrackingMode']
): string | null {
  if (!achievementTrackingMode) {
    return null;
  }

  return `추적 모드: ${achievementTrackingMode === 'pinned' ? '핀 고정' : '자동 전환'}`;
}

function formatAchievementTrackingHistory(
  achievementTrackingHistory?: string,
  achievementTrackingHistoryAt?: number
): string | null {
  if (!achievementTrackingHistory) {
    return null;
  }

  const timeLabel = achievementTrackingHistoryAt
    ? `${formatDate(achievementTrackingHistoryAt)} · `
    : '';

  return `추적 기록: ${timeLabel}${achievementTrackingHistory}`;
}

function formatNextAchievementProgress(
  nextAchievementTitle?: string,
  nextAchievementProgress?: string,
  nextAchievementHint?: string
): string | null {
  if (!nextAchievementTitle) {
    return null;
  }

  const summary = `${nextAchievementTitle}${nextAchievementProgress ? ` (${nextAchievementProgress})` : ''}`;
  if (nextAchievementHint) {
    return `다음 업적: ${summary} - ${nextAchievementHint}`;
  }

  return `다음 업적: ${summary}`;
}

function formatTrackedAchievementProgress(
  trackedAchievementTitle?: string,
  trackedAchievementProgress?: string,
  trackedAchievementHint?: string
): string | null {
  if (!trackedAchievementTitle) {
    return null;
  }

  const summary = `${trackedAchievementTitle}${trackedAchievementProgress ? ` (${trackedAchievementProgress})` : ''}`;
  if (trackedAchievementHint) {
    return `추적 업적: ${summary} - ${trackedAchievementHint}`;
  }

  return `추적 업적: ${summary}`;
}

/**
 * Show save slots
 */
export function showSaveSlots(slots: SaveSlotMetadata[]): void {
  console.log();
  showSeparator(60);
  console.log(chalk.cyan.bold('💾 세이브 슬롯'));
  showSeparator(60);
  console.log();

  slots.forEach(slot => {
    if (slot.exists && slot.savedAt && slot.playerName && slot.locationName) {
      const saveTypeIcon = getSaveTypeIcon(slot.saveType || SaveType.Manual);
      const achievementProgress = formatAchievementProgress(
        slot.achievementCount,
        slot.achievementTotal
      );

      console.log(chalk.yellow.bold(`[슬롯 ${slot.slotNumber}] ${saveTypeIcon}`));
      console.log(chalk.white(`  ${slot.playerName} - Lv ${slot.playerLevel}`));
      console.log(chalk.gray(`  위치: ${slot.locationName}`));
      console.log(chalk.gray(`  플레이 시간: ${formatPlayTime(slot.playTime || 0)}`));
      console.log(chalk.gray(`  저장 시간: ${formatDate(slot.savedAt)}`));
      if (achievementProgress) {
        console.log(chalk.gray(`  ${achievementProgress}`));
      }
      const resumeProgress = formatResumeProgress(slot.resumeTitle, slot.resumeHint);
      if (resumeProgress) {
        console.log(chalk.cyan(`  ${resumeProgress}`));
      }
      const trackingMode = formatAchievementTrackingMode(slot.achievementTrackingMode);
      if (trackingMode) {
        console.log(chalk.yellow(`  ${trackingMode}`));
      }
      const trackedAchievementProgress = formatTrackedAchievementProgress(
        slot.trackedAchievementTitle,
        slot.trackedAchievementProgress,
        slot.trackedAchievementHint
      );
      if (trackedAchievementProgress) {
        console.log(chalk.magenta(`  ${trackedAchievementProgress}`));
      }
      const nextAchievementProgress = formatNextAchievementProgress(
        slot.nextAchievementTitle,
        slot.nextAchievementProgress,
        slot.nextAchievementHint
      );
      if (nextAchievementProgress) {
        console.log(chalk.magenta(`  ${nextAchievementProgress}`));
      }
      const trackingHistory = formatAchievementTrackingHistory(
        slot.achievementTrackingHistory,
        slot.achievementTrackingHistoryAt
      );
      if (trackingHistory) {
        console.log(chalk.blue(`  ${trackingHistory}`));
      }
    } else {
      console.log(chalk.gray.bold(`[슬롯 ${slot.slotNumber}]`));
      console.log(chalk.gray('  비어있음'));
    }
    console.log();
  });

  showSeparator(60);
  console.log();
}

/**
 * Select save slot
 */
export async function selectSaveSlot(
  slots: SaveSlotMetadata[],
  action: 'save' | 'load' | 'delete'
): Promise<number | null> {
  const choices = slots.map(slot => {
    let name: string;

    if (slot.exists && slot.savedAt && slot.playerName && slot.locationName) {
      const saveTypeIcon = getSaveTypeIcon(slot.saveType || SaveType.Manual);
      const achievementProgress = formatAchievementProgress(
        slot.achievementCount,
        slot.achievementTotal
      );
      const resumeProgress = formatResumeProgress(slot.resumeTitle, slot.resumeHint);
      const trackingMode = formatAchievementTrackingMode(slot.achievementTrackingMode);
      const trackedAchievementProgress = formatTrackedAchievementProgress(
        slot.trackedAchievementTitle,
        slot.trackedAchievementProgress,
        slot.trackedAchievementHint
      );
      const nextAchievementProgress = formatNextAchievementProgress(
        slot.nextAchievementTitle,
        slot.nextAchievementProgress,
        slot.nextAchievementHint
      );
      const trackingHistory = formatAchievementTrackingHistory(
        slot.achievementTrackingHistory,
        slot.achievementTrackingHistoryAt
      );
      name =
        `${saveTypeIcon} 슬롯 ${slot.slotNumber}: ${slot.playerName} Lv${slot.playerLevel} - ${slot.locationName}` +
        [achievementProgress, resumeProgress, trackingMode, trackedAchievementProgress, nextAchievementProgress, trackingHistory]
          .filter(Boolean)
          .map(text => `(${text})`)
          .join(' ');
    } else {
      name = chalk.gray(`슬롯 ${slot.slotNumber}: 비어있음`);
    }

    return {
      name,
      value: slot.slotNumber,
      disabled: action === 'load' && !slot.exists ? '저장된 데이터 없음' : false
    };
  });

  choices.push({
    name: chalk.gray('← 취소'),
    value: 0,
    disabled: false
  });

  const actionText = {
    save: '저장할 슬롯',
    load: '불러올 슬롯',
    delete: '삭제할 슬롯'
  }[action];

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'slot',
      message: `${actionText} 선택:`,
      choices,
      pageSize: 10
    }
  ]);

  return answer.slot === 0 ? null : answer.slot;
}

/**
 * Confirm save overwrite
 */
export async function confirmSaveOverwrite(slotNumber: number, metadata: SaveSlotMetadata): Promise<boolean> {
  if (!metadata.exists) {
    return true;
  }

  console.log();
  console.log(chalk.yellow('⚠️  경고: 기존 저장 데이터를 덮어씁니다!'));
  console.log();
  console.log(chalk.white(`슬롯 ${slotNumber}:`));
  if (metadata.playerName && metadata.locationName) {
    console.log(chalk.gray(`  ${metadata.playerName} Lv${metadata.playerLevel} - ${metadata.locationName}`));
    const achievementProgress = formatAchievementProgress(
      metadata.achievementCount,
      metadata.achievementTotal
    );
    if (achievementProgress) {
      console.log(chalk.gray(`  ${achievementProgress}`));
    }
    const resumeProgress = formatResumeProgress(metadata.resumeTitle, metadata.resumeHint);
    if (resumeProgress) {
      console.log(chalk.cyan(`  ${resumeProgress}`));
    }
    const trackingMode = formatAchievementTrackingMode(metadata.achievementTrackingMode);
    if (trackingMode) {
      console.log(chalk.yellow(`  ${trackingMode}`));
    }
    const trackedAchievementProgress = formatTrackedAchievementProgress(
      metadata.trackedAchievementTitle,
      metadata.trackedAchievementProgress,
      metadata.trackedAchievementHint
    );
    if (trackedAchievementProgress) {
      console.log(chalk.magenta(`  ${trackedAchievementProgress}`));
    }
    const nextAchievementProgress = formatNextAchievementProgress(
      metadata.nextAchievementTitle,
      metadata.nextAchievementProgress,
      metadata.nextAchievementHint
    );
    if (nextAchievementProgress) {
      console.log(chalk.magenta(`  ${nextAchievementProgress}`));
    }
    const trackingHistory = formatAchievementTrackingHistory(
      metadata.achievementTrackingHistory,
      metadata.achievementTrackingHistoryAt
    );
    if (trackingHistory) {
      console.log(chalk.blue(`  ${trackingHistory}`));
    }
    if (metadata.savedAt) {
      console.log(chalk.gray(`  ${formatDate(metadata.savedAt)}`));
    }
  }
  console.log();

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '정말 덮어쓰시겠습니까?',
      default: false
    }
  ]);

  return answer.confirm;
}

/**
 * Confirm delete
 */
export async function confirmDelete(metadata: SaveSlotMetadata): Promise<boolean> {
  console.log();
  console.log(chalk.red('⚠️  경고: 저장 데이터를 삭제합니다!'));
  console.log();
  console.log(chalk.white(`슬롯 ${metadata.slotNumber}:`));
  if (metadata.playerName && metadata.locationName) {
    console.log(chalk.gray(`  ${metadata.playerName} Lv${metadata.playerLevel} - ${metadata.locationName}`));
    const achievementProgress = formatAchievementProgress(
      metadata.achievementCount,
      metadata.achievementTotal
    );
    if (achievementProgress) {
      console.log(chalk.gray(`  ${achievementProgress}`));
    }
    const resumeProgress = formatResumeProgress(metadata.resumeTitle, metadata.resumeHint);
    if (resumeProgress) {
      console.log(chalk.cyan(`  ${resumeProgress}`));
    }
    const trackedAchievementProgress = formatTrackedAchievementProgress(
      metadata.trackedAchievementTitle,
      metadata.trackedAchievementProgress,
      metadata.trackedAchievementHint
    );
    if (trackedAchievementProgress) {
      console.log(chalk.magenta(`  ${trackedAchievementProgress}`));
    }
    const nextAchievementProgress = formatNextAchievementProgress(
      metadata.nextAchievementTitle,
      metadata.nextAchievementProgress,
      metadata.nextAchievementHint
    );
    if (nextAchievementProgress) {
      console.log(chalk.magenta(`  ${nextAchievementProgress}`));
    }
    const trackingHistory = formatAchievementTrackingHistory(
      metadata.achievementTrackingHistory,
      metadata.achievementTrackingHistoryAt
    );
    if (trackingHistory) {
      console.log(chalk.blue(`  ${trackingHistory}`));
    }
    if (metadata.savedAt) {
      console.log(chalk.gray(`  ${formatDate(metadata.savedAt)}`));
    }
  }
  console.log();

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '정말 삭제하시겠습니까? (복구할 수 없습니다)',
      default: false
    }
  ]);

  return answer.confirm;
}

/**
 * Show save menu
 */
export async function showSaveMenu(): Promise<'save' | 'cancel'> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '저장 메뉴:',
      choices: [
        { name: '💾 저장하기', value: 'save' },
        { name: chalk.gray('← 취소'), value: 'cancel' }
      ]
    }
  ]);

  return answer.action;
}

/**
 * Show load menu
 */
export async function showLoadMenu(): Promise<'load' | 'delete' | 'cancel'> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '불러오기 메뉴:',
      choices: [
        { name: '📂 불러오기', value: 'load' },
        { name: '🗑️  삭제', value: 'delete' },
        { name: chalk.gray('← 취소'), value: 'cancel' }
      ]
    }
  ]);

  return answer.action;
}

/**
 * Show emergency save confirmation
 */
export async function confirmEmergencySave(tokenCount: number): Promise<boolean> {
  console.log();
  console.log(chalk.yellow('🆘 긴급 저장'));
  console.log();
  console.log(chalk.white('세이브 포인트가 아닌 곳에서 저장하려면 세이브 토큰이 필요합니다.'));
  console.log(chalk.gray(`보유 세이브 토큰: ${tokenCount}개`));
  console.log();

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '세이브 토큰 1개를 사용하여 저장하시겠습니까?',
      default: false
    }
  ]);

  return answer.confirm;
}

/**
 * Show save success message
 */
export function showSaveSuccess(slotNumber: number, saveType: SaveType): void {
  const messages = {
    [SaveType.Auto]: '자동 저장 완료!',
    [SaveType.Manual]: '저장 완료!',
    [SaveType.Emergency]: '긴급 저장 완료!'
  };

  const icons = {
    [SaveType.Auto]: '🔄',
    [SaveType.Manual]: '💾',
    [SaveType.Emergency]: '🆘'
  };

  console.log();
  console.log(chalk.green.bold(`${icons[saveType]} ${messages[saveType]}`));
  console.log(chalk.white(`슬롯 ${slotNumber}에 저장되었습니다.`));
  console.log();
}

/**
 * Show load success message
 */
export function showLoadSuccess(metadata: SaveSlotMetadata): void {
  console.log();
  console.log(chalk.green.bold('📂 불러오기 완료!'));
  if (metadata.playerName && metadata.locationName) {
    console.log(chalk.white(`${metadata.playerName} Lv${metadata.playerLevel} - ${metadata.locationName}`));
  }
  const achievementProgress = formatAchievementProgress(
    metadata.achievementCount,
    metadata.achievementTotal
  );
  if (achievementProgress) {
    console.log(chalk.gray(achievementProgress));
  }
  const resumeProgress = formatResumeProgress(metadata.resumeTitle, metadata.resumeHint);
  if (resumeProgress) {
    console.log(chalk.cyan(resumeProgress));
  }
  const trackedAchievementProgress = formatTrackedAchievementProgress(
    metadata.trackedAchievementTitle,
    metadata.trackedAchievementProgress,
    metadata.trackedAchievementHint
  );
  if (trackedAchievementProgress) {
    console.log(chalk.magenta(trackedAchievementProgress));
  }
  const nextAchievementProgress = formatNextAchievementProgress(
    metadata.nextAchievementTitle,
    metadata.nextAchievementProgress,
    metadata.nextAchievementHint
  );
  if (nextAchievementProgress) {
    console.log(chalk.magenta(nextAchievementProgress));
  }
  const trackingMode = formatAchievementTrackingMode(metadata.achievementTrackingMode);
  if (trackingMode) {
    console.log(chalk.yellow(trackingMode));
  }
  const trackingHistory = formatAchievementTrackingHistory(
    metadata.achievementTrackingHistory,
    metadata.achievementTrackingHistoryAt
  );
  if (trackingHistory) {
    console.log(chalk.blue(trackingHistory));
  }
  console.log();
}

/**
 * Show compact save notification (for auto-save)
 */
export function showAutoSaveNotification(): void {
  console.log(chalk.gray('🔄 자동 저장 중...'));
}
