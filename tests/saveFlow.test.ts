import './helpers/moduleMocks';
import { saveGameFlow } from '../src/systems/saveFlow';
import * as display from '../src/ui/display';
import * as saveUi from '../src/ui/save';
import * as saveSystem from '../src/systems/save';
import { SaveType } from '../src/types/save';
import {
  createEmptySaveSlots,
  createSaveFlowTestGameState,
  createSaveSlotMetadata,
  createSuccessfulSaveResult
} from './helpers/saveFixtureFactory';
import {
  mockDisplayPreset,
  mockPromptSequence
} from './helpers/uiMocks';

describe('Save Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should block saving when location has no save point and no token', async () => {
    const gameState = createSaveFlowTestGameState({
      currentLocation: 'memory-forest'
    });
    mockDisplayPreset('saveFlow');

    const showSaveSlotsSpy = jest.spyOn(saveUi, 'showSaveSlots').mockImplementation(() => undefined);

    const result = await saveGameFlow(gameState);

    expect(result).toBe(false);
    expect(showSaveSlotsSpy).not.toHaveBeenCalled();
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(1);
  });

  it('should write auto save in town without token prompt', async () => {
    const gameState = createSaveFlowTestGameState({
      currentLocation: 'bit-town'
    });
    mockDisplayPreset('saveFlow');

    jest.spyOn(saveUi, 'showSaveSlots').mockImplementation(() => undefined);
    jest.spyOn(saveUi, 'selectSaveSlot').mockResolvedValue(1);
    jest.spyOn(saveUi, 'showSaveSuccess').mockImplementation(() => undefined);

    jest.spyOn(saveSystem, 'listSaves').mockReturnValue(createEmptySaveSlots());
    jest.spyOn(saveSystem, 'getSaveMetadata').mockReturnValue(createSaveSlotMetadata(1));
    const saveGameSpy = jest.spyOn(saveSystem, 'saveGame').mockReturnValue(
      createSuccessfulSaveResult(1)
    );

    const result = await saveGameFlow(gameState);

    expect(result).toBe(true);
    expect(saveGameSpy).toHaveBeenCalledWith(gameState, 1, SaveType.Auto);
    expect(saveUi.showSaveSuccess).toHaveBeenCalledWith(1, SaveType.Auto);
  });

  it('should consume save token for emergency save', async () => {
    const gameState = createSaveFlowTestGameState(
      {
        currentLocation: 'memory-forest'
      },
      ['save-token']
    );
    mockDisplayPreset('saveFlow');

    jest.spyOn(saveUi, 'showSaveSlots').mockImplementation(() => undefined);
    jest.spyOn(saveUi, 'selectSaveSlot').mockResolvedValue(2);
    jest.spyOn(saveUi, 'showSaveSuccess').mockImplementation(() => undefined);

    jest.spyOn(saveSystem, 'listSaves').mockReturnValue(createEmptySaveSlots());
    jest.spyOn(saveSystem, 'getSaveMetadata').mockReturnValue(createSaveSlotMetadata(2));
    const saveGameSpy = jest.spyOn(saveSystem, 'saveGame').mockReturnValue(
      createSuccessfulSaveResult(2)
    );
    mockPromptSequence([{ confirm: true }]);

    const result = await saveGameFlow(gameState);

    expect(result).toBe(true);
    expect(saveGameSpy).toHaveBeenCalledWith(gameState, 2, SaveType.Emergency);
    expect(gameState.player.inventory).toEqual([]);
  });
});
