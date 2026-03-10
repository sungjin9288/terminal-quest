/**
 * Terminal Quest - Type Definitions Index
 * Central export point for all game types
 */

// Character types
export {
  Stats,
  CharacterClass,
  EquipmentSlot,
  Equipment,
  StatusEffect,
  ActiveStatusEffect,
  Player,
  Skill
} from './character.js';

// Item types
export {
  ItemRarity,
  ItemType,
  WeaponType,
  ArmorType,
  ElementType,
  ItemPrefix,
  Item,
  Weapon,
  Armor,
  Consumable,
  ConsumableEffect,
  Material,
  QuestItem,
  SetBonus,
  AnyItem
} from './item.js';

// Monster types
export {
  MonsterType,
  MonsterRank,
  MonsterPrefix,
  DropTableEntry,
  DropTable,
  AIBehavior,
  Monster,
  MonsterSpawn,
  EnemyParty,
  MonsterInstance
} from './monster.js';

// Location types
export {
  LocationType,
  LocationDifficulty,
  PointOfInterest,
  SavePoint,
  LocationConnection,
  EnvironmentalHazard,
  Location,
  Region,
  FastTravelPoint,
  PlayerPosition
} from './location.js';

// Game types
export {
  GameMode,
  GameModeConfig,
  QuestObjectiveType,
  QuestObjective,
  QuestStatus,
  QuestCategory,
  QuestFatigueClass,
  QuestNarrative,
  Quest,
  QuestHistoryType,
  QuestHistoryEntry,
  CombatState,
  CombatEncounter,
  GameStateType,
  GameStatistics,
  GameState,
  SaveData,
  SaveFileMetadata,
  GameConfig
} from './game.js';

// Achievement types
export {
  AchievementCategory,
  AchievementAccent,
  AchievementUnlockState,
  AchievementState,
  AchievementTrackingMode,
  AchievementTrackingHistoryType,
  AchievementTrackingHistoryEntry,
  AchievementTrackingState,
  AchievementPerkState,
  AchievementStatisticCountKey,
  AchievementStatisticFlagKey,
  AchievementRule,
  AchievementRewardItem,
  AchievementRewardShopTierUnlock,
  AchievementReward,
  AchievementDefinition,
  AchievementRewardGrant,
  RunSummary,
  AchievementProgress,
  AchievementView
} from './achievement.js';

// Save types
export {
  SaveSlot,
  SaveType,
  SaveSlotMetadata,
  SaveResult,
  LoadResult
} from './save.js';

// Runtime flow types
export {
  MainMenuChoice,
  EncounterResult,
  TravelResult,
  ShopMenuHandler,
  SaveGameHandler,
  TravelHandler,
  InGameMenuHandler,
  RunEncounterHandler,
  HandlePlayerDeathHandler,
  InGameMenuDependencies,
  TownLoopDependencies,
  DungeonLoopDependencies,
  TownLoopHandler,
  DungeonLoopHandler,
  InGameMenuLoopHandler,
  GameRuntimeDependencies,
  ShowMainMenuHandler,
  StartNewGameHandler,
  LoadGameHandler,
  ListSavesHandler,
  OpenSettingsHandler,
  GameLoopHandler,
  MainMenuRuntimeDependencies
} from './runtime.js';
