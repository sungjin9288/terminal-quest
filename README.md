# Terminal Quest

A terminal-based RPG adventure game built with Node.js and TypeScript.

## Overview

Terminal Quest is an immersive text-based RPG game that runs directly in your terminal. Embark on epic adventures, battle monsters, collect items, and level up your character - all from the command line!

## Features

- **Turn-based Combat System**: Strategic battles with damage calculation, critical hits, and elemental advantages
- **5 Character Classes**: Warrior, Mage, Rogue, Cleric, Ranger - each with unique stats
- **4 Difficulty Modes**: Story, Adventure, Challenge, Hardcore (permadeath)
- **Prefix System**: Monster and item prefixes for varied encounters
- **Element System**: Fire → Ice → Lightning → Poison → Dark element cycle with status effects
- **Shop System**: Buy weapons, armor, and potions from 3 different shops
- **Death Penalty System**: Mode-specific penalties on death
- **Save/Load System**: Manual saves at save points, emergency saves with tokens
- **Endgame Modifier Rotation**: Rotating abyss modifiers with risk/reward tuning per run
- **Seasonal Live Events**: Quarterly event rotation with encounter/quest reward modifiers
- **Telemetry-lite (Opt-in)**: Non-PII progression funnel events stored locally
- **Prompt Pace Mode**: Switch between streamlined auto-continue flow and classic Enter-confirm flow, with snappy/balanced/cinematic presets
- **Context Guide Hints**: Adaptive town/dungeon recommendations for safer progression and quest flow
- **Smart Action Focus**: Town/dungeon menus preselect recommended next action so Enter can fast-track common loops
- **First-Run Onboarding**: One-time quick-start guidance on first town entry for smoother early progression
- **12 Unique Locations**: From Memory Forest to Corruption Space

## Game World

### Act 1 - Foundation (Lv.1-12)
- **Memory Forest** (Lv.1-5): Starting area with basic monsters
- **Cache Cave** (Lv.5-8): Crystalline cavern
- **Bit Plains** (Lv.8-12): Binary winds and data constructs

### Act 2-4
- Registry Dungeon, Swap Swamp, Thread Forest
- Stack Mountains, Heap Cave, Network Layer
- Kernel Fortress, Root Directory, Corruption Space

## Tech Stack

- **Language**: TypeScript (ES2022)
- **Runtime**: Node.js (v18+)
- **CLI Libraries**:
  - `inquirer`: Interactive command-line prompts
  - `chalk`: Terminal string styling
  - `figlet`: ASCII art text
  - `cli-table3`: Table rendering
- **Testing**: Jest with ts-jest

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd terminal-quest

# One-command install + build + start
npm run play
```

Manual flow is still available:

```bash
npm install
npm run build
npm start
```

## How to Play

### Starting the Game
1. Run `npm run play` (or `npm start` if already built)
2. Select **New Game** or **Load Game**
3. Choose difficulty mode
4. Create your character (name + class)

### Controls
- **Arrow Keys**: Navigate menus
- **Enter**: Confirm selection
- **Esc**: Cancel/Back (in some menus)

### Town Actions
| Action | Description |
|--------|-------------|
| Shop | Buy/sell items |
| Inn | Restore HP/MP |
| Save | Save your progress |
| Travel | Move to another location |

### Dungeon Actions
| Action | Description |
|--------|-------------|
| Explore | Move forward (60% monster encounter) |
| Rest | Partial HP/MP recovery |
| Travel | Return to town or other areas |

### Combat Actions
| Action | Description |
|--------|-------------|
| Attack | Basic physical attack |
| Skill | Use special abilities (MP cost) |
| Item | Use consumable items |
| Defend | Reduce incoming damage |
| Escape | Attempt to flee |

## Game Systems

### Character Classes

| Class | HP | MP | ATK | DEF | SPD | Special |
|-------|----|----|-----|-----|-----|---------|
| Warrior | High | Low | High | High | Low | Tanky |
| Mage | Low | High | Low | Low | Med | Magic Power |
| Rogue | Med | Med | High | Low | High | Crit/Evasion |
| Cleric | Med | High | Low | Med | Med | Healing |
| Ranger | Med | Med | Med | Med | Med | Balanced |

### Difficulty Modes

| Mode | Death Penalty | Special |
|------|---------------|---------|
| Story | -10% Gold | Respawn at same location |
| Adventure | -30% Gold, -10% EXP, -50% consumables | Respawn at save point |
| Challenge | -50% Gold, -20% EXP, -100% consumables, 30% equipment loss | Level down possible |
| Hardcore | Save deleted | Permadeath, Soul Essence meta-progression |

### Element System

```
Fire → Ice → Lightning → Poison → Dark → Fire
         (30% bonus damage on advantage)
