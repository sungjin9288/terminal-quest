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
import { getAdventureFocusSummary, getRecommendedTravelDestination } from './adventureFocus.js';
import { getAiIntent } from './aiDirector.js';
import { recordAiMoment } from './aiMemory.js';
import { buildAiNarrativeCue } from './aiNarrator.js';
import { runDungeonEvent } from './dungeonEvents.js';
import {
  buildEncounterDirectorTelemetryPayload,
  coerceEncounterDirectorEventId,
  decideDungeonExploreOutcome,
  recordEncounterDirectorExploreOutcome,
  resetEncounterDirectorFatigue
} from './aiEncounterDirector.js';
import { trackTelemetryEvent } from './telemetry.js';
import { getRuntimeSettings } from '../runtime/settings.js';
import {
  formatAchievementRewardMessage,
  formatAchievementTrackingMessage,
  formatAchievementUnlockMessage,
  getAchievementTrackingTone,
  progressAchievements,
  recordRunGoldSpent
} from './achievements.js';

export type {
  EncounterResult,
  TownLoopDependencies,
  DungeonLoopDependencies
} from '../types/runtime.js';

function showAchievementUnlocks(gameState: GameState): void {
  const achievementResult = progressAchievements(gameState, {
    recordHistory: true,
    cause: '허브 활동'
  });
  for (const achievement of achievementResult.newlyUnlocked) {
    showMessage(formatAchievementUnlockMessage(achievement), 'success');
  }
  for (const rewardGrant of achievementResult.rewardGrants) {
    showMessage(formatAchievementRewardMessage(rewardGrant), 'success');
  }
  for (const entry of achievementResult.trackingHistory) {
    showMessage(formatAchievementTrackingMessage(entry), getAchievementTrackingTone(entry));
  }
}

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

