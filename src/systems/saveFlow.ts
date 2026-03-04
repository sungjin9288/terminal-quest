import chalk from 'chalk';
import inquirer from 'inquirer';
import { GameState } from '../types/game.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showSaveSlots,
  selectSaveSlot,
  confirmSaveOverwrite,
  confirmDelete,
  showSaveSuccess,
  showLoadSuccess
} from '../ui/save.js';
import {
  saveGame as saveToFile,
  loadGame as loadFromFile,
  listSaves,
  getSaveMetadata,
  deleteSave
} from './save.js';
import {
  migrateLoadedGameState
} from './gameStateMigration.js';
import {
  canSaveAtLocation,
  getSaveTokenCount,
  useSaveToken as consumeSaveToken,
  isAutoSaveLocation
} from './savePoint.js';
import { SaveType } from '../types/save.js';
import { trackTelemetryEvent } from './telemetry.js';

export async function loadGameFlow(): Promise<GameState | null> {
  clearScreen();
  await showTitle();

  const saves = listSaves();
  showSaveSlots(saves);

  const action = await inquirer.prompt([
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

  if (action.action === 'cancel') return null;

  if (action.action === 'delete') {
    const slotNumber = await selectSaveSlot(saves, 'delete');
    if (slotNumber) {
      const metadata = getSaveMetadata(slotNumber);
      if (metadata && metadata.exists) {
        const confirmed = await confirmDelete(metadata);
        if (confirmed) {
          const result = deleteSave(slotNumber);
          showMessage(result.message, result.success ? 'success' : 'error');
        }
      }
    }
    await pressEnterToContinue('important');
    return null;
  }

  if (action.action === 'load') {
    const slotNumber = await selectSaveSlot(saves, 'load');
    if (!slotNumber) return null;

    const result = loadFromFile(slotNumber);
    if (result.success && result.gameState) {
      migrateLoadedGameState(
        result.gameState,
        result.saveSchemaVersion ?? result.gameState.gameVersion
      );
      const metadata = getSaveMetadata(slotNumber);
      if (metadata) showLoadSuccess(metadata);
      await pressEnterToContinue('important');
      return result.gameState;
    } else {
      showMessage(result.message, 'error');
      await pressEnterToContinue('important');
      return null;
    }
  }

  return null;
}

export async function saveGameFlow(gameState: GameState): Promise<boolean> {
  clearScreen();
  await showTitle();

  const tokenCount = getSaveTokenCount(gameState.player);
  const canSave = canSaveAtLocation(
    gameState.player.currentLocation,
    false,
    tokenCount > 0
  );

  if (!canSave.canSave) {
    showMessage(canSave.reason, 'warning');
    await pressEnterToContinue('important');
    return false;
  }

  const saves = listSaves();
  showSaveSlots(saves);

  const slotNumber = await selectSaveSlot(saves, 'save');
  if (!slotNumber) return false;

  const metadata = getSaveMetadata(slotNumber);
  if (metadata && metadata.exists) {
    const confirmed = await confirmSaveOverwrite(slotNumber, metadata);
    if (!confirmed) return false;
  }

  let saveType = SaveType.Manual;
  let useToken = false;

  if (canSave.requiresToken) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `세이브 토큰 1개를 사용하여 긴급 저장하시겠습니까? (보유: ${tokenCount}개)`,
        default: true
      }
    ]);

    if (!answer.confirm) return false;
    saveType = SaveType.Emergency;
    useToken = true;
  } else if (isAutoSaveLocation(gameState.player.currentLocation)) {
    saveType = SaveType.Auto;
  }

  if (useToken) {
    if (!consumeSaveToken(gameState.player)) {
      showMessage('세이브 토큰이 부족합니다!', 'error');
      await pressEnterToContinue('important');
      return false;
    }
  }

  const result = saveToFile(gameState, slotNumber, saveType);

  if (result.success) {
    showSaveSuccess(slotNumber, saveType);
    trackTelemetryEvent('save_created', gameState, {
      slot: slotNumber,
      saveType,
      usedToken: useToken
    });
  } else {
    showMessage(result.message, 'error');
  }

  await pressEnterToContinue('important');
  return result.success;
}
