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
import { getLocationDisplayName } from './savePoint.js';

// Save directory
const SAVE_DIR = './saves';
const MAX_SLOTS = 3;

/**
 * Ensure save directory exists
 */
function ensureSaveDirectory(): void {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }
}

/**
 * Get save file path for slot
 */
function getSaveFilePath(slotNumber: number): string {
  return path.join(SAVE_DIR, `slot${slotNumber}.json`);
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
      gameState: saveSlot.gameState
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

        slots.push({
          slotNumber: i,
          exists: true,
          savedAt: saveSlot.savedAt,
          locationName: saveSlot.locationName,
          playerName: saveSlot.playerName,
          playerLevel: saveSlot.playerLevel,
          playTime: saveSlot.playTime,
          saveType: saveSlot.saveType
        });
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

    return {
      slotNumber,
      exists: true,
      savedAt: saveSlot.savedAt,
      locationName: saveSlot.locationName,
      playerName: saveSlot.playerName,
      playerLevel: saveSlot.playerLevel,
      playTime: saveSlot.playTime,
      saveType: saveSlot.saveType
    };
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
