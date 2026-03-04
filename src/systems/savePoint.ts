/**
 * Save point management system for Terminal Quest
 */

import { Player } from '../types/character.js';

/**
 * Save point locations
 */
const SAVE_POINTS: Record<string, boolean> = {
  'starting-town': true,  // Auto-save location (town)
  'memory-forest-entrance': true,
  'memory-forest-middle': true,
  'cache-cave-entrance': true,
  'registry-entrance': true,
  'compiler-valley-entrance': true
};

/**
 * Auto-save locations (towns)
 */
const AUTO_SAVE_LOCATIONS: string[] = [
  'starting-town',
  'bit-town',
  'byte-city'
];

/**
 * Check if current location has a save point
 */
export function hasSavePoint(locationId: string): boolean {
  return SAVE_POINTS[locationId] === true;
}

/**
 * Check if current location is an auto-save location
 */
export function isAutoSaveLocation(locationId: string): boolean {
  return AUTO_SAVE_LOCATIONS.includes(locationId);
}

/**
 * Use a save token
 */
export function useSaveToken(player: Player): boolean {
  if (player.inventory.includes('save-token')) {
    const index = player.inventory.indexOf('save-token');
    player.inventory.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get save token count
 */
export function getSaveTokenCount(player: Player): number {
  return player.inventory.filter(id => id === 'save-token').length;
}

/**
 * Add save token to player
 */
export function addSaveToken(player: Player, count: number = 1): void {
  for (let i = 0; i < count; i++) {
    if (player.inventory.length < player.maxInventorySize) {
      player.inventory.push('save-token');
    }
  }
}

/**
 * Get save points in a location
 */
export function getSavePointsInLocation(locationId: string): string[] {
  const savePoints: string[] = [];

  if (hasSavePoint(locationId)) {
    savePoints.push(locationId);
  }

  return savePoints;
}

/**
 * Can player save at current location?
 */
export interface CanSaveResult {
  canSave: boolean;
  reason: string;
  requiresToken: boolean;
}

export function canSaveAtLocation(
  locationId: string,
  inCombat: boolean,
  hasSaveToken: boolean
): CanSaveResult {
  // Cannot save in combat
  if (inCombat) {
    return {
      canSave: false,
      reason: '전투 중에는 저장할 수 없습니다.',
      requiresToken: false
    };
  }

  // Check if at save point
  if (hasSavePoint(locationId) || isAutoSaveLocation(locationId)) {
    return {
      canSave: true,
      reason: '현재 위치에서 저장 가능합니다.',
      requiresToken: false
    };
  }

  // Emergency save with token
  if (hasSaveToken) {
    return {
      canSave: true,
      reason: '세이브 토큰을 사용하여 긴급 저장 가능합니다.',
      requiresToken: true
    };
  }

  return {
    canSave: false,
    reason: '세이브 포인트가 없습니다. 세이브 토큰을 사용하거나 세이브 포인트를 찾으세요.',
    requiresToken: false
  };
}

/**
 * Get location display name
 */
export function getLocationDisplayName(locationId: string): string {
  const names: Record<string, string> = {
    'starting-town': '초보자 마을',
    'memory-forest-entrance': '메모리 숲 입구',
    'memory-forest-middle': '메모리 숲 중간',
    'cache-cave-entrance': '캐시 동굴 입구',
    'registry-entrance': '레지스트리 입구',
    'compiler-valley-entrance': '컴파일러 계곡 입구',
    'bit-town': '비트 타운',
    'byte-city': '바이트 시티'
  };

  return names[locationId] || locationId;
}
