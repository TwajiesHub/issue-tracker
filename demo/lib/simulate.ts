/**
 * Server only (the engine uses node:crypto). Runs fixtures through the real engine and returns plain JSON.
 * Used by app/layout.tsx (to seed the first screen) and app/api/simulate/route.ts (the Demo buttons).
 */
import { runGuard } from "./guard/index";
import { groupIncidents } from "./guard/group";
import { incident as incidentFixture } from "./guard/fixtures/incident";
import type { ChangeInput, Finding, ProtectedArea, Tier } from "./guard/types";
import { zikiProtectedAreas } from "./guard-profile";

export interface SimResult {
  kind: "attack" | "kite";
  agentId: string;
  agentName: string;
  summary: string;
  tier: Tier;
  matchesPromise: boolean;
  findings: Finding[];
  /** Changes checked, incidents found, and branches in the first incident. */
  changes: number;
  incidents: number;
  branches: number;
  restorePoint: string;
  claim: string;
  scope: string;
  ms: number;
}

const RESTORE_POINT = "f58bb07";

/** Ziki's own protected areas plus any the owner added in the demo. */
const configFor = (extra: ProtectedArea[]) => ({ protectedAreas: [...zikiProtectedAreas, ...extra] });

export function simulateAttack(extra: ProtectedArea[] = []): SimResult {
  const t = performance.now();
  const changes = incidentFixture.map((c) => ({ ...c, beforeSha: RESTORE_POINT }));
  const config = configFor(extra);
  const results = changes.map((c) => runGuard(c, config));
  const incidents = groupIncidents(results);
  const first = incidents[0];
  const rep = results.find((r) => r.id === first.changeIds[0]) ?? results[0];
  return {
    kind: "attack", agentId: "nova", agentName: "Nova",
    summary: rep.summary, tier: rep.tier, matchesPromise: rep.matchesPromise, findings: rep.findings,
    changes: changes.length, incidents: incidents.length, branches: first.branches.length,
    restorePoint: RESTORE_POINT,
    claim: changes[0].claim ?? "", scope: (changes[0].declaredScope ?? []).join(", "),
    ms: Math.round(performance.now() - t),
  };
}

/** Kite's second push, after it was told "no new dependencies". Fictional; harmless text only. */
export const kiteBreak: ChangeInput = {
  id: "kite-212-2", repo: "fictional/issue-tracker", branch: "kite/fix-212-emoji-picker",
  beforeSha: "9ad41e2", afterSha: "5b7e0c4", forced: false, isAncestor: true, pusher: "kite-bot",
  agent: { id: "kite", name: "Kite", ownerUserId: "alice", ownerEmails: ["alice@zendor.dev"], allowedPushers: ["kite-bot"] },
  commits: [{ sha: "5b7e0c4", message: "Use a picker library", authorName: "Kite", authorEmail: "alice@zendor.dev" }],
  claim: "Fix the emoji picker (#212)", declaredScope: ["lib/composer/*", "package.json"], limits: ["no_new_dependencies"],
  files: [
    { path: "lib/composer/emoji.ts", status: "modified", before: "export const picker = [];\n", after: "export const picker = ['smile'];\n" },
    {
      path: "package.json", status: "modified",
      before: JSON.stringify({ dependencies: { next: "16.4.1" } }),
      after: JSON.stringify({ dependencies: { next: "16.4.1", "example-picker": "^5.6.0" } }),
    },
  ],
};

export function simulateKite(extra: ProtectedArea[] = []): SimResult {
  const t = performance.now();
  const result = runGuard(kiteBreak, configFor(extra));
  const incidents = groupIncidents([result]);
  return {
    kind: "kite", agentId: "kite", agentName: "Kite",
    summary: result.summary, tier: result.tier, matchesPromise: result.matchesPromise, findings: result.findings,
    changes: 1, incidents: incidents.length, branches: 1,
    restorePoint: kiteBreak.beforeSha ?? "",
    claim: kiteBreak.claim ?? "", scope: (kiteBreak.declaredScope ?? []).join(", "),
    ms: Math.round(performance.now() - t),
  };
}
