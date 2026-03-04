import chalk from 'chalk';
import { GameState } from '../types/index.js';
import {
  TownLoopDependencies,
  DungeonLoopDependencies
} from '../types/runtime.js';
import {
  getLocationDisplayName,
  getLocationById,
  isTownLocation
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
  showDungeonMenu
} from '../ui/travel.js';
import {
  applyTalkQuestProgress,
  questBoardLoop
} from './questUi.js';
import { getQuestTrackerSummary } from './questTracker.js';
import { canAffordCost, getInnRestCost } from './economy.js';
import { getActiveSeasonalEvent } from './seasonalEvents.js';

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

    const choice = await showTownMenu(locationName, hasQuestBoard);

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
            await pressEnterToContinue();
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
          await pressEnterToContinue();
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
        await pressEnterToContinue();
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
          await pressEnterToContinue();
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

    const choice = await showDungeonMenu(locationName, true);

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
          await pressEnterToContinue();
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
        await pressEnterToContinue();
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
