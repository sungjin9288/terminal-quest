import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  GameState,
  Quest,
  QuestHistoryEntry
} from '../types/index.js';
import { getItemById } from '../data/items.js';
import {
  getAvailableQuests,
  getActiveQuests,
  getCompletedQuests,
  getCompletableQuests,
  acceptQuest,
  completeQuest,
  updateQuestProgressOnCollect,
  updateQuestProgressOnTalk,
  type QuestProgressUpdate
} from './quest.js';
import {
  countQuestHistoryEntriesByQuest,
  countQuestHistoryEntriesByType,
  filterQuestHistoryEntriesByQuest,
  filterQuestHistoryEntries,
  getQuestHistoryFilterLabel,
  getQuestHistoryTypeLabel,
  getQuestHistoryTypes,
  type QuestHistoryFilter
} from './questHistory.js';
import {
  ensureQuestHistoryState,
  QUEST_HISTORY_LIMIT
} from './gameStateMigration.js';
import { getSeasonalEventNameById } from './seasonalEvents.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import { confirmAction } from '../ui/menu.js';

const NO_QUEST_HISTORY_FILTER = '__without-quest__';
type QuestHistoryLimitMode = '12' | '30' | 'all';

interface QuestHistoryViewState {
  filter: QuestHistoryFilter;
  scope: string;
  limitMode: QuestHistoryLimitMode;
}

const DEFAULT_QUEST_HISTORY_VIEW_STATE: QuestHistoryViewState = {
  filter: 'all',
  scope: 'all',
  limitMode: '12'
};

let questHistoryViewState: QuestHistoryViewState = {
  ...DEFAULT_QUEST_HISTORY_VIEW_STATE
};

function pushQuestHistory(
  gameState: GameState,
  type: QuestHistoryEntry['type'],
  message: string,
  questId?: string
): void {
  ensureQuestHistoryState(gameState);

  gameState.questHistory.unshift({
    timestamp: Date.now(),
    type,
    message,
    questId
  });

  if (gameState.questHistory.length > QUEST_HISTORY_LIMIT) {
    gameState.questHistory.length = QUEST_HISTORY_LIMIT;
  }
}

function formatHistoryTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function showQuestDetails(quest: Quest): void {
  const statusText = quest.status === 'completed'
    ? chalk.green('완료')
    : quest.status === 'active'
      ? chalk.cyan('진행 중')
      : chalk.gray('미수락');

  console.log(chalk.yellow.bold(`\n📜 ${quest.name}`));
  console.log(chalk.gray(`  ${quest.description}`));
  console.log(chalk.white(`  상태: ${statusText} / 권장 레벨: ${quest.requiredLevel}`));

  for (const objective of quest.objectives) {
    const done = objective.currentAmount >= objective.requiredAmount;
    const progress = `${objective.currentAmount}/${objective.requiredAmount}`;
    const objectiveText = done
      ? chalk.green(`    ✓ ${objective.description} (${progress})`)
      : chalk.white(`    • ${objective.description} (${progress})`);
    console.log(objectiveText);
  }

  const rewardItems = quest.rewards.items
    .map(itemId => getItemById(itemId)?.name ?? itemId)
    .join(', ');
  console.log(chalk.gray(`  보상: EXP ${quest.rewards.exp}, GOLD ${quest.rewards.gold}, ITEMS [${rewardItems}]`));
  if (quest.repeatable) {
    console.log(chalk.cyan('  분류: 반복 퀘스트'));
  }
  if (quest.seasonalEventId) {
    const seasonalEventName = getSeasonalEventNameById(quest.seasonalEventId);
    console.log(chalk.yellow(`  시즌 제한: ${seasonalEventName ?? quest.seasonalEventId}`));
  }
}

