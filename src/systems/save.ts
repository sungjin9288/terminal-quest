/**
 * Save/Load system for Terminal Quest
 */

import fs from 'fs';
import path from 'path';
import { GameState } from '../types/game.js';
import {
  SaveSlot,
  SaveType,
  SaveSlotMetadata,
  SaveResult,
  LoadResult
} from '../types/save.js';
import {
  getAchievementPerkSummary,
  ensureAchievementTrackingState,
  getAchievementSummary,
  getNextAchievement,
  getTrackedAchievement,
  syncAchievementTrackingState
} from './achievements.js';
import { getLocationDisplayName } from './savePoint.js';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  migrateLoadedGameState
} from './gameStateMigration.js';
import {
  getAdventureFocusSummary,
  getLocationBossProgress,
  getRecommendedTravelDestination
} from './adventureFocus.js';
import { getQuestTrackerSummary } from './questTracker.js';
import { getHubTown, getLocationById, isTownLocation } from '../data/locations.js';
import { getAvailableQuests } from './quest.js';

// Save directory
const DEFAULT_SAVE_DIR = './saves';
const MAX_SLOTS = 3;

interface SaveResumeSummary {
  title: string;
  hint: string;
}

interface SaveNextAchievementSummary {
  title: string;
  progress: string;
  hint: string;
}

interface SaveTrackedAchievementSummary {
  title: string;
  progress: string;
  hint: string;
}

interface SaveTrackingHistorySummary {
  message: string;
  timestamp: number;
}

function resolveSaveDirectory(): string {
  const override = process.env.TERMINAL_QUEST_SAVE_DIR?.trim();
  if (override && override.length > 0) {
    return override;
  }

  return DEFAULT_SAVE_DIR;
}

export function getSaveDirectoryPath(): string {
  return resolveSaveDirectory();
}

/**
 * Ensure save directory exists
 */
function ensureSaveDirectory(): void {
  const saveDir = resolveSaveDirectory();
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
}

/**
 * Get save file path for slot
 */
function getSaveFilePath(slotNumber: number): string {
  return path.join(resolveSaveDirectory(), `slot${slotNumber}.json`);
}

function getLocationName(locationId: string): string {
  if (locationId === getHubTown().id) {
    return getHubTown().name;
  }

  return getLocationById(locationId)?.name ?? getLocationDisplayName(locationId);
}

function buildNextAchievementSummary(gameState: GameState): SaveNextAchievementSummary | null {
  const nextAchievement = getNextAchievement(gameState);

  if (!nextAchievement) {
    return null;
  }

  return {
    title: nextAchievement.title,
    progress: `${nextAchievement.progress.current}/${nextAchievement.progress.target}`,
    hint: nextAchievement.description
  };
}

function buildTrackedAchievementSummary(gameState: GameState): SaveTrackedAchievementSummary | null {
  const trackedAchievement = getTrackedAchievement(gameState);

  if (!trackedAchievement) {
    return null;
  }

  return {
    title: trackedAchievement.title,
    progress: `${trackedAchievement.progress.current}/${trackedAchievement.progress.target}`,
    hint: trackedAchievement.description
  };
}

function buildTrackingHistorySummary(gameState: GameState): SaveTrackingHistorySummary | null {
  const trackingState = ensureAchievementTrackingState(gameState);
  const latestEntry = trackingState.history[0];

  if (!latestEntry) {
    return null;
  }

  return {
    message: latestEntry.message,
    timestamp: latestEntry.timestamp
  };
}

