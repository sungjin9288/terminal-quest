/**
 * Terminal Quest - Death UI
 * Display functions for death screen, penalties, and game over
 */

import { Player } from '../types/character.js';
import { GameMode } from '../types/game.js';
import {
  DeathPenalty,
  DeathResult,
  getGameModeName,
  getPenaltySeverity
} from '../systems/death.js';

/**
 * Death screen display configuration
 */
export interface DeathScreenConfig {
  /** Screen width in characters */
  width: number;
  /** Show ASCII art */
  showAsciiArt: boolean;
  /** Show detailed penalties */
  showDetailedPenalties: boolean;
  /** Animation delay (ms) */
  animationDelay: number;
}

/**
 * Default death screen configuration
 */
export const DEFAULT_DEATH_SCREEN_CONFIG: DeathScreenConfig = {
  width: 40,
  showAsciiArt: true,
  showDetailedPenalties: true,
  animationDelay: 100
};

/**
 * Show death screen
 */
export function showDeathScreen(
  player: Player,
  deathResult: DeathResult,
  config: DeathScreenConfig = DEFAULT_DEATH_SCREEN_CONFIG
): string {
  const lines: string[] = [];
  const { width } = config;
  const border = '━'.repeat(width);

  lines.push(border);

  // ASCII skull art
  if (config.showAsciiArt) {
    lines.push(...getDeathAsciiArt(width));
  }

  // "YOU DIED" text
  lines.push(centerText('YOU DIED', width));
  lines.push(border);

  // Game mode
  lines.push(`[${getGameModeName(deathResult.gameMode)}]`);
  lines.push('');

  // Respawn message
  if (!deathResult.isGameOver) {
    lines.push(deathResult.message);
    lines.push('');
  }

  // Show penalties
  if (config.showDetailedPenalties && !deathResult.isGameOver) {
    lines.push('페널티:');
    lines.push(...formatPenaltyLines(deathResult.penalty, player));
  }

  // Game over for hardcore
  if (deathResult.isGameOver) {
    lines.push('');
    lines.push(centerText('☠ GAME OVER ☠', width));
    lines.push('');
    lines.push(`획득한 영혼 정수: ${deathResult.penalty.soulEssence}`);
    lines.push('(메타 진행도에 반영됩니다)');
  }

  lines.push('');
  lines.push(deathResult.isGameOver ? '[메인 메뉴로]' : '[계속]');
  lines.push(border);

  return lines.join('\n');
}

/**
 * Show death penalty details
 */
