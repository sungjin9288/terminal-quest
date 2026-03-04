import {
  countQuestHistoryEntriesByQuest,
  countQuestHistoryEntriesByType,
  filterQuestHistoryEntriesByQuest,
  filterQuestHistoryEntries,
  getQuestHistoryFilterLabel,
  getQuestHistoryTypeLabel,
  getQuestHistoryTypes
} from '../src/systems/questHistory';
import { QuestHistoryEntry } from '../src/types/game';

function createHistoryEntries(): QuestHistoryEntry[] {
  return [
    { timestamp: 1000, type: 'progress', message: 'A', questId: 'slime-cleanup' },
    { timestamp: 900, type: 'accepted', message: 'B', questId: 'slime-cleanup' },
    { timestamp: 800, type: 'reward', message: 'C', questId: 'forest-survey' },
    { timestamp: 700, type: 'progress', message: 'D', questId: 'forest-survey' },
    { timestamp: 600, type: 'system', message: 'E' }
  ];
}

describe('Quest History Helpers', () => {
  it('should expose all quest history types in a stable order', () => {
    expect(getQuestHistoryTypes()).toEqual([
      'accepted',
      'progress',
      'ready',
      'completed',
      'reward',
      'system'
    ]);
  });

  it('should filter entries by selected type', () => {
    const entries = createHistoryEntries();

    const filtered = filterQuestHistoryEntries(entries, 'progress');

    expect(filtered).toHaveLength(2);
    expect(filtered.every(entry => entry.type === 'progress')).toBe(true);
  });

  it('should count entries by each type including zero counts', () => {
    const entries = createHistoryEntries();

    const counts = countQuestHistoryEntriesByType(entries);

    expect(counts).toEqual({
      accepted: 1,
      progress: 2,
      ready: 0,
      completed: 0,
      reward: 1,
      system: 1
    });
  });

  it('should filter entries by quest ID and no-quest scope', () => {
    const entries = createHistoryEntries();

    const byQuest = filterQuestHistoryEntriesByQuest(entries, { questId: 'forest-survey' });
    const noQuest = filterQuestHistoryEntriesByQuest(entries, { withoutQuestIdOnly: true });

    expect(byQuest).toHaveLength(2);
    expect(byQuest.every(entry => entry.questId === 'forest-survey')).toBe(true);
    expect(noQuest).toHaveLength(1);
    expect(noQuest[0]?.type).toBe('system');
  });

  it('should count entries by quest scope', () => {
    const entries = createHistoryEntries();

    const counts = countQuestHistoryEntriesByQuest(entries);

    expect(counts).toEqual({
      byQuestId: {
        'slime-cleanup': 2,
        'forest-survey': 2
      },
      withoutQuestId: 1
    });
  });

  it('should return localized labels for type and filter', () => {
    expect(getQuestHistoryTypeLabel('completed')).toBe('완료');
    expect(getQuestHistoryFilterLabel('all')).toBe('전체');
    expect(getQuestHistoryFilterLabel('accepted')).toBe('수락');
  });
});
