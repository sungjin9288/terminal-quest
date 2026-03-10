import {
  getPresentationClassLabel,
  getPresentationDisplayName,
  getPresentationItemCopy,
  getPresentationLocationDescription,
  getPresentationShopGreeting,
  getPresentationSkillCopy
} from '../src/frontend/presentationText';

describe('Frontend presentation text', () => {
  it('should strip trailing English variants from display names', () => {
    expect(getPresentationDisplayName('녹슨 검 (Rusty Sword)')).toBe('녹슨 검');
  });

  it('should provide Korean class and skill labels', () => {
    expect(getPresentationClassLabel('Warrior')).toBe('워리어');

    const skill = getPresentationSkillCopy(
      'power-strike',
      'Power Strike',
      'Deliver a heavy strike with increased physical power.'
    );

    expect(skill.name).toBe('파워 스트라이크');
    expect(skill.description).toContain('일격');
  });

  it('should load localized item names and Korean presentation descriptions', () => {
    const sword = getPresentationItemCopy({
      itemId: 'rusty-sword',
      rawName: 'Rusty Sword',
      itemType: 'weapon',
      rarity: 'common',
      level: 1
    });

    expect(sword.name).toBe('녹슨 검');
    expect(sword.description).toContain('전투 장비');

    const potion = getPresentationItemCopy({
      itemId: 'health-potion',
      rawName: 'Health Potion',
      itemType: 'consumable'
    });

    expect(potion.description).toContain('회복약');
  });

  it('should provide localized location and shop copy', () => {
    expect(getPresentationLocationDescription('bit-town', 'fallback')).toContain('안전 허브');
    expect(getPresentationShopGreeting('binary-weapons', 'fallback')).toContain('무기');
  });
});
