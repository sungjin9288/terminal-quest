import { getItemById } from '../data/items.js';
import { getLocationById } from '../data/locations.js';
import { GameState } from '../types/index.js';
import { getAdventureFocusSummary, getLocationBossProgress } from './adventureFocus.js';
import { addItem } from './inventory.js';

type DungeonEventTone = 'info' | 'success';

interface DungeonEventMessage {
  text: string;
  tone: DungeonEventTone;
}

export interface DungeonEventResult {
  id: 'supply-cache' | 'maintenance-niche' | 'memory-echo' | 'route-scan';
  messages: DungeonEventMessage[];
}

function getLocationFlavor(locationId: string): {
  name: string;
  description: string;
  sectionHint: string | null;
} {
  const location = getLocationById(locationId);
  if (!location || !('description' in location)) {
    return {
      name: locationId,
      description: '낯선 로그와 잔향이 뒤섞인 공간입니다.',
      sectionHint: null
    };
  }

  return {
    name: location.name,
    description: location.description,
    sectionHint: 'sections' in location
      ? location.sections?.[0] ?? null
      : null
  };
}

function truncateText(text: string, maxLength: number = 88): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function chooseSupplyItemId(gameState: GameState, random: () => number): string {
  const hpRatio = gameState.player.stats.maxHp > 0
    ? gameState.player.stats.hp / gameState.player.stats.maxHp
    : 1;
  const mpRatio = gameState.player.stats.maxMp > 0
    ? gameState.player.stats.mp / gameState.player.stats.maxMp
    : 1;

  if (gameState.player.level >= 15 && random() > 0.82) {
    return 'save-token';
  }
  if (hpRatio <= 0.55 && hpRatio <= mpRatio) {
    return 'health-potion';
  }
  if (mpRatio <= 0.55) {
    return 'mana-potion';
  }
  return random() < 0.5 ? 'health-potion' : 'mana-potion';
}

function runSupplyCacheEvent(gameState: GameState, random: () => number): DungeonEventResult {
  const flavor = getLocationFlavor(gameState.player.currentLocation);
  const itemId = chooseSupplyItemId(gameState, random);
  const item = getItemById(itemId);
  const addResult = addItem(gameState.player, itemId);

  if (addResult.success && item) {
    return {
      id: 'supply-cache',
      messages: [
        {
          text: `${flavor.name}의 무너진 보급함에서 아직 쓸 수 있는 장비를 찾았습니다.`,
          tone: 'info'
        },
        {
          text: `${item.name} 1개를 확보했습니다.`,
          tone: 'success'
        }
      ]
    };
  }

  const fallbackGold = Math.floor(random() * 19) + 18;
  gameState.player.gold += fallbackGold;
  gameState.statistics.goldEarned += fallbackGold;

  return {
    id: 'supply-cache',
    messages: [
      {
        text: `${flavor.name}의 보급함은 비어 있었지만 정제 가능한 코인을 회수했습니다.`,
        tone: 'info'
      },
      {
        text: `${fallbackGold} 골드를 획득했습니다.`,
        tone: 'success'
      }
    ]
  };
}

function runMaintenanceNicheEvent(gameState: GameState): DungeonEventResult {
  const flavor = getLocationFlavor(gameState.player.currentLocation);
  const hpBefore = gameState.player.stats.hp;
  const mpBefore = gameState.player.stats.mp;
  const hpRestore = Math.max(14, Math.floor(gameState.player.stats.maxHp * 0.18));
  const mpRestore = Math.max(8, Math.floor(gameState.player.stats.maxMp * 0.22));

  gameState.player.stats.hp = Math.min(
    gameState.player.stats.maxHp,
    gameState.player.stats.hp + hpRestore
  );
  gameState.player.stats.mp = Math.min(
    gameState.player.stats.maxMp,
    gameState.player.stats.mp + mpRestore
  );

  const restoredHp = gameState.player.stats.hp - hpBefore;
  const restoredMp = gameState.player.stats.mp - mpBefore;

  return {
    id: 'maintenance-niche',
    messages: [
      {
        text: `${flavor.name} 안쪽에 남아 있던 유지보수 포켓에서 잠시 숨을 돌렸습니다.`,
        tone: 'info'
      },
      {
        text: `HP ${restoredHp}, MP ${restoredMp} 회복.`,
        tone: 'success'
      }
    ]
  };
}

function runMemoryEchoEvent(gameState: GameState, random: () => number): DungeonEventResult {
  const flavor = getLocationFlavor(gameState.player.currentLocation);
  const focus = getAdventureFocusSummary(gameState);
  const salvageGold = Math.floor(random() * 13) + 8;

  gameState.player.gold += salvageGold;
  gameState.statistics.goldEarned += salvageGold;

  const messages: DungeonEventMessage[] = [
    {
      text: `${flavor.name}의 벽면에 남은 로그 잔향이 짧게 되감깁니다.`,
      tone: 'info'
    },
    {
      text: truncateText(flavor.description),
      tone: 'info'
    },
    {
      text: `로그에서 정제 가능한 자원을 건져 ${salvageGold} 골드를 확보했습니다.`,
      tone: 'success'
    }
  ];

  if (focus?.lines[0]) {
    messages.push({
      text: `잔향 힌트: ${focus.lines[0]}`,
      tone: 'info'
    });
  }

  return {
    id: 'memory-echo',
    messages
  };
}

function runRouteScanEvent(gameState: GameState, random: () => number): DungeonEventResult {
  const flavor = getLocationFlavor(gameState.player.currentLocation);
  const bonusSteps = random() < 0.3 ? 2 : 1;
  gameState.position.stepsTaken += bonusSteps;
  const bossProgress = getLocationBossProgress(gameState);
  const progressText = bossProgress
    ? bossProgress.ready
      ? `${bossProgress.bossName}의 기척이 바로 앞에서 느껴집니다.`
      : `${bossProgress.bossName}까지 ${bossProgress.remainingSteps}회 남았습니다.`
    : '더 깊은 구간으로 이어지는 짧은 통로를 확보했습니다.';
  const routeLabel = flavor.sectionHint
    ? `${flavor.sectionHint} 방향`
    : '심층 구간';

  return {
    id: 'route-scan',
    messages: [
      {
        text: `${routeLabel}으로 이어지는 우회 동선을 찾아 빠르게 전진했습니다.`,
        tone: 'info'
      },
      {
        text: progressText,
        tone: 'success'
      }
    ]
  };
}

export function runDungeonEvent(
  gameState: GameState,
  random: () => number = Math.random
): DungeonEventResult {
  const roll = random();

  if (roll < 0.25) {
    return runSupplyCacheEvent(gameState, random);
  }
  if (roll < 0.5) {
    return runMaintenanceNicheEvent(gameState);
  }
  if (roll < 0.75) {
    return runMemoryEchoEvent(gameState, random);
  }

  return runRouteScanEvent(gameState, random);
}
