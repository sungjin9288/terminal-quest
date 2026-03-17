# 플레이테스트 런북 Playtest Runbook

온보딩, quest readability, fatigue, first-hour retention을 검증할 때는 isolated playtest profile을 사용합니다.

Frontend 전용 시나리오와 observation prompt는 `docs/frontend-playtest-checklist.md`에 정리돼 있습니다.

## 명령어 Commands

```bash
npm run playtest:setup
npm run playtest:start
npm run playtest:report
npm run playtest:report:json
npm run ai:insights:dry
npm run ai:backlog:dry
npm run ai:linear:dry
npm run ai:linear:export:dry
npm run ai:linear:sync:dry
npm run ai:ops:cycle
npm run ai:ops:cycle:dry
npm run ai:ops:cycle:apply
npm run ai:ops:cycle:gate
npm run ai:ops:cycle:gate:strict
npm run ai:ops:cycle:latest
npm run ai:ops:cycle:latest:json
npm run ai:ops:doctor
npm run ai:ops:doctor:json
npm run ai:ops:doctor:strict
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
  - landing hero에 `AI Ops Pulse` 카드가 나타나 현재 telemetry/note 기반 운영 우선순위를 즉시 보여줌
  - 런 시작 후에는 `Ops` 작업공간 탭에서 backlog draft, observation, recent AI signal을 더 자세히 확인 가능
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
  - `Ops doctor` 블록으로 최신 persisted cycle 기준 `ok / warn / fail` 운영 게이트와 권장 명령을 먼저 보여줌
  - `Ops status` 블록으로 현재 운영 상태를 `Cycle 실패`, `Cycle stale`, `Export 대기` 같은 한 줄 상태로 먼저 보여줌
  - build가 있으면 현재 Ops 상태 기준 `Next Command`도 함께 출력
  - `docs/ai-ops-cycle/latest.json`이 있으면 최근 persisted cycle의 PASS/FAIL, freshness, failed step, follow-up command도 같이 보여줌
  - 출력은 `[warning]`, `[recommended]`, `[success]` tone으로 구분되어 다음 운영 우선순위를 바로 읽을 수 있음
- `npm run playtest:report:json`
  - 같은 내용을 machine-readable JSON으로 출력
  - save/telemetry/note/Ops doctor/Ops status/next command/latest cycle health를 하나의 payload로 받아 자동화 스크립트나 후속 분석에 바로 연결 가능
- `npm run ai:insights:dry`
  - active telemetry + `notes/` markdown을 함께 읽어 AI 운영 요약과 playtest priority preview 출력
  - `npm run playtest:report:json > /tmp/playtest-report.json` 뒤 `npm run ai:insights:dry -- --report-json /tmp/playtest-report.json`처럼 structured report를 입력으로 재사용할 수 있음
- `npm run ai:backlog:dry`
  - 같은 입력을 기준으로 다음 패치/테스트용 `P0/P1/P2` backlog draft 출력
  - `--report-json`을 주면 report에 들어 있는 telemetry/note 경로를 그대로 사용
- `npm run ai:linear:dry`
  - 같은 입력을 기준으로 Linear issue로 옮기기 쉬운 markdown draft bundle 출력
  - `--report-json`을 주면 같은 playtest report payload 기준으로 draft를 생성
- `npm run ai:linear:export:dry`
  - `config/ai-ops-linear.json`의 기본 team/project/scope를 읽어 실제 export plan을 preview
  - 기본 설정은 `team = Sungjin-an`, `project = 없음`, `scope = P0`
  - `--report-json`을 주면 export 대상 계산도 같은 report가 가리키는 telemetry/note 입력을 기준으로 맞춰짐
- `npm run ai:linear:export`
  - `LINEAR_API_KEY`가 있으면 같은 draft를 실제 Linear 이슈로 생성/갱신
  - export 결과는 `docs/ai-linear-drafts/export-state.json`에 기록
  - 각 exported draft는 당시 telemetry baseline도 함께 저장되어 이후 Ops 탭에서 개선 여부를 비교
  - 브라우저 `Ops` 탭에서는 `미수출/동기화 완료`와 `개선/악화/유지/미측정` 필터로 draft를 바로 좁혀 볼 수 있음
- `npm run ai:linear:sync:dry`
  - 이미 export된 Linear issue가 있으면 원격 state를 조회해 `Done/In Progress/Canceled` 같은 상태가 어떻게 반영될지 preview
- `npm run ai:linear:sync`
  - `LINEAR_API_KEY`가 있으면 export state 파일의 issue 상태를 실제 Linear 기준으로 재동기화
  - 완료/취소된 이슈는 local export status도 `closed`로 정리되어 Ops 탭에 그대로 반영
  - 개선 효과까지 확인된 완료 항목은 Ops 탭에서 `shipped`로 보이며, 오래된 sync는 `stale sync` 경보로 드러남
  - landing `AI Ops Pulse`와 `Ops` 탭의 `Next Command`가 stale/pending/closed 상태에 맞는 다음 운영 명령을 바로 제안
- `npm run ai:ops:cycle`
  - `playtest-report -> insights -> backlog -> linear draft -> export preview -> sync preview`를 한 번에 실행
  - `docs/ai-ops-cycle/<timestamp>/`에 report JSON, 각 step raw output, summary JSON/MD, doctor JSON/MD, latest snapshot을 남김
  - persisted summary에는 `Ops status` 스냅샷도 같이 저장되어 artifact만으로 당시 운영 상태를 다시 읽을 수 있음
- `npm run ai:ops:cycle:dry`
  - 같은 순서를 임시 report JSON으로 실행하지만 persistent artifact는 남기지 않음
- `npm run ai:ops:cycle:apply`
  - 같은 cycle에서 Linear export와 sync를 실제 `--apply`로 실행
  - `LINEAR_API_KEY`가 필요하고, selected draft/sync candidate가 0건이면 no-op로 끝남
- `npm run ai:ops:cycle:gate`
  - 같은 cycle을 실행하되, persisted `Ops doctor` 판정이 `fail`이면 종료 코드도 실패로 승격
  - step 자체는 모두 통과했더라도 latest cycle health가 깨져 있으면 자동화 게이트로 사용할 수 있음
- `npm run ai:ops:cycle:gate:strict`
  - 같은 cycle을 실행하되, `Ops doctor`가 `warn`이어도 종료 코드를 실패로 처리
  - stale cycle, action-required 상태를 CI나 외부 자동화에서 hard gate로 다룰 때 사용
- `npm run ai:ops:cycle:latest`
  - 가장 최근 `ai:ops:cycle` artifact의 latest summary를 바로 읽어 PASS/FAIL, step 통과 수, snapshot command를 출력
  - latest 출력에도 persisted `Ops status` 라벨, action required 여부, 요약이 같이 포함됨
  - cycle age도 같이 출력되어, 마지막 persisted run이 오래됐으면 stale 상태를 바로 확인할 수 있음
  - FAIL일 때는 깨진 step 이름도 함께 출력되어 어느 단계부터 다시 볼지 바로 알 수 있음
  - browser landing `AI Ops Pulse`와 `Ops` 탭도 같은 latest cycle 요약을 함께 보여줌
  - stale cycle이면 두 표면에서 `cycle 갱신` follow-up이 나타나 `npm run ai:ops:cycle` 재실행이 바로 제안됨
  - 최근 cycle이 FAIL이면 두 표면에 `Cycle Follow-up` 명령이 같이 나타나 snapshot command를 바로 다시 확인할 수 있음
- `npm run ai:ops:cycle:latest:json`
  - 같은 latest summary를 machine-readable JSON으로 출력
  - freshness, passed/failed step count, failed step 목록, persisted `Ops status` snapshot까지 자동화가 직접 읽을 수 있음
- `npm run ai:ops:doctor`
  - latest persisted cycle을 기준으로 현재 운영 상태를 `ok / warn / fail`로 판정
  - 실패 cycle이면 `npm run ai:ops:cycle:latest`, stale이면 `npm run ai:ops:cycle`, action-required 상태면 persisted next command를 권장
- `npm run ai:ops:doctor:json`
  - 같은 판정을 machine-readable JSON으로 출력
  - 외부 자동화에서는 `--fail-on-warn` 옵션과 함께 사용해 stale/action-required 상태도 게이트로 승격 가능
- `npm run ai:ops:doctor:strict`
  - `ai:ops:doctor --fail-on-warn`의 npm 진입점
  - `warn`도 실패로 승격해 CI, preflight, release gate에서 바로 사용할 수 있음
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
6. 세션 종료 후 `npm run playtest:report`로 save/telemetry/note 현황을 확인합니다.
   자동화 파이프라인이나 외부 리포트로 넘길 때는 `npm run playtest:report:json`을 사용합니다.
7. 바로 이어서 `npm run ai:insights:dry`를 실행해 telemetry와 observation priority를 함께 검토합니다.
   자동화 파이프라인에서는 `npm run ai:insights:dry -- --report-json /tmp/playtest-report.json`처럼 같은 report JSON을 재사용합니다.
8. 이어서 `npm run ai:backlog:dry`로 실제 follow-up 후보를 `P0/P1/P2`로 정리합니다.
9. backlog를 실제 작업 항목으로 넘길 준비가 되면 `npm run ai:linear:dry`로 issue-ready draft를 확인합니다.
10. 이어서 `npm run ai:linear:export:dry`로 실제 create/update 대상과 범위를 검토합니다.
11. 실제 export가 필요할 때만 `LINEAR_API_KEY=... npm run ai:linear:export`를 실행합니다.
12. export 이후 진행 상태를 다시 반영하려면 `LINEAR_API_KEY=... npm run ai:linear:sync`를 실행합니다.
13. Ops 탭에서 `shipped`와 `stale sync` 배지를 확인해 효과 검증 여부와 재동기화 필요 항목을 구분합니다.
14. 완전히 새 환경이 필요할 때만 `npm run playtest:reset`을 실행합니다.

## 권장 자동화 흐름 Recommended Automation Flow

- 로컬 artifact bundle만 필요하면 `npm run ai:ops:cycle`
- CI나 외부 파이프라인에서 상태만 검토하면 `npm run ai:ops:cycle:dry`
- doctor를 hard gate로 써야 하면 `npm run ai:ops:doctor:strict`
- 전체 cycle 자체를 doctor 기준으로 막아야 하면 `npm run ai:ops:cycle:gate` 또는 `npm run ai:ops:cycle:gate:strict`
- 실제 Linear까지 밀어야 하면 `LINEAR_API_KEY=... npm run ai:ops:cycle:apply`
- 가장 최근 persisted 결과만 빠르게 보면 `npm run ai:ops:cycle:latest`
