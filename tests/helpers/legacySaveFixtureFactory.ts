import fs from 'fs';
import path from 'path';
import { GameState } from '../../src/types/game';
import { createTestGameState } from './gameStateFactory';

export const LEGACY_SAVE_SLOT_NUMBER = 3;
export const LEGACY_SAVE_DIR = path.join(process.cwd(), 'saves');
export const LEGACY_SLOT_FILE_PATH = path.join(
  LEGACY_SAVE_DIR,
  `slot${LEGACY_SAVE_SLOT_NUMBER}.json`
);
export const LEGACY_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests/fixtures/legacy-save-slot3-v0.8.0.json'
);

type LegacySaveWithOptionalQuestHistory = {
  gameState: {
    questHistory?: unknown;
  };
} & Record<string, unknown>;

export function readLegacySaveFixtureRaw(): string {
  return fs.readFileSync(LEGACY_FIXTURE_PATH, 'utf-8');
}

export function writeLegacyFixtureToSlot(slotFilePath: string): void {
  fs.writeFileSync(slotFilePath, readLegacySaveFixtureRaw(), 'utf-8');
}

export function createLegacySaveWithMalformedQuestHistory(): LegacySaveWithOptionalQuestHistory {
  const legacySave = JSON.parse(readLegacySaveFixtureRaw()) as LegacySaveWithOptionalQuestHistory;

  legacySave.gameState.questHistory = [
    {
      timestamp: 1730390400000,
      type: 'progress',
      message: '정상 로그',
      questId: 'forest-survey'
    },
    {
      timestamp: 'invalid-timestamp',
      type: 'unknown-type',
      message: '  타입 복구 로그  '
    },
    {
      timestamp: 1730390400001,
      type: 'accepted',
      message: '   '
    },
    'not-an-entry'
  ];

  return legacySave;
}

export function writeLegacyMalformedQuestHistorySaveToSlot(slotFilePath: string): void {
  const legacySave = createLegacySaveWithMalformedQuestHistory();
  fs.writeFileSync(slotFilePath, JSON.stringify(legacySave, null, 2), 'utf-8');
}

export function createLegacyStateWithoutQuestHistory(): GameState {
  const gameState = createTestGameState({
    playerOptions: {
      name: 'LoadTester',
      level: 2,
      currentLocation: 'bit-town',
      gold: 120,
      unlockedLocations: ['bit-town', 'memory-forest']
    }
  });

  gameState.player.experience = 10;
  gameState.player.experienceToNextLevel = 120;
  gameState.player.stats = {
    hp: 80,
    maxHp: 100,
    mp: 20,
    maxMp: 30,
    attack: 12,
    defense: 8,
    magicPower: 6,
    magicDefense: 6,
    speed: 8,
    critChance: 10,
    critDamage: 1.5,
    evasion: 5
  };
  gameState.player.baseStats = {
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 30,
    attack: 12,
    defense: 8,
    magicPower: 6,
    magicDefense: 6,
    speed: 8,
    critChance: 10,
    critDamage: 1.5,
    evasion: 5
  };
  gameState.player.completedQuests = ['slime-cleanup'];
  gameState.player.activeQuests = ['forest-survey'];
  gameState.player.playTime = 150;
  gameState.player.enemiesDefeated = 4;
  gameState.player.deaths = 0;
  gameState.player.skillPoints = 0;
  gameState.player.skills = [];

  gameState.position = { locationId: 'bit-town', stepsTaken: 3 };
  gameState.quests = {};
  gameState.statistics = {
    totalPlayTime: 150,
    enemiesDefeated: {},
    totalDamageDealt: 120,
    totalDamageTaken: 70,
    bossesDefeated: [],
    questsCompleted: 1,
    itemsCollected: 0,
    locationsDiscovered: 2,
    goldEarned: 120,
    goldSpent: 0,
    deaths: 0,
    highestLevel: 2
  };
  gameState.questHistory = [];
  gameState.gameVersion = '0.8.0';

  return gameState;
}