function buildSaveResumeSummary(gameState: GameState): SaveResumeSummary {
  const tracker = getQuestTrackerSummary(gameState);
  if (tracker?.status === 'ready') {
    return {
      title: `${tracker.questName} 정산`,
      hint: '게시판으로 돌아가 보상을 수령하세요.'
    };
  }

  const bossProgress = getLocationBossProgress(gameState);
  if (bossProgress) {
    return bossProgress.ready
      ? {
          title: `${bossProgress.bossName} 직전`,
          hint: '다음 전투에서 보스와 바로 조우할 수 있습니다.'
        }
      : {
          title: `${bossProgress.bossName} 추적`,
          hint: `보스 조우까지 탐색 ${bossProgress.remainingSteps}회 남았습니다.`
        };
  }

  const availableQuestCount = getAvailableQuests(gameState).length;
  if (isTownLocation(gameState.player.currentLocation) && availableQuestCount > 0) {
    return {
      title: '새 퀘스트',
      hint: `게시판에서 다음 의뢰 ${availableQuestCount}개를 확인하세요.`
    };
  }

  if (tracker) {
    return {
      title: tracker.questName,
      hint: `${tracker.objectiveDescription} (${tracker.currentAmount}/${tracker.requiredAmount})`
    };
  }

  const focus = getAdventureFocusSummary(gameState);
  if (focus?.lines[0]) {
    return {
      title: focus.title,
      hint: focus.lines[0]
    };
  }

  const recommendedLocationId = getRecommendedTravelDestination(gameState);
  if (recommendedLocationId) {
    return {
      title: '다음 공략',
      hint: `추천 목적지: ${getLocationName(recommendedLocationId)}`
    };
  }

  return {
    title: '현재 위치',
    hint: `${getLocationName(gameState.player.currentLocation)}에서 이어하기`
  };
}

function createSaveSlotMetadata(slotNumber: number, saveSlot: SaveSlot): SaveSlotMetadata {
  syncAchievementTrackingState(saveSlot.gameState, { recordHistory: false });
  const achievementSummary = getAchievementSummary(saveSlot.gameState);
  const resumeSummary = buildSaveResumeSummary(saveSlot.gameState);
  const trackingState = ensureAchievementTrackingState(saveSlot.gameState);
  const trackingHistorySummary = buildTrackingHistorySummary(saveSlot.gameState);
  const trackedAchievementSummary = buildTrackedAchievementSummary(saveSlot.gameState);
  const nextAchievementSummary = buildNextAchievementSummary(saveSlot.gameState);
  const achievementPerkSummary = getAchievementPerkSummary(saveSlot.gameState);

  return {
    slotNumber,
    exists: true,
    schemaVersion: saveSlot.schemaVersion,
    savedAt: saveSlot.savedAt,
    locationName: saveSlot.locationName,
    playerName: saveSlot.playerName,
    playerLevel: saveSlot.playerLevel,
    playTime: saveSlot.playTime,
    saveType: saveSlot.saveType,
    achievementCount: achievementSummary.unlockedCount,
    achievementTotal: achievementSummary.totalCount,
    resumeTitle: resumeSummary.title,
    resumeHint: resumeSummary.hint,
    achievementTrackingMode: trackingState.mode,
    achievementTrackingHistory: trackingHistorySummary?.message,
    achievementTrackingHistoryAt: trackingHistorySummary?.timestamp,
    trackedAchievementTitle: trackedAchievementSummary?.title,
    trackedAchievementProgress: trackedAchievementSummary?.progress,
    trackedAchievementHint: trackedAchievementSummary?.hint,
    nextAchievementTitle: nextAchievementSummary?.title,
    nextAchievementProgress: nextAchievementSummary?.progress,
    nextAchievementHint: nextAchievementSummary?.hint,
    achievementPerkSummary
  };
}

/**
 * Save game to slot
 */
