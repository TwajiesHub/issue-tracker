# Codex task 1: build the guard engine (`lib/guard/`)

Paste the prompt below into Codex, connected to `TwajiesHub/issue-tracker`.

```
You are working on TwajiesHub/issue-tracker (a fork of Ziki). Create a branch named codex/guard-engine from the branch feat/ziki-guard (or from main if feat/ziki-guard doesn't exist yet).

First read: AGENTS.md, CLAUDE.md, docs/ziki-guard/BRIEF.md and docs/ziki-guard/ENGINE.md. ENGINE.md is your specification; follow it exactly.

Security rules (team repos were hit by malware this week):
- Before installing anything, check package.json scripts and the repo root for unexpected files and report what you checked.
- Add NO new npm packages. Use node:crypto only.
- Fixtures are harmless stand-ins: no eval, no network, nothing that executes. Never copy real malware.

Build:
- lib/guard/ with types.ts, glob.ts, categorize.ts, detectors/*.ts, classify.ts, fingerprint.ts, group.ts (UnionFind), queue.ts (binary max-heap PriorityQueue), autonomy.ts (Wilson lower bound), chain.ts (hash chain), fixtures/incident.ts, fixtures/benign.ts, index.ts exporting runGuard and the helpers.
- Pure TypeScript only: no database, no network, no React, no imports from app/ or components/.
- Vitest tests for everything listed under "Required tests" in ENGINE.md, including the property tests.

Done when:
- pnpm test passes (the whole suite, not only yours), pnpm lint passes, and pnpm typecheck passes.
- The incident fixture's 17 variants group into exactly 1 incident; every benign fixture gets its expected tier with no false findings.

Commit messages: clear, conventional (e.g. "feat(guard): detectors and classifier"). Do NOT add Co-Authored-By or "Generated with" lines. Never force-push. Open a pull request from codex/guard-engine into feat/ziki-guard (in TwajiesHub/issue-tracker, NOT the upstream Zedu-Endor repo), and write a short report: files, the test count, any thresholds you changed and why, and anything in ENGINE.md that was unclear.
```
