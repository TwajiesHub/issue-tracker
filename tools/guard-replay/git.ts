import { execFileSync } from "node:child_process";
import { TextDecoder } from "node:util";
import type { ChangeInput, FileChange } from "../../demo/lib/guard/types";

export const MAX_FILE_BYTES = 500_000;
export const MAIN_REF = "refs/remotes/origin/main";
export type Git = (args: string[], input?: string) => Buffer;
export const git: Git = (args, input) => execFileSync("git", ["--no-pager", "--no-replace-objects", ...args], {
  input, maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" },
});
export interface Delta { oldMode: string; newMode: string; oldOid: string; newOid: string; status: FileChange["status"]; oldPath: string; path: string }
export interface Metadata { sha: string; parents: string[]; date: string; authorName: string; authorEmail: string; message: string }
export interface SkippedFile { path: string; reason: "binary" | "over 500 KB" | "non-blob (submodule)" }
export function parseRawDiff(buffer: Buffer): Delta[] {
  const fields = buffer.toString("utf8").split("\0"), changes: Delta[] = [];
  for (let i = 0; i < fields.length && fields[i];) {
    const header = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([AMDRCT])(\d*)$/.exec(fields[i++]);
    if (!header) throw new Error("Unrecognised raw git diff record");
    const [, oldMode, newMode, oldOid, newOid, status] = header;
    const oldPath = fields[i++];
    const path = status === "R" || status === "C" ? fields[i++] : oldPath;
    if (!path || !oldPath) throw new Error("Missing git diff path");
    changes.push({oldMode, newMode, oldOid, newOid, oldPath, path,
      status: status === "A" || status === "C" ? "added" : status === "D" ? "removed" : status === "R" ? "renamed" : "modified"});
  }
  return changes;
}
export function binaryPaths(buffer: Buffer): Set<string> {
  const paths = new Set<string>();
  for (const record of buffer.toString("utf8").split("\0").filter(Boolean)) {
    const match = /^([^\t]+)\t([^\t]+)\t([\s\S]+)$/.exec(record);
    if (!match) throw new Error("Unrecognised numstat record");
    if (match[1] === "-" || match[2] === "-") paths.add(match[3]);
  }
  return paths;
}
export function parseMetadata(buffer: Buffer): Metadata {
  const [sha, parents, date, authorName, authorEmail, ...message] = buffer.toString("utf8").split("\0");
  if (!/^[0-9a-f]{40,64}$/.test(sha) || !date || message.length === 0) throw new Error("Invalid commit metadata");
  return {sha, parents: parents ? parents.split(" ") : [], date, authorName, authorEmail, message: message.join("\0").trimEnd()};
}
/** Reads object data only. No checkout, filters, textconv, hooks, fetch, or shell. */
export class HistoryReader {
  private blobs = new Map<string, {text: string | null; reason?: SkippedFile["reason"]}>();
  constructor(private readonly read: Git = git) {}
  commits(ref = MAIN_REF): string[] {
    const tip = this.read(["rev-parse", "--verify", `${ref}^{commit}`]).toString().trim();
    return this.read(["log", "-n", "200", "--format=%H", tip, "--"]).toString().trim().split("\n").filter(Boolean);
  }
  private blob(oid: string): {text: string | null; reason?: SkippedFile["reason"]} {
    if (/^0+$/.test(oid)) return {text: null};
    const cached = this.blobs.get(oid);
    if (cached) return cached;
    const size = Number(this.read(["cat-file", "-s", oid]).toString().trim());
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("Invalid blob size");
    let result: {text: string | null; reason?: SkippedFile["reason"]};
    if (size > MAX_FILE_BYTES) result = {text: null, reason: "over 500 KB"};
    else {
      const data = this.read(["cat-file", "blob", oid]);
      try {
        if (data.includes(0)) throw new Error("NUL in blob");
        result = {text: new TextDecoder("utf-8", {fatal: true, ignoreBOM: true}).decode(data)};
      } catch { result = {text: null, reason: "binary"}; }
    }
    this.blobs.set(oid, result);
    return result;
  }
  readCommit(sha: string): {input: ChangeInput; metadata: Metadata; skipped: SkippedFile[]} {
    if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new Error("Expected a full commit SHA");
    const metadata = parseMetadata(this.read(["show", "-s", "--format=%H%x00%P%x00%cI%x00%an%x00%ae%x00%B", sha]));
    const parent = metadata.parents[0] ?? this.read(["hash-object", "-t", "tree", "--stdin"], "").toString().trim();
    const baseArgs = ["diff", "--no-ext-diff", "--no-textconv", parent, sha];
    const deltas = parseRawDiff(this.read([...baseArgs, "--raw", "--no-abbrev", "-z", "-M", "--"]));
    const binary = binaryPaths(this.read([...baseArgs, "--numstat", "-z", "--no-renames", "--"]));
    const files: FileChange[] = [], skipped: SkippedFile[] = [];
    for (const delta of deltas) {
      if (delta.oldMode === "160000" || delta.newMode === "160000") { skipped.push({path: delta.path, reason: "non-blob (submodule)"}); continue; }
      if (binary.has(delta.oldPath) || binary.has(delta.path)) { skipped.push({path: delta.path, reason: "binary"}); continue; }
      const before = this.blob(delta.oldOid), after = this.blob(delta.newOid);
      const reason = before.reason ?? after.reason;
      if (reason) { skipped.push({path: delta.path, reason}); continue; }
      files.push({path: delta.path, status: delta.status, before: before.text, after: after.text});
    }
    return {metadata, skipped, input: {
      id: sha, repo: "TwajiesHub/issue-tracker", branch: "main", beforeSha: metadata.parents[0] ?? null,
      afterSha: sha, forced: false, isAncestor: metadata.parents.length ? true : null,
      pusher: "unknown-from-git-history", commits: [{sha, message: metadata.message, authorName: metadata.authorName, authorEmail: metadata.authorEmail}],
      files, claim: metadata.message,
    }};
  }
}
