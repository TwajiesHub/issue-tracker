import { isLocked } from "./categorize";
import type { Category, ChangeInput, Finding, Tier } from "./types";
export const tierRank: Record<Tier, number> = {auto: 0, review: 1, human: 2};
export const maxTier = (...tiers: Tier[]): Tier => tiers.reduce((a, b) => tierRank[a] >= tierRank[b] ? a : b, "auto");
const labels: Record<Category, string> = {docs: "documentation", tests: "tests", ui: "the interface", code: "application code", scripts: "script commands", deps: "dependencies", ci_build: "build configuration", auth: "authentication", agent_rules: "agent rules", unknown: "unrecognised files"};
export function categoryTier(category: Category, delegation: ChangeInput["delegation"] = {}): Tier {
  if (isLocked(category) || category === "unknown") return "human";
  const level = delegation[category] ?? (category === "docs" || category === "tests" ? "auto" : "tell_after");
  return level === "ask" ? "human" : level === "tell_after" ? "review" : "auto";
}
export function classify(categories: readonly Category[], findings: readonly Finding[], delegation?: ChangeInput["delegation"]): Tier {
  let tier = maxTier(...categories.map(c => categoryTier(c, delegation)), ...findings.map(f => f.tier));
  if (findings.some(f => f.code === "claim_mismatch")) tier = tier === "auto" ? "review" : "human";
  return tier;
}
export function summarize(input: ChangeInput, categories: Category[], findings: Finding[], tier: Tier): string {
  const agent = input.agent?.name ?? `A change on ${input.branch}`;
  if (tier === "human") {
    if (findings.some(f => f.code === "claim_mismatch" || f.code === "outside_scope")) return `${agent} did more than it promised.`;
    if (findings.some(f => f.code === "broke_limit")) return `${agent} broke a limit you set.`;
    const riskiest = [...categories].sort((a, b) => tierRank[categoryTier(b, input.delegation)] - tierRank[categoryTier(a, input.delegation)])[0] ?? "unknown";
    return `${agent} wants to change ${labels[riskiest]}.`;
  }
  if (tier === "review") return `${agent} changed ${input.files.length} files you can check later.`;
  return `${agent} updated ${labels[categories[0] ?? "code"]}.`;
}
