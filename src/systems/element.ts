/**
 * Terminal Quest - Element System
 * Handles elemental damage calculations, advantages, and effects
 */

import { Stats, StatusEffect, ActiveStatusEffect } from '../types/character.js';
import { ElementType } from '../types/item.js';
import { MonsterInstance } from '../types/monster.js';

/**
 * Element advantage multiplier
 */
export const ELEMENT_ADVANTAGE_MULTIPLIER = 1.30; // +30% damage

/**
 * Element disadvantage multiplier
 */
export const ELEMENT_DISADVANTAGE_MULTIPLIER = 0.70; // -30% damage

/**
 * Element effect configuration
 */
export interface ElementEffectConfig {
  /** Effect type */
  effectType: StatusEffect | 'crit-boost' | 'none';
  /** Chance to apply effect (0-1) */
  chance: number;
  /** Duration in turns */
  duration: number;
  /** Damage per turn (for DoT effects) as percentage of max HP */
  dotPercent?: number;
  /** Flat damage per turn (for DoT effects) */
  dotFlat?: number;
  /** Additional effect description */
  description: string;
}

/**
 * Element advantage relationships
 * Key element has advantage over value element
 */
export const ELEMENT_ADVANTAGES: Record<ElementType, ElementType | null> = {
  [ElementType.Fire]: ElementType.Ice,        // Fire → Ice
  [ElementType.Ice]: ElementType.Lightning,   // Ice → Lightning
  [ElementType.Lightning]: ElementType.Poison, // Lightning → Poison
  [ElementType.Poison]: ElementType.Dark,     // Poison → Dark
  [ElementType.Dark]: ElementType.Fire,       // Dark → Fire
  [ElementType.Light]: ElementType.Dark,      // Light → Dark (bonus)
  [ElementType.Physical]: null                // Physical has no advantage
};

/**
 * Element effect configurations
 */
export const ELEMENT_EFFECTS: Record<ElementType, ElementEffectConfig> = {
  [ElementType.Fire]: {
    effectType: StatusEffect.Burned,
    chance: 0.35,
    duration: 3,
    dotPercent: 0.05, // 5% max HP per turn
    description: '화상: 3턴간 매 턴 최대 HP의 5% 피해'
  },
  [ElementType.Ice]: {
    effectType: StatusEffect.Frozen,
    chance: 0.20,
    duration: 1,
    description: '빙결: 20% 확률로 1턴간 행동 불가'
  },
  [ElementType.Lightning]: {
    effectType: StatusEffect.Stunned,
    chance: 0.30,
    duration: 1,
    description: '스턴: 30% 확률로 1턴간 행동 불가'
  },
  [ElementType.Poison]: {
    effectType: StatusEffect.Poisoned,
    chance: 0.45,
    duration: 5,
    dotPercent: 0.03, // 3% max HP per turn
    description: '중독: 5턴간 매 턴 최대 HP의 3% 피해'
  },
  [ElementType.Dark]: {
    effectType: 'crit-boost',
    chance: 1.0, // Always applies
    duration: 0,
    description: '어둠: 크리티컬 확률 +15%'
  },
  [ElementType.Light]: {
    effectType: StatusEffect.Blessed,
    chance: 0.25,
    duration: 3,
    description: '축복: 25% 확률로 3턴간 회복력 증가'
  },
  [ElementType.Physical]: {
    effectType: 'none',
    chance: 0,
    duration: 0,
    description: '물리: 특수 효과 없음'
  }
};

/**
 * Element names in Korean
 */
export const ELEMENT_NAMES: Record<ElementType, string> = {
  [ElementType.Fire]: '화염',
  [ElementType.Ice]: '냉기',
  [ElementType.Lightning]: '번개',
  [ElementType.Poison]: '독',
  [ElementType.Dark]: '암흑',
  [ElementType.Light]: '신성',
  [ElementType.Physical]: '물리'
};

/**
 * Element icons
 */
export const ELEMENT_ICONS: Record<ElementType, string> = {
  [ElementType.Fire]: '🔥',
  [ElementType.Ice]: '❄️',
  [ElementType.Lightning]: '⚡',
  [ElementType.Poison]: '☠️',
  [ElementType.Dark]: '🌑',
  [ElementType.Light]: '✨',
  [ElementType.Physical]: '⚔️'
};

/**
 * Element colors for display
 */
