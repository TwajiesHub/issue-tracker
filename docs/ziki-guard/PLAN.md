# Plan

One step at a time. Claude Code works the step marked **CURRENT** on `feat/ziki-guard`. Codex works its own tasks on
`codex/guard-engine` and reviews Claude Code's steps. After each step the owner tests and reports to the planner, who
writes the next brief.

| # | Step | Who | Status |
| --- | --- | --- | --- |
| 1 | Setup: kit committed, safety check, running locally on Neon with demo seed, "before" screenshots, reproduction deployed on Vercel | Claude Code + owner | **CURRENT** |
| C1 | Guard engine `lib/guard/` with tests (ENGINE.md) | Codex | starts once step 1 has pushed the kit |
| 2 | Data model and demo scenario: incidents, changes, findings, proposals with scope, limits, delegation, chained decision log; seed (fictional names) | Claude Code | — |
| 3 | Inbox: urgency tabs, quiet rows, two panes, the three decision kinds, Can wait, Done by agents, empty state, keyboard | Claude Code | — |
| 4 | Security tab, Dashboard strip, bell and email row, issue-page decision | Claude Code | — |
| 5 | Agent page: promises kept, delegation, active limits, pause and rotate key | Claude Code | — |
| 6 | Wiring: engine merged in; GitHub `push` events; proposals API; "check before you run" status API; limits enforced; Stop and restore, steer, hold-to-approve; earned-autonomy suggestions; "Simulate a push" demo button | Claude Code (Codex reviews) | — |
| 7 | Replay and measure: the incident (17 → 1), Ziki's own recent commits (false alarms), the three journeys; polish; deploy | Claude Code | — |
| 8 | Rationale doc (1–2 pages, before/after) and submission | Planner + owner | — |

Daily: the owner submits progress on the HNG spreadsheet (Mark gives yes/no feedback daily).
