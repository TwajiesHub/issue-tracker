import type { Delegation, Finding, LimitKind } from "./guard";
import type { ProtectedArea } from "./guard/types";
import { appendEntry, type Chained } from "./chain";
import type { SimResult } from "./simulate";
import { plainFinding } from "./plain";

export type ItemKind = "paused" | "proposal" | "question" | "design" | "idea";
export type Tier = "needs" | "wait" | "done";
export type ItemState =
  | "open" | "replied" | "restored" | "approved" | "working" | "finished"
  | "declined" | "answered" | "skipped" | "asked" | "held";

export interface PausedData {
  agentId: string;
  promised: string;
  scope: string;
  findings: Finding[];
  branches: number;
  restorePoint: string;
  /** What the agent said in its own words (quoted, never in Ziki's voice). */
  agentSaid: string;
  headline: string;
  paragraph: string;
  note: string;
  paused: string;
}
export interface ProposalData {
  agentId: string;
  issue: string;
  title: string;
  touches: string;
  estimateMin: number;
  needs: string | null;
  recommendation: string;
  paragraph: string;
  appliedLimits: LimitKind[];
}
export interface QuestionData {
  asker: string;
  text: string;
  issue: string;
  replies: string[];
  answer?: string;
}
export interface Item {
  id: string;
  kind: ItemKind;
  tier: Tier;
  agent: string;
  sentence: string;
  details: string[];
  /** Minutes old when the demo loads. */
  ageMin: number;
  state: ItemState;
  resolvedAt?: string;
  note?: string;
  /** Low-risk docs work: what "tell me after" for docs makes quiet. */
  docs?: boolean;
  paused?: PausedData;
  proposal?: ProposalData;
  question?: QuestionData;
}
export interface DoneLine { id: string; time: string; text: string }
export interface LogEntry { t: string; actor: string; text: string }

export type WorkKind = "docs" | "tests" | "ui" | "code";
export const WORK_LABELS: Record<WorkKind, string> = {
  docs: "Docs and README", tests: "Tests", ui: "UI and styling", code: "Other code",
};
export const LOCKED_LABELS = [
  "Scripts and dependencies", "CI and build", "Auth and secrets", "AGENTS.md and agent rules", "Deploys and force pushes",
];
export const LIMIT_LABELS: Record<LimitKind, string> = {
  no_new_dependencies: "No new dependencies",
  stay_in_scope: "Stay in these files",
  no_protected_files: "No protected files",
};
export const DELEGATION_LABELS: Record<Delegation, string> = {
  ask: "Ask me", tell_after: "Tell me after", auto: "Just do it",
};

export interface AgentState {
  id: string;
  name: string;
  blurb: string;
  paused: boolean;
  keySuffix: string;
  rotations: number;
  kept: number;
  total: number;
  /** The one promise Nova broke, linked from "Promises kept". */
  broken: { ref: string; text: string; when: string } | null;
  delegation: Record<WorkKind, Delegation>;
  limits: LimitKind[];
}

export interface State {
  items: Item[];
  doneLines: DoneLine[];
  agents: Record<string, AgentState>;
  log: Chained<LogEntry>[];
  suggestion: "open" | "accepted" | "dismissed";
  /** Protected areas the owner added in the demo (Ziki's own come from guard-profile.ts). */
  areas: ProtectedArea[];
  opened: Record<string, string[]>;
  status: string;
  engineNote: string | null;
}

const delegationAllAsk: Record<WorkKind, Delegation> = { docs: "ask", tests: "ask", ui: "ask", code: "ask" };