export const ELEMENT_COLORS: Record<ElementType, string> = {
  [ElementType.Fire]: '#FF4500',
  [ElementType.Ice]: '#00BFFF',
  [ElementType.Lightning]: '#FFD700',
  [ElementType.Poison]: '#32CD32',
  [ElementType.Dark]: '#4B0082',
  [ElementType.Light]: '#FFFACD',
  [ElementType.Physical]: '#C0C0C0'
};

/**
 * Result of element advantage check
 */
export interface ElementAdvantageResult {
  /** Attacker's element */
  attackerElement: ElementType;
  /** Defender's element */
  defenderElement: ElementType;
  /** Whether attacker has advantage */
  hasAdvantage: boolean;
  /** Whether attacker has disadvantage */
  hasDisadvantage: boolean;
  /** Damage multiplier */
  damageMultiplier: number;
  /** Description message */
  message: string;
}

/**
 * Result of element damage calculation
 */
export interface ElementDamageResult {
  /** Base damage before element calculation */
  baseDamage: number;
  /** Damage after element multiplier */
  elementalDamage: number;
  /** Total final damage */
  totalDamage: number;
  /** Element advantage info */
  advantageResult: ElementAdvantageResult;
  /** Whether element effect was triggered */
  effectTriggered: boolean;
  /** Status effect to apply (if any) */
  statusEffect: ActiveStatusEffect | null;
  /** Crit chance bonus (for Dark element) */
  critChanceBonus: number;
  /** Combat log messages */
  messages: string[];
}

/**
 * Combatant interface for element calculations
 */
export interface ElementCombatant {
  name: string;
  element: ElementType;
  stats: Stats;
  resistances?: Partial<Record<ElementType, number>>;
}

/**
 * Check element advantage between two elements
 */
export function checkElementAdvantage(
  attackerElement: ElementType,
  defenderElement: ElementType
): ElementAdvantageResult {
  const advantage = ELEMENT_ADVANTAGES[attackerElement];
  const hasAdvantage = advantage === defenderElement;

  // Check if defender has advantage (attacker has disadvantage)
  const defenderAdvantage = ELEMENT_ADVANTAGES[defenderElement];
  const hasDisadvantage = defenderAdvantage === attackerElement;

  let damageMultiplier = 1.0;
  let message = '';

  if (hasAdvantage) {
    damageMultiplier = ELEMENT_ADVANTAGE_MULTIPLIER;
    message = `${ELEMENT_ICONS[attackerElement]} → ${ELEMENT_ICONS[defenderElement]} 효과가 굉장했다! (+30%)`;
  } else if (hasDisadvantage) {
    damageMultiplier = ELEMENT_DISADVANTAGE_MULTIPLIER;
    message = `${ELEMENT_ICONS[attackerElement]} → ${ELEMENT_ICONS[defenderElement]} 효과가 별로였다... (-30%)`;
  } else if (attackerElement !== ElementType.Physical && attackerElement === defenderElement) {
    damageMultiplier = 0.5;
    message = `${ELEMENT_ICONS[attackerElement]} 동일 속성으로 피해가 감소했다! (-50%)`;
  }

  return {
    attackerElement,
    defenderElement,
    hasAdvantage,
    hasDisadvantage,
    damageMultiplier,
    message
  };
}

/**
 * Apply element resistance to damage
 */
export function applyElementResistance(
  damage: number,
  element: ElementType,
  resistances?: Partial<Record<ElementType, number>>
): number {
  if (!resistances) {
    return damage;
  }

  const resistance = resistances[element] ?? 0;
  // Resistance is a value from -1 (weakness) to 1 (immunity)
  // -1 = 200% damage, 0 = 100% damage, 1 = 0% damage
  const multiplier = 1 - resistance;

  return Math.floor(damage * Math.max(0, multiplier));
}

/**
 * Calculate element damage with advantages and effects
 */
