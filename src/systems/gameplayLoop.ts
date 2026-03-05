import chalk from 'chalk';
import { GameState } from '../types/index.js';
import {
  TownLoopDependencies,
  DungeonLoopDependencies
} from '../types/runtime.js';
import {
  getLocationDisplayName,
  getLocationById,
  isTownLocation,
  isLevelAppropriate
} from '../data/locations.js';
import {
  clearScreen,
  showTitle,
  showStats,
  showMessage,
  showLoading,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showTownMenu,
  showDungeonMenu,
  type TownMenuOption,
  type DungeonMenuOption
} from '../ui/travel.js';
import {
  applyTalkQuestProgress,
  questBoardLoop
} from './questUi.js';
import { getQuestTrackerSummary } from './questTracker.js';
import { canAffordCost, getInnRestCost } from './economy.js';
import { getActiveSeasonalEvent } from './seasonalEvents.js';
import { getRuntimeSettings } from '../runtime/settings.js';

export type {
  EncounterResult,
  TownLoopDependencies,
  DungeonLoopDependencies
} from '../types/runtime.js';

function showTrackedQuestSummary(gameState: GameState): void {
  const summary = getQuestTrackerSummary(gameState);
  if (!summary) {
    return;
  }

  const statusLabel = summary.status === 'ready'
    ? chalk.green.bold('🎁 완료 가능')
    : chalk.cyan('📌 추적 퀘스트');
  const progressText = chalk.gray(`(${summary.currentAmount}/${summary.requiredAmount})`);

  console.log(`${statusLabel} ${chalk.white(summary.questName)} ${progressText}`);
  console.log(chalk.gray(`   ${summary.objectiveDescription}`));
}

function showSeasonalEventSummary(gameState: GameState): void {
  const activeEvent = getActiveSeasonalEvent(gameState);
  if (!activeEvent) {
    return;
  }

  console.log(chalk.yellow.bold(`🌤 시즌 이벤트: ${activeEvent.name}`));
  console.log(chalk.gray(`   ${activeEvent.description}`));
}

type GuidanceContext = 'town' | 'dungeon';
const ONBOARDING_FLAG = 'ux-onboarding-v2-complete';

interface GuidanceResult {
  recommendedAction: TownMenuOption | DungeonMenuOption | null;
}

function getRecommendedActionLabel(action: TownMenuOption | DungeonMenuOption): string {
  const labelMap: Record<TownMenuOption | DungeonMenuOption, string> = {
    shop: '상점',
    inn: '여관',
    save: '세이브',
    explore: '탐색',
    travel: '이동',
    quest: '퀘스트 게시판',
    menu: '메뉴',
    rest: '휴식'
  };
  return labelMap[action];
}

function showContextGuidance(
  gameState: GameState,
  context: GuidanceContext,
  hasQuestBoard: boolean = false
): GuidanceResult {
  if (!getRuntimeSettings().showContextHints) {
    return { recommendedAction: null };
  }

  const hints: string[] = [];
  let recommendedAction: TownMenuOption | DungeonMenuOption | null = null;
  const hpRatio = gameState.player.stats.maxHp > 0
    ? gameState.player.stats.hp / gameState.player.stats.maxHp
    : 1;
  const mpRatio = gameState.player.stats.maxMp > 0
    ? gameState.player.stats.mp / gameState.player.stats.maxMp
    : 1;
  const inventoryRatio = gameState.player.maxInventorySize > 0
    ? gameState.player.inventory.length / gameState.player.maxInventorySize
    : 0;

  if (context === 'town') {
    const questSummary = getQuestTrackerSummary(gameState);
    const restCost = getInnRestCost(gameState.player.level);

    if (questSummary?.status === 'ready') {
      hints.push('완료 가능한 퀘스트가 있습니다. 게시판에서 보상을 수령하세요.');
      if (hasQuestBoard) {
        recommendedAction = 'quest';
      }
    } else if (!questSummary && hasQuestBoard) {
      hints.push('활성 퀘스트가 없습니다. 게시판에서 다음 목표를 수락해 보세요.');
      recommendedAction = 'quest';
    }

    if (hpRatio <= 0.45) {
      if (canAffordCost(gameState.player.gold, restCost)) {
        hints.push(`HP가 낮습니다. 여관 휴식(${restCost} 골드)으로 안전하게 회복하세요.`);
        recommendedAction = 'inn';
      } else {
        hints.push('HP가 낮고 골드가 부족합니다. 주변 탐색으로 골드를 모아 회복을 준비하세요.');
        recommendedAction = 'explore';
      }
    }
  } else {
    const levelFit = isLevelAppropriate(
      gameState.player.level,
      gameState.player.currentLocation
    );
    if (levelFit === 'under') {
      hints.push('현재 지역 난이도가 높습니다. 위험하면 마을로 돌아가 장비를 정비하세요.');
      recommendedAction = 'travel';
    }
    if (hpRatio <= 0.4 || mpRatio <= 0.3) {
      hints.push('전투 자원이 부족합니다. 휴식 후 탐험하거나 이동으로 전환하세요.');
      if (recommendedAction !== 'travel') {
        recommendedAction = 'rest';
      }
    }
  }

  if (inventoryRatio >= 0.9) {
    hints.push('인벤토리가 거의 가득 찼습니다. 상점에서 정리해 드랍 손실을 막으세요.');
    if (context === 'town') {
      recommendedAction = 'shop';
    }
  }

  if (hints.length === 0) {
    hints.push(
      context === 'town'
        ? '퀘스트 확인 → 상점 정비 → 저장 순서로 다음 구간을 준비해 보세요.'
        : '탐험 2~3회마다 상태를 점검하고, 위험하면 즉시 이동해 손실을 줄이세요.'
    );
    if (context === 'town') {
      recommendedAction = hasQuestBoard ? 'quest' : 'explore';
    } else {
      recommendedAction = 'explore';
    }
  }

  const displayed = hints.slice(0, 2);
  console.log(chalk.cyan.bold('🧭 추천 행동'));
  if (recommendedAction) {
    console.log(chalk.gray(`   기본 선택: ${getRecommendedActionLabel(recommendedAction)}`));
  }
  displayed.forEach((hint) => {
    console.log(chalk.gray(`   • ${hint}`));
  });

  return { recommendedAction };
}

