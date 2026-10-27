import { describe, expect, it } from "vitest";
import { runGuard, groupIncidents } from "../../demo/lib/guard/index";
import { baseChange } from "../../demo/lib/guard/fixtures/benign";
import { incident } from "../../demo/lib/guard/fixtures/incident";
import { zikiProfile } from "./ziki-profile";
it.each([
  "lib/points/rules.ts", "lib/agents/independence.ts", "lib/agent-api/validation.ts",
  "lib/approvals.ts", "lib/google-user.ts", "lib/password.ts", "lib/session-user.ts", "lib/two-factor.ts",
  "lib/rate-limit-postgres.ts", "lib/cron/runner.ts", "lib/orphaned-issues.ts", "prisma/schema.prisma",
  "app/api/auth/[...nextauth]/route.ts", "app/actions/notifications.ts",
])("Ziki policy protects %s without content heuristics", path => {
  const input = {...baseChange, delegation: {code: "auto" as const}, files: [{path, status: "modified" as const, before: "old", after: "new"}]};
  expect(runGuard(input, zikiProfile).tier).toBe("human");
  expect(runGuard(input, zikiProfile).findings.some(f => f.title.startsWith("This touches an area you marked as protected:"))).toBe(true);
});
describe("profile boundaries", () => {
  it("leaves ordinary docs and presentation files at their default tiers", () => {
    for (const [path, tier] of [["README.md", "auto"], ["components/agent-graphic.tsx", "review"], ["lib/format.ts", "review"]]) {
      expect(runGuard({...baseChange, files: [{path, status: "modified", after: "text"}]}, zikiProfile).tier).toBe(tier);
    }
  });
  it("keeps the incident human and groups all 17 branches", () => {
    const results = incident.map(change => runGuard(change, zikiProfile));
    expect(results.every(result => result.tier === "human")).toBe(true);
    expect(groupIncidents(results)).toHaveLength(1); expect(groupIncidents(results)[0].branches).toHaveLength(17);
  });
});
