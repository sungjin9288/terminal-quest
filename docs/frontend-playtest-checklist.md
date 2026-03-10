# Frontend Playtest Checklist

Use this with the isolated browser playtest profile in [docs/playtest-runbook.md](/Users/sungjin/dev/personal/terminal-quest/docs/playtest-runbook.md).

## Goal

Validate whether the browser frontend is understandable without explanation, keeps players moving on one screen, and supports clean stop-and-resume loops.

## Before Each Session

1. Run `npm run playtest:setup` once for the tester batch.
2. Start the isolated browser flow with `npm run playtest:start`.
3. Open the generated note in `playtest-data/active/notes/`.
4. Do not explain UI terms like `Next Move`, `Resume Preview`, or `Session Plan` unless the session specifically requires intervention.

## Session A: Blind First Run

Duration: `60-90 minutes`

Ask the tester to start fresh and play naturally.

Record whether the tester can:

- identify the first goal within 10 minutes
- accept the first quest without help
- enter the first dungeon without confusion
- understand why a reward turn-in matters
- say they want to continue after the first hour

Watch especially for:

- page-scroll attempts instead of workspace switching
- hesitation around `Next Move`, `Tempo Routes`, or `Session Plan`
- fatigue during quest reading or repeat combat loops

## Session B: Resume and Preview

Duration: `15-20 minutes`

Use a mid-run save and relaunch from landing.

Record whether the tester can:

- explain why smart resume opened the current workspace
- distinguish `Resume Command` from `Preview Command`
- predict what will happen before pressing a preview action
- understand the `Preview Commit` marker and toast after execution
- recover from a blocked preview using the suggested CTA

Critical prompts:

- “지금 단계와 다음 단계가 뭐라고 보이나요?”
- “이 버튼을 누르면 무슨 일이 일어날 것 같나요?”
- “지금 막힌 이유와 다음 행동이 보이나요?”

## Session C: Short Session Stop and Return

Duration: `15-20 minutes`

Set a short session window and ask the tester to stop cleanly, save, exit, relaunch, and continue.

Record whether the tester can:

- follow `Session Plan` to a natural stop point
- understand the recommended save slot without explanation
- pick the correct save from landing in under 2 seconds
- explain the `Resume Brief` or `Resume Route` on reload
- continue from the marked target card without scanning the whole UI

## Severity Rules

- `P0`: player cannot continue without external help
- `P1`: player continues, but confidence drops or repeated hesitation appears
- `P2`: friction is visible but does not meaningfully block progress

## Exit Questions

Ask these at the end of the session:

1. “다음에 다시 켰을 때 어디서 이어야 하는지 바로 알 것 같나요?”
2. “가장 재밌었던 순간은 언제였나요?”
3. “가장 귀찮거나 피곤했던 구간은 어디였나요?”
4. “계속 플레이하고 싶은가요, 아니면 여기까지면 충분한가요?”
