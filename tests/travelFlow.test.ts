import './helpers/moduleMocks';
import { handleTravel } from '../src/systems/travelFlow';
import * as display from '../src/ui/display';
import * as travelUi from '../src/ui/travel';
import * as locations from '../src/data/locations';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayPreset } from './helpers/uiMocks';

function mockTravelUi(): void {
  mockDisplayPreset('travelFlow');
  jest.spyOn(travelUi, 'showTravelAnimation').mockResolvedValue(undefined);
  jest.spyOn(travelUi, 'showLocationArrival').mockImplementation(() => undefined);
}

describe('Travel Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when player cancels travel', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'TravelTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockTravelUi();

    jest.spyOn(travelUi, 'showTravelMenu').mockResolvedValue({
      traveled: false,
      destination: null
    });

    const result = await handleTravel(gameState);

    expect(result.locationChanged).toBe(false);
    expect(gameState.player.currentLocation).toBe('bit-town');
  });

  it('should block travel to locked destination', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'TravelTester',
        level: 3,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town']
      }
    });
    mockTravelUi();

    jest.spyOn(travelUi, 'showTravelMenu').mockResolvedValue({
      traveled: true,
      destination: 'cache-cave'
    });
    jest.spyOn(locations, 'isLocationUnlocked').mockReturnValue(false);

    const result = await handleTravel(gameState);

    expect(result.locationChanged).toBe(false);
    expect(gameState.player.currentLocation).toBe('bit-town');
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(1);
  });

  it('should update location and unlock destination on successful travel', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'TravelTester',
        level: 3,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town']
      }
    });
    mockTravelUi();

    jest.spyOn(travelUi, 'showTravelMenu').mockResolvedValue({
      traveled: true,
      destination: 'memory-forest'
    });
    jest.spyOn(locations, 'isLocationUnlocked').mockReturnValue(true);

    const result = await handleTravel(gameState);

    expect(result.locationChanged).toBe(true);
    expect(gameState.player.currentLocation).toBe('memory-forest');
    expect(gameState.position.locationId).toBe('memory-forest');
    expect(gameState.position.stepsTaken).toBe(0);
    expect(gameState.player.unlockedLocations).toContain('memory-forest');
    expect(gameState.statistics.locationsDiscovered).toBe(2);
  });
});
