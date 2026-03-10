# Terminal Quest

A Node.js + TypeScript 기반 RPG adventure game으로, terminal client와 browser frontend를 모두 지원합니다. 배포 기준으로는 `browser-only static build + localStorage save` 경로를 지원해 Vercel에 바로 올릴 수 있습니다.

## 개요 Overview

Terminal Quest는 장기 플레이를 전제로 설계한 long-form RPG campaign입니다. 기존 terminal flow에 더해 browser-based operations deck를 지원하며, quest, travel, combat, save/load를 한눈에 읽히는 UI로 진행할 수 있습니다.

## 현재 상태 Current Status

`2026-03-10` 기준, 프로젝트는 `release-candidate / frontend playtest-ready / Vercel static deploy-ready` 상태입니다.

- Browser frontend가 현재 primary playtest surface이며, quests, travel, market, combat, saves, logs, achievement routing을 one-screen workspace shell로 묶었습니다.
- Vercel용 static build는 `vercel-dist/`를 출력하고, runtime state와 save slot은 browser `localStorage`에 저장됩니다.
- Frontend flow에는 smart resume, resume preview, preview commit feedback, blocked-action recovery, session planning, reward horizon, momentum tracking, stop-and-return UX가 모두 구현되어 있습니다.
- Achievement tracking은 browser와 terminal 양쪽에 연결되어 있고, reward preview, guided resume target, tracking history, dedicated terminal achievement menu까지 포함합니다.
- Narrative presentation은 episode quest grouping, direct NPC line, voiced feed reaction, localized presentation text 중심으로 리팩토링되어 있습니다.
- `playtest-data/active/` 아래에 isolated browser playtest tooling이 있으며, frontend-specific checklist와 auto-generated session note template도 함께 제공합니다.
- Versioned release packaging, artifact checksum, runtime smoke check, sign-off flow, release smoke report까지 packaged distribution validation 경로가 갖춰져 있습니다.

### Validation Snapshot

- Automated quality gate: `npm run release:check` PASS
- Release smoke: `npm run release:smoke` PASS
- Release package + artifact verification: `npm run release:package`, `npm run verify:release-artifacts` PASS
- Automated tests: `53/53` suites, `285/285` tests PASS
- Balance targets: baseline first clear `32.59h`, extended first clear `33.97h`, extended full completion `44.62h`

### 지금 바로 가능한 것 What Is Ready Now

- Frontend/browser playtest with isolated saves, telemetry, logs, notes
- Vercel static deployment without server management
- `releases/` 기준 packaged release bundle generation
- External distribution 이전 package-level smoke validation

### 실제 유저 검증이 필요한 것 What Still Depends On Real Users

- Blind first-run comprehension
- Mid-session fatigue와 pacing perception
- Live player behavior 기준의 resume / preview clarity
- Long-session retention과 actual completion-time feel

## 핵심 기능 Features

- **Turn-based Combat System**: damage calculation, critical hit, elemental advantage가 있는 전략 전투
- **5 Character Classes**: Warrior, Mage, Rogue, Cleric, Ranger 각 클래스별 고유 stat 보유
- **4 Difficulty Modes**: Story, Adventure, Challenge, Hardcore(permadeath)
- **Prefix System**: monster/item prefix 기반의 varied encounter 구성
- **Element System**: Fire → Ice → Lightning → Poison → Dark cycle + status effect
- **Shop System**: 3개 상점에서 weapon, armor, potion 구매
- **Death Penalty System**: mode별 death penalty 차등 적용
- **Save/Load System**: save point manual save + token emergency save
- **Endgame Modifier Rotation**: run마다 risk/reward가 달라지는 rotating abyss modifier
- **Seasonal Live Events**: quarterly rotation 기반 encounter/quest reward modifier
- **Telemetry-lite (Opt-in)**: non-PII progression funnel event 로컬 저장
- **Prompt Pace Mode**: streamlined auto-continue와 classic Enter-confirm flow 전환 지원
- **Context Guide Hints**: safer progression을 위한 adaptive town/dungeon recommendation
- **Adventure Focus Guide**: next objective, recommended destination, boss approach progress를 가시화
- **Episode Quest Board**: main story, character episode, contract, seasonal run을 session-length preview와 함께 그룹화
- **Achievement Chase UX**: reward preview, pinned tracking, resume routing, browser/terminal achievement view 제공
- **Dungeon Event Variety**: supply cache, maintenance pocket, lore echo, shortcut scan 등 non-combat event 추가
- **Smart Action Focus**: 추천 action을 기본 선택으로 잡아 Enter 중심 플레이 가속
- **First-Run Onboarding**: first town entry에서 one-time quick-start guidance 제공
- **Browser Operations Frontend**: quest routing, travel, shopping, combat, save/load를 다루는 responsive web dashboard
- **12 Unique Locations**: Memory Forest부터 Corruption Space까지 총 12개 지역

