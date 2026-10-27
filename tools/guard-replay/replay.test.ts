import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { binaryPaths, HistoryReader, MAX_FILE_BYTES, parseMetadata, parseRawDiff, type Git } from "./git";
import { markdownCell, renderReport, renderComparison, statistics, type Comparison, type Judgements, type Replay } from "./replay";
const sha = "a".repeat(40), parent = "b".repeat(40), blob = "c".repeat(40), oldBlob = "d".repeat(40), zero = "0".repeat(40);
const metadata = (parents = parent) => Buffer.from(`${sha}\0${parents}\x002026-10-27T13:00:00+01:00\0Fictional Author\0author@example.invalid\0Commit subject\n\nFull body\n`);
const raw = (status = "M", old = oldBlob, next = blob, path = "lib/a.ts") => Buffer.from(`:100644 100644 ${old} ${next} ${status}\0${path}\0`);
function readerWith(options: {before?: Buffer; after?: Buffer; size?: number; binary?: boolean; parents?: string; delta?: Buffer} = {}) {
  const calls: string[][] = [];
  const read: Git = args => {
    calls.push(args);
    if (args[0] === "show") return metadata(options.parents);
    if (args[0] === "hash-object") return Buffer.from("e".repeat(40));
    if (args[0] === "diff") return args.includes("--raw") ? options.delta ?? raw() : Buffer.from(options.binary ? "-\t-\tlib/a.ts\0" : "1\t1\tlib/a.ts\0");
    if (args[0] === "cat-file") return args[1] === "-s" ? Buffer.from(String(options.size ?? 3)) : args[2] === oldBlob ? options.before ?? Buffer.from("old") : options.after ?? Buffer.from("new");
    if (args[0] === "rev-parse") return Buffer.from(sha + "\n");
    if (args[0] === "log") return Buffer.from(`${sha}\n${parent}\n`);
    throw new Error(`Unexpected Git read ${args.join(" ")}`);
  };
  return {reader: new HistoryReader(read), calls};
}
describe("read-only Git conversion", () => {
  it("preserves full metadata/message", () => expect(parseMetadata(metadata())).toMatchObject({sha, parents: [parent], authorEmail: "author@example.invalid", message: "Commit subject\n\nFull body"}));
  it("lists a pinned main tip with a 200-commit cap", () => {
    const {reader, calls} = readerWith(); expect(reader.commits()).toEqual([sha, parent]);
    expect(calls[0]).toEqual(["rev-parse", "--verify", "refs/remotes/origin/main^{commit}"]);
    expect(calls[1]).toEqual(["log", "-n", "200", "--format=%H", sha, "--"]);
  });
  it("parses rename and unusual paths without splitting on whitespace", () => {
    const diff = raw("R100", oldBlob, blob, "old\tname\n.ts");
    const changes = parseRawDiff(Buffer.concat([diff, Buffer.from("new name.ts\0")]));
    expect(changes[0]).toMatchObject({status: "renamed", oldPath: "old\tname\n.ts", path: "new name.ts"});
  });
  it.each([["A", "added"], ["M", "modified"], ["D", "removed"], ["T", "modified"]])("maps %s status", (status, expected) => expect(parseRawDiff(raw(status))[0].status).toBe(expected));
  it("parses binary markers without confusing tabs/newlines in filenames", () => expect([...binaryPaths(Buffer.from("-\t-\ta\tb\nc\0"))]).toEqual(["a\tb\nc"]));
  it("supplies before/after and no fabricated agent, scope, or push evidence", () => {
    const {reader, calls} = readerWith();
    const {input} = reader.readCommit(sha);
    expect(input.files).toEqual([{path: "lib/a.ts", status: "modified", before: "old", after: "new"}]);
    expect(input).toMatchObject({forced: false, claim: "Commit subject\n\nFull body", beforeSha: parent, afterSha: sha, pusher: "unknown-from-git-history"});
    expect(input).not.toHaveProperty("agent"); expect(input).not.toHaveProperty("declaredScope");
    expect(calls.every(c => ["show", "diff", "cat-file"].includes(c[0]))).toBe(true);
    expect(calls.filter(c => c[0] === "diff").every(c => c.includes("--no-ext-diff") && c.includes("--no-textconv"))).toBe(true);
  });
  it("compares a merge against exactly its first parent", () => {
    const {reader, calls} = readerWith({parents: `${parent} ${"f".repeat(40)}`});
    expect(reader.readCommit(sha).metadata.parents).toHaveLength(2);
    expect(calls.find(c => c[0] === "diff")?.slice(3, 5)).toEqual([parent, sha]);
  });
  it("compares a root against an unwritten empty tree and uses null before for additions", () => {
    const {reader, calls} = readerWith({parents: "", delta: raw("A", zero)});
    const {input} = reader.readCommit(sha);
    expect(input.beforeSha).toBeNull(); expect(input.files[0].before).toBeNull();
    expect(calls.some(c => c[0] === "hash-object" && !c.includes("-w"))).toBe(true);
  });
  it("uses null after for deleted files", () => expect(readerWith({delta: raw("D", oldBlob, zero)}).reader.readCommit(sha).input.files[0]).toMatchObject({status: "removed", before: "old", after: null}));
  it("skips files over 500 KB before retrieving content, but includes exactly 500 KB", () => {
    const large = readerWith({size: MAX_FILE_BYTES + 1});
    expect(large.reader.readCommit(sha).skipped[0].reason).toBe("over 500 KB");
    expect(large.calls.some(c => c[0] === "cat-file" && c[1] === "blob")).toBe(false);
    expect(readerWith({size: MAX_FILE_BYTES}).reader.readCommit(sha).input.files).toHaveLength(1);
  });
  it.each([Buffer.from("a\0b"), Buffer.from([0xff])])("skips non-text blob %j", after => expect(readerWith({after}).reader.readCommit(sha).skipped[0].reason).toBe("binary"));
  it("skips either-side binary and Git-marked binaries", () => {
    expect(readerWith({before: Buffer.from("a\0b")}).reader.readCommit(sha).input.files).toEqual([]);
    const {reader, calls} = readerWith({binary: true});
    expect(reader.readCommit(sha).skipped[0].reason).toBe("binary"); expect(calls.some(c => c[0] === "cat-file")).toBe(false);
  });
  it("preserves a leading BOM and caches repeated blob reads", () => {
    const {reader, calls} = readerWith({after: Buffer.from("\ufeffnew")});
    expect(reader.readCommit(sha).input.files[0].after).toBe("\ufeffnew");
    reader.readCommit(sha);
    expect(calls.filter(c => c[0] === "cat-file")).toHaveLength(4);
  });
  it("reports submodule entries without treating commit objects as blobs", () => {
    const {reader} = readerWith({delta: Buffer.from(`:160000 160000 ${oldBlob} ${blob} M\0vendor\0`)});
    expect(reader.readCommit(sha).skipped).toEqual([{path: "vendor", reason: "non-blob (submodule)"}]);
  });
  it("does not disguise malformed Git output or invalid SHAs as zero-change commits", () => {
    expect(() => parseRawDiff(Buffer.from("bad\0"))).toThrow(); expect(() => binaryPaths(Buffer.from("bad\0"))).toThrow();
    expect(() => parseMetadata(Buffer.from("bad"))).toThrow(); expect(() => readerWith().reader.readCommit("--bad")).toThrow();
  });
});
const sample = (): Replay => ({ref: "refs/remotes/origin/main", tip: sha, engineCommit: parent, generatedAt: "2026-10-27T12:00:00Z", seconds: 1.234,
  incident: {branches: 17, incidents: 1, allHuman: true}, commits: [
    {sha, date: "2026-10-27", message: "Bump | dependency\nbody", parentCount: 1, fileCount: 1, paths: ["package.json"], skipped: [], tier: "human", categories: ["deps"], findings: [{code: "deps_changed", title: "One."}, {code: "deps_changed", title: "Two."}]},
    {sha: parent, date: "2026-10-26", message: "Readme", parentCount: 1, fileCount: 1, paths: ["README.md"], skipped: [], tier: "auto", categories: ["docs"], findings: []},
  ]});
