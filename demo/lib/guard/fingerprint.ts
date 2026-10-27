import { canonicalJSON, sha256 } from "./chain";
import type { FileChange, Finding, Tier } from "./types";
export function normalizeEvidence(text: string): string {
  return text.trim().replace(/\s+/gu, run => `<ws:${run.length}>`);
}
export function obfuscatedHashes(findings: readonly Finding[], files: readonly FileChange[]): string[] {
  return [...new Set(findings.filter(f => f.code === "obfuscated_file").flatMap(f => files.filter(file => file.path === f.file).map(file => sha256(file.after ?? ""))))].sort();
}
export function fingerprint(tier: Tier, findings: readonly Finding[], hashes: readonly string[], pusher: string): string | null {
  if (tier !== "human") return null;
  const evidence = findings.filter(f => f.tier === "human").map(f => {
    const normalized = Object.fromEntries(Object.entries(f.evidence ?? {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, typeof value === "string" ? normalizeEvidence(value) : value]));
    return `${f.code}:${canonicalJSON(normalized)}`;
  }).sort();
  return sha256(canonicalJSON({evidence, hashes: [...hashes].sort(), pusher: pusher.toLowerCase()}));
}
