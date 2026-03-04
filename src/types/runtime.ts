import { GameState } from './game.js';

export type MainMenuChoice = 'new-game' | 'load-game' | 'settings' | 'exit';
export type EncounterResult = 'victory' | 'defeat' | 'escape';

export interface TravelResult {
  locationChanged: boolean;
}

export type ShopMenuHandler = (gameState: GameState) => Promise<void>;
export type SaveGameHandler = (gameState: GameState) => Promise<boolean>;
export type TravelHandler = (gameState: GameState) => Promise<TravelResult>;
export type InGameMenuHandler = (gameState: GameState) => Promise<boolean>;
export type RunEncounterHandler = (gameState: GameState) => Promise<EncounterResult>;
export type HandlePlayerDeathHandler = (gameState: GameState) => Promise<boolean>;

export interface InGameMenuDependencies {
  saveGame: SaveGameHandler;
}

export interface TownLoopDependencies {
  shopMenu: ShopMenuHandler;
  saveGame: SaveGameHandler;
  handleTravel: TravelHandler;
  inGameMenuLoop: InGameMenuHandler;
  random?: () => number;
}

export interface DungeonLoopDependencies {
  runEncounter: RunEncounterHandler;
  handlePlayerDeath: HandlePlayerDeathHandler;
  handleTravel: TravelHandler;
  inGameMenuLoop: InGameMenuHandler;
  random?: () => number;
}

export type TownLoopHandler = (
  gameState: GameState,
  dependencies: TownLoopDependencies
) => Promise<boolean>;
export type DungeonLoopHandler = (
  gameState: GameState,
  dependencies: DungeonLoopDependencies
) => Promise<boolean>;
export type InGameMenuLoopHandler = (
  gameState: GameState,
  dependencies: InGameMenuDependencies
) => Promise<boolean>;

export interface GameRuntimeDependencies {
  townLoop: TownLoopHandler;
  dungeonLoop: DungeonLoopHandler;
  shopMenu: ShopMenuHandler;
  saveGame: SaveGameHandler;
  runEncounter: RunEncounterHandler;
  handlePlayerDeath: HandlePlayerDeathHandler;
  handleTravel: TravelHandler;
  inGameMenuLoop: InGameMenuLoopHandler;
}

export type ShowMainMenuHandler = () => Promise<MainMenuChoice>;
export type StartNewGameHandler = () => Promise<GameState>;
export type LoadGameHandler = () => Promise<GameState | null>;
export type GameLoopHandler = (gameState: GameState) => Promise<void>;
export type OpenSettingsHandler = () => Promise<void>;

export interface MainMenuRuntimeDependencies {
  showMainMenu: ShowMainMenuHandler;
  startNewGame: StartNewGameHandler;
  loadGame: LoadGameHandler;
  gameLoop: GameLoopHandler;
  openSettings: OpenSettingsHandler;
}
