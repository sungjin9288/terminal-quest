import {
  getStartingSkills,
  getAvailableSkills,
  getClassSkills,
  getLearnableSkills,
  learnSkill,
  useSkill
} from '../src/systems/skills';
import { createMonsterInstance } from '../src/systems/combat';
import { getSampleMonsters } from '../src/data/monsters';
import { CharacterClass } from '../src/types/character';
import { createTestPlayer as createPlayerFixture } from './helpers/gameStateFactory';

function createTestPlayer(characterClass: CharacterClass) {
  const player = createPlayerFixture({
    name: 'SkillTester',
    characterClass,
    level: 10,
    gold: 100,
    currentLocation: 'bit-town',
    unlockedLocations: ['bit-town'],
    skills: getStartingSkills(characterClass)
  });
  player.stats.mp = 100;
  player.stats.maxMp = 100;
  player.stats.attack = 25;
  player.stats.magicPower = 30;
  player.stats.defense = 10;
  player.stats.magicDefense = 10;
  player.stats.speed = 10;
  player.baseStats = { ...player.stats };
  return player;
}

describe('Skill System', () => {
  it('should provide class-specific starting skill', () => {
    expect(getStartingSkills(CharacterClass.Warrior)).toContain('power-strike');
    expect(getStartingSkills(CharacterClass.Mage)).toContain('arcane-bolt');
    expect(getStartingSkills(CharacterClass.Cleric)).toContain('minor-heal');
  });

  it('should return available skills learned by player', () => {
    const player = createTestPlayer(CharacterClass.Ranger);
    const skills = getAvailableSkills(player);

    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0].id).toBe('precision-shot');
  });

  it('should consume MP and deal damage when using attack skill', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      const player = createTestPlayer(CharacterClass.Warrior);
      const monsters = getSampleMonsters();
      const target = createMonsterInstance(monsters.slime);
      const initialMp = player.stats.mp;
      const initialHp = target.currentHp;

      const result = useSkill(player, target, 'power-strike');

      expect(result.success).toBe(true);
      expect(player.stats.mp).toBeLessThan(initialMp);
      expect(target.currentHp).toBeLessThan(initialHp);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('should restore HP when using heal skill', () => {
    const player = createTestPlayer(CharacterClass.Cleric);
    const monsters = getSampleMonsters();
    const target = createMonsterInstance(monsters.slime);
    player.stats.hp = 25;

    const result = useSkill(player, target, 'minor-heal');

    expect(result.success).toBe(true);
    expect(player.stats.hp).toBeGreaterThan(25);
  });

  it('should fail when MP is insufficient', () => {
    const player = createTestPlayer(CharacterClass.Mage);
    const monsters = getSampleMonsters();
    const target = createMonsterInstance(monsters.slime);
    player.stats.mp = 0;

    const result = useSkill(player, target, 'arcane-bolt');

    expect(result.success).toBe(false);
  });

  it('should return class-specific skill catalog', () => {
    const warriorSkills = getClassSkills(CharacterClass.Warrior).map(skill => skill.id);

    expect(warriorSkills).toContain('power-strike');
    expect(warriorSkills).toContain('shield-breaker');
    expect(warriorSkills).not.toContain('arcane-bolt');
  });

  it('should return currently learnable skills', () => {
    const player = createTestPlayer(CharacterClass.Warrior);
    player.level = 4;
    player.skillPoints = 1;

    const learnable = getLearnableSkills(player).map(skill => skill.id);

    expect(learnable).toContain('shield-breaker');
    expect(learnable).not.toContain('power-strike');
  });

  it('should learn skill and consume skill points', () => {
    const player = createTestPlayer(CharacterClass.Warrior);
    player.level = 4;
    player.skillPoints = 2;

    const result = learnSkill(player, 'shield-breaker');

    expect(result.success).toBe(true);
    expect(player.skillPoints).toBe(1);
    expect(player.skills).toContain('shield-breaker');
  });

  it('should fail to learn skill when skill points are insufficient', () => {
    const player = createTestPlayer(CharacterClass.Warrior);
    player.level = 4;
    player.skillPoints = 0;

    const result = learnSkill(player, 'shield-breaker');

    expect(result.success).toBe(false);
    expect(player.skills).not.toContain('shield-breaker');
  });

  it('should fail to learn skill from another class', () => {
    const player = createTestPlayer(CharacterClass.Warrior);
    player.level = 10;
    player.skillPoints = 3;

    const result = learnSkill(player, 'arcane-bolt');

    expect(result.success).toBe(false);
    expect(player.skillPoints).toBe(3);
    expect(player.skills).not.toContain('arcane-bolt');
  });
});
