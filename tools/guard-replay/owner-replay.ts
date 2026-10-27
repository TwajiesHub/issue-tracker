import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJSON, sha256 } from "../../demo/lib/guard/index";
import { collect, PINNED_TIP, type Replay } from "./replay";
import { git, HistoryReader } from "./git";
import { zikiProfile } from "./ziki-profile";
import { renderOwnerReport, type OwnerLabels } from "./owner-report";
export interface OwnerEvaluation {
  profile: typeof zikiProfile; profileHash: string; profileCommit: string;
  primary: Replay; heldout: Replay;
}
export function main(args: string[]): void {
  if (args.some(arg => arg !== "--collect-only" && arg !== "--render-only")) throw new Error("Usage: owner-replay.ts [--collect-only | --render-only]");
  const path = "tools/guard-replay/owner-results.json";
  let evaluation: OwnerEvaluation;
  if (args.includes("--render-only")) evaluation = JSON.parse(readFileSync(path, "utf8"));
  else {
    const reader = new HistoryReader();
    const profileCommit = git(["log", "-1", "--format=%H", "--", "tools/guard-replay/ziki-profile.ts"]).toString().trim();
    if (!profileCommit) throw new Error("Commit the frozen profile before reading held-out history");
    // Refuse to silently evaluate an uncommitted or changed policy as the frozen profile.
    const saved = git(["show", `${profileCommit}:tools/guard-replay/ziki-profile.ts`]);
    if (!saved.equals(readFileSync("tools/guard-replay/ziki-profile.ts"))) throw new Error("Profile changed after its freeze commit");
    const primary = collect(PINNED_TIP, {config: zikiProfile, reader});
    const heldout = collect(PINNED_TIP, {config: zikiProfile, skip: 200, reader});
    evaluation = {profile: zikiProfile, profileHash: sha256(canonicalJSON(zikiProfile)), profileCommit, primary, heldout};
    writeFileSync(path, JSON.stringify(evaluation, null, 2) + "\n");
  }
  if (!args.includes("--collect-only")) {
    const load = (name: string) => JSON.parse(readFileSync(`tools/guard-replay/${name}.json`, "utf8"));
    const labels: OwnerLabels = {primary: load("judgements-protected"), heldout: load("judgements-heldout")};
    writeFileSync("tools/guard-replay/REPORT.md", renderOwnerReport(load("results-before"), load("results"), load("judgements-before"), evaluation, labels));
  }
  console.log(JSON.stringify({profileCommit: evaluation.profileCommit, primary: evaluation.primary.commits.reduce((counts, c) => ({...counts, [c.tier]: (counts[c.tier] ?? 0) + 1}), {} as Record<string, number>), heldout: evaluation.heldout.commits.reduce((counts, c) => ({...counts, [c.tier]: (counts[c.tier] ?? 0) + 1}), {} as Record<string, number>)}));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve("tools/guard-replay/owner-replay.ts")) main(process.argv.slice(2));
