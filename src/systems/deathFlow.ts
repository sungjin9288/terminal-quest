import { GameState } from '../types/game.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showDeathScreen,
  showGameOver
} from '../ui/death.js';
import {
  handleDeath,
  respawnPlayer
} from './death.js';
import { getLocationDisplayName } from '../data/locations.js';
import { trackTelemetryEvent } from './telemetry.js';

export async function handlePlayerDeathFlow(gameState: GameState): Promise<boolean> {
  const deathResult = handleDeath(
    gameState.player,
    gameState.gameMode,
    gameState.player.currentLocation
  );

  clearScreen();
  await showTitle();

  const deathScreen = showDeathScreen(gameState.player, deathResult);
  console.log(deathScreen);

  await pressEnterToContinue('critical');

  if (deathResult.isGameOver) {
    trackTelemetryEvent('player_death', gameState, {
      isGameOver: true,
      goldLost: deathResult.penalty.goldLost,
      expLost: deathResult.penalty.expLost
    });

    clearScreen();
    const gameOverScreen = showGameOver(gameState.player, deathResult.penalty.soulEssence);
    console.log(gameOverScreen);
    await pressEnterToContinue('critical');
    return false;
  }

  gameState.player = respawnPlayer(
    gameState.player,
    deathResult.respawnLocation || 'bit-town',
    deathResult.penalty
  );

  gameState.statistics.deaths++;
  trackTelemetryEvent('player_death', gameState, {
    isGameOver: false,
    goldLost: deathResult.penalty.goldLost,
    expLost: deathResult.penalty.expLost
  });

  showMessage(`${getLocationDisplayName(gameState.player.currentLocation)}에서 부활했습니다.`, 'info');
  await pressEnterToContinue('critical');

  return true;
}
