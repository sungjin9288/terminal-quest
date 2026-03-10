import {
  GameState
} from '../types/index.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  showLoading,
  showBox,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showGameModeSelect,
  showCharacterCreation
} from '../ui/menu.js';
import { getHubTown } from '../data/locations.js';
import { getGameModeName } from './death.js';
import { createNewGameState } from './newGameState.js';
export { createNewGameState, createPlayer } from './newGameState.js';

export async function startNewGameFlow(): Promise<GameState> {
  clearScreen();
  await showTitle();

  const gameMode = await showGameModeSelect();
  showMessage(`${getGameModeName(gameMode)} 선택됨`, 'success');
  await showLoading('게임 초기화 중', 1000);

  clearScreen();
  await showTitle();

  const characterData = await showCharacterCreation();
  showMessage(`환영합니다, ${characterData.class} ${characterData.name}!`, 'success');
  await showLoading('캐릭터 생성 중', 1500);

  const gameState = createNewGameState(characterData.name, characterData.class, gameMode);
  const player = gameState.player;

  clearScreen();
  await showTitle();

  const hub = getHubTown();
  showBox(
    `당신은 ${hub.name}에서 눈을 떴습니다.\n` +
    `평화로운 마을에 햇살이 내리쬐고, 주민들이 분주히 움직입니다.\n` +
    `하지만 어둠의 소문이 퍼지고 있습니다...\n` +
    `주변 숲에서 몬스터들이 나타나기 시작했다고 합니다.\n\n` +
    `당신의 모험이 시작됩니다, ${player.name}!`,
    '프롤로그'
  );

  await pressEnterToContinue('important');

  return gameState;
}
