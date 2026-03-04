import { GameState } from '../../src/types/game';
import {
  SaveResult,
  SaveSlotMetadata
} from '../../src/types/save';
import {
  createTestGameState,
  type TestPlayerOptions
} from './gameStateFactory';

const SAVE_FLOW_DEFAULT_PLAYER_OPTIONS: TestPlayerOptions = {
  name: 'SaveFlowTester',
  level: 3,
  currentLocation: 'bit-town'
};

export function createSaveFlowTestGameState(
  playerOptions: Partial<TestPlayerOptions> = {},
  inventory: string[] = []
): GameState {
  const gameState = createTestGameState({
    playerOptions: {
      ...SAVE_FLOW_DEFAULT_PLAYER_OPTIONS,
      ...playerOptions
    }
  });
  gameState.player.inventory = [...inventory];
  return gameState;
}

export function createEmptySaveSlots(): SaveSlotMetadata[] {
  return [
    { slotNumber: 1, exists: false },
    { slotNumber: 2, exists: false },
    { slotNumber: 3, exists: false }
  ];
}

export function createSaveSlotMetadata(
  slotNumber: number,
  overrides: Partial<SaveSlotMetadata> = {}
): SaveSlotMetadata {
  return {
    slotNumber,
    exists: false,
    ...overrides
  };
}

export function createSuccessfulSaveResult(
  slotNumber: number,
  message: string = 'ok'
): SaveResult {
  return {
    success: true,
    message,
    slotNumber
  };
}
