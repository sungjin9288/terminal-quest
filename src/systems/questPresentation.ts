import {
  Quest,
  QuestCategory,
  QuestFatigueClass
} from '../types/index.js';
import { estimateQuestPlaytimeRange } from './playtimeBalance.js';

export interface QuestCategoryPresentation {
  category: QuestCategory;
  icon: string;
  label: string;
  shortLabel: string;
}

export interface QuestCategoryGroup extends QuestCategoryPresentation {
  quests: Quest[];
}

const CATEGORY_ORDER: QuestCategory[] = [
  QuestCategory.MainStory,
  QuestCategory.CharacterStory,
  QuestCategory.Contract,
  QuestCategory.Seasonal
];

const CATEGORY_PRESENTATION: Record<QuestCategory, QuestCategoryPresentation> = {
  [QuestCategory.MainStory]: {
    category: QuestCategory.MainStory,
    icon: '◆',
    label: '메인 스토리',
    shortLabel: '메인'
  },
  [QuestCategory.CharacterStory]: {
    category: QuestCategory.CharacterStory,
    icon: '◎',
    label: '인물 서브스토리',
    shortLabel: '인물'
  },
  [QuestCategory.Contract]: {
    category: QuestCategory.Contract,
    icon: '•',
    label: '현장 계약',
    shortLabel: '계약'
  },
  [QuestCategory.Seasonal]: {
    category: QuestCategory.Seasonal,
    icon: '☼',
    label: '시즌 이벤트',
    shortLabel: '시즌'
  }
};

const FATIGUE_LABELS: Record<QuestFatigueClass, string> = {
  [QuestFatigueClass.Short]: '짧은 세션',
  [QuestFatigueClass.Medium]: '표준 세션',
  [QuestFatigueClass.Long]: '집중 세션'
};

export function getQuestCategory(quest: Quest): QuestCategory {
  return quest.narrative?.category ?? (
    quest.repeatable || quest.seasonalEventId
      ? QuestCategory.Seasonal
      : quest.isMainQuest
        ? QuestCategory.MainStory
        : QuestCategory.Contract
  );
}

export function getQuestCategoryPresentation(questOrCategory: Quest | QuestCategory): QuestCategoryPresentation {
  const category = typeof questOrCategory === 'string'
    ? questOrCategory
    : getQuestCategory(questOrCategory);
  return CATEGORY_PRESENTATION[category];
}

export function getQuestSessionLabel(quest: Quest): string {
  const fatigueClass = quest.narrative?.fatigueClass ?? QuestFatigueClass.Medium;
  return FATIGUE_LABELS[fatigueClass];
}

export function formatMinutesLabel(min: number, max: number): string {
  const roundedMin = Math.max(1, Math.round(min));
  const roundedMax = Math.max(roundedMin, Math.round(max));
  return roundedMin === roundedMax
    ? `${roundedMin}분`
    : `${roundedMin}-${roundedMax}분`;
}

export function getQuestEstimatedTimeLabel(quest: Quest): string {
  const range = estimateQuestPlaytimeRange(quest);
  return `약 ${formatMinutesLabel(range.min, range.max)}`;
}

export function groupQuestsByCategory(quests: Quest[]): QuestCategoryGroup[] {
  const grouped = new Map<QuestCategory, Quest[]>();

  for (const quest of quests) {
    const category = getQuestCategory(quest);
    const existing = grouped.get(category);
    if (existing) {
      existing.push(quest);
    } else {
      grouped.set(category, [quest]);
    }
  }

  return CATEGORY_ORDER
    .filter(category => (grouped.get(category)?.length ?? 0) > 0)
    .map(category => ({
      ...CATEGORY_PRESENTATION[category],
      quests: grouped.get(category) ?? []
    }));
}

export function summarizeQuestCategories(quests: Quest[]): string {
  const groups = groupQuestsByCategory(quests);
  if (groups.length === 0) {
    return '없음';
  }

  return groups
    .map(group => `${group.icon} ${group.shortLabel} ${group.quests.length}`)
    .join(' | ');
}
