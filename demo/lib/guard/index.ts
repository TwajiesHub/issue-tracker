import { sha256 } from "./chain";
import { categorize, isLocked, isManifest } from "./categorize";
import { classify, summarize, tierRank } from "./classify";
import { inspectManifest } from "./detectors/manifest";
import { detectContent } from "./detectors/content";
import { detectHistory } from "./detectors/history";
import { detectPromise } from "./detectors/promise";
import { fingerprint, obfuscatedHashes } from "./fingerprint";
import { DEFAULT_CONFIG, FINDING_CODES, type Category, type ChangeInput, type Finding, type GuardConfig, type GuardResult } from "./types";
export function runGuard(input: ChangeInput, config: Partial<GuardConfig> = {}): GuardResult {
  const settings = {...DEFAULT_CONFIG, ...config};
  for (const value of Object.values(settings)) if (!Number.isFinite(value) || value <= 0) throw new RangeError("Guard thresholds must be positive and finite");
  if (settings.entropyMaxWhitespaceRatio > 1) throw new RangeError("Whitespace ratio must not exceed one");
  const findings: Finding[] = [], fileCategories: Category[][] = [];
  let addedDependencies = false;
  input.files.forEach(file => {
    const manifest = inspectManifest(file);
    const categories = categorize(file);
    if (manifest.scriptsChanged) categories.push("scripts");
    if (manifest.depsChanged) categories.push("deps");
    if (isManifest(file.path) && categories.length === 0) categories.push(manifest.findings.some(f => f.code === "unreadable_manifest") ? "unknown" : "code");
    addedDependencies ||= manifest.addedDependencies;
    fileCategories.push(categories);
    findings.push(...manifest.findings, ...detectContent(file, settings));
    if (categories.includes("unknown") && !isManifest(file.path)) findings.push({code: "unknown_file", tier: "human", file: file.path, title: "This file is not recognised by the guard.", evidence: {excerpt: file.path, after: sha256(file.after ?? "")}});
  });
  for (const category of [...new Set(fileCategories.flat())].filter(isLocked)) {
    const paths = input.files.filter((_, i) => fileCategories[i].includes(category) && !findings.some(f => f.file === input.files[i].path && ["scripts_changed", "deps_changed", "unreadable_manifest"].includes(f.code))).map(f => f.path).sort();
    if (paths.length) findings.push({code: "protected_path", tier: "human", title: "This change touches protected files.", evidence: {excerpt: `${category}: ${paths.join(", ")}`, after: JSON.stringify(paths.map(path => [path, sha256(input.files.find(file => file.path === path)?.after ?? "")]))}});
  }
  findings.push(...detectHistory(input), ...detectPromise(input, fileCategories, addedDependencies));
  const categories = [...new Set(fileCategories.flat())];
  const tier = classify(categories, findings, input.delegation);
  const mismatch = findings.find(f => f.code === "claim_mismatch");
  if (mismatch) mismatch.tier = tier;
  findings.sort((a, b) => tierRank[b.tier] - tierRank[a.tier] || FINDING_CODES.indexOf(a.code) - FINDING_CODES.indexOf(b.code));
  const hashes = obfuscatedHashes(findings, input.files);
  return {tier, findings, categories, matchesPromise: !findings.some(f => f.code === "outside_scope" || f.code === "claim_mismatch"), fingerprint: fingerprint(tier, findings, hashes, input.pusher), summary: summarize(input, categories, findings, tier), id: input.id, branch: input.branch, pusher: input.pusher, obfuscatedHashes: hashes};
}
export * from "./types";
export * from "./glob";
export * from "./categorize";
export * from "./classify";
export * from "./fingerprint";
export * from "./group";
export * from "./queue";
export * from "./autonomy";
export * from "./chain";
export * from "./detectors/manifest";
export * from "./detectors/content";
export * from "./detectors/history";
export * from "./detectors/promise";
