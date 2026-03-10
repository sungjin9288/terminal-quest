# 프론트엔드 플레이테스트 체크리스트 Frontend Playtest Checklist

이 문서는 [docs/playtest-runbook.md](/Users/sungjin/dev/personal/terminal-quest/docs/playtest-runbook.md)의 isolated browser playtest profile과 함께 사용합니다.

## 목표 Goal

Browser frontend가 설명 없이도 이해되는지, one-screen flow를 유지하는지, stop-and-resume loop가 자연스럽게 이어지는지를 검증합니다.

## 세션 시작 전 Before Each Session

1. Tester batch 시작 전에 `npm run playtest:setup`을 1회 실행합니다.
2. Isolated browser flow는 `npm run playtest:start`로 시작합니다.
3. `playtest-data/active/notes/`에 생성된 note를 엽니다.
4. 세션 개입이 꼭 필요한 경우가 아니면 `Next Move`, `Resume Preview`, `Session Plan` 같은 UI term을 먼저 설명하지 않습니다.

## Session A: Blind First Run

Duration: `60-90 minutes`

Tester에게 fresh start 상태에서 자연스럽게 플레이하라고 안내합니다.

아래 항목을 기록합니다:

- 10분 이내에 첫 목표를 파악하는가
- 도움 없이 첫 quest를 수락하는가
- 혼란 없이 첫 dungeon에 진입하는가
- reward turn-in이 왜 중요한지 이해하는가
- 첫 1시간 뒤에도 계속하고 싶다고 말하는가

특히 아래 지점을 주의해서 봅니다:

- workspace switching 대신 page scroll을 시도하는가
- `Next Move`, `Tempo Routes`, `Session Plan`에서 머뭇거리는가
- quest reading 또는 반복 combat loop에서 피로를 보이는가

## Session B: Resume and Preview

Duration: `15-20 minutes`

Mid-run save를 사용해 landing에서 다시 시작합니다.

아래 항목을 기록합니다:

- smart resume가 왜 현재 workspace를 열었는지 설명할 수 있는가
- `Resume Command`와 `Preview Command`를 구분하는가
- preview action을 누르기 전에 결과를 예측할 수 있는가
- 실행 후 `Preview Commit` marker와 toast를 이해하는가
- blocked preview 상황에서 제안된 CTA로 복구할 수 있는가

Critical prompt:

- “지금 단계와 다음 단계가 뭐라고 보이나요?”
- “이 버튼을 누르면 무슨 일이 일어날 것 같나요?”
- “지금 막힌 이유와 다음 행동이 보이나요?”

## Session C: Short Session Stop and Return

Duration: `15-20 minutes`

짧은 session window를 설정한 뒤, 자연스럽게 멈추고 save하고 종료한 다음 다시 실행해서 이어가게 합니다.

아래 항목을 기록합니다:

- `Session Plan`을 따라 natural stop point까지 가는가
- 설명 없이 recommended save slot을 이해하는가
- landing에서 2초 이내에 올바른 save를 고르는가
- reload 후 `Resume Brief` 또는 `Resume Route`를 설명할 수 있는가
- 전체 UI를 훑지 않고 marked target card에서 바로 이어가는가

## 심각도 규칙 Severity Rules

- `P0`: 외부 도움 없이는 진행할 수 없음
- `P1`: 진행은 되지만 confidence가 떨어지거나 반복 hesitation이 나타남
- `P2`: friction은 보이지만 진행을 의미 있게 막지는 않음

## 종료 질문 Exit Questions

세션 마지막에 아래 질문을 사용합니다:

1. “다음에 다시 켰을 때 어디서 이어야 하는지 바로 알 것 같나요?”
2. “가장 재밌었던 순간은 언제였나요?”
3. “가장 귀찮거나 피곤했던 구간은 어디였나요?”
4. “계속 플레이하고 싶은가요, 아니면 여기까지면 충분한가요?”