export function seedAgents(): Record<string, AgentState> {
  return {
    nova: {
      id: "nova", name: "Nova", blurb: "Frontend agent. Yours.",
      paused: false, keySuffix: "a91f", rotations: 0, kept: 41, total: 42,
      broken: { ref: "T-1790", text: "Said it would only edit the README, also changed a workflow file.", when: "Oct 14" },
      delegation: { ...delegationAllAsk }, limits: [],
    },
    kite: {
      id: "kite", name: "Kite", blurb: "Composer and docs agent. Yours.",
      paused: false, keySuffix: "7d03", rotations: 0, kept: 27, total: 27, broken: null,
      delegation: { ...delegationAllAsk }, limits: [],
    },
    specialone: {
      id: "specialone", name: "SpecialOne", blurb: "Your own reviewer agent.",
      paused: false, keySuffix: "2c58", rotations: 0, kept: 19, total: 19, broken: null,
      delegation: { ...delegationAllAsk }, limits: [],
    },
  };
}

/** Fictional demo history: a week of decisions already in the chained log. */
const HISTORY: LogEntry[] = [
  { t: "Oct 20 · 09:12", actor: "You", text: "Approved Kite: fix a typo in docs/setup.md" },
  { t: "Oct 20 · 15:40", actor: "Ziki", text: "Checked Nova: add tests for the switcher. Passed" },
  { t: "Oct 21 · 11:05", actor: "You", text: "Approved Kite: update CONTRIBUTING.md links" },
  { t: "Oct 22 · 10:31", actor: "You", text: "Skipped SpecialOne: idea for a weekly digest" },
  { t: "Oct 23 · 16:48", actor: "You", text: "Approved Kite: document the composer API" },
  { t: "Oct 24 · 09:55", actor: "Ziki", text: "Checked Nova: reword the empty state. Passed" },
  { t: "Oct 25 · 14:20", actor: "You", text: "Approved Kite: fix a typo in README.md" },
  { t: "Oct 26 · 08:47", actor: "You", text: "Answered SpecialOne: keep survey answers anonymous" },
];

export function seedLog(): Chained<LogEntry>[] {
  const out: Chained<LogEntry>[] = [];
  let prev = "GENESIS";
  for (const e of HISTORY) {
    const c = appendEntry(prev, e as unknown as Record<string, unknown>) as unknown as Chained<LogEntry>;
    out.push(c);
    prev = c.hash;
  }
  return out;
}

export function nextLog(log: Chained<LogEntry>[], entry: LogEntry): Chained<LogEntry>[] {
  const prev = log.length ? log[log.length - 1].hash : "GENESIS";
  return [...log, appendEntry(prev, entry as unknown as Record<string, unknown>) as unknown as Chained<LogEntry>];
}

export const INCIDENT_ID = "inc-nova";
export const KITE_BREAK_ID = "inc-kite";
export const PROPOSAL_ID = "prop-kite-212";

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "");

/** One line per kind of finding, using the engine's own title for the first of each kind. */
export interface FindingGroup { code: string; title: string; items: Finding[] }
export function groupFindings(findings: Finding[]): FindingGroup[] {
  const groups: FindingGroup[] = [];
  for (const f of findings) {
    const g = groups.find((x) => x.code === f.code);
    if (g) g.items.push(f);
    else groups.push({ code: f.code, title: f.title, items: [f] });
  }
  return groups;
}

/** A paused change, built from what the engine found. */
export function pausedItem(sim: SimResult, ageMin: number): Item {
  const attack = sim.kind === "attack";
  const findings = sim.findings.map(plainFinding);
  // The mismatch note says what claim_mismatch says, so the list (and this count) leaves it out.
  const n = groupFindings(findings).filter((g) => !(g.code === "claim_mismatch" && !sim.matchesPromise)).length;
  const limit = findings.find((f) => f.code === "broke_limit");
  const branches = sim.branches === 1 ? "1 branch" : `${sim.branches} branches`;
  return {
    id: attack ? INCIDENT_ID : KITE_BREAK_ID, kind: "paused", tier: "needs", agent: sim.agentName,
    sentence: lower(sim.summary.replace(new RegExp(`^${sim.agentName} `), "")),
    details: ["paused", branches, "nothing has run"],
    ageMin, state: "open",
    paused: {
      agentId: sim.agentId,
      headline: sim.summary,
      paragraph: attack
        ? `${sim.agentName} promised “${sim.claim}”. Ziki found ${n} things it didn't mention. Nothing has run.`
        : `You told ${sim.agentName} no new dependencies. Its second push adds one. Nothing has run.`,
      promised: sim.claim,
      scope: sim.scope,
      agentSaid: sim.claim,
      findings,
      branches: sim.branches,
      restorePoint: sim.restorePoint,
      note: !sim.matchesPromise ? `Doesn't match what ${sim.agentName} promised.` : limit ? limit.title : "Needs your decision.",
      paused: attack ? "4 min" : "0 min",
    },
  };
}