export function calculateElementDamage(
  attacker: ElementCombatant,
  defender: ElementCombatant,
  baseDamage: number,
  attackElement?: ElementType
): ElementDamageResult {
  const element = attackElement ?? attacker.element;
  const messages: string[] = [];

  // Check element advantage
  const advantageResult = checkElementAdvantage(element, defender.element);

  // Calculate elemental damage
  let elementalDamage = Math.floor(baseDamage * advantageResult.damageMultiplier);

  if (advantageResult.message) {
    messages.push(advantageResult.message);
  }

  // Apply defender's resistance
  const finalDamage = applyElementResistance(elementalDamage, element, defender.resistances);

  if (finalDamage !== elementalDamage) {
    const resistPercent = Math.round((1 - finalDamage / elementalDamage) * 100);
    if (resistPercent > 0) {
      messages.push(`${defender.name}의 ${ELEMENT_NAMES[element]} 저항으로 피해 -${resistPercent}%`);
    } else {
      messages.push(`${defender.name}의 ${ELEMENT_NAMES[element]} 약점으로 피해 +${Math.abs(resistPercent)}%`);
    }
  }

  // Check for element effect
  const effectConfig = ELEMENT_EFFECTS[element];
  let effectTriggered = false;
  let statusEffect: ActiveStatusEffect | null = null;
  let critChanceBonus = 0;

  if (effectConfig.effectType !== 'none') {
    const roll = Math.random();

    if (effectConfig.effectType === 'crit-boost') {
      // Dark element always gives crit bonus
      critChanceBonus = 15;
      messages.push(`${ELEMENT_ICONS[element]} 어둠의 힘으로 크리티컬 확률 +15%!`);
      effectTriggered = true;
    } else if (roll < effectConfig.chance) {
      // Status effect triggered
      effectTriggered = true;
      statusEffect = {
        type: effectConfig.effectType,
        duration: effectConfig.duration,
        power: effectConfig.dotPercent
          ? Math.floor(defender.stats.maxHp * effectConfig.dotPercent)
          : (effectConfig.dotFlat ?? 0)
      };

      const effectName = getStatusEffectName(effectConfig.effectType);
      messages.push(`${ELEMENT_ICONS[element]} ${defender.name}이(가) ${effectName} 상태가 되었다!`);
    }
  }

  return {
    baseDamage,
    elementalDamage,
    totalDamage: finalDamage,
    advantageResult,
    effectTriggered,
    statusEffect,
    critChanceBonus,
    messages
  };
}

/**
 * Apply element effect to a target
 */
export function applyElementEffect(
  target: MonsterInstance | { statusEffects: ActiveStatusEffect[]; stats: Stats },
  element: ElementType,
  forceApply: boolean = false
): { applied: boolean; effect: ActiveStatusEffect | null; message: string } {
  const effectConfig = ELEMENT_EFFECTS[element];

  if (effectConfig.effectType === 'none' || effectConfig.effectType === 'crit-boost') {
    return {
      applied: false,
      effect: null,
      message: ''
    };
  }

  // Check if effect should trigger
  if (!forceApply && Math.random() >= effectConfig.chance) {
    return {
      applied: false,
      effect: null,
      message: `${ELEMENT_ICONS[element]} 속성 효과가 발동하지 않았다.`
    };
  }

  // Check if target already has this effect
  const existingEffect = target.statusEffects.find(e => e.type === effectConfig.effectType);
  if (existingEffect) {
    // Refresh duration
    existingEffect.duration = Math.max(existingEffect.duration, effectConfig.duration);
    return {
      applied: true,
      effect: existingEffect,
      message: `${ELEMENT_ICONS[element]} 효과가 갱신되었다!`
    };
  }

  // Create new effect
  const effect: ActiveStatusEffect = {
    type: effectConfig.effectType,
    duration: effectConfig.duration,
    power: effectConfig.dotPercent
      ? Math.floor(target.stats.maxHp * effectConfig.dotPercent)
      : (effectConfig.dotFlat ?? 0)
  };

  target.statusEffects.push(effect);

  const effectName = getStatusEffectName(effectConfig.effectType);
  return {
    applied: true,
    effect,
    message: `${ELEMENT_ICONS[element]} ${effectName} 효과가 적용되었다! (${effectConfig.duration}턴)`
  };
}

/**
 * Process element DoT damage at start/end of turn
 */
export function processElementDoT(
  target: { currentHp: number; stats: Stats; statusEffects: ActiveStatusEffect[] }
): { damage: number; messages: string[] } {
  let totalDamage = 0;
  const messages: string[] = [];

  for (const effect of target.statusEffects) {
    if (effect.type === StatusEffect.Burned) {
      const damage = effect.power;
      totalDamage += damage;
      target.currentHp = Math.max(0, target.currentHp - damage);
      messages.push(`🔥 화상으로 ${damage} 피해!`);
    } else if (effect.type === StatusEffect.Poisoned) {
      const damage = effect.power;
      totalDamage += damage;
      target.currentHp = Math.max(0, target.currentHp - damage);
      messages.push(`☠️ 중독으로 ${damage} 피해!`);
    }
  }

  return { damage: totalDamage, messages };
}

/**
 * Check if target can act (not frozen or stunned)
 */
