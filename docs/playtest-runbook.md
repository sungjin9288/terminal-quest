# 플레이테스트 런북 Playtest Runbook

온보딩, quest readability, fatigue, first-hour retention을 검증할 때는 isolated playtest profile을 사용합니다.

Frontend 전용 시나리오와 observation prompt는 `docs/frontend-playtest-checklist.md`에 정리돼 있습니다.

## 명령어 Commands

```bash
npm run playtest:setup
npm run playtest:start
npm run playtest:report
npm run playtest:reset
```

## 명령별 역할 What Each Command Does

- `npm run playtest:setup`
  - `playtest-data/active/` 생성
  - 권장 runtime setting seed 적용
  - 일반 `saves/`, `telemetry/`, `logs/`는 그대로 보존
- `npm run playtest:start`
  - 현재 프로젝트 build 수행
  - isolated save/settings/telemetry/log 디렉터리로 browser frontend server 실행
  - `http://localhost:4310`에서 dashboard 제공
  - `playtest-data/active/notes/`에 timestamped note template 생성
- `npm run playtest:start:terminal`
  - 현재 프로젝트 build 수행
  - 같은 isolated playtest profile로 legacy terminal client 실행
- `npm run frontend:playtest`
  - 현재 프로젝트 build 수행
  - 같은 isolated playtest profile로 browser frontend server 실행
  - `http://localhost:4310`에서 dashboard 제공
  - `playtest-data/active/notes/`에 timestamped note template 생성
- `npm run playtest:report`
  - active playtest workspace 기준 telemetry와 save slot 요약 출력
- `npm run playtest:reset`
  - isolated playtest data 전체 제거

## 활성 디렉터리 Active Directories

Playtest profile은 아래 경로에만 기록합니다:

- `playtest-data/active/saves/`
- `playtest-data/active/settings/`
- `playtest-data/active/telemetry/`
- `playtest-data/active/logs/`
- `playtest-data/active/notes/`

## 기본 프로필 Default Playtest Profile

초기 seed runtime setting은 다음과 같습니다:

- Text speed: `normal`
- Continue prompt mode: `streamlined`
- Auto pace: `balanced`
- Key hints: `on`
- Context hints: `on`
- Telemetry: `on` (`local only`, `non-PII`)

## 권장 세션 흐름 Recommended Session Flow

1. 첫 tester batch 시작 전에 `npm run playtest:setup`을 1회 실행합니다.
2. 표준 browser session은 `npm run playtest:start`로 시작합니다.
3. legacy CLI flow 비교가 필요할 때만 `npm run playtest:start:terminal`을 사용합니다.
4. `docs/frontend-playtest-checklist.md`의 scenario 순서를 따릅니다.
   Blind first run
   Resume and preview
   Short session stop and return
5. 관찰 내용은 `playtest-data/active/notes/` 아래 생성된 note file에 기록합니다.
6. 세션 종료 후 `npm run playtest:report`를 실행합니다.
7. 완전히 새 환경이 필요할 때만 `npm run playtest:reset`을 실행합니다.
