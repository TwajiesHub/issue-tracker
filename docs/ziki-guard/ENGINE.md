# Engine: how Ziki checks a change

Pure TypeScript in `lib/guard/`. **No database, no network, no new npm packages** (use `node:crypto` only). Everything is
a pure function or a small class, fully unit-tested with Vitest. Claude Code wires it to the database, the GitHub
webhook and the screens later.

## Pipeline
```
change ─▶ categorize ─▶ detectors ─▶ classify ─▶ fingerprint ─▶ (group across changes) ─▶ (queue for the human)
                                                                   decisions ─▶ chained log ─▶ autonomy statistics
```

## Types (`lib/guard/types.ts`)
```ts
export type Tier = "auto" | "review" | "human";           // shown as: Done by agents · Can wait · Needs you
export type Category =
  | "docs" | "tests" | "ui" | "code"                       // ordinary work
  | "scripts" | "deps" | "ci_build" | "auth" | "agent_rules" // locked: always human
  | "unknown";                                             // nothing recognised it: human
export type Delegation = "ask" | "tell_after" | "auto";    // ask → human, tell_after → review, auto → auto
export type LimitKind = "no_new_dependencies" | "stay_in_scope" | "no_protected_files";

export interface FileChange {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  before?: string | null;   // full text before (null for added / binary)
  after?: string | null;    // full text after (null for removed / binary)
}
export interface CommitInfo { sha: string; message: string; authorName: string; authorEmail: string }
export interface AgentInfo {
  id: string; name: string; ownerUserId: string;
  ownerEmails: string[];        // emails the owner commits with
  allowedPushers: string[];     // GitHub logins allowed to push for this owner/agent
}
export interface ChangeInput {
  id: string; repo: string; branch: string;
  beforeSha: string | null; afterSha: string;
  forced: boolean;              // GitHub push payload `forced`
  isAncestor?: boolean | null;  // was beforeSha an ancestor of afterSha (caller computes; null = unknown)
  pusher: string;               // GitHub login that pushed
  commits: CommitInfo[];
  files: FileChange[];
  agent?: AgentInfo | null;     // the agent Ziki attributes this to, if any
  claim?: string | null;        // the agent's own words (PR body, commit message, or proposal intent)
  declaredScope?: string[] | null;  // globs the agent promised to touch
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
  title: string;                 // ONE plain sentence for humans, e.g. "A script now runs before dev, build and start."
  evidence?: { before?: string; after?: string; excerpt?: string; metric?: number };
}
export interface GuardResult {
  tier: Tier;
  findings: Finding[];           // ordered: tier desc, then the order of FindingCode above
  categories: Category[];
  matchesPromise: boolean;       // false if outside_scope or claim_mismatch
  fingerprint: string | null;    // set for human-tier results (used to group one attack across branches)
  summary: string;               // one agent-first sentence, e.g. "Nova did more than it promised."
}
export function runGuard(input: ChangeInput, config?: Partial<GuardConfig>): GuardResult;
```