## 게임 월드 Game World

### Act 1 - Foundation (Lv.1-12)
- **Memory Forest** (Lv.1-5): 기본 monster를 상대하는 starting area
- **Cache Cave** (Lv.5-8): crystalline cavern 스타일의 중간 지역
- **Bit Plains** (Lv.8-12): binary wind와 data construct가 등장하는 평원

### Act 2-4
- Registry Dungeon, Swap Swamp, Thread Forest
- Stack Mountains, Heap Cave, Network Layer
- Kernel Fortress, Root Directory, Corruption Space

## 기술 스택 Tech Stack

- **Language**: TypeScript (ES2022)
- **Runtime**: Node.js (v18+)
- **Deployment**: Vercel static hosting (`vercel-dist/`, browser-local save)
- **CLI Libraries**:
  - `inquirer`: interactive command-line prompt
  - `chalk`: terminal string styling
  - `figlet`: ASCII art text
  - `cli-table3`: table rendering
- **Testing**: Jest + ts-jest

## 설치 Installation

```bash
# Clone repository
git clone <repository-url>
cd terminal-quest

# One-command install + build + start
npm run play
```

Manual flow도 그대로 사용할 수 있습니다:

```bash
npm install
npm run build
npm start
```

Browser frontend 실행 flow:

```bash
npm install
npm run frontend:start
```

그다음 `http://localhost:4310`을 열면 됩니다.

Vercel용 static build flow:

```bash
npm install
npm run vercel:build
```

출력은 `vercel-dist/`에 생성됩니다. 이 build는 server process 없이 browser에서 직접 game runtime을 돌리고, save/load는 각 브라우저의 `localStorage`를 사용합니다.

## Vercel 배포 Vercel Deployment

Vercel project에는 아래 설정으로 연결하면 됩니다.

- Build Command: `npm run vercel:build`
- Output Directory: `vercel-dist`
- Framework Preset: `Other`

핵심 caveat:

- save data는 browser/device별 `localStorage`에 저장됩니다.
- browser storage를 지우면 해당 device의 save도 함께 사라집니다.
- server-side cloud save는 현재 포함되어 있지 않습니다.

상세 절차는 `docs/vercel-deployment.md`를 보면 됩니다.

## 플레이테스트 환경 Playtest Environment

새 save, local telemetry capture, separate crash log가 필요한 경우 isolated playtest profile을 사용하세요:

```bash
npm run playtest:setup
npm run playtest:start
npm run playtest:report
```

Playtest workspace는 `playtest-data/active/` 아래에 생성됩니다. 운영 메모는 `docs/playtest-runbook.md`, browser session checklist는 `docs/frontend-playtest-checklist.md`를 보면 됩니다.

## 플레이 방법 How to Play

### 게임 시작 Starting the Game
1. `npm run play` 실행 (`already built` 상태면 `npm start`도 가능)
2. **New Game** 또는 **Load Game** 선택
3. Difficulty mode 선택
4. Character 생성(name + class)

### 브라우저 프론트엔드 시작 Starting the Browser Frontend
1. 일반 실행은 `npm run frontend:start`, isolated playtest는 `npm run playtest:start`
2. `http://localhost:4310` 열기
3. 새 run 생성 또는 기존 slot load
4. Dashboard panel에서 quest, travel, combat, save를 진행

### 조작 Controls
- **Arrow Keys**: menu 이동
- **Enter**: 선택 확정
- **Esc**: 취소 / 뒤로 가기 (일부 메뉴)

### 마을 액션 Town Actions
| Action | Description |
|--------|-------------|
| Shop | item buy/sell |
| Inn | HP/MP 회복 |
| Save | 진행 상황 저장 |
| Travel | 다른 location으로 이동 |

### 던전 액션 Dungeon Actions
| Action | Description |
|--------|-------------|
| Explore | 전진 탐색 (`60%` monster encounter) |
| Rest | 부분 HP/MP recovery |
| Travel | town 또는 다른 area로 복귀 |

### 전투 액션 Combat Actions
| Action | Description |
|--------|-------------|
| Attack | 기본 physical attack |
| Skill | special ability 사용(MP cost) |
| Item | consumable item 사용 |
| Defend | incoming damage 감소 |
| Escape | 도주 시도 |

## 게임 시스템 Game Systems

### 캐릭터 클래스 Character Classes

