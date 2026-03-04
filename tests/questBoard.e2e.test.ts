import './helpers/moduleMocks';
import { questBoardLoop } from '../src/game';
import { ensureQuestState, acceptQuest, updateQuestProgressOnKill } from '../src/systems/quest';
import {
  QuestHistoryEntry
} from '../src/types/game';
import * as display from '../src/ui/display';
import * as menu from '../src/ui/menu';
import { createQuestTestGameState } from './helpers/questFixtureFactory';
import { mockDisplayPreset, mockPromptSequence } from './helpers/uiMocks';

describe('Quest Board E2E', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should accept a selected quest through board input flow', async () => {
    const gameState = createQuestTestGameState({
      playerOptions: {
        name: 'QuestBoardTester',
        level: 2
      }
    });
    ensureQuestState(gameState);
    mockDisplayPreset('questBoard');

    jest.spyOn(menu, 'confirmAction').mockResolvedValue(true);
    mockPromptSequence([
      { action: 'accept' },
      { questId: 'slime-cleanup' },
      { action: 'back' }
    ]);

    await questBoardLoop(gameState);

    expect(gameState.player.activeQuests).toContain('slime-cleanup');
    expect(
      gameState.questHistory.some(
        entry => entry.type === 'accepted' && entry.questId === 'slime-cleanup'
      )
    ).toBe(true);
  });

  it('should complete a ready quest through board input flow', async () => {
    const gameState = createQuestTestGameState({
      playerOptions: {
        name: 'QuestBoardTester',
        level: 2
      }
    });
    ensureQuestState(gameState);
    acceptQuest(gameState, 'slime-cleanup');
    updateQuestProgressOnKill(gameState, 'bug-slime', 3);
    mockDisplayPreset('questBoard');

    jest.spyOn(menu, 'confirmAction').mockResolvedValue(true);
    mockPromptSequence([
      { action: 'complete' },
      { questId: 'slime-cleanup' },
      { action: 'back' }
    ]);

    await questBoardLoop(gameState);

    expect(gameState.player.completedQuests).toContain('slime-cleanup');
    expect(
      gameState.questHistory.some(
        entry => entry.type === 'completed' && entry.questId === 'slime-cleanup'
      )
    ).toBe(true);
  });

  it('should jump from history entry to the source quest detail', async () => {
    const gameState = createQuestTestGameState({
      playerOptions: {
        name: 'QuestBoardTester',
        level: 2
      }
    });
    ensureQuestState(gameState);
    const now = Date.now();
    const historyEntries: QuestHistoryEntry[] = [
      {
        timestamp: now,
        type: 'accepted',
        message: '슬라임 정리 의뢰 수락',
        questId: 'slime-cleanup'
      },
      {
        timestamp: now - 60_000,
        type: 'system',
        message: '시스템 로그'
      }
    ];
    gameState.questHistory = historyEntries;
    mockDisplayPreset('questBoard');

    const showMessageSpy = jest.spyOn(display, 'showMessage').mockImplementation(() => undefined);
    mockPromptSequence([
      { action: 'history' },
      { filter: 'all' },
      { scope: 'slime-cleanup' },
      { limit: 'all' },
      { entryIndex: 1 },
      { action: 'back' }
    ]);

    await questBoardLoop(gameState);

    expect(showMessageSpy).not.toHaveBeenCalledWith(
      '선택한 로그의 원본 퀘스트를 찾을 수 없습니다.',
      'warning'
    );
  });
});
