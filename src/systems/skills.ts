/**
 * Skill system for Terminal Quest
 */

import {
  Player,
  Skill,
  CharacterClass,
  MonsterInstance
} from '../types/index.js';
import { CombatActionResult, calculateDamage, checkCritical, checkMiss } from './combat.js';

type SkillMap = Record<string, Skill>;

const SKILL_DATA: SkillMap = {
  'power-strike': {
    id: 'power-strike',
    name: 'Power Strike',
    description: 'Deliver a heavy strike with increased physical power.',
    manaCost: 8,
    power: 1.5,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 1,
    requiredClass: CharacterClass.Warrior,
    skillPointCost: 0
  },
  'shield-breaker': {
    id: 'shield-breaker',
    name: 'Shield Breaker',
    description: 'Crush enemy guard with a brutal armor-piercing strike.',
    manaCost: 12,
    power: 1.85,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 4,
    requiredClass: CharacterClass.Warrior,
    skillPointCost: 1
  },
  'arcane-bolt': {
    id: 'arcane-bolt',
    name: 'Arcane Bolt',
    description: 'Fire a concentrated arcane projectile.',
    manaCost: 10,
    power: 1.6,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 1,
    requiredClass: CharacterClass.Mage,
    skillPointCost: 0
  },
  'chain-lightning': {
    id: 'chain-lightning',
    name: 'Chain Lightning',
    description: 'Release unstable lightning with amplified magical impact.',
    manaCost: 16,
    power: 2.0,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 5,
    requiredClass: CharacterClass.Mage,
    skillPointCost: 1
  },
  'shadow-stab': {
    id: 'shadow-stab',
    name: 'Shadow Stab',
    description: 'A fast strike with high critical potential.',
    manaCost: 7,
    power: 1.35,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 1,
    requiredClass: CharacterClass.Rogue,
    skillPointCost: 0
  },
  'execution-slash': {
    id: 'execution-slash',
    name: 'Execution Slash',
    description: 'A lethal ambush strike tuned for finishing blows.',
    manaCost: 11,
    power: 1.9,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 5,
    requiredClass: CharacterClass.Rogue,
    skillPointCost: 1
  },
  'minor-heal': {
    id: 'minor-heal',
    name: 'Minor Heal',
    description: 'Restore HP using divine energy.',
    manaCost: 9,
    power: 55,
    type: 'heal',
    target: 'self',
    requiredLevel: 1,
    requiredClass: CharacterClass.Cleric,
    skillPointCost: 0
  },
  'holy-light': {
    id: 'holy-light',
    name: 'Holy Light',
    description: 'Restore a large amount of HP through sacred power.',
    manaCost: 14,
    power: 95,
    type: 'heal',
    target: 'self',
    requiredLevel: 5,
    requiredClass: CharacterClass.Cleric,
    skillPointCost: 1
  },
  'precision-shot': {
    id: 'precision-shot',
    name: 'Precision Shot',
    description: 'A focused shot aimed at weak points.',
    manaCost: 8,
    power: 1.45,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 1,
    requiredClass: CharacterClass.Ranger,
    skillPointCost: 0
  },
  'piercing-arrow': {
    id: 'piercing-arrow',
    name: 'Piercing Arrow',
    description: 'Launch an arrow that tears through hardened defenses.',
    manaCost: 12,
    power: 1.8,
    type: 'attack',
    target: 'enemy',
    requiredLevel: 4,
    requiredClass: CharacterClass.Ranger,
    skillPointCost: 1
  }
};

export interface SkillLearnResult {
  success: boolean;
  message: string;
  skill?: Skill;
}

/**
 * Get full skill database
 */
export function getSkillDatabase(): SkillMap {
  return SKILL_DATA;
}

/**
 * Get skill by ID
 */
export function getSkillById(skillId: string): Skill | null {
  return SKILL_DATA[skillId] ?? null;
}

/**
 * Get skill point cost for a skill
 */
export function getSkillPointCost(skill: Skill): number {
  return skill.skillPointCost ?? 1;
}

/**
 * Get all skills for a class
 */
export function getClassSkills(characterClass: CharacterClass): Skill[] {
  return Object.values(SKILL_DATA).filter(skill =>
    !skill.requiredClass || skill.requiredClass === characterClass
  );
}

/**
 * Get starting skill IDs for class
 */
export function getStartingSkills(characterClass: CharacterClass): string[] {
  const classSkillMap: Record<CharacterClass, string> = {
    [CharacterClass.Warrior]: 'power-strike',
    [CharacterClass.Mage]: 'arcane-bolt',
    [CharacterClass.Rogue]: 'shadow-stab',
    [CharacterClass.Cleric]: 'minor-heal',
    [CharacterClass.Ranger]: 'precision-shot'
  };

  return [classSkillMap[characterClass]];
}