export function seedItems(seed: SimResult): Item[] {
  return [
    pausedItem(seed, 4),
    {
      id: PROPOSAL_ID, kind: "proposal", tier: "needs", agent: "Kite",
      sentence: "wants to fix #212 Emoji picker",
      details: ["proposal", "may add 1 dependency"], ageMin: 12, state: "open",
      proposal: {
        agentId: "kite", issue: "#212", title: "Emoji picker", touches: "lib/composer/*", estimateMin: 30,
        needs: "may add 1 dependency",
        recommendation: "Add a small picker library. It is the fastest route, but a new dependency is your call.",
        paragraph: "It will change the composer files and estimates 30 minutes. It may need one new library, which is your call.",
        appliedLimits: [],
      },
    },
    {
      id: "q-1881", kind: "question", tier: "needs", agent: "SpecialOne",
      sentence: `asks: "Should the survey include pricing questions?"`,
      details: ["question", "#1881"], ageMin: 62, state: "open",
      question: {
        asker: "SpecialOne", issue: "#1881",
        text: "Should the survey include pricing questions?",
        replies: ["Yes, keep it to two questions", "No, leave pricing out for now", "Ask me again after launch"],
      },
    },
    {
      id: "w-docs-setup", kind: "proposal", tier: "wait", agent: "Kite", docs: true,
      sentence: "wants to fix a typo in docs/setup.md", details: ["docs only", "never runs code"], ageMin: 25, state: "open",
    },
    {
      id: "w-tests-switcher", kind: "proposal", tier: "wait", agent: "Nova",
      sentence: "wants to add tests for the switcher menu", details: ["tests only", "never runs code"], ageMin: 48, state: "open",
    },
    {
      id: "w-design-empty", kind: "design", tier: "wait", agent: "SpecialOne",
      sentence: "asks for feedback on the new empty state", details: ["design feedback", "#1874"], ageMin: 95, state: "open",
    },
    {
      id: "w-idea-shortcuts", kind: "idea", tier: "wait", agent: "Kite",
      sentence: "has an idea: a keyboard shortcuts cheat sheet", details: ["new idea", "#1890"], ageMin: 180, state: "open",
    },
  ];
}

export function seedDoneLines(): DoneLine[] {
  const rows: [string, string][] = [
    ["10:24", "SpecialOne reviewed T-1869"],
    ["10:02", "Kite fixed a typo in docs/composer.md"],
    ["09:41", "Nova fixed a typo in README.md"],
    ["09:30", "Kite reworded the setup guide"],
    ["09:12", "SpecialOne reviewed T-1866"],
    ["08:58", "Kite updated CONTRIBUTING.md links"],
    ["08:40", "Nova fixed a broken link in docs/agents.md"],
    ["08:21", "Kite fixed a typo in docs/api.md"],
    ["08:05", "SpecialOne reviewed T-1861"],
    ["07:52", "Kite documented the composer hooks"],
    ["07:30", "Nova added alt text to the logo"],
    ["07:11", "Kite fixed a typo in docs/faq.md"],
    ["06:48", "SpecialOne reviewed T-1858"],
    ["06:20", "Kite fixed a typo in docs/limits.md"],
  ];
  return rows.map(([time, text], i) => ({ id: `d${i}`, time, text }));
}

export function initialState(seed: SimResult): State {
  return {
    items: seedItems(seed),
    doneLines: seedDoneLines(),
    agents: seedAgents(),
    log: seedLog(),
    suggestion: "open",
    areas: [],
    opened: {},
    status: "",
    engineNote: null,
  };
}
