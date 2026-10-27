import { canonicalJSON, sha256 } from "../../demo/lib/guard/index";
import { markdownCell, statistics, type Judgements, type Replay } from "./replay";
import type { OwnerEvaluation } from "./owner-replay";
export interface RiskLabel { risk: "real risk" | "harmless"; reason: string }
export interface OwnerLabels { primary: Record<string, RiskLabel>; heldout: Record<string, RiskLabel> }
const rate = (n: number, d: number) => d ? `${(100 * n / d).toFixed(2)}% (${n}/${d})` : "N/A";
export function evaluate(replay: Replay, labels: Record<string, RiskLabel>, requireAll = false) {
  let caught = 0, falseAlarms = 0, misses = 0, harmless = 0;
  for (const commit of replay.commits) {
    const label = labels[commit.sha];
    if (!label) { if (requireAll || commit.tier === "human") throw new Error(`Missing manual label for ${commit.sha}`); continue; }
    if (!["real risk", "harmless"].includes(label.risk) || !label.reason.trim()) throw new Error(`Invalid manual label for ${commit.sha}`);
    if (label.risk === "real risk") { if (commit.tier === "human") caught++; else misses++; }
    else { harmless++; if (commit.tier === "human") falseAlarms++; }
  }
  return {...statistics(replay).tiers, caught, falseAlarms, misses, harmless};
}
export function assertSameSample(a: Replay, b: Replay): void {
  if (a.tip !== b.tip || canonicalJSON(a.commits.map(c => [c.sha, c.paths, c.skipped])) !== canonicalJSON(b.commits.map(c => [c.sha, c.paths, c.skipped]))) throw new Error("Different replay inputs");
}
export function renderOwnerReport(original: Replay, entropy: Replay, baseline: Judgements, evaluation: OwnerEvaluation, labels: OwnerLabels): string {
  const {primary, heldout} = evaluation;
  assertSameSample(original, entropy); assertSameSample(entropy, primary);
  if (heldout.tip !== primary.tip || new Set([...primary.commits, ...heldout.commits].map(c => c.sha)).size !== 400 || primary.commits.length !== 200 || heldout.commits.length !== 200) throw new Error("Expected two disjoint 200-commit windows at one tip");
  if (sha256(canonicalJSON(evaluation.profile)) !== evaluation.profileHash) throw new Error("Profile hash mismatch");
  for (const [sha, label] of Object.entries(baseline)) {
    if (labels.primary[sha]?.risk !== (label.verdict === "real risk" ? "real risk" : "harmless")) throw new Error(`Baseline risk label changed: ${sha}`);
  }
  const a = evaluate(original, labels.primary), b = evaluate(entropy, labels.primary), c = evaluate(primary, labels.primary), h = evaluate(heldout, labels.heldout, true);
  const current = new Map(primary.commits.map(commit => [commit.sha, commit]));
  const old = new Map(original.commits.map(commit => [commit.sha, commit]));
  const lost = entropy.commits.filter(commit => commit.tier !== "human" && old.get(commit.sha)!.tier === "human" && baseline[commit.sha]?.verdict === "real risk");
  const recovered = lost.filter(commit => current.get(commit.sha)!.tier === "human");
  const legacyHarmless = new Set(Object.entries(baseline).filter(([, j]) => j.verdict === "false alarm").map(([sha]) => sha));
  const policyFalseAlarms = primary.commits.filter(commit => commit.tier === "human" && labels.primary[commit.sha]?.risk === "harmless");
  const heldoutPolicyOnlyFalseAlarms = heldout.commits.filter(commit => commit.tier === "human" && labels.heldout[commit.sha].risk === "harmless" && commit.findings.every(finding => finding.code === "protected_path" && finding.title.startsWith("This touches an area you marked as protected:"))).length;
  const areas = evaluation.profile.protectedAreas ?? [];
  const skipped = (replay: Replay) => replay.commits.reduce((n, commit) => n + commit.skipped.length, 0);
  const table = (replay: Replay, ledger: Record<string, RiskLabel>, filter: (commit: Replay["commits"][number]) => boolean) => replay.commits.filter(filter).map(commit => {
    const label = ledger[commit.sha];
    return `| ${commit.sha.slice(0, 10)} | ${commit.date.slice(0, 10)} | ${markdownCell(commit.message.split("\n")[0])} | ${commit.tier} | ${label.risk} | ${commit.tier === "human" ? label.risk === "real risk" ? "real risk caught" : "false alarm" : label.risk === "real risk" ? "miss" : "no alert needed"} | ${markdownCell(label.reason)} |`;
  }).join("\n");
  return `# Guard replay report

## Owner-protected areas

The profile in ziki-profile.ts was committed at **${evaluation.profileCommit} before inspecting the held-out sample**. It uses architectural directories and module names, not commit IDs. Profile SHA-256: \`${evaluation.profileHash}\`. The exact profile is stored in owner-results.json. It was not retuned after viewing held-out results.

The engine's default protectedAreas is empty. This replay explicitly opts into the Ziki profile. Matching any area emits a human-tier protected_path finding even when delegation says auto. Existing entropy thresholds and built-in locked paths remain unchanged. Areas cover tests as well as runtime modules: a benign test-only edit can therefore be a false alarm. Manual risk labels are independent of the configured globs and the resulting tier. Reasons retained from the original primary ledger describe that earlier assessment; their historical entropy wording does not mean entropy still fires under the new profile.

| Owner area | Globs (each is explained in the profile source) |
| --- | --- |
${areas.map(area => `| ${markdownCell(area.label)} | ${area.globs.map(glob => `\`${glob}\``).join(", ")} |`).join("\n")}

### Same pinned first 200 commits: three versions

All three measurements use main tip \`${primary.tip}\` and the exact same ordered commits, before/after text coverage and skips. Original and entropy-only evidence remain in results-before.json and results.json; profile runs are in owner-results.json. All original 77 manual risk labels are preserved. Newly human-tier primary commits have explicit additional labels in judgements-protected.json; primary non-alerted commits outside that ledger were not exhaustively relabelled, so no exhaustive primary recall claim is made.

| Measure | Original | Entropy fix | With protected areas |
| --- | ---: | ---: | ---: |
| Auto | ${a.auto} | ${b.auto} | ${c.auto} |
| Review | ${a.review} | ${b.review} | ${c.review} |
| Human | ${a.human} | ${b.human} | ${c.human} |
| Real risks caught | ${a.caught} | ${b.caught} | ${c.caught} |
| False alarms | ${a.falseAlarms} | ${b.falseAlarms} | ${c.falseAlarms} |
| False-alarm share of human queue | ${rate(a.falseAlarms, a.human)} | ${rate(b.falseAlarms, b.human)} | ${rate(c.falseAlarms, c.human)} |
| False alarms / all 200 commits | ${rate(a.falseAlarms, 200)} | ${rate(b.falseAlarms, 200)} | ${rate(c.falseAlarms, 200)} |
| Previously lost real risks recovered | N/A | 0/${lost.length} | ${recovered.length}/${lost.length} |
| Incident branches → incidents | ${original.incident.branches} → ${original.incident.incidents} | ${entropy.incident.branches} → ${entropy.incident.incidents} | ${primary.incident.branches} → ${primary.incident.incidents} |
| Runtime seconds | ${original.seconds.toFixed(3)} | ${entropy.seconds.toFixed(3)} | ${primary.seconds.toFixed(3)} |

The profile brings ${recovered.length} of the ${lost.length} lost real-risk commits back to human. It also produces **${policyFalseAlarms.length} false alarms**, including **${policyFalseAlarms.filter(commit => legacyHarmless.has(commit.sha)).length} of the old harmless commits**. These are policy overbreadth, not renewed entropy warnings; tightening content heuristics and choosing owner globs are separate decisions. No risk labels were changed to conceal this trade-off.

### All 14 previously lost real-risk commits

| SHA | Recovered? | Protected areas matched | Original independent reason |
| --- | --- | --- | --- |
${lost.map(commit => `| ${commit.sha.slice(0, 10)} | ${current.get(commit.sha)!.tier === "human" ? "yes" : "no — still missed"} | ${current.get(commit.sha)!.findings.filter(f => f.title.startsWith("This touches an area you marked as protected:")).map(f => markdownCell(f.title)).join(" ")} | ${markdownCell(baseline[commit.sha].reason)} |`).join("\n")}

### Every primary human-tier commit and judgement

| SHA | Date | Message | Tier | Manual judgement | Outcome | Reason |
| --- | --- | --- | --- | --- | --- | --- |
${table(primary, labels.primary, commit => commit.tier === "human")}

## Held-out check: commits 201–400

These are the next 200 entries in the same \`git log\` ordering from the pinned tip, selected with \`--skip=200\`; they are not the 200 ancestors of entry 200 (which could select a different graph). The first and last held-out SHAs are \`${heldout.commits[0].sha}\` and \`${heldout.commits.at(-1)!.sha}\`. The two samples are disjoint. The profile was frozen before this history was inspected and was not adjusted to fix its misses or false alarms.

Every held-out commit has an explicit manual label in judgements-heldout.json, including non-alerted changes. Harmless includes clearly benign presentation/docs/test or small compatibility changes. Real risk means independently sensitive runtime, trust, data or deployment changes warranting human review, even when legitimate. A label is not a malware verdict. A false alarm is a harmless human-tier commit; a miss is a real-risk commit routed to auto/review. Review means it can be checked later, not that it is harmless.

| Held-out measure | With frozen protected areas |
| --- | ---: |
| Commits checked | 200 |
| Auto | ${h.auto} |
| Review | ${h.review} |
| Human | ${h.human} |
| Manually labelled real risks | ${h.caught + h.misses} |
| Real risks caught | ${h.caught} |
| Misses | ${h.misses} |
| Harmless commits | ${h.harmless} |
| False alarms | ${h.falseAlarms} |
| False alarms with only owner-area signals | ${heldoutPolicyOnlyFalseAlarms} |
| False-alarm share of human queue | ${rate(h.falseAlarms, h.human)} |
| False alarms / all commits | ${rate(h.falseAlarms, 200)} |
| False-positive rate among labelled harmless commits | ${rate(h.falseAlarms, h.harmless)} |
| Recall of labelled real risks | ${rate(h.caught, h.caught + h.misses)} |
| Runtime seconds | ${heldout.seconds.toFixed(3)} |
| Incident branches → incidents | ${heldout.incident.branches} → ${heldout.incident.incidents} |

${heldoutPolicyOnlyFalseAlarms} harmless alerts have only owner-area signals. The other ${h.falseAlarms - heldoutPolicyOnlyFalseAlarms} also have inherited built-in human signals (auth-named tests, an example environment file, or unrecognised static SVG assets). They are included in total false alarms rather than attributed solely to the new profile.

### Held-out misses and false alarms

| SHA | Date | Message | Tier | Manual judgement | Outcome | Reason |
| --- | --- | --- | --- | --- | --- | --- |
${table(heldout, labels.heldout, commit => labels.heldout[commit.sha].risk === "real risk" ? commit.tier !== "human" : commit.tier === "human") || "| — | — | None | — | — | — | — |"}

### All 200 held-out judgements

| SHA | Date | Message | Tier | Manual judgement | Outcome | Reason |
| --- | --- | --- | --- | --- | --- | --- |
${table(heldout, labels.heldout, () => true)}

## Method and limits

Git inspection is local and read-only: no fetch, checkout, dependency install, historical code execution or network is used by the replay. Only the separately requested branch push uses network. Root commits compare with the empty tree; merges compare with their first parent. Underlying work can recur in feature commits and merges; counts describe commit decisions, not unique deployments. Dates are original committer dates; subjects are escaped and the full message is supplied as claim.

Historical inputs have forced=false, no agent, no declared scope and an explicit unknown pusher. Git cannot prove whether a historical push was forced or identify GitHub pushers; the synthetic incident exercises those unavailable signals. The incident is excluded from historical counts; all incident variants are human in both profile runs: ${primary.incident.allHuman && heldout.incident.allHuman}.

Files with either side over 500,000 bytes, binary markers, NUL or invalid UTF-8 are skipped; submodules have no blob text and are skipped. Skipped file-change occurrences: primary **${skipped(primary)}**, held-out **${skipped(heldout)}** (listed per commit in owner-results.json). Counts/labels cover inspected text; skipped content is not a safety verdict. Empty inspected commits are counted. Runtime includes Git reads, conversion, engine and fixture grouping, and excludes manual review/tests/push. No causal performance claim is made from these timings.

Primary and held-out real-risk judgements remain subjective, not an independent security audit. Binary/skipped changes and unrecognised security semantics can hide risk. The held-out sample was unseen while choosing the profile, but it comes from the same repository/history and contains overlapping merged changes, so it is not an independent project benchmark. The reported held-out misses and policy false alarms should inform future owner review; this experiment does not tune the profile against them.
`;
}
