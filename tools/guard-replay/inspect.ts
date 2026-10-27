/** Review aid: prints inert added-text excerpts; never executes historical files. */
import { readFileSync } from "node:fs";
import { addedText, sha256 } from "../../demo/lib/guard/index";
import { HistoryReader } from "./git";
import type { Replay } from "./replay";
const replay = JSON.parse(readFileSync("tools/guard-replay/results.json", "utf8")) as Replay;
const reader = new HistoryReader(), seen = new Set<string>();
for (const commit of replay.commits) {
  if (commit.tier !== "human" || commit.findings.some(f => f.code === "protected_path" || f.code === "unknown_file")) continue;
  const {input} = reader.readCommit(commit.sha);
  for (const finding of commit.findings.filter(f => f.code === "obfuscated_file")) {
    const file = input.files.find(f => f.path === finding.file)!;
    const text = addedText(file), key = sha256(file.path + text);
    if (seen.has(key)) continue;
    seen.add(key);
    const lines = text.split("\n"), longest = [...lines].sort((a, b) => b.length - a.length)[0];
    console.log(JSON.stringify({sha: commit.sha.slice(0, 10), path: file.path, entropy: finding.metric,
      addedBytes: Buffer.byteLength(text), longestLine: longest.length,
      identifiers: text.match(/_0x[0-9a-f]{3,}/gi)?.length ?? 0,
      beginning: lines.slice(0, 12).join("\n").slice(0, 800),
      longestExcerpt: longest.slice(0, 250), ending: lines.slice(-4).join("\n").slice(0, 400)}));
  }
}