export function saveGame(
  gameState: GameState,
  slotNumber: number,
  saveType: SaveType = SaveType.Manual
): SaveResult {
  try {
    migrateLoadedGameState(gameState, gameState.gameVersion);

    // Validate slot number
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    // Ensure save directory exists
    ensureSaveDirectory();

    // Create save slot
    const saveSlot: SaveSlot = {
      slotNumber,
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      gameState,
      savedAt: Date.now(),
      locationName: getLocationDisplayName(gameState.player.currentLocation),
      playerName: gameState.player.name,
      playerLevel: gameState.player.level,
      playTime: gameState.player.playTime,
      saveType
    };

    // Write to file
    const filePath = getSaveFilePath(slotNumber);
    fs.writeFileSync(filePath, JSON.stringify(saveSlot, null, 2), 'utf-8');

    const saveTypeText = {
      [SaveType.Auto]: '자동 저장',
      [SaveType.Manual]: '수동 저장',
      [SaveType.Emergency]: '긴급 저장'
    }[saveType];

    return {
      success: true,
      message: `슬롯 ${slotNumber}에 ${saveTypeText} 완료!`,
      slotNumber
    };
  } catch (error) {
    return {
      success: false,
      message: `저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * Load game from slot
 */
export function loadGame(slotNumber: number): LoadResult {
  try {
    // Validate slot number
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    const filePath = getSaveFilePath(slotNumber);

    // Check if save exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `슬롯 ${slotNumber}에 저장된 데이터가 없습니다.`
      };
    }

    // Read save file
    const saveData = fs.readFileSync(filePath, 'utf-8');
    const saveSlot: SaveSlot = JSON.parse(saveData);

    return {
      success: true,
      message: `슬롯 ${slotNumber}에서 불러오기 완료!`,
      gameState: saveSlot.gameState,
      saveSchemaVersion: saveSlot.schemaVersion
    };
  } catch (error) {
    return {
      success: false,
      message: `불러오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * Delete save slot
 */
export function deleteSave(slotNumber: number): SaveResult {
  try {
    // Validate slot number
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    const filePath = getSaveFilePath(slotNumber);

    // Check if save exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `슬롯 ${slotNumber}에 저장된 데이터가 없습니다.`
      };
    }

    // Delete file
    fs.unlinkSync(filePath);

    return {
      success: true,
      message: `슬롯 ${slotNumber} 삭제 완료!`,
      slotNumber
    };
  } catch (error) {
    return {
      success: false,
      message: `삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}

/**
 * List all save slots
 */
export function listSaves(): SaveSlotMetadata[] {
  ensureSaveDirectory();

  const slots: SaveSlotMetadata[] = [];

  for (let i = 1; i <= MAX_SLOTS; i++) {
    const filePath = getSaveFilePath(i);

    if (fs.existsSync(filePath)) {
      try {
        const saveData = fs.readFileSync(filePath, 'utf-8');
        const saveSlot: SaveSlot = JSON.parse(saveData);
        migrateLoadedGameState(
          saveSlot.gameState,
          saveSlot.schemaVersion ?? saveSlot.gameState.gameVersion
        );
        slots.push(createSaveSlotMetadata(i, saveSlot));
      } catch (error) {
        // Corrupted save file
        slots.push({
          slotNumber: i,
          exists: false
        });
      }
    } else {
      slots.push({
        slotNumber: i,
        exists: false
      });
    }
  }

  return slots;
}

/**
 * Check if save slot exists
 */
export function saveExists(slotNumber: number): boolean {
  const filePath = getSaveFilePath(slotNumber);
  return fs.existsSync(filePath);
}

/**
 * Get save slot metadata
 */
export function getSaveMetadata(slotNumber: number): SaveSlotMetadata | null {
  if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
    return null;
  }

  const filePath = getSaveFilePath(slotNumber);

  if (!fs.existsSync(filePath)) {
    return {
      slotNumber,
      exists: false
    };
  }

  try {
    const saveData = fs.readFileSync(filePath, 'utf-8');
    const saveSlot: SaveSlot = JSON.parse(saveData);
    migrateLoadedGameState(
      saveSlot.gameState,
      saveSlot.schemaVersion ?? saveSlot.gameState.gameVersion
    );

    return createSaveSlotMetadata(slotNumber, saveSlot);
  } catch (error) {
    return {
      slotNumber,
      exists: false
    };
  }
}

/**
 * Auto-save to first slot
 */
export function autoSave(gameState: GameState): SaveResult {
  return saveGame(gameState, 1, SaveType.Auto);
}