async function previewQuestAndConfirm(
  quest: Quest,
  action: 'accept' | 'complete'
): Promise<boolean> {
  clearScreen();
  await showTitle();

  if (action === 'accept') {
    console.log(chalk.magenta.bold('\n📝 퀘스트 수락 확인\n'));
  } else {
    console.log(chalk.magenta.bold('\n🎁 퀘스트 완료 보상 수령 확인\n'));
  }

  showQuestDetails(quest);

  const confirmationMessage = action === 'accept'
    ? `${quest.name} 퀘스트를 수락하시겠습니까?`
    : `${quest.name} 보상을 수령하고 완료 처리하시겠습니까?`;
  return confirmAction(confirmationMessage);
}

function styleQuestHistoryTypeLabel(type: QuestHistoryEntry['type']): string {
  const baseLabel = getQuestHistoryTypeLabel(type);
  if (type === 'accepted') return chalk.cyan(baseLabel);
  if (type === 'progress') return chalk.yellow(baseLabel);
  if (type === 'ready') return chalk.green(baseLabel);
  if (type === 'completed') return chalk.green.bold(baseLabel);
  if (type === 'reward') return chalk.magenta(baseLabel);
  if (type === 'system') return chalk.gray(baseLabel);
  return chalk.white(baseLabel);
}

function formatQuestHistoryEntryText(entry: QuestHistoryEntry): string {
  return `[${formatHistoryTimestamp(entry.timestamp)}] ${getQuestHistoryTypeLabel(entry.type)} ${entry.message}`;
}

function showQuestHistory(
  gameState: GameState,
  options: {
    filter?: QuestHistoryFilter;
    limit?: number;
    questIdFilter?: string;
    withoutQuestIdOnly?: boolean;
    scopeLabel?: string;
  } = {}
): QuestHistoryEntry[] {
  ensureQuestHistoryState(gameState);
  const filter = options.filter ?? 'all';
  const limit = options.limit ?? 12;
  const scopeLabel = options.scopeLabel ?? '전체 퀘스트';

  console.log(
    chalk.magenta.bold(
      `\n🕘 최근 퀘스트 히스토리 (${getQuestHistoryFilterLabel(filter)} / ${scopeLabel})\n`
    )
  );
  if (gameState.questHistory.length === 0) {
    console.log(chalk.gray('기록된 퀘스트 로그가 없습니다.'));
    return [];
  }

  const typeFilteredEntries = filterQuestHistoryEntries(gameState.questHistory, filter);
  const filteredEntries = filterQuestHistoryEntriesByQuest(typeFilteredEntries, {
    questId: options.questIdFilter,
    withoutQuestIdOnly: options.withoutQuestIdOnly
  });

  if (filteredEntries.length === 0) {
    console.log(chalk.gray('선택한 필터에 해당하는 히스토리가 없습니다.'));
    return [];
  }

  const entries = filteredEntries.slice(0, Math.max(1, limit));
  for (const [index, entry] of entries.entries()) {
    const label = styleQuestHistoryTypeLabel(entry.type);
    const linePrefix = chalk.gray(`${index + 1}. [${formatHistoryTimestamp(entry.timestamp)}] `);
    console.log(linePrefix + label + ` ${entry.message}`);
  }

  if (filteredEntries.length > entries.length) {
    console.log(chalk.gray(`\n... ${filteredEntries.length - entries.length}개 기록이 더 있습니다.`));
  }

  return entries;
}

export function showQuestProgressUpdates(gameState: GameState, updates: QuestProgressUpdate[]): void {
  const announcedReadyQuest = new Set<string>();

  for (const update of updates) {
    const progressMessage =
      `[퀘스트] ${update.questName}: ${update.objectiveDescription} ` +
      `(${update.currentAmount}/${update.requiredAmount})`;
    showMessage(progressMessage, 'info');
    pushQuestHistory(gameState, 'progress', progressMessage, update.questId);

    if (update.questReadyToComplete && !announcedReadyQuest.has(update.questId)) {
      const readyMessage = `[퀘스트] ${update.questName} 완료 가능! 마을 게시판에서 보상을 수령하세요.`;
      showMessage(readyMessage, 'success');
      pushQuestHistory(gameState, 'ready', readyMessage, update.questId);
      announcedReadyQuest.add(update.questId);
    }
  }
}

