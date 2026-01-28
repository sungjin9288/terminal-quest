/**
 * Terminal Quest - Element UI
 * Handles display of elemental information in combat and menus
 */

import { ElementType } from '../types/item.js';
import {
  ELEMENT_ICONS,
  ELEMENT_NAMES,
  ELEMENT_COLORS,
  ELEMENT_EFFECTS,
  ELEMENT_ADVANTAGES,
  checkElementAdvantage,
  ElementAdvantageResult
} from '../systems/element.js';

/**
 * Display configuration
 */
export interface ElementDisplayConfig {
  showIcon: boolean;
  showName: boolean;
  showColor: boolean;
  compact: boolean;
}

export const DEFAULT_DISPLAY_CONFIG: ElementDisplayConfig = {
  showIcon: true,
  showName: true,
  showColor: false,
  compact: false
};

/**
 * Show element icon
 */
export function showElementIcon(element: ElementType): string {
  return ELEMENT_ICONS[element];
}

/**
 * Show element name with icon
 */
export function showElementName(element: ElementType, showIcon: boolean = true): string {
  const icon = showIcon ? ELEMENT_ICONS[element] + ' ' : '';
  return `${icon}${ELEMENT_NAMES[element]}`;
}

/**
 * Show element with color code (for terminals that support it)
 */
export function showElementWithColor(element: ElementType): string {
  const color = ELEMENT_COLORS[element];
  const icon = ELEMENT_ICONS[element];
  const name = ELEMENT_NAMES[element];
  // ANSI color code format (may not work in all terminals)
  return `\x1b[38;2;${hexToRgb(color)}m${icon} ${name}\x1b[0m`;
}

/**
 * Convert hex color to RGB string
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255;255;255';
  return `${parseInt(result[1], 16)};${parseInt(result[2], 16)};${parseInt(result[3], 16)}`;
}

/**
 * Show element advantage result
 */
export function showElementAdvantage(
  attackerElement: ElementType,
  defenderElement: ElementType
): string {
  const result = checkElementAdvantage(attackerElement, defenderElement);
  return formatAdvantageResult(result);
}

/**
 * Format advantage result for display
 */
export function formatAdvantageResult(result: ElementAdvantageResult): string {
  const attackIcon = ELEMENT_ICONS[result.attackerElement];
  const defendIcon = ELEMENT_ICONS[result.defenderElement];

  if (result.hasAdvantage) {
    return `${attackIcon} → ${defendIcon} 효과가 굉장했다! (+30% 데미지)`;
  } else if (result.hasDisadvantage) {
    return `${attackIcon} → ${defendIcon} 효과가 별로였다... (-30% 데미지)`;
  } else if (result.attackerElement === result.defenderElement &&
             result.attackerElement !== ElementType.Physical) {
    return `${attackIcon} = ${defendIcon} 동일 속성! (-50% 데미지)`;
  }

  return `${attackIcon} → ${defendIcon} 보통 효과`;
}

/**
 * Show element advantage chart
 */
export function showElementAdvantageChart(): string {
  const lines: string[] = [
    '╔════════════════════════════════════╗',
    '║       ⚔️  속성 상성표  ⚔️          ║',
    '╠════════════════════════════════════╣',
    '║  🔥 화염  ──▶  ❄️ 냉기   (+30%)   ║',
    '║  ❄️ 냉기  ──▶  ⚡ 번개   (+30%)   ║',
    '║  ⚡ 번개  ──▶  ☠️ 독     (+30%)   ║',
    '║  ☠️ 독    ──▶  🌑 암흑   (+30%)   ║',
    '║  🌑 암흑  ──▶  🔥 화염   (+30%)   ║',
    '╠════════════════════════════════════╣',
    '║  ✨ 신성  ──▶  🌑 암흑   (+30%)   ║',
    '╚════════════════════════════════════╝'
  ];

  return lines.join('\n');
}

/**
 * Show element effects list
 */
export function showElementEffectsList(): string {
  const lines: string[] = [
    '╔════════════════════════════════════════════╗',
    '║          ✨ 속성 효과 목록 ✨              ║',
    '╠════════════════════════════════════════════╣'
  ];

  const elements: ElementType[] = [
    ElementType.Fire,
    ElementType.Ice,
    ElementType.Lightning,
    ElementType.Poison,
    ElementType.Dark,
    ElementType.Light
  ];

  for (const element of elements) {
    const icon = ELEMENT_ICONS[element];
    const name = ELEMENT_NAMES[element].padEnd(4, ' ');
    const effect = ELEMENT_EFFECTS[element];
    const chance = effect.chance < 1 ? `${Math.round(effect.chance * 100)}%` : '항상';

    lines.push(`║  ${icon} ${name}: ${effect.description.substring(0, 28).padEnd(28, ' ')} ║`);
    if (effect.chance > 0 && effect.chance < 1) {
      lines.push(`║         발동 확률: ${chance.padEnd(26, ' ')} ║`);
    }
  }

  lines.push('╚════════════════════════════════════════════╝');

  return lines.join('\n');
}

/**
 * Format attack message with element
 */