| Class | HP | MP | ATK | DEF | SPD | Special |
|-------|----|----|-----|-----|-----|---------|
| Warrior | High | Low | High | High | Low | Tanky |
| Mage | Low | High | Low | Low | Med | Magic Power |
| Rogue | Med | Med | High | Low | High | Crit/Evasion |
| Cleric | Med | High | Low | Med | Med | Healing |
| Ranger | Med | Med | Med | Med | Med | Balanced |

### 난이도 Difficulty Modes

| Mode | Death Penalty | Special |
|------|---------------|---------|
| Story | -10% Gold | same location respawn |
| Adventure | -30% Gold, -10% EXP, -50% consumables | save point respawn |
| Challenge | -50% Gold, -20% EXP, -100% consumables, 30% equipment loss | level down 가능 |
| Hardcore | Save deleted | permadeath, Soul Essence meta-progression |

### 속성 시스템 Element System

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

## 프로젝트 구조 Project Structure

```
terminal-quest/
├── src/
│   ├── types/          # TypeScript interfaces/enums
│   ├── systems/        # Game logic (combat, inventory, etc.)
│   ├── frontend/       # Browser runtime + HTTP server
│   ├── data/           # Data loaders (items, monsters, locations)
│   ├── ui/             # Display functions
│   ├── index.ts        # Entry point
│   └── game.ts         # Main game loop
├── frontend/           # Browser app shell (HTML/CSS/JS)
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

## 스크립트 Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | TypeScript compile |
| `npm start` | 게임 실행 |
| `npm run play` | install/build/start one-command launcher |
| `npm run playtest:start` | isolated playtest mode로 browser frontend 실행 |
| `npm run playtest:start:terminal` | legacy terminal client를 isolated mode로 실행 |
| `npm run frontend:start` | browser frontend server를 `http://localhost:4310`에서 실행 |
| `npm run frontend:playtest` | isolated save/telemetry/log 기반 browser frontend 실행 |
| `npm run dev` | build + run |
| `npm run watch` | watch mode |
| `npm test` | test 실행 |
| `npm run clean` | `dist` 제거 |
| `npm run validate:data` | data/quest/economy balance validation 실행 |
| `npm run validate:economy` | economy balance만 검증 |
| `npm run validate:playtime:extended` | `30h+ first-clear / 44-50h full-completion` 목표 검증 |
| `npm run balance:notes` | validator 기반 dated live-balance patch note 생성 |
| `npm run verify:save-migration` | legacy save migration verification test 실행 |
| `npm run verify:package-launch` | built package를 1회 실행해 graceful startup/shutdown 검증 |
| `npm run verify:runtime-smoke` | focused runtime smoke test 후 JSON report 작성 |
| `npm run verify:release-artifacts` | packaged archive checksum 및 manifest integrity 검증 |
| `npm run release:signoff -- --status` | QA/Engineering/Release Manager sign-off 상태 출력 |
| `npm run release:signoff:all -- --by "<name>"` | small-team flow용 전체 sign-off 승인 |
| `npm run release:check` | paid-release readiness gate 실행 |
| `npm run release:smoke` | release smoke 실행 후 markdown/JSON summary 생성 |
| `npm run release:candidate` | final release candidate gate 실행 |
| `npm run release:package` | versioned release bundle + changelog sync + checksum 생성 |

## 테스트 Testing

```bash
# 전체 테스트 실행
npm test

# coverage 포함 실행
npm test -- --coverage

# 특정 테스트 파일 실행
npm test -- tests/combat.test.ts
```

## 개발 가이드 Development

### 새 기능 추가 Adding New Features

1. **Types**: `src/types/`에 정의
2. **Logic**: `src/systems/`에 구현
3. **UI**: `src/ui/` 또는 frontend layer에 추가
4. **Data**: `data/`에 JSON 추가

### 코드 스타일 Code Style

- TypeScript strict mode 사용
- ES2022 module + `.js` import extension 유지
- Unused variable은 `_` prefix 사용

## 유료 릴리스 트랙 Paid Release Track

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
- Telemetry event log path(활성화 시): `telemetry/events.ndjson`

## 플레이 팁 Tips for Players

- 자주 저장하세요. town save point를 적극적으로 쓰는 편이 좋습니다.
- 던전 진입 전 health potion을 먼저 확보하세요.
- 지역 진입 전 recommended level을 확인하세요.
- Equipment > Gold 입니다. Gold는 death penalty로 잃을 수 있습니다.
- Hardcore mode에서는 애매하면 싸우지 말고 flee가 정답입니다.

## License

MIT

## 기여 Contributing

Contribution은 언제든 환영합니다. 자유롭게 Pull Request를 보내주세요.
