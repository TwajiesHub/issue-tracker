# Ziki Guard: instructions for Claude Code

You are working in a **fork** of Ziki (`Zedu-Endor/issue-tracker`), owned by Bonnke (GitHub: TwajiesHub), for HNG15 week 5
Task 1 (human–agent interaction). A planning assistant (Claude, in a separate chat) designed the work with him and writes
the files in `docs/ziki-guard/`. You build it, **one step at a time**.

## Read before any work
1. This file.
2. `AGENTS.md` and `CONTRIBUTING.md` (Ziki's own rules; they still apply).
3. `docs/ziki-guard/README.md`, then `docs/ziki-guard/PLAN.md` (which step is CURRENT).
4. The current step: `docs/ziki-guard/steps/STEP-NN.md`. **Do only that step.**
5. As needed: `BRIEF.md` (the why), `DESIGN.md` (screens, words, design rules), `ENGINE.md` (the guard's logic).

## Hard rules
- **Security first.** Team repos were hit this week by a malware dropper (an obfuscated `api.js` run before every npm
  script, payloads hidden behind long runs of whitespace in config files, forged commits force-pushed). Before any
  `pnpm install` or any script run: check `package.json` scripts, look for unexpected root files, and say what you
  checked. Never run code you didn't write or that the step doesn't name. Never commit the real malware; fixtures use
  harmless stand-ins only.
- **Keep Ziki's look.** Use Ziki's existing tokens (`zk-*` in `app/globals.css`, `app/theme-dark.css`), components, fonts
  (Manrope, Geist Mono) and both themes. **No new colours, no new fonts, no new theme.** The task is graded as interaction
  design; a visual restyle is an instant fail.
- **Follow `DESIGN.md` → "Design rules"** (restraint, one primary action, colour only for risk, two voices kept apart, effort
  matches risk, silence means paused).
- **Our database only.** The Neon database in `.env` is ours and holds demo data. Never point at Ziki's production. Never
  commit `.env`, keys or secrets.
- **Branches:** you work on `feat/ziki-guard`. Codex works on `codex/guard-engine` and owns `lib/guard/**`. Don't edit
  `lib/guard/**` unless a step says so (after Codex's branch is merged in).
- **Never force-push.** Small commits, clear messages, and **no `Co-Authored-By` or "Generated with" lines** (owner's rule).
- **Tests:** `pnpm test` must pass before you declare a step done (Node 22; see AGENTS.md for the jsdom note). Add tests
  for what you add.
- The owner works on **Windows (PowerShell)**. Give commands that work there.
- **Names:** apart from the owner's own agent (SpecialOne), every person and agent in demo data is fictional. Never use real
  teammates' names.

## How to work a step
1. Read the step fully; if anything is unclear or conflicts with these docs, ask before coding.
2. Show a short plan (files you'll touch).
3. Build, then test: `pnpm test`, `pnpm lint`, and look at it in the browser (`pnpm dev` → http://localhost:3001) in light
   and dark mode, desktop and phone width.
4. Report in chat using the step's report format, with screenshots saved in `screenshots/` (not committed).
5. Commit on `feat/ziki-guard` with the step's message.
