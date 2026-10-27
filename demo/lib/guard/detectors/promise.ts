import { isLocked } from "../categorize";
import { matchesAny } from "../glob";
import type { Category, ChangeInput, Finding } from "../types";
const keywords: Partial<Record<Category, string[]>> = {
  scripts: ["script", "package.json", "npm"], deps: ["dependency", "dependencies", "package", "upgrade", "bump", "install"],
  ci_build: ["ci", "workflow", "build", "docker", "config"], auth: ["auth", "login", "permission", "secret"], agent_rules: ["agents.md", "rules", "instructions"],
};
export function detectPromise(input: ChangeInput, fileCategories: Category[][], addedDependencies: boolean, protectedAreaMatched = false): Finding[] {
  const findings: Finding[] = [];
  const outside = input.files.filter(file => input.declaredScope != null && !matchesAny(file.path, input.declaredScope));
  for (const file of outside) findings.push({code: "outside_scope", tier: input.limits?.includes("stay_in_scope") ? "human" : "review", file: file.path, title: "This file is outside the promised scope."});
  const claim = (input.claim ?? "").toLowerCase();
  const undeclared = input.files.some((file, i) => fileCategories[i].some(category => isLocked(category) &&
    !matchesAny(file.path, input.declaredScope ?? []) &&
    !keywords[category]?.some(word => new RegExp(`(?:^|[^a-z])${word.replace(/\./g, "\\.")}[a-z]*(?:$|[^a-z])`, "i").test(claim))));
  if (undeclared) findings.push({code: "claim_mismatch", tier: "review", title: `This doesn't match what ${input.agent?.name ?? "the change"} promised.`});
  for (const limit of new Set(input.limits ?? [])) {
    if ((limit === "no_new_dependencies" && addedDependencies) || (limit === "stay_in_scope" && outside.length > 0) || (limit === "no_protected_files" && (protectedAreaMatched || fileCategories.some(categories => categories.some(isLocked))))) {
      findings.push({code: "broke_limit", tier: "human", title: `This breaks a limit you set: ${limit}.`, evidence: {excerpt: limit}});
    }
  }
  return findings;
}