function showAdventureFocus(gameState: GameState): void {
  const summary = getAdventureFocusSummary(gameState);
  if (!summary) {
    return;
  }

  const title =
    summary.tone === 'warning'
      ? chalk.yellow.bold('🎯 모험 포커스')
      : summary.tone === 'success'
        ? chalk.green.bold('🎯 모험 포커스')
        : chalk.cyan.bold('🎯 모험 포커스');

  console.log(title);
  summary.lines.slice(0, 2).forEach(line => {
    console.log(chalk.gray(`   ${line}`));
  });
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

  const intent = getAiIntent(gameState);
  const allowedActions = context === 'town'
    ? ['shop', 'inn', 'save', 'explore', 'travel', 'quest', 'menu']
    : ['explore', 'rest', 'travel', 'menu'];
  const rawRecommendedAction = intent?.recommendedAction ?? null;
  const recommendedAction = rawRecommendedAction &&
    allowedActions.includes(rawRecommendedAction) &&
    !(rawRecommendedAction === 'quest' && !hasQuestBoard)
    ? rawRecommendedAction as TownMenuOption | DungeonMenuOption
    : context === 'town'
      ? (hasQuestBoard ? 'quest' : 'explore')
      : 'explore';
  const displayed = intent?.lines?.length
    ? intent.lines.slice(0, 2)
    : [
        context === 'town'
          ? '퀘스트 확인 → 상점 정비 → 저장 순서로 다음 구간을 준비해 보세요.'
          : '탐험 2~3회마다 상태를 점검하고, 위험하면 즉시 이동해 손실을 줄이세요.'
      ];

  console.log(chalk.cyan.bold('🧭 추천 행동'));
  if (recommendedAction) {
    console.log(chalk.gray(`   기본 선택: ${getRecommendedActionLabel(recommendedAction)}`));
  }
  displayed.forEach(hint => {
    console.log(chalk.gray(`   • ${hint}`));
  });

  const narrativeCue = buildAiNarrativeCue(gameState);
  if (narrativeCue) {
    const cueTitle = narrativeCue.tone === 'warning'
      ? chalk.yellow.bold('🎙 동행 브리프')
      : narrativeCue.tone === 'success'
        ? chalk.green.bold('🎙 동행 브리프')
        : chalk.cyan.bold('🎙 동행 브리프');
    console.log(cueTitle);
    console.log(chalk.gray(`   ${narrativeCue.speaker} · ${narrativeCue.title}`));
    console.log(chalk.gray(`   ${narrativeCue.summary}`));
  }

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
    showAdventureFocus(gameState);

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
          recordRunGoldSpent(gameState, innRestCost);

          await applyTalkQuestProgress(gameState, ['innkeeper']);
          showMessage(`여관에서 휴식을 취합니다... (비용: ${innRestCost} 골드)`, 'info');
          await showLoading('휴식 중', 1500);
          gameState.player.stats.hp = gameState.player.stats.maxHp;
          gameState.player.stats.mp = gameState.player.stats.maxMp;
          resetEncounterDirectorFatigue(gameState, 'town');
          recordAiMoment(gameState, {
            type: 'rest',
            label: '여관 정비 완료'
          });
          showMessage(`HP와 MP가 완전히 회복되었습니다! (잔액: ${gameState.player.gold} 골드)`, 'success');
          showAchievementUnlocks(gameState);
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
          const recommendedDestinationId = getRecommendedTravelDestination(gameState);
          const travelResult = await dependencies.handleTravel(gameState, recommendedDestinationId);
          if (travelResult.locationChanged) {
            resetEncounterDirectorFatigue(gameState, 'travel');
            recordAiMoment(gameState, {
              type: 'travel',
              label: `${getLocationDisplayName(gameState.player.currentLocation)} 진입`
            });
          }
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
    showAdventureFocus(gameState);
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

        const decision = decideDungeonExploreOutcome(gameState, random);
        trackTelemetryEvent(
          'encounter_director_decision',
          gameState,
          buildEncounterDirectorTelemetryPayload(decision, 'terminal-runtime')
        );
        if (decision.mode !== 'steady') {
          showMessage(decision.reason, decision.mode === 'pressure' ? 'warning' : 'info');
        }

        if (decision.outcome === 'combat') {
          recordEncounterDirectorExploreOutcome(gameState, { outcome: 'combat' });
          const result = await dependencies.runEncounter(gameState);

          if (result === 'defeat') {
            const continueGame = await dependencies.handlePlayerDeath(gameState);
            if (!continueGame) return false;
            if (isTownLocation(gameState.player.currentLocation)) {
              resetEncounterDirectorFatigue(gameState, 'town');
            }
            if (isTownLocation(gameState.player.currentLocation)) {
              return true;
            }
          }
        } else {
          const eventResult = runDungeonEvent(gameState, random, {
            preferredEventId: coerceEncounterDirectorEventId(decision.preferredEventId)
          });
          recordEncounterDirectorExploreOutcome(gameState, {
            outcome: 'event',
            eventId: eventResult.id
          });
          for (const message of eventResult.messages) {
            showMessage(message.text, message.tone);
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
          resetEncounterDirectorFatigue(gameState, 'rest');
          recordAiMoment(gameState, {
            type: 'rest',
            label: '현장 휴식 완료'
          });
          showMessage(`HP ${hpRestore}, MP ${mpRestore} 회복!`, 'success');
        }
        await pressEnterToContinue('important');
        break;

      case 'travel':
        {
          const recommendedDestinationId = getRecommendedTravelDestination(gameState);
          const travelResult = await dependencies.handleTravel(gameState, recommendedDestinationId);
          if (travelResult.locationChanged) {
            recordAiMoment(gameState, {
              type: 'travel',
              label: `${getLocationDisplayName(gameState.player.currentLocation)} 진입`
            });
            if (isTownLocation(gameState.player.currentLocation)) {
              resetEncounterDirectorFatigue(gameState, 'travel');
            }
          }
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