export async function applyTalkQuestProgress(
  gameState: GameState,
  targetIds: string[]
): Promise<void> {
  const updates: QuestProgressUpdate[] = [];

  for (const targetId of targetIds) {
    updates.push(...updateQuestProgressOnTalk(gameState, targetId));
  }

  if (updates.length > 0) {
    showQuestProgressUpdates(gameState, updates);
    await pressEnterToContinue('important');
  }
}

export async function questBoardLoop(gameState: GameState): Promise<void> {
  ensureQuestHistoryState(gameState);

  while (true) {
    clearScreen();
    await showTitle();

    const talkUpdates = updateQuestProgressOnTalk(gameState, 'quest-board');
    if (talkUpdates.length > 0) {
      showQuestProgressUpdates(gameState, talkUpdates);
    }

    const availableQuests = getAvailableQuests(gameState);
    const activeQuests = getActiveQuests(gameState);
    const completedQuests = getCompletedQuests(gameState);
    const completableQuests = getCompletableQuests(gameState);

    console.log(chalk.magenta.bold('\n📋 퀘스트 게시판\n'));
    console.log(chalk.white(`진행 중: ${activeQuests.length} / 완료 가능: ${completableQuests.length}`));
    console.log(chalk.gray('─'.repeat(60)));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '무엇을 하시겠습니까?',
        choices: [
          {
            name: '📝 신규 퀘스트 수락',
            value: 'accept',
            disabled: availableQuests.length > 0 ? false : '수락 가능한 퀘스트 없음'
          },
          {
            name: '📌 진행 중인 퀘스트 보기',
            value: 'active',
            disabled: activeQuests.length > 0 ? false : '진행 중인 퀘스트 없음'
          },
          {
            name: '✅ 완료한 퀘스트 보기',
            value: 'completed',
            disabled: completedQuests.length > 0 ? false : '완료한 퀘스트 없음'
          },
          {
            name: '🎁 완료 보상 수령',
            value: 'complete',
            disabled: completableQuests.length > 0 ? false : '완료 가능한 퀘스트 없음'
          },
          {
            name: '🕘 최근 진행 히스토리',
            value: 'history',
            disabled: gameState.questHistory.length > 0 ? false : '기록된 히스토리 없음'
          },
          { name: chalk.gray('← 돌아가기'), value: 'back' }
        ]
      }
    ]);

    if (answer.action === 'back') {
      return;
    }

    if (answer.action === 'accept') {
      const questChoices = availableQuests.map(quest => ({
        name: (() => {
          if (!quest.seasonalEventId) {
            return `${quest.name} (Lv ${quest.requiredLevel})`;
          }

          const seasonalEventName = getSeasonalEventNameById(quest.seasonalEventId);
          const seasonalLabel = seasonalEventName ?? '시즌 이벤트';
          return `🌤 ${seasonalLabel} | ${quest.name} (Lv ${quest.requiredLevel})`;
        })(),
        value: quest.id
      }));
      questChoices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

      const questAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'questId',
          message: '수락할 퀘스트를 선택하세요:',
          choices: questChoices
        }
      ]);

      if (questAnswer.questId !== 'cancel') {
        const selectedQuest = availableQuests.find(quest => quest.id === questAnswer.questId);
        if (!selectedQuest) {
          showMessage('퀘스트 정보를 불러오지 못했습니다.', 'error');
          await pressEnterToContinue('important');
          continue;
        }

        const confirmed = await previewQuestAndConfirm(selectedQuest, 'accept');
        if (!confirmed) {
          showMessage('퀘스트 수락을 취소했습니다.', 'info');
          await pressEnterToContinue('important');
          continue;
        }

        clearScreen();
        await showTitle();
        const result = acceptQuest(gameState, questAnswer.questId);
        showMessage(result.message, result.success ? 'success' : 'error');
        if (result.success && result.quest) {
          pushQuestHistory(gameState, 'accepted', `${result.quest.name} 수락`, result.quest.id);
        }
      }

      await pressEnterToContinue('important');
      continue;
    }

    if (answer.action === 'active') {
      clearScreen();
      await showTitle();
      console.log(chalk.magenta.bold('\n📌 진행 중인 퀘스트\n'));

      for (const quest of activeQuests) {
        showQuestDetails(quest);
      }

      await pressEnterToContinue('important');
      continue;
    }

    if (answer.action === 'completed') {
      clearScreen();
      await showTitle();
      console.log(chalk.magenta.bold('\n✅ 완료한 퀘스트\n'));

      for (const quest of completedQuests) {
        showQuestDetails(quest);
      }

      await pressEnterToContinue('important');
      continue;
    }

    if (answer.action === 'history') {
      const historyCounts = countQuestHistoryEntriesByType(gameState.questHistory);
      const historyFilterChoices: Array<{
        name: string;
        value: QuestHistoryFilter | 'cancel';
        disabled?: string | false;
      }> = [
        {
          name: `전체 (${gameState.questHistory.length})`,
          value: 'all'
        }
      ];

      for (const historyType of getQuestHistoryTypes()) {
        const count = historyCounts[historyType];
        historyFilterChoices.push({
          name: `${getQuestHistoryTypeLabel(historyType)} (${count})`,
          value: historyType,
          disabled: count > 0 ? false : '기록 없음'
        });
      }

      historyFilterChoices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

      const historyAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'filter',
          message: '조회할 히스토리 필터를 선택하세요:',
          choices: historyFilterChoices,
          default: questHistoryViewState.filter
        }
      ]);

      if (historyAnswer.filter === 'cancel') {
        continue;
      }

      const selectedFilter = historyAnswer.filter as QuestHistoryFilter;
      const typeFilteredEntries = filterQuestHistoryEntries(gameState.questHistory, selectedFilter);
      const questCounts = countQuestHistoryEntriesByQuest(typeFilteredEntries);
      const orderedQuestIds: string[] = [];
      const seenQuestIds = new Set<string>();
      for (const entry of typeFilteredEntries) {
        if (!entry.questId) {
          continue;
        }
        if (!seenQuestIds.has(entry.questId)) {
          seenQuestIds.add(entry.questId);
          orderedQuestIds.push(entry.questId);
        }
      }

      const questScopeChoices: Array<{
        name: string;
        value: string | 'cancel';
      }> = [
        {
          name: `전체 퀘스트 (${typeFilteredEntries.length})`,
          value: 'all'
        }
      ];

      for (const questId of orderedQuestIds) {
        const count = questCounts.byQuestId[questId] ?? 0;
        const questName = gameState.quests[questId]?.name ?? questId;
        questScopeChoices.push({
          name: `${questName} (${count})`,
          value: questId
        });
      }

      if (questCounts.withoutQuestId > 0) {
        questScopeChoices.push({
          name: `퀘스트 연결 없음 (${questCounts.withoutQuestId})`,
          value: NO_QUEST_HISTORY_FILTER
        });
      }

      questScopeChoices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

      const scopeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'scope',
          message: '조회할 퀘스트 범위를 선택하세요:',
          choices: questScopeChoices,
          default: questScopeChoices.some(choice => choice.value === questHistoryViewState.scope)
            ? questHistoryViewState.scope
            : 'all'
        }
      ]);

      if (scopeAnswer.scope === 'cancel') {
        continue;
      }

      const selectedScope = scopeAnswer.scope as string;
      const selectedQuestId = selectedScope !== 'all' && selectedScope !== NO_QUEST_HISTORY_FILTER
        ? selectedScope
        : undefined;
      const withoutQuestIdOnly = selectedScope === NO_QUEST_HISTORY_FILTER;
      const scopeLabel = withoutQuestIdOnly
        ? '퀘스트 연결 없음'
        : selectedQuestId
          ? (gameState.quests[selectedQuestId]?.name ?? selectedQuestId)
          : '전체 퀘스트';
      const filteredCount = filterQuestHistoryEntriesByQuest(typeFilteredEntries, {
        questId: selectedQuestId,
        withoutQuestIdOnly
      }).length;

      const historyLimitChoices: Array<{
        name: string;
        value: QuestHistoryLimitMode | 'cancel';
        disabled?: string | false;
      }> = [
        {
          name: '최근 12개',
          value: '12',
          disabled: filteredCount > 12 ? false : '기록이 12개 이하입니다'
        },
        {
          name: '최근 30개',
          value: '30',
          disabled: filteredCount > 30 ? false : '기록이 30개 이하입니다'
        },
        {
          name: `전체 (${filteredCount})`,
          value: 'all'
        },
        {
          name: chalk.gray('← 취소'),
          value: 'cancel'
        }
      ];

      const lastLimitChoice = historyLimitChoices.find(
        choice => choice.value === questHistoryViewState.limitMode
      );
      const canUseLastLimitMode = Boolean(lastLimitChoice && !lastLimitChoice.disabled);
      const defaultLimitMode: QuestHistoryLimitMode = canUseLastLimitMode
        ? questHistoryViewState.limitMode
        : 'all';

      const limitAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'limit',
          message: '표시할 기록 개수를 선택하세요:',
          choices: historyLimitChoices,
          default: defaultLimitMode
        }
      ]);

      if (limitAnswer.limit === 'cancel') {
        continue;
      }

      const selectedLimitMode = limitAnswer.limit as QuestHistoryLimitMode;
      const selectedLimit = selectedLimitMode === 'all'
        ? filteredCount
        : Number(selectedLimitMode);

      questHistoryViewState = {
        filter: selectedFilter,
        scope: selectedScope,
        limitMode: selectedLimitMode
      };

      clearScreen();
      await showTitle();
      const displayedEntries = showQuestHistory(gameState, {
        filter: selectedFilter,
        limit: selectedLimit,
        questIdFilter: selectedQuestId,
        withoutQuestIdOnly,
        scopeLabel
      });

      const jumpCandidates: Array<{
        displayIndex: number;
        entry: QuestHistoryEntry;
        questId: string;
        questName: string;
      }> = [];

      for (const [index, entry] of displayedEntries.entries()) {
        if (!entry.questId) {
          continue;
        }
        const quest = gameState.quests[entry.questId];
        if (!quest) {
          continue;
        }

        jumpCandidates.push({
          displayIndex: index + 1,
          entry,
          questId: entry.questId,
          questName: quest.name
        });
      }

      if (jumpCandidates.length > 0) {
        const jumpChoices: Array<{
          name: string;
          value: number | 'back';
        }> = jumpCandidates.map(candidate => ({
          name:
            `${candidate.displayIndex}. ${candidate.questName} ← ` +
            formatQuestHistoryEntryText(candidate.entry),
          value: candidate.displayIndex
        }));
        jumpChoices.push({ name: chalk.gray('← 돌아가기'), value: 'back' });

        const jumpAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'entryIndex',
            message: '원본 퀘스트 상세로 이동할 로그를 선택하세요:',
            choices: jumpChoices
          }
        ]);

        if (jumpAnswer.entryIndex !== 'back') {
          const selectedCandidate = jumpCandidates.find(
            candidate => candidate.displayIndex === jumpAnswer.entryIndex
          );
          if (selectedCandidate) {
            const targetQuest = gameState.quests[selectedCandidate.questId];
            if (targetQuest) {
              clearScreen();
              await showTitle();
              console.log(chalk.magenta.bold('\n🔎 히스토리 원본 퀘스트\n'));
              console.log(chalk.gray(`선택 로그: ${formatQuestHistoryEntryText(selectedCandidate.entry)}`));
              showQuestDetails(targetQuest);
              await pressEnterToContinue('important');
              continue;
            }
          }

          showMessage('선택한 로그의 원본 퀘스트를 찾을 수 없습니다.', 'warning');
          await pressEnterToContinue('important');
          continue;
        }
      }

      await pressEnterToContinue('important');
      continue;
    }

    if (answer.action === 'complete') {
      const completeChoices = completableQuests.map(quest => ({
        name: quest.name,
        value: quest.id
      }));
      completeChoices.push({ name: chalk.gray('← 취소'), value: 'cancel' });

      const completeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'questId',
          message: '보상을 수령할 퀘스트를 선택하세요:',
          choices: completeChoices
        }
      ]);

      if (completeAnswer.questId !== 'cancel') {
        const selectedQuest = completableQuests.find(quest => quest.id === completeAnswer.questId);
        if (!selectedQuest) {
          showMessage('퀘스트 정보를 불러오지 못했습니다.', 'error');
          await pressEnterToContinue('important');
          continue;
        }

        const confirmed = await previewQuestAndConfirm(selectedQuest, 'complete');
        if (!confirmed) {
          showMessage('퀘스트 보상 수령을 취소했습니다.', 'info');
          await pressEnterToContinue('important');
          continue;
        }

        clearScreen();
        await showTitle();
        const result = completeQuest(gameState, completeAnswer.questId);
        showMessage(result.message, result.success ? 'success' : 'error');

        if (result.success) {
          if (result.quest) {
            pushQuestHistory(gameState, 'completed', `${result.quest.name} 완료`, result.quest.id);
          }
          showMessage(`보상: EXP +${result.expGained}, GOLD +${result.goldGained}`, 'info');
          if (result.bonusExpGained > 0 || result.bonusGoldGained > 0) {
            showMessage(
              `시즌 보너스 적용: EXP +${result.bonusExpGained}, GOLD +${result.bonusGoldGained}`,
              'success'
            );
          }
          if (result.quest) {
            pushQuestHistory(
              gameState,
              'reward',
              `${result.quest.name} 보상 수령 (EXP +${result.expGained}, GOLD +${result.goldGained})`,
              result.quest.id
            );
          }
          if (result.itemsAdded.length > 0) {
            const itemNames = result.itemsAdded.map(itemId => getItemById(itemId)?.name ?? itemId);
            showMessage(`획득 아이템: ${itemNames.join(', ')}`, 'info');

            const itemCounts = new Map<string, number>();
            for (const itemId of result.itemsAdded) {
              itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
            }
            for (const [itemId, count] of itemCounts) {
              const questUpdates = updateQuestProgressOnCollect(gameState, itemId, count);
              if (questUpdates.length > 0) {
                showQuestProgressUpdates(gameState, questUpdates);
              }
            }
          }
          if (result.itemsFailed.length > 0) {
            const failedItemNames = result.itemsFailed.map(itemId => getItemById(itemId)?.name ?? itemId);
            showMessage(`인벤토리 가득 참: ${failedItemNames.join(', ')}`, 'warning');
          }
          if (result.unlockedLocations.length > 0) {
            showMessage(`신규 해금 지역: ${result.unlockedLocations.join(', ')}`, 'success');
          }
          if (result.levelsGained > 0) {
            showMessage(`레벨 업! Lv ${result.oldLevel} -> Lv ${result.newLevel}`, 'success');
          }
          if (result.repeatableReset) {
            showMessage('반복 퀘스트가 초기화되어 다시 수락할 수 있습니다.', 'info');
          }
        }
      }

      await pressEnterToContinue('important');
    }
  }
}
