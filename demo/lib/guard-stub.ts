/**
 * Stand-in for Codex's engine (docs/ziki-guard/ENGINE.md → demo/lib/guard).
 * Same types and function names, but runGuard returns fixed results for the
 * fixtures below instead of detecting anything. Nothing else in the demo imports
 * this file: everything goes through lib/guard.ts, so swapping is a one-line change.
 */

export type Tier = "auto" | "review" | "human";
export type Category =
  | "docs" | "tests" | "ui" | "code"
  | "scripts" | "deps" | "ci_build" | "auth" | "agent_rules"
  | "unknown";
export type Delegation = "ask" | "tell_after" | "auto";
export type LimitKind = "no_new_dependencies" | "stay_in_scope" | "no_protected_files";

export interface FileChange {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  before?: string | null;
  after?: string | null;
}
export interface CommitInfo { sha: string; message: string; authorName: string; authorEmail: string }
export interface AgentInfo {
  id: string; name: string; ownerUserId: string;
  ownerEmails: string[]; allowedPushers: string[];
}
export interface ChangeInput {
  id: string; repo: string; branch: string;
  beforeSha: string | null; afterSha: string;
  forced: boolean;
  isAncestor?: boolean | null;
  pusher: string;
  commits: CommitInfo[];
  files: FileChange[];
  agent?: AgentInfo | null;
  claim?: string | null;
  declaredScope?: string[] | null;
  limits?: LimitKind[];
  delegation?: Partial<Record<Category, Delegation>>;
}
export type FindingCode =
  | "scripts_changed" | "lifecycle_hook" | "deps_changed" | "deps_unusual_source"
  | "protected_path" | "hidden_whitespace" | "invisible_chars" | "obfuscated_file"
  | "history_rewritten" | "author_pusher_mismatch" | "outside_scope" | "claim_mismatch"
  | "broke_limit" | "unreadable_manifest" | "unknown_file";
export interface Finding {
  code: FindingCode; tier: Tier;
  file?: string; line?: number;
  title: string;
  evidence?: { before?: string; after?: string; excerpt?: string; metric?: number };
}
export interface GuardResult {
  tier: Tier;
  findings: Finding[];
  categories: Category[];
  matchesPromise: boolean;
  fingerprint: string | null;
  summary: string;
}
export interface Incident {
  id: string; changeIds: string[]; branches: string[]; tier: Tier; fingerprint: string;
}

// ---------------------------------------------------------------- fixtures

const OWNER = ["alice@zendor.dev"];
export const NOVA: AgentInfo = {
  id: "nova", name: "Nova", ownerUserId: "alice", ownerEmails: OWNER, allowedPushers: ["nova-bot"],
};
export const KITE: AgentInfo = {
  id: "kite", name: "Kite", ownerUserId: "alice", ownerEmails: OWNER, allowedPushers: ["kite-bot"],
};

const RESTORE_POINT = "f58bb07";

/** The replayed attack: one push, repeated on 17 branches. Harmless stand-ins only (no code, no network). */
export function incidentChanges(): ChangeInput[] {
  return Array.from({ length: 17 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `atk-${n}`,
      repo: "zedu/ziki",
      branch: i === 0 ? "nova/refactor-switcher" : `nova/refactor-switcher-${n}`,
      beforeSha: RESTORE_POINT,
      afterSha: `c0ffee${n}`,
      forced: true,
      isAncestor: false,
      pusher: "nova-bot-2",
      commits: [{ sha: `c0ffee${n}`, message: "Small refactor of the switcher menu", authorName: "Nova", authorEmail: "nova@mail.invalid" }],
      files: [
        { path: "components/agents/AgentSwitcher.tsx", status: "modified" },
        { path: "package.json", status: "modified" },
        { path: "api.js", status: "added" },
        { path: "postcss.config.mjs", status: "modified" },
      ],
      agent: NOVA,
      claim: "Small refactor of the switcher menu",
      declaredScope: ["components/agents/AgentSwitcher.tsx"],
    } satisfies ChangeInput;
  });
}

/** Kite's follow-up push after it was told "no new dependencies". */
export function kiteLimitBreak(): ChangeInput {
  return {
    id: "kite-212-2",
    repo: "zedu/ziki",
    branch: "kite/fix-212-emoji-picker",
    beforeSha: "9ad41e2",
    afterSha: "5b7e0c4",
    forced: false,
    isAncestor: true,
    pusher: "kite-bot",
    commits: [{ sha: "5b7e0c4", message: "Use emoji-mart for the picker", authorName: "Kite", authorEmail: "alice@zendor.dev" }],
    files: [
      { path: "lib/composer/emoji.ts", status: "modified" },
      { path: "package.json", status: "modified" },
      { path: "pnpm-lock.yaml", status: "modified" },
    ],
    agent: KITE,
    claim: "Fix the emoji picker (#212)",
    declaredScope: ["lib/composer/*"],
    limits: ["no_new_dependencies"],
  };
}

// ---------------------------------------------------------------- results (fixed)

