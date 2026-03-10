# 내부 AI 로드맵 Internal AI Roadmap

## 목표

Terminal Quest 안에 `내부 AI 계층`을 추가해 아래 4가지를 동시에 올린다.

- 첫 30분 이해도
- 세션 재개율과 이탈 복귀율
- 반복 플레이의 신선도
- 같은 콘텐츠 양으로 체감 가치를 높이는 운영 효율

이 로드맵에서 말하는 AI는 먼저 `로컬/결정론 기반 디렉터`를 의미한다. 외부 LLM 연결은 선택 옵션으로만 다루고, 핵심 재미 루프는 오프라인에서도 완전히 동작해야 한다.

## 현재 기반

이미 다음 기반이 갖춰져 있다.

- `src/systems/adventureFocus.ts`
  현재 상황에 맞는 추천 이동과 보상 미리보기
- `src/frontend/runtime.ts`, `frontend/app.js`
  smart resume, action rail, momentum, reward horizon
- `src/frontend/feedVoices.ts`
  지역/보스/상점 반응형 보이스 피드
- `src/data/questNarratives.ts`, `src/systems/questPresentation.ts`
  퀘스트 분류, 세션 길이, 서사 메타
- `src/systems/telemetry.ts`
  opt-in 로컬 telemetry
- `docs/playtest-runbook.md`, `docs/frontend-playtest-checklist.md`
  플레이테스트 절차와 관찰 질문

즉, 완전히 새 AI를 만드는 단계가 아니라 이미 있는 추천/브리핑/피드 계층을 `하나의 판단 엔진`으로 묶는 단계가 맞다.

## 원칙

- `로컬 우선`
  기본 동작은 TypeScript 룰 엔진으로 완결한다.
- `설명 가능`
  추천은 항상 이유를 텍스트로 설명할 수 있어야 한다.
- `재미 우선`
  정답 자동화가 아니라 긴장, 보상 기대, 서사 맥락을 강화해야 한다.
- `세이브 안전`
  AI 상태는 작은 구조로 저장하고, 마이그레이션 가능해야 한다.
- `옵션화`
  AI 개입 강도는 설정에서 조절하거나 끌 수 있어야 한다.

## 만들 AI 축

### 1. Session Director AI

플레이어의 현재 자원, 퀘스트 상태, 최근 행동, 세션 길이, 업적 추적 상태를 읽고 `지금 무엇을 해야 재미가 가장 덜 끊기는지` 판단한다.

기능:

- 다음 행동 추천 정확도 강화
- 반복 행동 감지 후 루프 전환 제안
- 세션 종료 타이밍 추천
- 위험 과다/보상 부족 구간에서 완급 조절
- 업적 추적, 퀘스트, 경제, 보스 접근 중 무엇을 우선할지 동적 재정렬

주요 연결 지점:

- `src/systems/adventureFocus.ts`
- `src/systems/gameplayLoop.ts`
- `src/frontend/runtime.ts`
- `frontend/app.js`

신규 모듈 제안:

- `src/types/ai.ts`
- `src/systems/aiDirector.ts`
- `src/systems/aiContext.ts`

### 2. Narrative Companion AI

현재 상태를 읽고 짧은 보이스/브리핑/회고를 생성해 플레이에 의미를 붙인다. 목표는 장문 생성보다 `짧지만 정확한 감정적 맥락`이다.

기능:

- 지역/보스/퀘스트 진척에 따른 동적 브리핑
- 연속 실패, 무결점 진행, 아슬아슬한 생존 같은 순간의 반응 강화
- 추적 업적/시즌 이벤트/엔드게임 도전에 맞는 전용 카피
- 최근 3~5개 행동을 기억한 회고 로그

주요 연결 지점:

- `src/frontend/feedVoices.ts`
- `src/data/questNarratives.ts`
- `src/systems/questUi.ts`
- `src/systems/encounterFlow.ts`

신규 모듈 제안:

- `src/systems/aiNarrator.ts`
- `src/systems/aiMemory.ts`

### 3. Contract Composer AI

정적 퀘스트만으로는 반복 플레이 가치가 제한된다. 기존 데이터와 템플릿을 조합해 `상황 맞춤형 계약`을 만든다.

기능:

- 현재 act, 해금 지역, 최근 사용 아이템, 최근 방문 지역 기준 계약 생성
- 짧은 세션용 계약과 긴 세션용 계약 분리
- 시즌/업적/경제 상태를 읽어 적절한 계약 우선 공급
- 보상은 기존 economy guardrail 안에서만 산출