```

| Element | Status Effect |
|---------|---------------|
| Fire | Burn (DoT) |
| Ice | Freeze (skip turn) |
| Lightning | Stun (skip turn) |
| Poison | Poison (DoT) |
| Dark | +15% crit chance |

## Project Structure

```
terminal-quest/
├── src/
│   ├── types/          # TypeScript interfaces/enums
│   ├── systems/        # Game logic (combat, inventory, etc.)
│   ├── data/           # Data loaders (items, monsters, locations)
│   ├── ui/             # Display functions
│   ├── index.ts        # Entry point
│   └── game.ts         # Main game loop
├── data/               # JSON data files
│   ├── items.json      # 50+ items
│   ├── monsters.json   # 40+ monsters
│   ├── locations.json  # 12 locations
│   ├── shops.json      # 3 shops
│   └── prefixes.json   # Monster/item prefixes
├── tests/              # Jest test files
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm start` | Run the game |
| `npm run play` | One-command install/build/start launcher |
| `npm run dev` | Build and run |
| `npm run watch` | Watch mode |
| `npm test` | Run tests |
| `npm run clean` | Remove dist folder |
| `npm run validate:data` | Run data/quest/economy balance validations |
| `npm run validate:economy` | Run economy balance validation only |
| `npm run validate:playtime:extended` | Measure 25-30h full-completion target progress with anti-loose guardrails |
| `npm run balance:notes` | Generate dated live-balance patch notes from validators |
| `npm run verify:save-migration` | Run legacy save migration verification tests |
| `npm run verify:package-launch` | Launch built package entry once, auto-select Exit, and validate graceful startup/shutdown |
| `npm run verify:runtime-smoke` | Run focused runtime smoke scenario tests and write `releases/smoke-reports/runtime-smoke-latest.json` |
| `npm run verify:release-artifacts` | Validate packaged archive checksum (`.sha256`) and release manifest integrity |
| `npm run release:signoff -- --status` | Show current QA/Engineering/Release Manager sign-off state (`release-signoff-latest.json`) |
| `npm run release:signoff:all -- --by "<name>"` | Approve all sign-off roles at once for small-team release flow |
| `npm run release:check` | Run paid-release readiness gate (build/test/data checks) |
| `npm run release:smoke` | Run release smoke flow and generate markdown + JSON summaries under `releases/smoke-reports/` |
| `npm run release:candidate` | Final release candidate gate: run smoke + enforce version/commit/branch-matched sign-offs for current candidate |
| `npm run release:package` | Build versioned release bundle + changelog sync + archive checksum (`.sha256`) |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/combat.test.ts
```

## Development

### Adding New Features

1. **Types**: Define in `src/types/`
2. **Logic**: Implement in `src/systems/`
3. **UI**: Create in `src/ui/`
4. **Data**: Add JSON in `data/`

### Code Style

- TypeScript strict mode enabled
- ES2022 modules with `.js` import extensions
- Unused variables prefixed with `_`

## Paid Release Track

- Roadmap: `docs/paid-release-roadmap.md`
- Changelog: `CHANGELOG.md`
- Support policy: `docs/support-policy.md`
- Release gate: `npm run release:check`
- Release smoke report: `npm run release:smoke`
- Release candidate gate: `npm run release:candidate`
- Release sign-off status: `npm run release:signoff -- --status`
- Balance cadence: `docs/live-balance-cadence.md` (`npm run balance:notes`)
- Seasonal events: `docs/seasonal-events.md`
- Prompt priority policy: `docs/prompt-priority-policy.md`
- Telemetry event log path (when enabled): `telemetry/events.ndjson`

## Tips for Players

- Save frequently! Use save points in towns
- Buy health potions before exploring dungeons
- Check recommended levels before entering areas
- Equipment > Gold (gold can be lost on death)
- In Hardcore mode: when in doubt, flee!

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