export function showDeathPenalty(
  penalty: DeathPenalty,
  player: Player,
  gameMode: GameMode
): string {
  const lines: string[] = [];
  const severity = getPenaltySeverity(gameMode);

  lines.push('┌─────────────────────────────────┐');
  lines.push('│         사망 페널티             │');
  lines.push('├─────────────────────────────────┤');

  // Severity indicator
  const severityText = getSeverityText(severity);
  lines.push(`│ 심각도: ${severityText.padEnd(23)}│`);
  lines.push('├─────────────────────────────────┤');

  // Gold loss
  if (penalty.goldLost > 0) {
    const goldLine = `골드: -${penalty.goldLost.toLocaleString()} (${penalty.goldPercentage}%)`;
    lines.push(`│ ${goldLine.padEnd(31)}│`);
    const remainingGold = `  남은 골드: ${(player.gold - penalty.goldLost).toLocaleString()}G`;
    lines.push(`│ ${remainingGold.padEnd(31)}│`);
  }

  // Exp loss
  if (penalty.expLost > 0) {
    const expLine = `경험치: -${penalty.expLost.toLocaleString()} (${penalty.expPercentage}%)`;
    lines.push(`│ ${expLine.padEnd(31)}│`);
    if (penalty.canLevelDown) {
      lines.push(`│ ${'  ⚠ 레벨 다운 가능'.padEnd(31)}│`);
    }
  }

  // Consumables lost
  if (penalty.consumablesLost.length > 0) {
    const consumableLine = `소모품: ${penalty.consumablesLost.length}개 손실 (${penalty.consumableLossPercentage}%)`;
    lines.push(`│ ${consumableLine.padEnd(31)}│`);
  }

  // Equipment lost
  if (penalty.equipmentLost) {
    lines.push(`│ ${'장비: 1개 손실'.padEnd(31)}│`);
    lines.push(`│ ${'  → ' + penalty.equipmentLost.substring(0, 24).padEnd(27)}│`);
  } else if (penalty.equipmentLossChance > 0) {
    const equipLine = `장비 손실: 회피됨 (${penalty.equipmentLossChance}% 확률)`;
    lines.push(`│ ${equipLine.padEnd(31)}│`);
  }

  // Soul essence (hardcore)
  if (penalty.soulEssence > 0) {
    lines.push('├─────────────────────────────────┤');
    const soulLine = `영혼 정수: +${penalty.soulEssence}`;
    lines.push(`│ ${soulLine.padEnd(31)}│`);
  }

  lines.push('└─────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Show game over screen (hardcore mode)
 */
export function showGameOver(
  player: Player,
  soulEssence: number
): string {
  const lines: string[] = [];
  const width = 44;
  const border = '━'.repeat(width);

  lines.push(border);
  lines.push('');

  // Large skull ASCII art
  lines.push(...getGameOverAsciiArt(width));

  lines.push('');
  lines.push(centerText('☠ GAME OVER ☠', width));
  lines.push('');
  lines.push(border);
  lines.push('');

  // Player stats summary
  lines.push(centerText(`${player.name}의 여정이 끝났습니다`, width));
  lines.push('');
  lines.push(`  최종 레벨: ${player.level}`);
  lines.push(`  처치한 적: ${player.enemiesDefeated}`);
  lines.push(`  플레이 시간: ${formatPlayTime(player.playTime)}`);
  lines.push(`  사망 횟수: ${player.deaths + 1}`);
  lines.push('');

  lines.push(border);
  lines.push('');
  lines.push(centerText('메타 진행도', width));
  lines.push('');
  lines.push(`  획득한 영혼 정수: +${soulEssence}`);
  lines.push('  (다음 캐릭터에 보너스 적용)');
  lines.push('');

  lines.push(border);
  lines.push('');
  lines.push(centerText('[1] 새 게임  [2] 메인 메뉴', width));
  lines.push('');
  lines.push(border);

  return lines.join('\n');
}

/**
 * Show respawn confirmation
 */
export function showRespawnConfirmation(
  respawnLocation: string,
  penalty: DeathPenalty,
  gameMode: GameMode
): string {
  const lines: string[] = [];

  lines.push('┌─────────────────────────────────────┐');
  lines.push('│            부활 확인                │');
  lines.push('├─────────────────────────────────────┤');

  const modeName = getGameModeName(gameMode);
  lines.push(`│ 모드: ${modeName.padEnd(29)}│`);
  lines.push(`│ 부활 위치: ${respawnLocation.substring(0, 24).padEnd(24)}│`);
  lines.push('├─────────────────────────────────────┤');

  // Show penalties
  if (penalty.goldLost > 0) {
    lines.push(`│ 골드 손실: -${penalty.goldLost.toLocaleString().padEnd(23)}│`);
  }
  if (penalty.expLost > 0) {
    lines.push(`│ 경험치 손실: -${penalty.expLost.toLocaleString().padEnd(21)}│`);
  }
  if (penalty.consumablesLost.length > 0) {
    lines.push(`│ 소모품 손실: ${penalty.consumablesLost.length}개${''.padEnd(22)}│`);
  }
  if (penalty.equipmentLost) {
    lines.push(`│ 장비 손실: ${penalty.equipmentLost.substring(0, 23).padEnd(23)}│`);
  }

  lines.push('├─────────────────────────────────────┤');
  lines.push('│         [Enter] 부활하기            │');
  lines.push('└─────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Show death animation frames
 */
export function getDeathAnimationFrames(): string[] {
  return [
    `
    ❤️ → 💔
    HP: 0
    `,
    `
      💀
    YOU DIED
    `,
    `
      ☠️
    GAME OVER
    `
  ];
}

/**
 * Show death penalty comparison by mode
 */
export function showDeathPenaltyComparison(): string {
  const lines: string[] = [];

  lines.push('┌────────────────────────────────────────────────────────┐');
  lines.push('│                   난이도별 사망 페널티                 │');
  lines.push('├──────────┬─────────┬─────────┬──────────┬─────────────┤');
  lines.push('│   모드   │  골드   │ 경험치  │  소모품  │    장비     │');
  lines.push('├──────────┼─────────┼─────────┼──────────┼─────────────┤');
  lines.push('│ 스토리   │  -10%   │    -    │    -     │      -      │');
  lines.push('│ 어드벤처 │  -30%   │  -10%   │  -50%    │      -      │');
  lines.push('│ 챌린지   │  -50%   │  -20%   │ -100%    │   30% 확률  │');
  lines.push('│ 하드코어 │  세이브 삭제 (영구 사망)                   │');
  lines.push('└──────────┴─────────┴─────────┴──────────┴─────────────┘');

  return lines.join('\n');
}

/**
 * Get severity display text
 */
function getSeverityText(severity: 'light' | 'medium' | 'heavy' | 'fatal'): string {
  switch (severity) {
    case 'light':
      return '💚 가벼움';
    case 'medium':
      return '💛 보통';
    case 'heavy':
      return '🧡 심각';
    case 'fatal':
      return '💀 치명적';
    default:
      return '보통';
  }
}

/**
 * Format penalty lines for display
 */
function formatPenaltyLines(penalty: DeathPenalty, player: Player): string[] {
  const lines: string[] = [];

  if (penalty.goldLost > 0) {
    lines.push(`- 골드 -${penalty.goldLost.toLocaleString()} (${penalty.goldPercentage}%)`);
  }

  if (penalty.expLost > 0) {
    lines.push(`- 경험치 -${penalty.expLost.toLocaleString()} (${penalty.expPercentage}%)`);
    if (penalty.canLevelDown) {
      const currentExp = player.experience - penalty.expLost;
      if (currentExp < 0) {
        lines.push('  ⚠ 레벨 다운!');
      }
    }
  }

  if (penalty.consumablesLost.length > 0) {
    const percent = penalty.consumableLossPercentage === 100 ? '전부' : `${penalty.consumableLossPercentage}%`;
    lines.push(`- 소모품 ${percent} 손실`);
  }

  if (penalty.equipmentLost) {
    lines.push(`- 장비 손실: ${penalty.equipmentLost}`);
  }

  if (lines.length === 0) {
    lines.push('- 페널티 없음');
  }

  return lines;
}

/**
 * Center text in given width
 */
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Get death ASCII art
 */
function getDeathAsciiArt(width: number): string[] {
  const skull = [
    '        💀        ',
  ];
  return skull.map(line => centerText(line.trim(), width));
}

/**
 * Get game over ASCII art
 */
function getGameOverAsciiArt(width: number): string[] {
  const art = [
    '    ╔═══════════╗    ',
    '    ║   ☠   ☠   ║    ',
    '    ║     ▼     ║    ',
    '    ║  ═══════  ║    ',
    '    ╚═══════════╝    ',
  ];
  return art.map(line => centerText(line, width));
}

/**
 * Format play time for display
 */
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${secs}초`;
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  }
  return `${secs}초`;
}

/**
 * Show quick death summary (for combat log)
 */
export function showQuickDeathSummary(gameMode: GameMode): string {
  switch (gameMode) {
    case GameMode.Story:
      return '💀 사망! (같은 위치에서 부활, 골드 -10%)';
    case GameMode.Adventure:
      return '💀 사망! (세이브 복귀, 골드 -30%, 경험치 -10%)';
    case GameMode.Challenge:
      return '💀 사망! (세이브 복귀, 심각한 페널티 적용)';
    case GameMode.Hardcore:
      return '☠️ 영구 사망! 세이브가 삭제됩니다...';
    default:
      return '💀 사망!';
  }
}

/**
 * Show death tips based on mode
 */
export function showDeathTips(gameMode: GameMode): string[] {
  const tips: Record<GameMode, string[]> = {
    [GameMode.Story]: [
      '💡 포션을 미리 준비하세요.',
      '💡 레벨이 낮다면 주변 몬스터로 먼저 레벨업하세요.',
    ],
    [GameMode.Adventure]: [
      '💡 자주 세이브하면 손실을 줄일 수 있습니다.',
      '💡 소모품을 아껴두면 죽었을 때 절반을 잃습니다.',
      '💡 골드는 장비에 투자하면 잃지 않습니다.',
    ],
    [GameMode.Challenge]: [
      '💡 장비 손실 확률이 30%입니다. 신중하게 플레이하세요.',
      '💡 레벨 다운이 가능하니 보스전 전 충분히 준비하세요.',
      '💡 소모품은 필요할 때만 구매하세요.',
    ],
    [GameMode.Hardcore]: [
      '💡 하드코어 모드에서는 신중함이 생존의 열쇠입니다.',
      '💡 도망치는 것은 부끄러운 일이 아닙니다.',
      '💡 확실하지 않으면 싸우지 마세요.',
    ],
  };

  return tips[gameMode] || [];
}
