import {
  acceptQuest,
  completeQuest,
  ensureQuestState,
  getAvailableQuests,
  updateQuestProgressOnExplore,
  updateQuestProgressOnTalk
} from '../src/systems/quest';
import { recordAiMoment } from '../src/systems/aiMemory';
import { createTestGameState } from './helpers/gameStateFactory';

describe('AI Contract Composer', () => {
  it('should compose frontier recon and cull contracts into the available quest board', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 3,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest']
      }
    });

    ensureQuestState(gameState);
    const availableQuestIds = getAvailableQuests(gameState).map(quest => quest.id);

    expect(availableQuestIds).toContain('ai-contract-frontier-recon');
    expect(availableQuestIds).toContain('ai-contract-frontier-cull');

    const reconQuest = gameState.quests['ai-contract-frontier-recon'];
    const cullQuest = gameState.quests['ai-contract-frontier-cull'];

    expect(reconQuest?.name).toContain('메모리 숲');
    expect(reconQuest?.repeatable).toBe(true);
    expect(reconQuest?.narrative?.category).toBe('contract');
    expect(reconQuest?.aiContract).toMatchObject({
      templateId: 'frontier-recon',
      directive: 'push',
      adaptive: false,
      sessionWindow: 'opening'
    });
    expect(cullQuest?.objectives[0]?.type).toBe('kill');
    expect(cullQuest?.aiContract).toMatchObject({
      templateId: 'frontier-cull',
      directive: 'push',
      adaptive: true
    });
  });

  it('should allow accepting and completing a dynamic recon contract, then retarget the slot to the next frontier', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 5,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest', 'cache-cave']
      }
    });

    ensureQuestState(gameState);

    const accepted = acceptQuest(gameState, 'ai-contract-frontier-recon');
    expect(accepted.success).toBe(true);

    const updates = updateQuestProgressOnExplore(gameState, 'memory-forest');
    expect(updates.some(update => update.questId === 'ai-contract-frontier-recon')).toBe(true);

    const completed = completeQuest(gameState, 'ai-contract-frontier-recon');
    expect(completed.success).toBe(true);
    expect(completed.repeatableReset).toBe(true);

    gameState.statistics.bossesDefeated.push('memory-leak-titan');

    const refreshedQuestIds = getAvailableQuests(gameState).map(quest => quest.id);
    const refreshedRecon = gameState.quests['ai-contract-frontier-recon'];

    expect(refreshedQuestIds).toContain('ai-contract-frontier-recon');
    expect(refreshedRecon?.name).toContain('캐시 동굴');
    expect(refreshedRecon?.objectives[0]?.targetId).toBe('cache-cave');
  });

  it('should pivot the adaptive slot into a recovery contract after a defeat-state signal', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 4,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest']
      }
    });
    gameState.player.stats.hp = Math.floor(gameState.player.stats.maxHp * 0.35);
    gameState.player.stats.mp = Math.floor(gameState.player.stats.maxMp * 0.25);
    recordAiMoment(gameState, {
      type: 'defeat',
      label: '비트 타운 후퇴',
      timestamp: 1700000000000
    });

    ensureQuestState(gameState);

    const availableQuestIds = getAvailableQuests(gameState).map(quest => quest.id);
    const recoveryQuest = gameState.quests['ai-contract-frontier-recovery'];

    expect(availableQuestIds).toContain('ai-contract-frontier-recovery');
    expect(availableQuestIds).not.toContain('ai-contract-frontier-cull');
    expect(recoveryQuest?.objectives[0]?.targetId).toBe('innkeeper');
    expect(recoveryQuest?.aiContract).toMatchObject({
      templateId: 'frontier-recovery',
      directive: 'recovery',
      adaptive: true,
      sessionWindow: 'opening'
    });
  });

  it('should pivot the adaptive slot into a supply contract during an extended session', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 5,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest', 'cache-cave']
      }
    });
    gameState.statistics.totalPlayTime = 45 * 60;
    gameState.player.inventory = Array.from({ length: 14 }, () => 'health-potion');

    ensureQuestState(gameState);

    const availableQuestIds = getAvailableQuests(gameState).map(quest => quest.id);
    const supplyQuest = gameState.quests['ai-contract-frontier-supply'];

    expect(availableQuestIds).toContain('ai-contract-frontier-supply');
    expect(availableQuestIds).not.toContain('ai-contract-frontier-cull');
    expect(supplyQuest?.objectives[0]?.targetId).toBe('merchant');
    expect(supplyQuest?.aiContract).toMatchObject({
      templateId: 'frontier-supply',
      directive: 'supply',
      adaptive: true,
      sessionWindow: 'extended'
    });

    const accepted = acceptQuest(gameState, 'ai-contract-frontier-supply');
    expect(accepted.success).toBe(true);
    const updates = updateQuestProgressOnTalk(gameState, 'merchant');
    expect(updates.some(update => update.questId === 'ai-contract-frontier-supply')).toBe(true);
  });
});
