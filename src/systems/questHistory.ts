import {
  QuestHistoryEntry,
  QuestHistoryType
} from '../types/game.js';

export type QuestHistoryFilter = 'all' | QuestHistoryType;

const QUEST_HISTORY_TYPES: QuestHistoryType[] = [
  'accepted',
  'progress',
  'ready',
  'completed',
  'reward',
  'system'
];

export function getQuestHistoryTypeLabel(type: QuestHistoryType): string {
  switch (type) {
    case 'accepted':
      return '수락';
    case 'progress':
      return '진행';
    case 'ready':
      return '완료가능';
    case 'completed':
      return '완료';
    case 'reward':
      return '보상';
    case 'system':
      return '시스템';
    default: {
      const exhaustivenessCheck: never = type;
      return exhaustivenessCheck;
    }
  }
}

export function getQuestHistoryFilterLabel(filter: QuestHistoryFilter): string {
  if (filter === 'all') {
    return '전체';
  }

  return getQuestHistoryTypeLabel(filter);
}

export function filterQuestHistoryEntries(
  entries: QuestHistoryEntry[],
  filter: QuestHistoryFilter
): QuestHistoryEntry[] {
  if (filter === 'all') {
    return entries;
  }

  return entries.filter(entry => entry.type === filter);
}

export interface QuestHistoryScope {
  questId?: string;
  withoutQuestIdOnly?: boolean;
}

export function filterQuestHistoryEntriesByQuest(
  entries: QuestHistoryEntry[],
  scope: QuestHistoryScope = {}
): QuestHistoryEntry[] {
  if (scope.withoutQuestIdOnly) {
    return entries.filter(entry => !entry.questId);
  }

  if (scope.questId) {
    return entries.filter(entry => entry.questId === scope.questId);
  }

  return entries;
}

export function countQuestHistoryEntriesByType(
  entries: QuestHistoryEntry[]
): Record<QuestHistoryType, number> {
  const counts: Record<QuestHistoryType, number> = {
    accepted: 0,
    progress: 0,
    ready: 0,
    completed: 0,
    reward: 0,
    system: 0
  };

  for (const entry of entries) {
    counts[entry.type] += 1;
  }

  return counts;
}

export interface QuestHistoryQuestCounts {
  byQuestId: Record<string, number>;
  withoutQuestId: number;
}

export function countQuestHistoryEntriesByQuest(
  entries: QuestHistoryEntry[]
): QuestHistoryQuestCounts {
  const byQuestId: Record<string, number> = {};
  let withoutQuestId = 0;

  for (const entry of entries) {
    if (entry.questId) {
      byQuestId[entry.questId] = (byQuestId[entry.questId] ?? 0) + 1;
    } else {
      withoutQuestId += 1;
    }
  }

  return {
    byQuestId,
    withoutQuestId
  };
}

export function getQuestHistoryTypes(): QuestHistoryType[] {
  return [...QUEST_HISTORY_TYPES];
}