async function maybeShowFirstRunOnboarding(
  gameState: GameState,
  hasQuestBoard: boolean
): Promise<void> {
  if (gameState.flags[ONBOARDING_FLAG]) {
    return;
  }

  const questLine = hasQuestBoard
    ? '3) 퀘스트 게시판으로 목표를 수락하고 보상을 챙기세요.'
    : '3) 주변 탐색으로 골드를 확보한 뒤 이동으로 전투를 시작하세요.';

  showMessage('처음 플레이를 위한 빠른 안내를 표시합니다.', 'info');
  console.log(chalk.cyan.bold('🧭 빠른 시작 가이드'));
  console.log(chalk.gray('  1) 추천 행동 기본 선택이 자동으로 맞춰집니다. Enter로 바로 진행하세요.'));
  console.log(chalk.gray('  2) HP가 낮으면 여관/휴식을 먼저 선택해 손실을 줄이세요.'));
  console.log(chalk.gray(`  ${questLine}`));
  console.log(chalk.gray('  4) 마을에서 저장 후 전투 지역으로 이동하면 안정적입니다.'));
  await pressEnterToContinue('important');
  gameState.flags[ONBOARDING_FLAG] = true;
}

export async function townLoop(
  gameState: GameState,
  dependencies: TownLoopDependencies
): Promise<boolean> {
  const random = dependencies.random ?? Math.random;

  while (true) {
    const locationName = getLocationDisplayName(gameState.player.currentLocation);

    clearScreen();
    await showTitle();
    showStats(gameState.player);
    showSeasonalEventSummary(gameState);
    showTrackedQuestSummary(gameState);

    const currentLocation = getLocationById(gameState.player.currentLocation);
    const hasQuestBoard = Boolean(
      currentLocation &&
      'facilities' in currentLocation &&
      currentLocation.facilities.includes('quest-board')
    );
    await maybeShowFirstRunOnboarding(gameState, hasQuestBoard);
    const guidance = showContextGuidance(gameState, 'town', hasQuestBoard);

    const choice = await showTownMenu(
      locationName,
      hasQuestBoard,
      guidance.recommendedAction as TownMenuOption | null
    );

    switch (choice) {
      case 'shop':
        await dependencies.shopMenu(gameState);
        break;

      case 'inn':
        {
          const innRestCost = getInnRestCost(gameState.player.level);
          if (!canAffordCost(gameState.player.gold, innRestCost)) {
            showMessage(
              `골드가 부족합니다. 여관 휴식 비용 ${innRestCost} 골드가 필요합니다. (현재 ${gameState.player.gold} 골드)`,
              'warning'
            );
            await pressEnterToContinue('important');
            break;
          }

          gameState.player.gold -= innRestCost;
          gameState.statistics.goldSpent += innRestCost;

          await applyTalkQuestProgress(gameState, ['innkeeper']);
          showMessage(`여관에서 휴식을 취합니다... (비용: ${innRestCost} 골드)`, 'info');
          await showLoading('휴식 중', 1500);
          gameState.player.stats.hp = gameState.player.stats.maxHp;
          gameState.player.stats.mp = gameState.player.stats.maxMp;
          showMessage(`HP와 MP가 완전히 회복되었습니다! (잔액: ${gameState.player.gold} 골드)`, 'success');
          await pressEnterToContinue('important');
          break;
        }

      case 'save':
        await dependencies.saveGame(gameState);
        break;

      case 'explore':
        showMessage('마을 주변을 둘러봅니다...', 'info');
        await showLoading('탐색 중', 1000);
        if (random() < 0.3) {
          const goldFound = Math.floor(random() * 20) + 5;
          gameState.player.gold += goldFound;
          gameState.statistics.goldEarned += goldFound;
          showMessage(`${goldFound} 골드를 발견했습니다!`, 'success');
        } else {
          showMessage('특별한 것은 발견하지 못했습니다.', 'info');
        }
        await pressEnterToContinue('normal');
        break;

      case 'travel':
        {
          const travelResult = await dependencies.handleTravel(gameState);
          if (travelResult.locationChanged && !isTownLocation(gameState.player.currentLocation)) {
            return true;
          }
        }
        break;

      case 'quest':
        if (hasQuestBoard) {
          await questBoardLoop(gameState);
        } else {
          showMessage('이 지역에는 퀘스트 게시판이 없습니다.', 'warning');
          await pressEnterToContinue('important');
        }
        break;

      case 'menu':
        {
          const shouldContinue = await dependencies.inGameMenuLoop(gameState);
          if (!shouldContinue) return false;
        }
        break;
    }
  }
}