주의:

- 자유 생성이 아니라 `템플릿 + 슬롯 채우기 + 보상 캡` 구조로 제한한다.
- 첫 단계에서는 메인 스토리나 핵심 progression quest를 건드리지 않는다.

주요 연결 지점:

- `src/data/quests.ts`
- `src/systems/quest.ts`
- `src/systems/playtimeBalance.ts`
- `src/systems/questPresentation.ts`

신규 모듈 제안:

- `src/systems/aiContractComposer.ts`
- `src/data/contractTemplates.ts`

### 4. Encounter Director AI

전투와 탐험의 체감 리듬을 조절한다. 난이도 자체보다 `긴장-해소-보상` 주기를 다듬는 역할이 핵심이다.

기능:

- 최근 교전 길이와 자원 소모 기준으로 다음 이벤트 성향 조절
- 과도한 반복 전투 감지 시 dungeon event 비중 상향
- 보스 접근 직전 긴장감 강화
- 죽음 직전 연속 손실 구간 완화
- 엔드게임에선 반대로 패턴 해석과 압박을 강화

주요 연결 지점:

- `src/systems/encounterFlow.ts`
- `src/systems/battle.ts`
- `src/systems/dungeonEvents.ts`
- `src/systems/endgameChallenge.ts`

신규 모듈 제안:

- `src/systems/aiEncounterDirector.ts`

### 5. Ops Analyst AI

플레이 바깥의 운영용 AI다. 로컬 telemetry와 save snapshot을 읽어 `어디가 재미를 깎는지` 요약한다.

기능:

- 첫 이탈 지점, 반복 루프 과밀, 추천 무시 패턴 탐지
- 업적 추적 사용률, smart resume 수용률, 세션 종료 위치 분석
- patch note 후보와 밸런스 경고 초안 생성
- playtest note와 telemetry를 합쳐 관찰 우선순위 제안

주요 연결 지점:

- `src/systems/telemetry.ts`
- `docs/playtest-runbook.md`
- `docs/frontend-playtest-checklist.md`
- balance validation scripts

신규 모듈/스크립트 제안:

- `src/systems/aiOpsInsights.ts`
- `scripts/generate-ai-insights-report.js`

## 저장 구조 제안

`GameState`에 아래 구조를 추가한다.

```ts
interface AiState {
  directorMode: 'off' | 'light' | 'full';
  narrativeMode: 'off' | 'light' | 'full';
  currentIntent: null | {
    id: string;
    kind: 'quest' | 'travel' | 'market' | 'achievement' | 'recovery' | 'boss';
    title: string;
    reason: string;
    confidence: number;
    createdAt: number;
  };
  fatigueSnapshot: {
    repeatActionCount: number;
    consecutiveCombats: number;
    consecutiveNonProgressLoops: number;
  };
  memory: {
    recentMoments: Array<{
      type: string;
      label: string;
      timestamp: number;
    }>;
  };
}
```

세이브 메타에는 전체를 내리지 말고 아래만 요약한다.

- `aiIntentTitle`
- `aiIntentReason`
- `aiDirectorMode`
- `aiMomentSummary[]`

## 구현 순서

### Phase 1. AI Director 기반 만들기

상태: 구현 완료 (2026-03-10)

구현됨:

- `src/types/ai.ts`, `src/systems/aiContext.ts`, `src/systems/aiDirector.ts`
- `GameState.aiState` 저장 및 세이브 마이그레이션 정규화
- 브라우저 `AI Director` 카드와 Action Rail 연결
- 터미널 guidance, smart resume, save summary의 공용 intent 사용
- telemetry 이벤트 `ai_recommendation_shown`, `ai_recommendation_followed`, `ai_recommendation_dismissed`

보류:

- `ai_session_stop_followed`는 Session Director의 종료 추천이 실제 제품 흐름에 고정된 뒤 추가

원래 범위:

- `aiContext` 구성
- 현재 추천 계층을 `aiDirector`로 통합
- `Resume Brief`, `Action Rail`, 터미널 guidance가 같은 판단 결과를 사용
- telemetry에 추천 수용 이벤트 추가

추가 이벤트 제안:

- `ai_recommendation_shown`
- `ai_recommendation_followed`
- `ai_recommendation_dismissed`
- `ai_session_stop_followed`

완료 기준:

