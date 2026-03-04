import './helpers/moduleMocks';
import { loadGame } from '../src/game';
import * as saveUi from '../src/ui/save';
import * as saveSystem from '../src/systems/save';
import { mockDisplayPreset, mockPromptSequence } from './helpers/uiMocks';
import { createSaveSlotMetadata } from './helpers/saveFixtureFactory';
import { createLegacyStateWithoutQuestHistory } from './helpers/legacySaveFixtureFactory';

describe('Load Game E2E', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should load and migrate save state through load menu flow', async () => {
    mockDisplayPreset('loadGame');
    jest.spyOn(saveUi, 'showSaveSlots').mockImplementation(() => undefined);
    jest.spyOn(saveUi, 'showLoadSuccess').mockImplementation(() => undefined);
    jest.spyOn(saveUi, 'selectSaveSlot').mockResolvedValue(3);

    const saves = [
      createSaveSlotMetadata(3, {
        exists: true,
        savedAt: 1730390400000,
        locationName: '비트 타운',
        playerName: 'LoadTester',
        playerLevel: 2,
        playTime: 150
      })
    ];

    jest.spyOn(saveSystem, 'listSaves').mockReturnValue(saves);
    jest.spyOn(saveSystem, 'getSaveMetadata').mockReturnValue(saves[0] ?? null);
    jest.spyOn(saveSystem, 'loadGame').mockReturnValue({
      success: true,
      message: 'ok',
      gameState: createLegacyStateWithoutQuestHistory(),
      saveSchemaVersion: '0.8.0'
    });

    mockPromptSequence([{ action: 'load' }]);

    const loadedState = await loadGame();

    expect(loadedState).not.toBeNull();
    expect(Array.isArray(loadedState?.questHistory)).toBe(true);
    expect(Object.keys(loadedState?.quests ?? {})).toEqual(
      expect.arrayContaining(['slime-cleanup', 'forest-survey'])
    );
    expect(loadedState?.player.completedQuests).toContain('slime-cleanup');
    expect(loadedState?.player.activeQuests).toContain('forest-survey');
    expect(saveUi.showLoadSuccess).toHaveBeenCalled();
  });
});