export async function dungeonLoop(
  gameState: GameState,
  dependencies: DungeonLoopDependencies
): Promise<boolean> {
  const random = dependencies.random ?? Math.random;

  while (true) {
    const locationName = getLocationDisplayName(gameState.player.currentLocation);

    clearScreen();
    await showTitle();
    showStats(gameState.player);
    showSeasonalEventSummary(gameState);
    showTrackedQuestSummary(gameState);
    const guidance = showContextGuidance(gameState, 'dungeon');

    const choice = await showDungeonMenu(
      locationName,
      true,
      guidance.recommendedAction as DungeonMenuOption | null
    );

    switch (choice) {
      case 'explore':
        showMessage('앞으로 나아갑니다...', 'info');
        await showLoading('탐색 중', 1500);

        gameState.position.locationId = gameState.player.currentLocation;
        gameState.position.stepsTaken += 1;

        if (random() < 0.6) {
          const result = await dependencies.runEncounter(gameState);

          if (result === 'defeat') {
            const continueGame = await dependencies.handlePlayerDeath(gameState);
            if (!continueGame) return false;
            if (isTownLocation(gameState.player.currentLocation)) {
              return true;
            }
          }
        } else {
          const eventRoll = random();
          if (eventRoll < 0.3) {
            const goldFound = Math.floor(random() * 30) + 10;
            gameState.player.gold += goldFound;
            gameState.statistics.goldEarned += goldFound;
            showMessage(`${goldFound} 골드를 발견했습니다!`, 'success');
          } else if (eventRoll < 0.5) {
            showMessage('체력 회복 샘을 발견했습니다!', 'success');
            gameState.player.stats.hp = Math.min(
              gameState.player.stats.hp + 30,
              gameState.player.stats.maxHp
            );
            showMessage('HP가 30 회복되었습니다.', 'info');
          } else {
            showMessage('아무것도 발견하지 못했습니다.', 'info');
          }
          await pressEnterToContinue('normal');
        }
        break;

      case 'rest':
        if (gameState.player.stats.hp < gameState.player.stats.maxHp * 0.5) {
          showMessage('너무 위험한 상태입니다. 안전한 곳에서 쉬세요.', 'warning');
        } else {
          showMessage('잠시 휴식을 취합니다...', 'info');
          await showLoading('휴식 중', 2000);
          const hpRestore = Math.floor(gameState.player.stats.maxHp * 0.3);
          const mpRestore = Math.floor(gameState.player.stats.maxMp * 0.2);
          gameState.player.stats.hp = Math.min(
            gameState.player.stats.hp + hpRestore,
            gameState.player.stats.maxHp
          );
          gameState.player.stats.mp = Math.min(
            gameState.player.stats.mp + mpRestore,
            gameState.player.stats.maxMp
          );
          showMessage(`HP ${hpRestore}, MP ${mpRestore} 회복!`, 'success');
        }
        await pressEnterToContinue('important');
        break;

      case 'travel':
        {
          const travelResult = await dependencies.handleTravel(gameState);
          if (travelResult.locationChanged && isTownLocation(gameState.player.currentLocation)) {
            return true;
          }
        }
        break;

      case 'menu':
        {
          const shouldContinue = await dependencies.inGameMenuLoop(gameState);
          if (!shouldContinue) return false;
        }
        break;
    }
  }
}
