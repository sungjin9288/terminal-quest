import { getDefaultQuests } from '../src/data/quests';
import {
  getQuestEstimatedTimeLabel,
  getQuestSessionLabel,
  groupQuestsByCategory,
  summarizeQuestCategories
} from '../src/systems/questPresentation';
import { QuestCategory } from '../src/types/game';

describe('Quest presentation', () => {
  it('should inject narrative metadata into default quests', () => {
    const quests = getDefaultQuests();

    expect(quests['registry-briefing'].narrative).toMatchObject({
      category: QuestCategory.MainStory,
      arcId: 'registry-crisis'
    });
    expect(quests['merchant-network'].narrative).toMatchObject({
      category: QuestCategory.CharacterStory,
      arcId: 'town-support-line'
    });
    expect(quests['spring-memory-festival-sweep'].narrative).toMatchObject({
      category: QuestCategory.Seasonal,
      arcId: 'seasonal-ops'
    });
  });

  it('should group quests in board order by category', () => {
    const quests = getDefaultQuests();
    const grouped = groupQuestsByCategory([
      quests['plains-recon'],
      quests['merchant-network'],
      quests['registry-briefing'],
      quests['spring-memory-festival-sweep']
    ]);

    expect(grouped.map(group => group.category)).toEqual([
      QuestCategory.MainStory,
      QuestCategory.CharacterStory,
      QuestCategory.Contract,
      QuestCategory.Seasonal
    ]);
    expect(summarizeQuestCategories([
      quests['registry-briefing'],
      quests['merchant-network'],
      quests['plains-recon'],
      quests['spring-memory-festival-sweep']
    ])).toBe('◆ 메인 1 | ◎ 인물 1 | • 계약 1 | ☼ 시즌 1');
  });

  it('should expose session guidance for quest details', () => {
    const quests = getDefaultQuests();

    expect(getQuestEstimatedTimeLabel(quests['registry-briefing'])).toMatch(/^약 \d+(?:-\d+)?분$/);
    expect(getQuestSessionLabel(quests['final-purge'])).toBe('집중 세션');
  });

  it('should attach direct npc dialogue to curated quest narratives', () => {
    const quests = getDefaultQuests();

    expect(quests['registry-briefing'].narrative?.npcLine).toBe(
      '현장 계약은 끝났습니다. 지금부터는 정식 작전으로 움직입니다.'
    );
    expect(quests['merchant-network'].narrative?.npcLine).toContain('돌아올 길');
    expect(quests['final-purge'].narrative?.npcLine).toContain('코어');
  });
});
