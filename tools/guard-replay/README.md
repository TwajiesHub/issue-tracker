# Guard history replay

From the repository root, using existing dependencies:

```sh
pnpm exec tsx tools/guard-replay/replay.ts
pnpm exec vitest run tools/guard-replay
```

The tool reads the local `refs/remotes/origin/main` tip, walks its latest 200 commits with `git log`, and compares each commit to its first parent (or the empty tree for a root). It never checks out history, executes historical code, fetches, installs, or uses the network. Git external diffs, text conversion, lazy fetch and replacement objects are disabled. Both sides of renamed paths are read from their blob IDs. No files outside this folder are written by the tool.

`REPORT.md` contains the measured counts, every human-tier commit and its manual judgement, skipped files, incident fixture outcome and runtime. `results.json` is the underlying per-commit evidence, including paths and emitted findings, without full source contents. Dates and the exact sampled tip are recorded in the report; the local remote-tracking ref may lag GitHub because this workflow performs no fetch.

Judgements in `judgements.json` are explicit reviews keyed by full SHA, not classifications guessed from commit messages. A legitimate migration, deployment, credential, authorization or state-changing unattended job is still real review risk; that label does not allege malicious intent. Readable code misidentified as obfuscation is a false *finding*, but does not make an otherwise sensitive commit a false *alarm*.

The reported false-alarm share uses human-tier commits as denominator (false discovery proportion); a second rate uses all sampled commits. A statistical FPR cannot be calculated without independently labelling every harmless commit, including non-alerted commits. Merge histories can repeat underlying work; the report counts commit decisions, not unique changes.

For a different local main history, first collect evidence:

```sh
pnpm exec tsx tools/guard-replay/replay.ts --collect-only
pnpm exec tsx tools/guard-replay/inspect.ts
```

Review Git diffs and update the commit-keyed judgements, then run the normal command again. Missing judgements cause report generation to fail rather than silently label unknown changes harmless. `inspect.ts` prints inert excerpts and entropy metrics for unique obfuscation alerts not already explained by protected/unknown paths; it is a review aid, not an automatic verdict. For merges, use `git diff <sha>^ <sha>` when reviewing: `git show` defaults to a combined merge diff and can hide first-parent changes.

Files with either side over 500,000 bytes, binary numstat markers, NUL bytes or invalid UTF-8 are excluded entirely, with reasons recorded. Submodules have no file text and are reported separately as skipped. Empty inspected commits are still counted. Pusher identity and force-push history cannot be recovered from commit objects, so historical inputs use an explicit unknown pusher, `forced=false`, no agent and no declared scope; their full commit message is the claim. The separate harmless 17-branch fixture exercises the missing push evidence.

No engine code or thresholds are changed. The replay branch is based on `codex/guard-engine`, which supplies its engine dependency.
