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
  Quest,
  CombatState,
  CombatEncounter,
  GameStateType,
  GameStatistics,
  GameState,
  SaveData,
  SaveFileMetadata,
  GameConfig
} from './game.js';

// Save types
export {
  SaveSlot,
  SaveType,
  SaveSlotMetadata,
  SaveResult,
  LoadResult
} from './save.js';
