import { categorize, isLocked, isLockfile } from "../categorize";
import { matchesAny } from "../glob";
import type { FileChange, Finding, GuardConfig } from "../types";
/** A linear line-multiset diff: unchanged lines do not count as added payload. */
export function addedText(file: FileChange): string {
  if (file.after == null || file.status === "removed") return "";
  const counts = new Map<string, number>();
  for (const line of (file.before ?? "").split("\n")) counts.set(line, (counts.get(line) ?? 0) + 1);
  return file.after.split("\n").filter(line => {
    const count = counts.get(line) ?? 0;
    if (count) { counts.set(line, count - 1); return false; }
    return true;
  }).join("\n");
}
export function shannonEntropy(text: string): number {
  const counts = new Map<string, number>();
  let size = 0;
  for (const char of text) { counts.set(char, (counts.get(char) ?? 0) + 1); size++; }
  let entropy = 0;
  for (const count of counts.values()) { const p = count / size; entropy -= p * Math.log2(p); }
  return entropy;
}
export function detectContent(file: FileChange, config: GuardConfig): Finding[] {
  const text = addedText(file), findings: Finding[] = [];
  if (!text) return findings;
  const emit = (code: Finding["code"], title: string, metric: number, line?: number) => findings.push({code, tier: "human", file: file.path, line, title, evidence: {metric}});
  // Scan the original text to retain accurate line numbers, but only inspect newly added lines.
  const oldLines = new Map<string, number>();
  for (const line of (file.before ?? "").split("\n")) oldLines.set(line, (oldLines.get(line) ?? 0) + 1);
  let offset = 0;
  for (const [index, line] of (file.after ?? "").split("\n").entries()) {
    const count = oldLines.get(line) ?? 0;
    if (count) oldLines.set(line, count - 1);
    else {
      let run = 0, max = 0;
      for (const c of line) { run = c === " " || c === "\t" ? run + 1 : 0; max = Math.max(max, run); }
      if (max >= config.whitespaceRun) emit("hidden_whitespace", "A long run of whitespace hides content on this line.", max, index + 1);
      const excluded = /\.md$/i.test(file.path) || matchesAny(file.path, ["**/locales/**/*.json", "**/translations/**/*.json", "**/i18n/**/*.json", "**/messages/**/*.json"]);
      if (!excluded && (categorize(file).some(c => isLocked(c) || c === "code" || c === "tests") || /\.(?:json|ya?ml|toml|css)$/.test(file.path))) {
        let charOffset = 0;
        for (const c of line) {
          const cp = c.codePointAt(0)!;
          if ((cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069) || (cp === 0xfeff && offset + charOffset !== 0) || (cp >= 0xe0000 && cp <= 0xe007f) || (cp >= 0xe0100 && cp <= 0xe01ef)) {
            emit("invisible_chars", "Invisible characters appear in code or configuration.", cp, index + 1);
            break;
          }
          charOffset += c.length;
        }
      }
    }
    offset += line.length + 1;
  }
  if (file.after != null && file.after !== file.before) {
    let i = file.after.length - 1;
    while (i >= 0 && /\s/u.test(file.after[i])) i--;
    const trailing = file.after.length - 1 - i;
    const previousTail = (file.before ?? "").match(/\s*$/u)?.[0] ?? "";
    if (trailing >= config.whitespaceRun && file.after.slice(i + 1) !== previousTail && !findings.some(f => f.code === "hidden_whitespace")) {
      emit("hidden_whitespace", "A long run of whitespace follows the file's content.", trailing, file.after.slice(0, i + 1).split("\n").length);
    }
  }
  const allowlisted = isLockfile(file.path) || matchesAny(file.path, ["**/*.min.*", "dist/**", "build/**", ".next/**", "public/**/*.js"]);
  if (!allowlisted) {
    const entropy = shannonEntropy(text);
    const whitespaceRatio = (text.match(/[ \t\r\n]/g)?.length ?? 0) / text.length;
    const packedEntropy = !/\.svg$/i.test(file.path) && text.length >= config.entropyMinLength && entropy >= config.entropyThreshold && whitespaceRatio < config.entropyMaxWhitespaceRatio;
    const identifiers = text.match(/_0x[0-9a-f]{3,}/gi)?.length ?? 0;
    const longLine = /\.(?:js|mjs|cjs|ts)$/.test(file.path) && text.split("\n").some(line => line.length >= config.longLineLength);
    if (packedEntropy || identifiers >= config.obfuscatedIdentifiers || longLine) {
      findings.push({code: "obfuscated_file", tier: "human", file: file.path, title: "This file contains text that looks obfuscated.", evidence: {metric: entropy, excerpt: JSON.stringify({size: text.length, whitespaceRatio, identifiers, longLine})}});
    }
  }
  return findings;
}
