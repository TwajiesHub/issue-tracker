export type Tier = "auto" | "review" | "human";
export type Category = "docs" | "tests" | "ui" | "code" | "scripts" | "deps" | "ci_build" | "auth" | "agent_rules" | "unknown";
export type Delegation = "ask" | "tell_after" | "auto";
export type LimitKind = "no_new_dependencies" | "stay_in_scope" | "no_protected_files";
export interface FileChange {
  path: string; status: "added" | "modified" | "removed" | "renamed";
  before?: string | null; after?: string | null;
}
export interface CommitInfo { sha: string; message: string; authorName: string; authorEmail: string }
export interface AgentInfo { id: string; name: string; ownerUserId: string; ownerEmails: string[]; allowedPushers: string[] }
export interface ChangeInput {
  id: string; repo: string; branch: string; beforeSha: string | null; afterSha: string;
  forced: boolean; isAncestor?: boolean | null; pusher: string; commits: CommitInfo[];
  files: FileChange[]; agent?: AgentInfo | null; claim?: string | null;
  declaredScope?: string[] | null; limits?: LimitKind[];
  delegation?: Partial<Record<Category, Delegation>>;
}
export const FINDING_CODES = ["scripts_changed", "lifecycle_hook", "deps_changed", "deps_unusual_source", "protected_path", "hidden_whitespace", "invisible_chars", "obfuscated_file", "history_rewritten", "author_pusher_mismatch", "outside_scope", "claim_mismatch", "broke_limit", "unreadable_manifest", "unknown_file"] as const;
export type FindingCode = typeof FINDING_CODES[number];
export interface Finding {
  code: FindingCode; tier: Tier; file?: string; line?: number; title: string;
  evidence?: { before?: string; after?: string; excerpt?: string; metric?: number };
}
export interface ProtectedArea { label: string; globs: string[] }
export interface GuardConfig { protectedAreas?: ProtectedArea[]; whitespaceRun: number; entropyThreshold: number; entropyMinLength: number; entropyMaxWhitespaceRatio: number; obfuscatedIdentifiers: number; longLineLength: number }
export const DEFAULT_CONFIG: Readonly<GuardConfig> = Object.freeze({ protectedAreas: [], whitespaceRun: 200, entropyThreshold: 5, entropyMinLength: 1000, entropyMaxWhitespaceRatio: 0.05, obfuscatedIdentifiers: 5, longLineLength: 2000 });
export interface GuardResult {
  tier: Tier; findings: Finding[]; categories: Category[]; matchesPromise: boolean;
  fingerprint: string | null; summary: string;
  /** Correlation metadata: no database or mutable registry is needed by groupIncidents. */
  id: string; branch: string; pusher: string; obfuscatedHashes: string[];
}
export interface Incident { id: string; changeIds: string[]; branches: string[]; tier: Tier; fingerprint: string | null }
