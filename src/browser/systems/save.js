import { SaveType } from '../../types/save.js';
import {
  getAchievementPerkSummary,
  ensureAchievementTrackingState,
  getAchievementSummary,
  getNextAchievement,
  getTrackedAchievement,
  syncAchievementTrackingState
} from '../../systems/achievements.js';
import { getAiIntent, syncAiState } from '../../systems/aiDirector.js';
import { getLocationDisplayName } from '../../systems/savePoint.js';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  migrateLoadedGameState
} from '../../systems/gameStateMigration.js';
import {
  getAdventureFocusSummary,
  getLocationBossProgress,
  getRecommendedTravelDestination
} from '../../systems/adventureFocus.js';
import { getQuestTrackerSummary } from '../../systems/questTracker.js';
import { getHubTown, getLocationById, isTownLocation } from '../data/locations.js';
import { getAvailableQuests } from '../../systems/quest.js';
import { readJsonStorage, writeJsonStorage } from '../shared/storage.js';

const SAVE_STORAGE_KEY = 'terminal-quest/save-slots-v1';
const DEFAULT_SAVE_DIR = 'browser://localStorage';
const MAX_SLOTS = 3;

function readSlots() {
  return readJsonStorage(SAVE_STORAGE_KEY, {});
}

function writeSlots(slots) {
  writeJsonStorage(SAVE_STORAGE_KEY, slots);
}

function getLocationName(locationId) {
  if (locationId === getHubTown().id) {
    return getHubTown().name;
  }

  return getLocationById(locationId)?.name ?? getLocationDisplayName(locationId);
}

function buildNextAchievementSummary(gameState) {
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

function buildTrackedAchievementSummary(gameState) {
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

function buildTrackingHistorySummary(gameState) {
  const latestEntry = ensureAchievementTrackingState(gameState).history[0];
  if (!latestEntry) {
    return null;
  }

  return {
    message: latestEntry.message,
    timestamp: latestEntry.timestamp
  };
}

function buildSaveResumeSummary(gameState) {
  const aiIntent = getAiIntent(gameState);
  if (aiIntent) {
    return {
      title: aiIntent.title,
      hint: aiIntent.reason
    };
  }

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
  if (focus?.lines?.[0]) {
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

function createSaveSlotMetadata(slotNumber, saveSlot) {
  syncAchievementTrackingState(saveSlot.gameState, { recordHistory: false });
  syncAiState(saveSlot.gameState, saveSlot.savedAt);
  const achievementSummary = getAchievementSummary(saveSlot.gameState);
  const resumeSummary = buildSaveResumeSummary(saveSlot.gameState);
  const trackingState = ensureAchievementTrackingState(saveSlot.gameState);
  const aiState = saveSlot.gameState.aiState;
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
    achievementPerkSummary,
    aiDirectorMode: aiState?.directorMode,
    aiIntentTitle: aiState?.currentIntent?.title,
    aiIntentReason: aiState?.currentIntent?.reason
  };
}

export function getSaveDirectoryPath() {
  return DEFAULT_SAVE_DIR;
}

export function saveGame(gameState, slotNumber, saveType = SaveType.Manual) {
  try {
    migrateLoadedGameState(gameState, gameState.gameVersion);

    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    const saveSlot = {
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
    const slots = readSlots();
    slots[`slot${slotNumber}`] = saveSlot;
    writeSlots(slots);

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

export function loadGame(slotNumber) {
  try {
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    const saveSlot = readSlots()[`slot${slotNumber}`];
    if (!saveSlot) {
      return {
        success: false,
        message: `슬롯 ${slotNumber}에 저장된 데이터가 없습니다.`
      };
    }

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

export function deleteSave(slotNumber) {
  try {
    if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
      return {
        success: false,
        message: `유효하지 않은 슬롯 번호입니다. (1-${MAX_SLOTS})`
      };
    }

    const slots = readSlots();
    if (!slots[`slot${slotNumber}`]) {
      return {
        success: false,
        message: `슬롯 ${slotNumber}에 저장된 데이터가 없습니다.`
      };
    }

    delete slots[`slot${slotNumber}`];
    writeSlots(slots);

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

export function listSaves() {
  const slots = readSlots();
  const metadata = [];

  for (let slotNumber = 1; slotNumber <= MAX_SLOTS; slotNumber += 1) {
    const saveSlot = slots[`slot${slotNumber}`];
    if (!saveSlot) {
      metadata.push({ slotNumber, exists: false });
      continue;
    }

    try {
      migrateLoadedGameState(
        saveSlot.gameState,
        saveSlot.schemaVersion ?? saveSlot.gameState.gameVersion
      );
      metadata.push(createSaveSlotMetadata(slotNumber, saveSlot));
    } catch {
      metadata.push({ slotNumber, exists: false });
    }
  }

  return metadata;
}

export function saveExists(slotNumber) {
  return Boolean(readSlots()[`slot${slotNumber}`]);
}

export function getSaveMetadata(slotNumber) {
  if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
    return null;
  }

  const saveSlot = readSlots()[`slot${slotNumber}`];
  if (!saveSlot) {
    return {
      slotNumber,
      exists: false
    };
  }

  try {
    migrateLoadedGameState(
      saveSlot.gameState,
      saveSlot.schemaVersion ?? saveSlot.gameState.gameVersion
    );
    return createSaveSlotMetadata(slotNumber, saveSlot);
  } catch {
    return {
      slotNumber,
      exists: false
    };
  }
}

export function autoSave(gameState) {
  return saveGame(gameState, 1, SaveType.Auto);
}