describe("honest report generation", () => {
  it("requires an explicit judgement for every human commit", () => expect(() => renderReport(sample(), {})).toThrow(`Missing manual judgement for ${sha}`));
  it("distinguishes emitted finding counts from affected commits", () => {
    const stats = statistics(sample()); expect(stats.tiers).toEqual({auto: 1, review: 0, human: 1}); expect(stats.findings.deps_changed).toBe(2); expect(stats.affectedCommits.deps_changed).toBe(1);
  });
  it("preserves genuine dependency risk and renders the denominator and incident result", () => {
    const report = renderReport(sample(), {[sha]: {verdict: "real risk", reason: "Changes dependency versions."}});
    expect(report).toContain("**0.00%** (0/1)"); expect(report).toContain("17 branches → 1 incident"); expect(report).toContain("real risk | Changes dependency versions."); expect(report).toContain("Bump &#124; dependency"); expect(report).toContain("1.234 seconds");
  });
  it("computes human-queue false discovery share separately from all-commit share", () => {
    const report = renderReport(sample(), {[sha]: {verdict: "false alarm", reason: "Synthetic test of a reviewed harmless trigger."}});
    expect(report).toContain("**100.00%** (1/1)"); expect(report).toContain("**50.00%** (1/2)");
  });
  it("reports empty denominators honestly", () => expect(renderReport({...sample(), commits: []}, {})).toContain("N/A (zero denominator)"));
  it("escapes Markdown and HTML in untrusted commit text", () => expect(markdownCell("<img> | `test`\nnext &" )).toBe("&lt;img&gt; &#124; &#96;test&#96; next &amp;"));
});


