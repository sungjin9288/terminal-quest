export type AchievementCategory =
  | 'quest'
  | 'economy'
  | 'exploration'
  | 'boss'
  | 'act'
  | 'challenge';

export type AchievementAccent =
  | 'quest'
  | 'reward'
  | 'unlock'
  | 'boss'
  | 'act'
  | 'clear';

export interface AchievementUnlockState {
  unlockedAt: number;
  rewardGrantedAt?: number;
}

export interface AchievementState {
  unlocked: Record<string, AchievementUnlockState>;
}

export type AchievementTrackingMode = 'auto' | 'pinned';

export type AchievementTrackingHistoryType =
  | 'tracked'
  | 'switched'
  | 'completed'
  | 'cleared'
  | 'mode';

export interface AchievementTrackingHistoryEntry {
  timestamp: number;
  type: AchievementTrackingHistoryType;
  message: string;
  achievementId?: string;
  achievementTitle?: string;
  progress?: string;
  mode?: AchievementTrackingMode;
  cause?: string;
}

export interface AchievementTrackingState {
  mode: AchievementTrackingMode;
  achievementId: string | null;
  updatedAt: number;
  history: AchievementTrackingHistoryEntry[];
}

export type AchievementRule =
  | {
      kind: 'stat_at_least';
      stat: 'questsCompleted' | 'goldSpent' | 'locationsDiscovered';
      target: number;
    }
  | {
      kind: 'boss_count_at_least';
      target: number;
    }
  | {
      kind: 'flag_true';
      flag: string;
    }
  | {
      kind: 'run_flawless_boss_clear';
    };

export interface AchievementRewardItem {
  itemId: string;
  quantity: number;
}

export interface AchievementReward {
  gold?: number;
  skillPoints?: number;
  items?: AchievementRewardItem[];
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  accent: AchievementAccent;
  rule: AchievementRule;
  reward?: AchievementReward;
}

export interface AchievementRewardGrant {
  achievementId: string;
  achievementTitle: string;
  goldGranted: number;
  skillPointsGranted: number;
  itemsAdded: AchievementRewardItem[];
  itemsFailed: AchievementRewardItem[];
}

export interface RunSummary {
  startedAt: number;
  updatedAt: number;
  activeLocationId: string | null;
  damageTaken: number;
  goldEarned: number;
  goldSpent: number;
  questsCompleted: number;
  itemsCollected: number;
  bossesDefeated: string[];
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementView {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  accent: AchievementAccent;
  unlocked: boolean;
  unlockedAt?: number;
  progress: AchievementProgress;
}