## 1. Categorize (`categorize.ts`)
Map each path to a category with globs (reuse the matcher style of `lib/approvals.ts` `matchGlob`, or copy it into
`lib/guard/glob.ts` with tests):
- `scripts`: `package.json` *when its `scripts` changed* (decided by the manifest detector).
- `deps`: `package.json` dependency sections, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `requirements*.txt`, `pubspec.yaml`, `pubspec.lock`.
- `ci_build`: `.github/**`, `Dockerfile*`, `docker-compose*.yml`, `vercel.json`, `next.config.*`, `postcss.config.*`, `tailwind.config.*`, `vite.config.*`, `webpack.config.*`, `tsconfig*.json`, `Makefile`, `scripts/**`, `.husky/**`, `prisma/migrations/**`.
- `auth`: `auth*.ts`, `middleware.ts`, `**/auth/**`, `**/*secret*`, `.env*`, `**/permissions/**`.
- `agent_rules`: `AGENTS.md`, `CLAUDE.md`, `**/AGENTS.md`, `.cursor/**`, `.claude/**`, `mcp*.json`, `**/.mcp.json`.
- `docs`: `**/*.md` (except agent_rules), `docs/**`, `LICENSE`.
- `tests`: `**/*.test.*`, `**/*.spec.*`, `e2e/**`, `**/__tests__/**`.
- `ui`: `components/**`, `app/**/*.tsx`, `**/*.css`, `public/**` (not js).
- `code`: other source files (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.dart`, `*.py`, …).
- `unknown`: anything else, including any new root-level `*.js`/`*.mjs`/`*.sh` file → also raises `unknown_file`.
Locked categories (`scripts`, `deps`, `ci_build`, `auth`, `agent_rules`) are always `human` and ignore delegation.

## 2. Detectors (`detectors/*.ts`), each returns `Finding[]`
| Code | Rule | Tier |
| --- | --- | --- |
| `scripts_changed` | Parse `package.json` before/after as JSON. Compare the `scripts` object **key by key**. Report scripts whose command changed or was added; the title names them ("A command now runs before dev, build and start."), evidence shows before/after. A version-only change does not trigger this. | human |
| `lifecycle_hook` | `preinstall`, `install`, `postinstall`, `prepare`, `prepublish`, `prepack` added or changed. | human |
| `deps_changed` | Dependencies added, removed or re-versioned in any dependency section, or a lockfile changed. | human |
| `deps_unusual_source` | A dependency spec that is a git URL, tarball URL, `file:` or `link:`. | human |
| `unreadable_manifest` | `package.json` fails to parse. | human |
| `protected_path` | Any locked-category path not already explained by the findings above (one finding per category, listing files). | human |
| `hidden_whitespace` | In added/changed text: a run of ≥ 200 consecutive spaces/tabs on one line, or ≥ 200 whitespace characters after the last non-whitespace character of the file. Linear scan, O(n). Evidence: count, line. | human |
| `invisible_chars` | In code/config files (not `.md`, not translation `.json`): U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF (except at offset 0), U+E0000–U+E007F, U+E0100–U+E01EF. | human |
| `obfuscated_file` | Added or changed file (skip allowlisted: `**/*.min.*`, `dist/**`, `build/**`, `.next/**`, `public/**/*.js`, lockfiles) whose **added text** has Shannon entropy ≥ 5.0 bits/char over ≥ 1,000 chars, **or** ≥ 5 identifiers matching `/_0x[0-9a-f]{3,}/i`, **or** any line ≥ 2,000 chars in a `.js/.mjs/.cjs/.ts` file. Evidence: entropy, size. | human |
| `history_rewritten` | `forced === true` or `isAncestor === false`. Title: "It replaced an earlier commit by force." Evidence: `beforeSha` (the restore point). | human |
| `author_pusher_mismatch` | With an `agent`: any commit author email not in `ownerEmails`, or `pusher` not in `allowedPushers`. Title: "The commit says one author but was pushed by someone else." | human |
| `outside_scope` | With `declaredScope`: files that match none of its globs. | review (human if limit `stay_in_scope`) |
| `claim_mismatch` | Locked categories present in the change but **not** in the declared scope and **not** mentioned by the claim (keyword map per category: scripts→"script, package.json, npm"; deps→"dependency, package, upgrade, bump, install"; ci_build→"ci, workflow, build, docker, config"; auth→"auth, login, permission, secret"; agent_rules→"agents.md, rules, instructions"). Title: "This doesn't match what {agent} promised." | raises the overall tier one step |
| `broke_limit` | Limit violated: `no_new_dependencies` (deps added), `stay_in_scope` (outside scope), `no_protected_files` (locked category). Title: "This breaks a limit you set: {limit}." | human |
| `unknown_file` | A file no category recognises, or a new root-level executable script. | human |

## 3. Classify (`classify.ts`): a monotonic scale
- Order: `auto < review < human`. Overall tier = **max** over: each category's tier (locked → human; unknown → human;
  otherwise from `delegation`, defaults: docs `auto`, tests `auto`, ui `tell_after`, code `tell_after`) and every finding's tier.
- `claim_mismatch` raises the result one step (auto → review → human).
- **Monotonic:** adding a file or a finding can never lower the tier. Test this property (randomised inputs).
- `summary`: human + mismatch → "{agent} did more than it promised."; human + broke_limit → "{agent} broke a limit you
  set."; human otherwise → "{agent} wants to change {plain label of the riskiest category}."; review → "{agent} changed
  {n} files you can check later."; auto → "{agent} {verb} {thing}." (no agent: use "A change on {branch}").

## 4. Fingerprint and group (`fingerprint.ts`, `group.ts`)
- `fingerprint` (human tier only): SHA-256 over the sorted list of `code + ":" + normalized evidence` for human-tier
  findings, plus the SHA-256 of any `obfuscated_file` content, plus the pusher. The same attack on 17 branches gives the
  same fingerprint; a different attack does not. (Normalize: trim, collapse whitespace runs to their length.)
- `groupIncidents(results)`: **union-find** (`UnionFind` class with path compression and union by rank). Union changes
  with equal fingerprints; also union changes that share the same pusher **and** the same obfuscated-file hash. Returns
  incidents `{ id, changeIds, branches, tier, fingerprint }`.

## 5. Queue (`queue.ts`): what the human sees first
- A small **binary max-heap** `PriorityQueue<T>` with `push`, `pop`, `peek`, `size`, `toSortedArray`.
- Priority of an incident: `tierRank * 1_000_000 + min(branches, 999) * 1_000 + (touchesMain ? 500 : 0) + min(ageMinutes, 499)`.
- Tests: ordering, ties (older first), heap invariants after random push/pop.

## 6. Earned autonomy (`autonomy.ts`)
- `wilsonLowerBound(successes, n, z = 1.96)`.
- `suggestDelegation({ category, approvals, total, brokenPromisesInWindow })` returns a suggestion only if the category is
  not locked, `total ≥ 10`, no broken promise in the window, and the lower bound ≥ **0.75**.
- Expected: 12/12 → ≈ 0.758 → suggest. 10/10 → ≈ 0.722 → no. 11/12 → no. 3/3 → no. Locked category → never.

## 7. Chained log (`chain.ts`)
- `appendEntry(prevHash, entry) → { hash, entry }` with `hash = sha256(prevHash + "\n" + canonicalJSON(entry))`
  (`canonicalJSON` sorts keys recursively). The first entry uses `prevHash = "GENESIS"`.
- `verifyChain(entries) → { ok: true } | { ok: false, brokenAt: number }`. Tests: editing any entry, reordering, or
  deleting one breaks verification at the right index.

## 8. Fixtures (`lib/guard/fixtures/`), harmless stand-ins only
- `incident.ts`: the replayed attack, **17 branch variants** of one push (same payload): `package.json` before/after
  with `"dev": "node api.js && next dev"` etc.; an `api.js` **stand-in** that is a harmless, non-executable-looking text
  (e.g. an array of random base64 strings and `_0x`-style names, starting with the comment
  `// HARMLESS TEST FIXTURE: simulates an obfuscated file; contains no code that does anything`) sized ~12 KB; a
  `postcss.config.mjs` with 2,400 spaces after the last line followed by `/* fixture marker */`; `forced: true`; author
  email that is not the owner's; claim "Small refactor of the switcher menu"; scope `components/agents/AgentSwitcher.tsx`.
  **Never** include real malware, `eval`, network calls, or anything that executes.
- `benign.ts`: a README typo (auto) · an in-scope switcher change (review) · a dependency version bump (human,
  `deps_changed` only, no `scripts_changed`) · a new dependency under the `no_new_dependencies` limit (`broke_limit`) · a
  minified `dist/app.min.js` (no `obfuscated_file`) · a Markdown file with emoji (no `invisible_chars`).

## Required tests (Vitest, `lib/guard/**/*.test.ts`)
- Each detector: positive and negative cases, including the near-misses above.
- `runGuard(incident[0])`: tier human, findings include scripts_changed, obfuscated_file, hidden_whitespace,
  history_rewritten, author_pusher_mismatch, claim_mismatch; `matchesPromise` false; summary "Nova did more than it promised."
- All 17 incident variants → `groupIncidents` → **1 incident** with 17 branches.
- Every benign fixture → the expected tier and no false finding.
- Classify monotonicity property test; queue heap property test; Wilson values; chain tamper tests.