export function formatElementalAttack(
  attackerName: string,
  element: ElementType,
  damage: number,
  effectTriggered: boolean,
  effectMessage?: string
): string[] {
  const messages: string[] = [];
  const icon = ELEMENT_ICONS[element];
  const name = ELEMENT_NAMES[element];

  messages.push(`⚔️  ${attackerName}의 ${icon}${name} 공격!`);
  messages.push(`   → ${damage} 피해!`);

  if (effectTriggered && effectMessage) {
    messages.push(`   → ${effectMessage}`);
  }

  return messages;
}

/**
 * Format elemental advantage message
 */
export function formatAdvantageMessage(
  attackerElement: ElementType,
  defenderElement: ElementType
): string | null {
  const result = checkElementAdvantage(attackerElement, defenderElement);

  if (result.hasAdvantage) {
    return `   → ${ELEMENT_ICONS[attackerElement]} 효과가 굉장했다! (+30% 데미지)`;
  } else if (result.hasDisadvantage) {
    return `   → ${ELEMENT_ICONS[attackerElement]} 효과가 별로였다... (-30% 데미지)`;
  }

  return null;
}

/**
 * Show status effect with element
 */
export function showStatusEffect(
  element: ElementType,
  targetName: string,
  effectName: string,
  duration: number
): string {
  const icon = ELEMENT_ICONS[element];
  return `${icon} ${targetName}이(가) ${effectName} 상태가 되었다! (${duration}턴)`;
}

/**
 * Show DoT damage message
 */
export function showDotDamage(element: ElementType, damage: number): string {
  const icon = ELEMENT_ICONS[element];
  const effectName = element === ElementType.Fire ? '화상' :
                     element === ElementType.Poison ? '중독' : '지속 피해';
  return `${icon} ${effectName}으로 ${damage} 피해!`;
}

/**
 * Show status effect prevention message
 */
export function showStatusPrevented(element: ElementType, effectName: string): string {
  const icon = ELEMENT_ICONS[element];
  return `${icon} ${effectName} 효과에 저항했다!`;
}

/**
 * Format combat element info for display
 */
export function formatCombatElementInfo(
  attackerElement: ElementType,
  defenderElement: ElementType
): string {
  const attackIcon = ELEMENT_ICONS[attackerElement];
  const defendIcon = ELEMENT_ICONS[defenderElement];
  const attackName = ELEMENT_NAMES[attackerElement];
  const defendName = ELEMENT_NAMES[defenderElement];

  return `${attackIcon}${attackName} vs ${defendIcon}${defendName}`;
}

/**
 * Get element badge for item display
 */
export function getElementBadge(element: ElementType): string {
  if (element === ElementType.Physical) {
    return '';
  }
  return `[${ELEMENT_ICONS[element]}]`;
}

/**
 * Get compact element display
 */
export function getCompactElementDisplay(element: ElementType): string {
  return `${ELEMENT_ICONS[element]}`;
}

/**
 * Show recommended element against target
 */
export function showRecommendedElement(targetElement: ElementType): string {
  for (const [attacker, defender] of Object.entries(ELEMENT_ADVANTAGES)) {
    if (defender === targetElement) {
      const attackerEl = attacker as ElementType;
      return `💡 추천: ${ELEMENT_ICONS[attackerEl]} ${ELEMENT_NAMES[attackerEl]} 속성 사용!`;
    }
  }
  return '';
}

/**
 * Format element resistance display
 */
export function formatElementResistance(
  element: ElementType,
  resistance: number
): string {
  const icon = ELEMENT_ICONS[element];
  const name = ELEMENT_NAMES[element];

  if (resistance >= 1) {
    return `${icon} ${name}: 면역`;
  } else if (resistance > 0) {
    return `${icon} ${name}: -${Math.round(resistance * 100)}%`;
  } else if (resistance < 0) {
    return `${icon} ${name}: +${Math.round(Math.abs(resistance) * 100)}% (약점)`;
  }

  return `${icon} ${name}: 보통`;
}

/**
 * Show all resistances for a target
 */
export function showResistances(
  resistances: Partial<Record<ElementType, number>>
): string {
  const lines: string[] = ['═══ 속성 저항 ═══'];

  const elements: ElementType[] = [
    ElementType.Fire,
    ElementType.Ice,
    ElementType.Lightning,
    ElementType.Poison,
    ElementType.Dark,
    ElementType.Light
  ];

  for (const element of elements) {
    const resistance = resistances[element] ?? 0;
    if (resistance !== 0) {
      lines.push(formatElementResistance(element, resistance));
    }
  }

  if (lines.length === 1) {
    lines.push('특별한 저항 없음');
  }

  return lines.join('\n');
}

/**
 * Create element comparison display for two combatants
 */
export function createElementComparisonDisplay(
  attacker: { name: string; element: ElementType },
  defender: { name: string; element: ElementType }
): string {
  const attackIcon = ELEMENT_ICONS[attacker.element];
  const defendIcon = ELEMENT_ICONS[defender.element];
  const result = checkElementAdvantage(attacker.element, defender.element);

  let comparison: string;
  if (result.hasAdvantage) {
    comparison = '▶▶▶';
  } else if (result.hasDisadvantage) {
    comparison = '◁◁◁';
  } else {
    comparison = '───';
  }

  return `${attackIcon} ${comparison} ${defendIcon}`;
}
