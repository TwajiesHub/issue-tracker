import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { runGuard, groupIncidents, FINDING_CODES, type FindingCode, type GuardConfig, type GuardResult } from "../../demo/lib/guard/index";
import { incident } from "../../demo/lib/guard/fixtures/incident";
import { git, HistoryReader, MAIN_REF, type SkippedFile } from "./git";

export interface CommitResult {
  sha: string; date: string; message: string; parentCount: number; fileCount: number;
  skipped: SkippedFile[]; tier: GuardResult["tier"]; categories: GuardResult["categories"];
  findings: {code: FindingCode; file?: string; line?: number; title: string; metric?: number}[];
  paths: string[];
}
export interface Replay {
  ref: string; tip: string; engineCommit: string; generatedAt: string; seconds: number;
  commits: CommitResult[]; incident: {branches: number; incidents: number; allHuman: boolean};
}
export interface Judgement { verdict: "real risk" | "false alarm"; reason: string }
export type Judgements = Record<string, Judgement>;
const folder = resolve("tools/guard-replay");
export const PINNED_TIP = "a2d680f508a7504ac0f2f064eea243936dd5eca3";
export function collect(ref = MAIN_REF, options: {config?: Partial<GuardConfig>; skip?: number; reader?: HistoryReader} = {}): Replay {
  const started = performance.now(), reader = options.reader ?? new HistoryReader();
  const tip = git(["rev-parse", "--verify", `${ref}^{commit}`]).toString().trim();
  const commits = reader.commits(tip, options.skip ?? 0).map(sha => {
    const {input, metadata, skipped} = reader.readCommit(sha), result = runGuard(input, options.config);
    return {sha, date: metadata.date, message: metadata.message, parentCount: metadata.parents.length,
      fileCount: input.files.length, paths: input.files.map(f => f.path), skipped, tier: result.tier, categories: result.categories,
      findings: result.findings.map(f => ({code: f.code, file: f.file, line: f.line, title: f.title, metric: f.evidence?.metric}))};
  });
  const results = incident.map(change => runGuard(change, options.config)), groups = groupIncidents(results);
  return {ref, tip, engineCommit: git(["log", "-1", "--format=%H", "--", "demo/lib/guard"]).toString().trim(),
    generatedAt: new Date().toISOString(), seconds: (performance.now() - started) / 1000,
    commits, incident: {branches: new Set(incident.map(c => c.branch)).size, incidents: groups.length, allHuman: results.every(r => r.tier === "human")}};
}
export function markdownCell(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "&#124;").replace(/`/g, "&#96;").replace(/[\r\n]+/g, " ");
}
export function statistics(replay: Replay) {
  const tiers = {auto: 0, review: 0, human: 0};
  const findings = Object.fromEntries(FINDING_CODES.map(code => [code, 0])) as Record<FindingCode, number>;
  const affectedCommits = {...findings};
  for (const commit of replay.commits) {
    tiers[commit.tier]++;
    for (const finding of commit.findings) findings[finding.code]++;
    for (const code of new Set(commit.findings.map(f => f.code))) affectedCommits[code]++;
  }
  return {tiers, findings, affectedCommits};
}
export interface TierChangeJudgement { correct: boolean; reason: string }
export interface Comparison { before: Replay; beforeJudgements: Judgements; changes: Record<string, TierChangeJudgement> }
export function renderComparison(after: Replay, judgements: Judgements, comparison: Comparison): string {
  const {before, beforeJudgements, changes} = comparison;
  if (before.tip !== after.tip || JSON.stringify(before.commits.map(c => c.sha)) !== JSON.stringify(after.commits.map(c => c.sha))) throw new Error("Comparison requires the exact same pinned tip and ordered commits");
  for (let i = 0; i < before.commits.length; i++) {
    if (JSON.stringify(before.commits[i].paths) !== JSON.stringify(after.commits[i].paths) || JSON.stringify(before.commits[i].skipped) !== JSON.stringify(after.commits[i].skipped)) throw new Error("Compared file coverage changed");
  }
  const changed = after.commits.filter((commit, i) => commit.tier !== before.commits[i].tier);
  const previous = new Map(before.commits.map(c => [c.sha, c]));
  for (const commit of changed) {
    const judgement = changes[commit.sha];
    if (!judgement || typeof judgement.correct !== "boolean" || !judgement.reason.trim()) throw new Error(`Missing tier-change judgement for ${commit.sha}`);
  }
  const summary = (data: Replay, labels: Judgements) => {
    const tiers = statistics(data).tiers, human = data.commits.filter(c => c.tier === "human");
    for (const c of human) if (!labels[c.sha]) throw new Error(`Missing judgement for ${c.sha}`);
    const falseAlarms = human.filter(c => labels[c.sha].verdict === "false alarm").length;
    return {tiers, falseAlarms, realRisks: human.length - falseAlarms};
  };
  const old = summary(before, beforeJudgements), current = summary(after, judgements);
  const rate = (n: number, d: number) => d ? `${(100 * n / d).toFixed(2)}% (${n}/${d})` : "N/A (zero denominator)";
  const lostRealRisks = changed.filter(c => previous.get(c.sha)!.tier === "human" && c.tier !== "human" && beforeJudgements[c.sha]?.verdict === "real risk").length;
  return `
## Before and after the fix

Same pinned main tip: \`${after.tip}\`; exact same ${after.commits.length} ordered commits and inspected/skipped file coverage. Baseline engine: \`${before.engineCommit}\`; fixed engine: \`${after.engineCommit}\`. Baseline evidence and labels are preserved in results-before.json and judgements-before.json; manual risk labels have not been rewritten to improve the numbers.

| Measure | Before | After |
| --- | ---: | ---: |
| Auto | ${old.tiers.auto} | ${current.tiers.auto} |
| Review | ${old.tiers.review} | ${current.tiers.review} |
| Human | ${old.tiers.human} | ${current.tiers.human} |
| Human commits judged real risk | ${old.realRisks} | ${current.realRisks} |
| Human false alarms | ${old.falseAlarms} | ${current.falseAlarms} |
| False-alarm share of human queue | ${rate(old.falseAlarms, old.tiers.human)} | ${rate(current.falseAlarms, current.tiers.human)} |
| False alarms / all commits | ${rate(old.falseAlarms, before.commits.length)} | ${rate(current.falseAlarms, after.commits.length)} |
| Obfuscated-file findings | ${statistics(before).findings.obfuscated_file} | ${statistics(after).findings.obfuscated_file} |
| Replay seconds | ${before.seconds.toFixed(3)} | ${after.seconds.toFixed(3)} |
| Incident branches → incidents | ${before.incident.branches} → ${before.incident.incidents} | ${after.incident.branches} → ${after.incident.incidents} |

${changed.length} commits changed tier. Of these, ${lostRealRisks} were previously judged real risks and now leave the human queue: this is a loss of useful review coverage, not a false-alarm reduction. Their obfuscation warnings were spurious, but credential/access/state-policy risk needs its own detector rather than an entropy heuristic. No risk label is inferred from the new tier. Review-tier still means a human can inspect later; it does not mean risk-free.

### Every changed tier and assessment

| SHA | Message | Tier before → after | Original risk judgement | Is the tier change correct? | Reason |
| --- | --- | --- | --- | --- | --- |
${changed.map(commit => `| ${commit.sha.slice(0, 10)} | ${markdownCell(commit.message.split("\n")[0])} | ${previous.get(commit.sha)!.tier} → ${commit.tier} | ${beforeJudgements[commit.sha]?.verdict ?? "not previously human"} | ${changes[commit.sha].correct ? "yes" : "no — review coverage lost"} | ${markdownCell(changes[commit.sha].reason)} |`).join("\n")}
`;
}
export function renderReport(replay: Replay, judgements: Judgements, comparison?: Comparison): string {
  const {tiers, findings, affectedCommits} = statistics(replay), human = replay.commits.filter(c => c.tier === "human");
  for (const commit of human) {
    const judgement = judgements[commit.sha];
    if (!judgement || !["real risk", "false alarm"].includes(judgement.verdict) || !judgement.reason.trim()) throw new Error(`Missing manual judgement for ${commit.sha}`);
  }
  const falseAlarms = human.filter(c => judgements[c.sha].verdict === "false alarm").length;
  const rate = (numerator: number, denominator: number) => denominator ? `${(100 * numerator / denominator).toFixed(2)}%` : "N/A (zero denominator)";
  const skipped = replay.commits.flatMap(c => c.skipped), skippedCounts = new Map<string, number>();
  for (const file of skipped) skippedCounts.set(file.reason, (skippedCounts.get(file.reason) ?? 0) + 1);
  return `# Guard replay report

Generated: ${replay.generatedAt}

## Headline results

- Commits checked: **${replay.commits.length}**.
- Tiers: **auto ${tiers.auto} · review ${tiers.review} · human ${tiers.human}**.
- Human commits judged real risk: **${human.length - falseAlarms}**; false alarms: **${falseAlarms}**.
- False-alarm rate among human-tier commits: **${rate(falseAlarms, human.length)}** (${falseAlarms}/${human.length}). This is the false discovery proportion, not the statistical FPR: the number of all truly harmless commits is not independently labelled.
- False alarms as a share of all checked commits: **${rate(falseAlarms, replay.commits.length)}** (${falseAlarms}/${replay.commits.length}).
- Incident fixture: **${replay.incident.branches} branches → ${replay.incident.incidents} incident${replay.incident.incidents === 1 ? "" : "s"}**; all human-tier: **${replay.incident.allHuman}**.
- Replay run time (Git reads, conversion, engine and incident grouping): **${replay.seconds.toFixed(3)} seconds**. Manual review, report formatting, tests and push are excluded.

## Scope and method

- Repository: TwajiesHub/issue-tracker; local ref: \`${replay.ref}\`; pinned tip: \`${replay.tip}\`.
- Engine source commit: \`${replay.engineCommit}\`. The existing thresholds are unchanged; entropy now additionally requires less than 5% whitespace and excludes SVG. Identifier and long-line triggers are unchanged.
- Uses \`git log -n 200\` over all ancestors, in Git's default history order. Merge commits compare against their first parent (${replay.commits.filter(c => c.parentCount > 1).length} merges in this sample); root commits compare against the empty tree. The same underlying change can therefore be counted in a feature commit and in a later merge. Counts describe commits, not unique changes or deployments.
- Read-only local Git object inspection, with external diffs, text conversion and lazy fetch disabled. No historical code is checked out or executed. No network is used by the tool. This local ref may lag the remote; no fetch was performed.
- Full before/after UTF-8 text is supplied to the engine. Files with either side above **500,000 bytes** (decimal 500 KB), binary numstat markers, NUL bytes or invalid UTF-8 are skipped entirely. Submodule entries have no blob text and are skipped. Renames use the previous path for before text and the new path for categorization.
- Skipped file-change occurrences: **${skipped.length}** (${[...skippedCounts].map(([reason, count]) => `${reason}: ${count}`).join("; ") || "none"}). Counts and judgements only cover inspected text; skipping is not a safety verdict. Commits with no inspected files remain in the denominator and receive the unchanged engine's empty-input result.
- Each input uses \`forced=false\`, the full commit message as \`claim\`, no agent and no declared scope. Pusher is \`unknown-from-git-history\`: Git history does not identify GitHub pushers or prove the absence of force pushes. Author/pusher attribution is not tested by historical commits; the incident fixture exercises it separately.
- Judgements are explicit, commit-keyed manual reviews in \`judgements.json\`. A human-tier dependency, script, CI/build, auth or agent-rule change is a **real risk requiring review**, even when legitimate; that label does not allege malware. False alarms are reserved for clearly harmless triggers with no other genuine reason to require human review. A false finding inside an otherwise real-risk commit does not turn the whole commit into a false alarm.
- Findings are counted per emitted finding; affected-commit counts deduplicate each code within a commit. The synthetic incident is excluded from all historical counts.

## Finding counts

| Code | Findings | Commits affected |
| --- | ---: | ---: |
${FINDING_CODES.map(code => `| ${code} | ${findings[code]} | ${affectedCommits[code]} |`).join("\n")}

## Every human-tier commit and judgement

Dates are committer timestamps with their original offsets. Messages show the subject; the full message was used as the claim.

| SHA | Date | Message | Codes | Judgement | Reason |
| --- | --- | --- | --- | --- | --- |
${human.map(commit => `| ${commit.sha.slice(0, 10)} | ${commit.date.slice(0, 10)} | ${markdownCell(commit.message.split("\n")[0])} | ${[...new Set(commit.findings.map(f => f.code))].join(", ")} | ${judgements[commit.sha].verdict} | ${markdownCell(judgements[commit.sha].reason)} |`).join("\n")}

## Skipped files

| Commit | File | Reason |
| --- | --- | --- |
${replay.commits.flatMap(commit => commit.skipped.map(file => `| ${commit.sha.slice(0, 10)} | ${markdownCell(file.path)} | ${file.reason} |`)).join("\n") || "| — | None | — |"}
${comparison ? renderComparison(replay, judgements, comparison) : ""}`;
}
export function main(args: string[]): void {
  if (args.some(arg => arg !== "--collect-only")) throw new Error("Usage: pnpm exec tsx tools/guard-replay/replay.ts [--collect-only]");
  const replay = collect(PINNED_TIP);
  writeFileSync(resolve(folder, "results.json"), JSON.stringify(replay, null, 2) + "\n");
  if (!args.includes("--collect-only")) {
    const judgements = JSON.parse(readFileSync(resolve(folder, "judgements.json"), "utf8")) as Judgements;
    const comparison: Comparison = {
      before: JSON.parse(readFileSync(resolve(folder, "results-before.json"), "utf8")),
      beforeJudgements: JSON.parse(readFileSync(resolve(folder, "judgements-before.json"), "utf8")),
      changes: JSON.parse(readFileSync(resolve(folder, "tier-changes.json"), "utf8")),
    };
    writeFileSync(resolve(folder, "REPORT.md"), renderReport(replay, judgements, comparison));
  }
  console.log(JSON.stringify({commits: replay.commits.length, ...statistics(replay), incident: replay.incident, seconds: replay.seconds}, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(folder, "replay.ts")) main(process.argv.slice(2));
