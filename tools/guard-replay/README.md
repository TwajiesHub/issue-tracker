# Guard history replay

From the repository root, using existing dependencies:

```sh
pnpm exec tsx tools/guard-replay/replay.ts
pnpm exec vitest run tools/guard-replay
```

The CLI pins main history to `a2d680f508a7504ac0f2f064eea243936dd5eca3` and walks its latest 200 commits with `git log`, and compares each commit to its first parent (or the empty tree for a root). It never checks out history, executes historical code, fetches, installs, or uses the network. Git external diffs, text conversion, lazy fetch and replacement objects are disabled. Both sides of renamed paths are read from their blob IDs. No files outside this folder are written by the tool.

`REPORT.md` contains the measured counts, every human-tier commit and its manual judgement, skipped files, incident fixture outcome and runtime. `results.json` is the underlying per-commit evidence, including paths and emitted findings, without full source contents. Dates and the exact sampled tip are recorded in the report; the local remote-tracking ref may lag GitHub because this workflow performs no fetch.

Judgements in `judgements.json` are explicit reviews keyed by full SHA, not classifications guessed from commit messages. A legitimate migration, deployment, credential, authorization or state-changing unattended job is still real review risk; that label does not allege malicious intent. Readable code misidentified as obfuscation is a false *finding*, but does not make an otherwise sensitive commit a false *alarm*.

The reported false-alarm share uses human-tier commits as denominator (false discovery proportion); a second rate uses all sampled commits. A statistical FPR cannot be calculated without independently labelling every harmless commit, including non-alerted commits. Merge histories can repeat underlying work; the report counts commit decisions, not unique changes.

To recollect the pinned history for manual inspection:

```sh
pnpm exec tsx tools/guard-replay/replay.ts --collect-only
pnpm exec tsx tools/guard-replay/inspect.ts
```

Review Git diffs and update the commit-keyed judgements, then run the normal command again. Missing judgements cause report generation to fail rather than silently label unknown changes harmless. `inspect.ts` prints inert excerpts and entropy metrics for unique obfuscation alerts not already explained by protected/unknown paths; it is a review aid, not an automatic verdict. For merges, use `git diff <sha>^ <sha>` when reviewing: `git show` defaults to a combined merge diff and can hide first-parent changes.

Files with either side over 500,000 bytes, binary numstat markers, NUL bytes or invalid UTF-8 are excluded entirely, with reasons recorded. Submodules have no file text and are reported separately as skipped. Empty inspected commits are still counted. Pusher identity and force-push history cannot be recovered from commit objects, so historical inputs use an explicit unknown pusher, `forced=false`, no agent and no declared scope; their full commit message is the claim. The separate harmless 17-branch fixture exercises the missing push evidence.

The v2 engine adds a strict entropy whitespace ceiling (5%) and skips SVG for entropy only. Other thresholds and triggers are unchanged. This branch was created from the locally fetched `feat/ziki-guard` tip and merged `codex/guard-replay` first.

The normal command also renders the before/after comparison. `results-before.json` and `judgements-before.json` preserve the prior measurement. `tier-changes.json` contains an explicit correctness judgement for every tier change. Comparison rejects a different tip, ordered commit sample, or inspected/skipped file coverage; it never silently compares different histories. Original manual risk labels remain unchanged even when the new detector stops alerting. For another historical sample, update the pinned tip, collect and review fresh evidence, and supply a corresponding baseline before producing comparisons.

## Owner-protected profile and held-out evaluation

The v3 report command is:

```sh
pnpm exec tsx tools/guard-replay/owner-replay.ts
pnpm exec vitest run demo/lib/guard tools/guard-replay
```

It evaluates the first 200 and next 200 entries of `git log` at the pinned main tip. `ziki-profile.ts` was committed before inspecting the older history and is frozen: collection checks its committed source before running. No glob was adjusted after viewing held-out results. `owner-results.json` stores the exact profile, hash, commit and both measurements. Blob caching is shared across the two samples.

Use `--collect-only` to refresh evidence without rendering, or `--render-only` to format the already saved measurements after manual review. Every held-out commit, including non-alerted commits, must have an explicit `real risk`/`harmless` label in `judgements-heldout.json`. Primary alerts use `judgements-protected.json`, which preserves all 77 original labels and adds newly human-tier cases. All held-out misses and false alarms are listed in REPORT.md. The profile intentionally includes tests inside protected modules and can over-alert on harmless test or doc edits. It is an owner policy, not a malware classifier.

The commit-keyed JSON labels are explicit manual assessments, not guesses derived from the new tier or from profile matches. The legacy `replay.ts` command still produces the entropy-only comparison and overwrites REPORT.md; use the owner command to restore the full three-version/held-out report. No engine-wide default profile is applied.
