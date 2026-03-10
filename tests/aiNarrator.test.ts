import { buildAiNarrativeCue, buildAiNarrativeVoiceLine } from '../src/systems/aiNarrator';
import { recordAiMoment } from '../src/systems/aiMemory';
import { syncAiState } from '../src/systems/aiDirector';
import { initializeQuestState } from '../src/systems/quest';
import { QuestStatus } from '../src/types/game';
import { createTestGameState } from './helpers/gameStateFactory';

function attachDefaultQuests(gameState: ReturnType<typeof createTestGameState>): void {
  gameState.quests = initializeQuestState();
}

describe('AI Narrator', () => {
  it('should build a narrative cue from recent quest moments and the current intent', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    attachDefaultQuests(gameState);
    const quest = gameState.quests['forest-survey'];
    quest.status = QuestStatus.Active;
    gameState.player.activeQuests = ['forest-survey'];

    recordAiMoment(gameState, {
      type: 'new-game',
      label: '비트 타운 도착',
      timestamp: 1700000000000
    });
    recordAiMoment(gameState, {
      type: 'quest-accepted',
      label: quest.name,
      timestamp: 1700000001000
    });

    syncAiState(gameState, 1700000002000);
    const cue = buildAiNarrativeCue(gameState, 1700000002000);

    expect(cue?.title).toBe('장면 고정');
    expect(cue?.speaker).toBe('동행 기록관');
    expect(cue?.summary).toContain(quest.name);
    expect(cue?.beats).toEqual([quest.name, '비트 타운 도착']);
  });

  it('should generate a recovery-flavored companion line after a defeat moment', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 4,
        currentLocation: 'bit-town'
      }
    });

    const line = buildAiNarrativeVoiceLine(gameState, {
      type: 'defeat',
      label: '비트 타운 후퇴'
    }, 1700000003000);

    expect(line?.speaker).toBe('복구 브리퍼');
    expect(line?.text).toContain('비트 타운 후퇴');
    expect(line?.text).toContain('분기점');
  });
});
