import { loadGame as loadFromFile } from '../src/systems/save';
import { migrateLoadedGameState } from '../src/systems/gameStateMigration';
import { QuestStatus } from '../src/types/game';
import { setupIsolatedSaveSlot } from './helpers/saveSlotSandbox';
import {
  LEGACY_SAVE_DIR,
  LEGACY_SAVE_SLOT_NUMBER,
  LEGACY_SLOT_FILE_PATH,
  writeLegacyFixtureToSlot,
  writeLegacyMalformedQuestHistorySaveToSlot
} from './helpers/legacySaveFixtureFactory';

describe('Save Migration E2E', () => {
  setupIsolatedSaveSlot({
    saveDir: LEGACY_SAVE_DIR,
    slotFilePath: LEGACY_SLOT_FILE_PATH
  });

  it('should migrate legacy save state from fixture on load', () => {
    writeLegacyFixtureToSlot(LEGACY_SLOT_FILE_PATH);

    const loaded = loadFromFile(LEGACY_SAVE_SLOT_NUMBER);
    expect(loaded.success).toBe(true);
    expect(loaded.gameState).toBeDefined();

    const gameState = loaded.gameState!;
    migrateLoadedGameState(gameState);

    expect(Array.isArray(gameState.questHistory)).toBe(true);
    expect(gameState.questHistory).toEqual([]);
    expect(Object.keys(gameState.quests)).toEqual(
      expect.arrayContaining([
        'slime-cleanup',
        'forest-survey',
        'board-checkin',
        'legacy-custom-quest'
      ])
    );
    expect(gameState.player.completedQuests).toContain('slime-cleanup');
    expect(gameState.player.activeQuests).toEqual(
      expect.arrayContaining(['forest-survey', 'legacy-custom-quest'])
    );
    expect(gameState.quests['slime-cleanup']?.status).toBe(QuestStatus.Completed);
    expect(gameState.quests['forest-survey']?.status).toBe(QuestStatus.Active);
    expect(gameState.quests['legacy-custom-quest']?.status).toBe(QuestStatus.Active);
    expect(gameState.statistics.endgameChallengeUnlocked).toBe(false);
    expect(gameState.statistics.endgameChallengeClears).toBe(0);
    expect(gameState.statistics.endgameChallengeTier).toBe(0);
    expect(gameState.statistics.endgameChallengeCurrentStreak).toBe(0);
    expect(gameState.statistics.endgameChallengeBestStreak).toBe(0);
  });

  it('should sanitize malformed legacy quest history entries during migration', () => {
    writeLegacyMalformedQuestHistorySaveToSlot(LEGACY_SLOT_FILE_PATH);

    const loaded = loadFromFile(LEGACY_SAVE_SLOT_NUMBER);
    expect(loaded.success).toBe(true);
    expect(loaded.gameState).toBeDefined();

    const gameState = loaded.gameState!;
    migrateLoadedGameState(gameState);

    expect(gameState.questHistory).toHaveLength(2);
    expect(gameState.questHistory[0]).toMatchObject({
      type: 'progress',
      message: '정상 로그',
      questId: 'forest-survey'
    });
    expect(gameState.questHistory[1]).toMatchObject({
      type: 'system',
      message: '타입 복구 로그'
    });
  });
});
