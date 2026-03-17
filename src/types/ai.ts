export type AiDirectorMode = 'off' | 'light' | 'full';
export type AiNarrativeMode = 'off' | 'light' | 'full';
export type AiIntentTone = 'info' | 'success' | 'warning';
export type EncounterDirectorMode = 'steady' | 'recovery' | 'variety' | 'pressure';
export type EncounterDirectorPreferredEventId =
  | 'supply-cache'
  | 'maintenance-niche'
  | 'memory-echo'
  | 'route-scan';
export type AiMomentType =
  | 'new-game'
  | 'quest-accepted'
  | 'quest-completed'
  | 'travel'
  | 'rest'
  | 'purchase'
  | 'boss-victory'
  | 'defeat'
  | 'achievement-unlocked';
export type AiIntentKind =
  | 'quest-turn-in'
  | 'quest-objective'
  | 'boss-approach'
  | 'frontier'
  | 'recovery'
  | 'inventory-pressure'
  | 'new-quest'
  | 'achievement-track'
  | 'steady-progress';
export type AiRecommendationAction =
  | 'quest'
  | 'travel'
  | 'explore'
  | 'inn'
  | 'rest'
  | 'shop'
  | 'save'
  | 'menu';

export interface AiIntent {
  id: string;
  kind: AiIntentKind;
  title: string;
  reason: string;
  tone: AiIntentTone;
  confidence: number;
  createdAt: number;
  recommendedAction: AiRecommendationAction | null;
  recommendedLocationId: string | null;
  lines: string[];
  targetQuestId?: string;
  targetAchievementId?: string;
}

export interface AiFatigueSnapshot {
  repeatActionCount: number;
  consecutiveCombats: number;
  consecutiveNonProgressLoops: number;
}

export interface AiEncounterDirectorPreview {
  mode: EncounterDirectorMode;
  encounterChance: number;
  preferredEventId: EncounterDirectorPreferredEventId | null;
  reason: string;
  fatigueSnapshot: AiFatigueSnapshot;
  challengeContext?: {
    tier: number;
    streak: number;
    modifierId: string | null;
    modifierName: string | null;
  } | null;
}

export interface AiMoment {
  type: string;
  label: string;
  timestamp: number;
}

export interface AiNarrativeCue {
  speaker: string;
  title: string;
  summary: string;
  beats: string[];
  tone: AiIntentTone;
}

export interface AiState {
  directorMode: AiDirectorMode;
  narrativeMode: AiNarrativeMode;
  currentIntent: AiIntent | null;
  fatigueSnapshot: AiFatigueSnapshot;
  memory: {
    recentMoments: AiMoment[];
  };
}
