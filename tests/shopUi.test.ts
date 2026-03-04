import './helpers/moduleMocks';
import { shopMenu } from '../src/systems/shopUi';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayPreset, mockPromptSequence } from './helpers/uiMocks';

describe('Shop UI', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return immediately when exit is selected', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'ShopUiTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });

    mockDisplayPreset('shopMenu');
    const promptMock = mockPromptSequence([{ choice: 'exit' }]);

    await shopMenu(gameState);

    expect(promptMock).toHaveBeenCalledTimes(1);
  });
});