- 브라우저와 터미널이 같은 intent를 읽는다.
- 추천 이유가 한 줄 설명으로 항상 노출된다.
- 테스트로 quest/travel/market/recovery intent 전환을 고정한다.

### Phase 2. Narrative Companion 붙이기

상태: 초기 구현 완료 (2026-03-10)

구현됨:

- `src/systems/aiMemory.ts`로 최근 순간 메모리 누적
- `src/systems/aiNarrator.ts`로 intent/최근 순간 기반 companion line 생성
- `src/frontend/runtime.ts`에서 주요 액션 후 companion voice와 `recentMoments` 기록
- 브라우저 Action Rail의 `Companion Note` 카드로 narrative cue 노출

남음:

- 지역/보스/업적별 전용 카피 풀 확대
- 같은 세션 안의 중복 문장 억제 규칙 강화
- 터미널 로그/가이던스 쪽 companion surface 추가

범위:

- 최근 순간 메모리 저장
- 업적, 보스, 연속 실패, 복귀 성공 같은 순간의 전용 카피 생성
- 기존 `feedVoices`를 정적 표에서 컨텍스트 선택형으로 확장

완료 기준:

- 같은 지역이라도 상태에 따라 보이스가 달라진다.
- 긴장/보상/회복 순간에 로그 카피 품질이 체감된다.
- 과도한 중복 카피 방지 규칙이 있다.

### Phase 3. Contract Composer 도입

범위:

- 계약 템플릿 정의
- act/세션 길이/플레이 스타일 기반 계약 생성
- 보상 밸런스 검증 스크립트 연결

완료 기준:

- 동적 계약이 기존 guardrail을 깨지 않는다.
- 첫 2시간 구간에서 계약 반복 체감이 줄어든다.
- quest UI와 history에 정적 퀘스트처럼 자연스럽게 표시된다.

### Phase 4. Encounter Director 도입

범위:

- 최근 전투/이벤트 템포 분석
- 던전 이벤트, 보상 템포, 전투 압박 조절
- 엔드게임 한정 강화 규칙 추가

완료 기준:

- 연속 동일 패턴 반복이 줄어든다.
- boss 접근 구간의 긴장감이 올라가고 무의미한 소모전이 줄어든다.
- endgame은 더 날카롭지만 불공정하지 않다.

### Phase 5. Ops Analyst 정착

범위:

- telemetry 기반 인사이트 리포트
- playtest note와 metrics 결합
- balance note 초안 자동화

완료 기준:

- 플레이테스트 1회 후 즉시 확인 가능한 AI 리포트가 나온다.
- 추천 무시율, 반복 루프, 조기 이탈 지점이 자동 요약된다.

## 성공 지표

- 첫 세션에서 첫 퀘스트 수락까지 걸리는 시간 감소
- `smart resume` 이후 2분 내 의미 있는 액션 실행 비율 증가
- 같은 세션 안에서 `quest -> travel -> reward -> save` 루프 완주율 증가
- 반복 전투만 계속하는 구간 비율 감소
- 업적 추적 사용 후 실제 해금까지 이어지는 비율 증가
- 플레이테스트 note의 `confused`, `fatigue`, `why am I here` 빈도 감소

## 하지 말아야 할 것

- 1단계부터 외부 LLM에 의존하기
- 메인 퀘스트 보상/진행을 자유 생성으로 흔들기
- 저장 구조에 긴 자유 텍스트를 그대로 누적하기
- 추천을 늘리기만 하고 왜 그런지 설명하지 않기
- AI가 플레이어 대신 결정을 확정해 버리기

## 가장 먼저 착수할 실제 작업

1. `src/types/ai.ts`, `src/systems/aiContext.ts`, `src/systems/aiDirector.ts` 추가
2. `adventureFocus`, `frontend/runtime`, `gameplayLoop`의 추천 판단을 `aiDirector`로 이관
3. telemetry 이벤트 4종 추가
4. browser/terminal 공용 `AI Intent` 표면 추가
5. `tests/frontendRuntime.test.ts`, `tests/gameplayLoop.test.ts`, `tests/playerMenu.test.ts`에 director 회귀 추가

## 최종 방향

Terminal Quest의 내부 AI는 `챗봇`이 아니라 `게임 디렉터`여야 한다. 플레이어가 “이 게임이 지금 내 상태를 읽고 있다”는 감각을 받게 만들되, 시스템은 여전히 테스트 가능하고 오프라인에서 결정론적으로 유지되는 쪽이 맞다.
