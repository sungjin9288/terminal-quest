import fs from 'fs';
import os from 'os';
import path from 'path';
import { createTestGameState } from './helpers/gameStateFactory';
import { saveGame, listSaves, getSaveDirectoryPath } from '../src/systems/save';
import { SaveType } from '../src/types/save';

describe('Save environment overrides', () => {
  let saveDir: string;

  beforeEach(() => {
    saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-save-env-'));
    process.env.TERMINAL_QUEST_SAVE_DIR = saveDir;
  });

  afterEach(() => {
    delete process.env.TERMINAL_QUEST_SAVE_DIR;
    fs.rmSync(saveDir, { recursive: true, force: true });
  });

  it('should write saves into the overridden save directory', () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'SaveEnvTester',
        currentLocation: 'bit-town',
        level: 4
      }
    });

    const result = saveGame(gameState, 2, SaveType.Manual);

    expect(result.success).toBe(true);
    expect(getSaveDirectoryPath()).toBe(saveDir);
    expect(fs.existsSync(path.join(saveDir, 'slot2.json'))).toBe(true);

    const saves = listSaves();
    expect(saves.find(slot => slot.slotNumber === 2)?.exists).toBe(true);
  });
});