export function canTargetAct(
  target: { statusEffects: ActiveStatusEffect[] }
): { canAct: boolean; reason: string } {
  for (const effect of target.statusEffects) {
    if (effect.type === StatusEffect.Frozen) {
      return { canAct: false, reason: '❄️ 빙결 상태로 행동할 수 없다!' };
    }
    if (effect.type === StatusEffect.Stunned) {
      return { canAct: false, reason: '⚡ 스턴 상태로 행동할 수 없다!' };
    }
  }
  return { canAct: true, reason: '' };
}

/**
 * Reduce status effect durations at end of turn
 */
export function tickStatusEffects(
  target: { statusEffects: ActiveStatusEffect[] }
): string[] {
  const messages: string[] = [];
  const expiredEffects: StatusEffect[] = [];

  for (const effect of target.statusEffects) {
    effect.duration--;
    if (effect.duration <= 0) {
      expiredEffects.push(effect.type);
    }
  }

  // Remove expired effects
  target.statusEffects = target.statusEffects.filter(e => e.duration > 0);

  for (const expired of expiredEffects) {
    const effectName = getStatusEffectName(expired);
    messages.push(`${effectName} 효과가 해제되었다.`);
  }

  return messages;
}

/**
 * Get status effect name in Korean
 */
export function getStatusEffectName(effect: StatusEffect): string {
  const names: Record<StatusEffect, string> = {
    [StatusEffect.Poisoned]: '중독',
    [StatusEffect.Burned]: '화상',
    [StatusEffect.Frozen]: '빙결',
    [StatusEffect.Stunned]: '스턴',
    [StatusEffect.Blessed]: '축복',
    [StatusEffect.Cursed]: '저주',
    [StatusEffect.Regenerating]: '재생',
    [StatusEffect.Weakened]: '약화',
    [StatusEffect.Strengthened]: '강화'
  };
  return names[effect] ?? effect;
}

/**
 * Get element advantage chain description
 */
export function getElementAdvantageChain(): string {
  return `속성 상성:
🔥 화염 → ❄️ 냉기 (+30%)
❄️ 냉기 → ⚡ 번개 (+30%)
⚡ 번개 → ☠️ 독 (+30%)
☠️ 독 → 🌑 암흑 (+30%)
🌑 암흑 → 🔥 화염 (+30%)
✨ 신성 → 🌑 암흑 (+30%)`;
}

/**
 * Get element description with effect info
 */
export function getElementDescription(element: ElementType): string {
  const icon = ELEMENT_ICONS[element];
  const name = ELEMENT_NAMES[element];
  const effect = ELEMENT_EFFECTS[element];
  const advantage = ELEMENT_ADVANTAGES[element];

  let description = `${icon} ${name}`;

  if (advantage) {
    description += `\n  상성: ${ELEMENT_ICONS[advantage]} ${ELEMENT_NAMES[advantage]}에 강함 (+30%)`;
  }

  description += `\n  효과: ${effect.description}`;

  if (effect.chance > 0 && effect.chance < 1) {
    description += ` (${Math.round(effect.chance * 100)}% 확률)`;
  }

  return description;
}

/**
 * Get all element descriptions
 */
export function getAllElementDescriptions(): string {
  const elements = [
    ElementType.Fire,
    ElementType.Ice,
    ElementType.Lightning,
    ElementType.Poison,
    ElementType.Dark,
    ElementType.Light
  ];

  return elements.map(e => getElementDescription(e)).join('\n\n');
}

/**
 * Calculate effective element for mixed damage
 */
export function calculateMixedElementDamage(
  attacker: ElementCombatant,
  defender: ElementCombatant,
  physicalDamage: number,
  elementalDamage: number,
  element: ElementType
): { physical: number; elemental: number; total: number; messages: string[] } {
  const messages: string[] = [];

  // Physical damage (no element advantage)
  const finalPhysical = physicalDamage;

  // Elemental damage with advantages
  const elementResult = calculateElementDamage(
    attacker,
    defender,
    elementalDamage,
    element
  );

  messages.push(...elementResult.messages);

  return {
    physical: finalPhysical,
    elemental: elementResult.totalDamage,
    total: finalPhysical + elementResult.totalDamage,
    messages
  };
}

/**
 * Check if element is effective against monster type
 */
export function isElementEffectiveAgainstType(
  element: ElementType,
  monsterElement: ElementType
): boolean {
  return ELEMENT_ADVANTAGES[element] === monsterElement;
}

/**
 * Get recommended element against a target
 */
export function getRecommendedElement(targetElement: ElementType): ElementType | null {
  for (const [attacker, defender] of Object.entries(ELEMENT_ADVANTAGES)) {
    if (defender === targetElement) {
      return attacker as ElementType;
    }
  }
  return null;
}