/**
 * Get skills currently usable by player
 */
export function getAvailableSkills(player: Player): Skill[] {
  return player.skills
    .map(skillId => getSkillById(skillId))
    .filter((skill): skill is Skill => {
      if (!skill) return false;
      if (player.level < skill.requiredLevel) return false;
      if (skill.requiredClass && player.class !== skill.requiredClass) return false;
      return true;
    });
}

/**
 * Get skills that the player can learn now
 */
export function getLearnableSkills(player: Player): Skill[] {
  return getClassSkills(player.class).filter(skill => {
    if (player.skills.includes(skill.id)) return false;
    if (player.level < skill.requiredLevel) return false;
    if (player.skillPoints < getSkillPointCost(skill)) return false;
    return true;
  });
}

/**
 * Learn a skill using skill points
 */
export function learnSkill(player: Player, skillId: string): SkillLearnResult {
  const skill = getSkillById(skillId);

  if (!skill) {
    return {
      success: false,
      message: 'Unknown skill.'
    };
  }

  if (skill.requiredClass && skill.requiredClass !== player.class) {
    return {
      success: false,
      message: `${skill.name} is not available for your class.`
    };
  }

  if (player.skills.includes(skill.id)) {
    return {
      success: false,
      message: `${skill.name} is already learned.`
    };
  }

  if (player.level < skill.requiredLevel) {
    return {
      success: false,
      message: `${skill.name} requires level ${skill.requiredLevel}.`
    };
  }

  const cost = getSkillPointCost(skill);
  if (player.skillPoints < cost) {
    return {
      success: false,
      message: `Need ${cost} skill point(s) to learn ${skill.name}.`
    };
  }

  player.skillPoints -= cost;
  player.skills.push(skill.id);

  return {
    success: true,
    message: `${skill.name} learned! (-${cost} SP)`,
    skill
  };
}

function usesMagicFormula(skill: Skill): boolean {
  return skill.requiredClass === CharacterClass.Mage || skill.requiredClass === CharacterClass.Cleric;
}

/**
 * Execute a skill during battle
 */
export function useSkill(
  player: Player,
  target: MonsterInstance,
  skillId: string
): CombatActionResult {
  const skill = getSkillById(skillId);

  if (!skill) {
    return {
      success: false,
      message: 'Unknown skill.'
    };
  }

  if (!player.skills.includes(skillId)) {
    return {
      success: false,
      message: `You have not learned ${skill.name}.`
    };
  }

  if (player.level < skill.requiredLevel) {
    return {
      success: false,
      message: `${skill.name} requires level ${skill.requiredLevel}.`
    };
  }

  if (skill.requiredClass && player.class !== skill.requiredClass) {
    return {
      success: false,
      message: `${skill.name} is not available for your class.`
    };
  }

  if (player.stats.mp < skill.manaCost) {
    return {
      success: false,
      message: `Not enough MP for ${skill.name}.`
    };
  }

  player.stats.mp -= skill.manaCost;

  if (skill.type === 'heal') {
    const healPower = Math.floor(skill.power + player.stats.magicPower * 0.7);
    const healed = Math.min(healPower, player.stats.maxHp - player.stats.hp);
    player.stats.hp += healed;

    return {
      success: true,
      healing: healed,
      message: `${player.name} casts ${skill.name} and restores ${healed} HP!`
    };
  }

  if (skill.type === 'attack') {
    if (checkMiss(target.stats.evasion)) {
      return {
        success: true,
        missed: true,
        message: `${player.name} used ${skill.name}, but it missed!`
      };
    }

    const isMagic = usesMagicFormula(skill);
    const baseAttack = isMagic ? player.stats.magicPower : player.stats.attack;
    const scaledAttack = Math.max(1, Math.floor(baseAttack * skill.power));
    const defense = isMagic ? target.stats.magicDefense : target.stats.defense;
    let damage = calculateDamage(scaledAttack, defense, isMagic);

    let critChance = player.stats.critChance;
    if (skill.id === 'shadow-stab') {
      critChance += 15;
    }

    const critical = checkCritical(critChance);
    if (critical) {
      damage = Math.floor(damage * player.stats.critDamage);
    }

    target.currentHp = Math.max(0, target.currentHp - damage);
    const defeated = target.currentHp === 0;
    if (defeated) {
      target.isDefeated = true;
    }

    return {
      success: true,
      damage,
      critical,
      targetDefeated: defeated,
      message: `${player.name} used ${skill.name} for ${damage} damage!${critical ? ' Critical hit!' : ''}`
    };
  }

  return {
    success: false,
    message: `${skill.name} is not yet supported.`
  };
}
