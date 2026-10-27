import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJSON, sha256 } from "../../demo/lib/guard/index";
import { git, HistoryReader } from "./git";
import { PINNED_TIP, type Replay, type Judgements } from "./replay";
import { assertSameSample, evaluate, renderOwnerReport, type OwnerLabels, type RiskLabel } from "./owner-report";
import type { OwnerEvaluation } from "./owner-replay";
import { zikiProfile } from "./ziki-profile";
const load = <T>(name: string) => JSON.parse(readFileSync(`tools/guard-replay/${name}.json`, "utf8")) as T;
const evaluation = load<OwnerEvaluation>("owner-results"), original = load<Replay>("results-before"), entropy = load<Replay>("results"), baseline = load<Judgements>("judgements-before");
const labels: OwnerLabels = {primary: load("judgements-protected"), heldout: load("judgements-heldout")};
describe("owner policy measurement", () => {
  it("uses the frozen profile without retrospective tuning", () => {
    expect(evaluation.profile).toEqual(zikiProfile);
    expect(evaluation.profileHash).toBe(sha256(canonicalJSON(zikiProfile)));
    expect(git(["show", `${evaluation.profileCommit}:tools/guard-replay/ziki-profile.ts`]).equals(readFileSync("tools/guard-replay/ziki-profile.ts"))).toBe(true);
  });
  it("uses the same primary sample and the next 200 log entries, not a different ancestry walk", () => {
    assertSameSample(original, evaluation.primary); assertSameSample(entropy, evaluation.primary);
    const expected = git(["log", "-n", "400", "--format=%H", PINNED_TIP, "--"]).toString().trim().split("\n");
    expect(evaluation.primary.commits.map(c => c.sha)).toEqual(expected.slice(0, 200));
    expect(evaluation.heldout.commits.map(c => c.sha)).toEqual(expected.slice(200, 400));
    expect(new Set(expected).size).toBe(400);
  });
  it("validates history offsets", () => expect(() => new HistoryReader().commits(PINNED_TIP, -1)).toThrow("Invalid history offset"));
  it("preserves every old manual judgement, including harmless commits that now alert", () => {
    for (const [sha, label] of Object.entries(baseline)) expect(labels.primary[sha].risk).toBe(label.verdict === "real risk" ? "real risk" : "harmless");
    expect(evaluate(evaluation.primary, labels.primary).falseAlarms).toBeGreaterThan(0);
  });
  it("does not accept partially labelled held-out history or equate review with harmless", () => {
    expect(Object.keys(labels.heldout)).toHaveLength(200);
    expect(() => evaluate(evaluation.heldout, {}, true)).toThrow("Missing manual label");
    const scores = evaluate(evaluation.heldout, labels.heldout, true);
    expect(scores.caught + scores.misses + scores.harmless).toBe(200);
    expect(scores.misses).toBeGreaterThan(0);
    expect(scores.caught + scores.falseAlarms).toBe(scores.human);
  });
  it("scores non-alerted real risks as misses using independent labels", () => {
    const commits = evaluation.heldout.commits.slice(0, 2).map((c, i) => ({...c, tier: i ? "human" as const : "review" as const}));
    const ledger: Record<string, RiskLabel> = {[commits[0].sha]: {risk: "real risk", reason: "Authorization changed."}, [commits[1].sha]: {risk: "harmless", reason: "CSS only."}};
    expect(evaluate({...evaluation.heldout, commits}, ledger, true)).toMatchObject({caught: 0, misses: 1, falseAlarms: 1, harmless: 1});
  });
  it("reports every held-out judgement, all recovery cases, misses and false alarms", () => {
    const report = renderOwnerReport(original, entropy, baseline, evaluation, labels);
    expect(report).toBe(readFileSync("tools/guard-replay/REPORT.md", "utf8"));
    expect(report).toContain("## Owner-protected areas"); expect(report).toContain("| Original | Entropy fix | With protected areas |");
    expect(report).toContain("| Previously lost real risks recovered | N/A | 0/14 | 14/14 |");
    for (const commit of evaluation.heldout.commits) expect(report).toContain(commit.sha.slice(0, 10));
  });
  it("rejects a changed profile, changed samples and retroactively flipped labels", () => {
    expect(() => renderOwnerReport(original, entropy, baseline, {...evaluation, profileHash: "bad"}, labels)).toThrow("Profile hash mismatch");
    expect(() => assertSameSample(original, {...entropy, tip: "bad"})).toThrow("Different replay inputs");
    const sha = Object.keys(baseline)[0];
    const flipped = {...labels, primary: {...labels.primary, [sha]: {risk: baseline[sha].verdict === "real risk" ? "harmless" as const : "real risk" as const, reason: "Bad flip."}}};
    expect(() => renderOwnerReport(original, entropy, baseline, evaluation, flipped)).toThrow("Baseline risk label changed");
  });
  it("still routes and groups all incident variants in both samples", () => {
    for (const replay of [evaluation.primary, evaluation.heldout]) expect(replay.incident).toEqual({branches: 17, incidents: 1, allHuman: true});
  });
});
