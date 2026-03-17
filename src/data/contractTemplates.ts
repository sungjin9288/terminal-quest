import { QuestFatigueClass, type AiContractDirective } from '../types/game.js';

export type AiContractTemplateId =
  | 'frontier-recon'
  | 'frontier-cull'
  | 'frontier-recovery'
  | 'frontier-supply';

export interface AiContractTemplate {
  id: AiContractTemplateId;
  questId: string;
  chapterLabel: string;
  featuredNpc: string;
  fatigueClass: QuestFatigueClass;
  directive: AiContractDirective;
}

const AI_CONTRACT_TEMPLATES: AiContractTemplate[] = [
  {
    id: 'frontier-recon',
    questId: 'ai-contract-frontier-recon',
    chapterLabel: '동적 계약. 전선 정찰',
    featuredNpc: '동행 기록관',
    fatigueClass: QuestFatigueClass.Short,
    directive: 'push'
  },
  {
    id: 'frontier-cull',
    questId: 'ai-contract-frontier-cull',
    chapterLabel: '동적 계약. 압력 제거',
    featuredNpc: '전초 브리퍼',
    fatigueClass: QuestFatigueClass.Medium,
    directive: 'push'
  },
  {
    id: 'frontier-recovery',
    questId: 'ai-contract-frontier-recovery',
    chapterLabel: '동적 계약. 회복 루프',
    featuredNpc: '복구 브리퍼',
    fatigueClass: QuestFatigueClass.Short,
    directive: 'recovery'
  },
  {
    id: 'frontier-supply',
    questId: 'ai-contract-frontier-supply',
    chapterLabel: '동적 계약. 보급 재정렬',
    featuredNpc: '보급 브리퍼',
    fatigueClass: QuestFatigueClass.Short,
    directive: 'supply'
  }
];

export function getAiContractTemplates(): AiContractTemplate[] {
  return AI_CONTRACT_TEMPLATES.map(template => ({ ...template }));
}