const INCIDENT_FINDINGS: Finding[] = [
  {
    code: "scripts_changed", tier: "human", file: "package.json", line: 7,
    title: "A script now runs before dev, build and start.",
    evidence: { before: `"dev": "next dev --port 3001"`, after: `"dev": "node api.js && next dev --port 3001"` },
  },
  {
    code: "obfuscated_file", tier: "human", file: "api.js", line: 1,
    title: "A new 12 KB file that looks obfuscated.",
    evidence: { excerpt: "// HARMLESS TEST FIXTURE: simulates an obfuscated file; contains no code that does anything\nconst _0x4af1 = ['Zm9v', 'YmFy', 'YmF6', …];", metric: 5.6 },
  },
  {
    code: "hidden_whitespace", tier: "human", file: "postcss.config.mjs", line: 6,
    title: "2,400 hidden characters at the end of a config file.",
    evidence: { excerpt: "export default config;\n[2,400 spaces]/* fixture marker */", metric: 2400 },
  },
  {
    code: "history_rewritten", tier: "human",
    title: "It replaced an earlier commit by force.",
    evidence: { before: `${RESTORE_POINT} (restore point)`, after: "c0ffee01 (force-pushed)" },
  },
];

const LIMIT_FINDINGS: Finding[] = [
  {
    code: "broke_limit", tier: "human", file: "package.json", line: 24,
    title: "This breaks a limit you set: no new dependencies.",
    evidence: { before: `"dependencies": { "next": "16.4.1" }`, after: `"dependencies": { "next": "16.4.1", "emoji-mart": "^5.6.0" }` },
  },
  {
    code: "deps_changed", tier: "human", file: "pnpm-lock.yaml",
    title: "The lockfile changed to add one library.",
    evidence: { excerpt: "+ emoji-mart@5.6.0" },
  },
];

export function runGuard(input: ChangeInput): GuardResult {
  if (input.id.startsWith("atk-")) {
    return {
      tier: "human",
      findings: INCIDENT_FINDINGS,
      categories: ["scripts", "unknown", "ci_build", "ui"],
      matchesPromise: false,
      fingerprint: "fp-7c1e90a4",
      summary: "Nova did more than it promised.",
    };
  }
  if (input.id.startsWith("kite-212")) {
    return {
      tier: "human",
      findings: LIMIT_FINDINGS,
      categories: ["deps", "code"],
      matchesPromise: true,
      fingerprint: "fp-3b02d5e1",
      summary: "Kite broke a limit you set.",
    };
  }
  return { tier: "auto", findings: [], categories: ["docs"], matchesPromise: true, fingerprint: null, summary: `${input.agent?.name ?? "A change"} fixed a typo.` };
}

export function groupIncidents(entries: { change: ChangeInput; result: GuardResult }[]): Incident[] {
  const byFingerprint = new Map<string, Incident>();
  for (const { change, result } of entries) {
    if (!result.fingerprint || result.tier !== "human") continue;
    const existing = byFingerprint.get(result.fingerprint);
    if (existing) {
      existing.changeIds.push(change.id);
      existing.branches.push(change.branch);
    } else {
      byFingerprint.set(result.fingerprint, {
        id: `inc-${result.fingerprint.slice(3)}`,
        changeIds: [change.id],
        branches: [change.branch],
        tier: result.tier,
        fingerprint: result.fingerprint,
      });
    }
  }
  return [...byFingerprint.values()];
}

// ---------------------------------------------------------------- earned autonomy

export function wilsonLowerBound(successes: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (centre - margin) / denom;
}

const LOCKED: Category[] = ["scripts", "deps", "ci_build", "auth", "agent_rules"];
export function suggestDelegation(a: {
  category: Category; approvals: number; total: number; brokenPromisesInWindow: number;
}): { suggest: boolean; lowerBound: number } {
  const lowerBound = wilsonLowerBound(a.approvals, a.total);
  const suggest = !LOCKED.includes(a.category) && a.total >= 10 && a.brokenPromisesInWindow === 0 && lowerBound >= 0.75;
  return { suggest, lowerBound };
}

// ---------------------------------------------------------------- chained log

export interface ChainEntry { [key: string]: unknown }
export interface Chained<T> { hash: string; prevHash: string; entry: T }

function canonicalJSON(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJSON).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJSON(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** Small synchronous SHA-256 so the log can be chained in the browser without async plumbing. */
export function sha256(text: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, (len * 8) >>> 0);
  view.setUint32(padded.length - 8, Math.floor((len * 8) / 0x100000000));
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return [...h].map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

export function appendEntry<T extends object>(prevHash: string, entry: T): Chained<T> {
  return { hash: sha256(`${prevHash}\n${canonicalJSON(entry)}`), prevHash, entry };
}

export function verifyChain<T extends object>(entries: Chained<T>[]): { ok: true } | { ok: false; brokenAt: number } {
  let prev = "GENESIS";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prevHash !== prev || appendEntry(prev, e.entry).hash !== e.hash) return { ok: false, brokenAt: i };
    prev = e.hash;
  }
  return { ok: true };
}