describe("before/after integrity", () => {
  const labels: Judgements = {[sha]: {verdict: "real risk", reason: "Dependency change still merits review."}};
  const changed = () => ({...sample(), commits: sample().commits.map((c, i) => i ? c : {...c, tier: "review" as const, findings: []})});
  const comparison = (): Comparison => ({before: sample(), beforeJudgements: labels, changes: {[sha]: {correct: false, reason: "A real risk lost its human gate."}}});
  it("reports lost real-risk coverage without relabelling it a false-alarm reduction", () => {
    const report = renderComparison(changed(), labels, comparison());
    expect(report).toContain("1 were previously judged real risks");
    expect(report).toContain("no — review coverage lost");
    expect(report).toContain("real risk");
  });
  it("requires explicit correctness judgements", () => expect(() => renderComparison(changed(), labels, {...comparison(), changes: {}})).toThrow("Missing tier-change judgement"));
  it("rejects different tips, commit sets or ordering", () => {
    expect(() => renderComparison({...changed(), tip: parent}, labels, comparison())).toThrow("exact same pinned tip");
    expect(() => renderComparison({...changed(), commits: [...changed().commits].reverse()}, labels, comparison())).toThrow("ordered commits");
  });
  it("rejects changed file coverage", () => {
    const after = changed(); after.commits[0] = {...after.commits[0], paths: []};
    expect(() => renderComparison(after, labels, comparison())).toThrow("file coverage changed");
  });
  it("the saved replays use identical inputs and change no other finding codes", () => {
    const before = JSON.parse(readFileSync("tools/guard-replay/results-before.json", "utf8")) as Replay;
    const after = JSON.parse(readFileSync("tools/guard-replay/results.json", "utf8")) as Replay;
    expect(after.tip).toBe("a2d680f508a7504ac0f2f064eea243936dd5eca3"); expect(after.tip).toBe(before.tip);
    expect(after.commits).toHaveLength(200);
    for (let i = 0; i < 200; i++) {
      const a = after.commits[i], b = before.commits[i];
      expect(a.sha).toBe(b.sha); expect(a.paths).toEqual(b.paths); expect(a.skipped).toEqual(b.skipped);
      expect(a.findings.filter(f => f.code !== "obfuscated_file")).toEqual(b.findings.filter(f => f.code !== "obfuscated_file"));
    }
    expect(after.incident).toEqual({branches: 17, incidents: 1, allHuman: true});
    expect(JSON.parse(readFileSync("tools/guard-replay/judgements.json", "utf8"))).toEqual(JSON.parse(readFileSync("tools/guard-replay/judgements-before.json", "utf8")));
  });
});
