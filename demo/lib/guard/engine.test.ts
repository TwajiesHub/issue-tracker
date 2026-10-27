import { describe, expect, it } from "vitest";
import { runGuard, categorize, classify, tierRank, matchGlob, FINDING_CODES, LOCKED_CATEGORIES, type Category, type Finding } from "./index";
import { incident, harmlessPayload } from "./fixtures/incident";
import { benign, baseChange } from "./fixtures/benign";
const result = (overrides: Partial<typeof baseChange> = {}) => runGuard({...baseChange, ...overrides});
describe("engine", () => {
  it("catches the harmless 17-branch replay with the requested human summary", () => {
    const value = runGuard(incident[0]);
    expect(value.tier).toBe("human");
    expect(value.findings.map(f => f.code)).toEqual(expect.arrayContaining(["scripts_changed", "obfuscated_file", "hidden_whitespace", "history_rewritten", "author_pusher_mismatch", "claim_mismatch"]));
    expect(value.matchesPromise).toBe(false); expect(value.summary).toBe("Nova did more than it promised.");
    expect(harmlessPayload.length).toBeGreaterThan(11000); expect(harmlessPayload.length).toBeLessThan(13000);
    expect(harmlessPayload.startsWith("// HARMLESS TEST FIXTURE:")).toBe(true);
    for (let i = 1; i < value.findings.length; i++) {
      const a = value.findings[i - 1], b = value.findings[i];
      expect(tierRank[a.tier] > tierRank[b.tier] || (a.tier === b.tier && FINDING_CODES.indexOf(a.code) <= FINDING_CODES.indexOf(b.code))).toBe(true);
    }
  });
  it.each(benign)("handles $name without false findings", fixture => {
    const value = runGuard(fixture.input);
    expect(value.tier).toBe(fixture.tier); expect(value.findings.map(f => f.code)).toEqual(fixture.codes);
  });
  it("is deterministic, pure, and rejects invalid config", () => {
    const snapshot = JSON.stringify(incident[0]);
    expect(runGuard(incident[0])).toEqual(runGuard(incident[0])); expect(JSON.stringify(incident[0])).toBe(snapshot);
    expect(() => runGuard(baseChange, {whitespaceRun: 0})).toThrow();
  });
  it("detects forced pushes or non-ancestor history, not unknown ancestry", () => {
    expect(result({forced: true}).findings[0]).toMatchObject({code: "history_rewritten", evidence: {before: "before"}});
    expect(result({isAncestor: false}).findings[0].code).toBe("history_rewritten");
    for (const isAncestor of [true, null, undefined]) expect(result({isAncestor}).findings).toEqual([]);
  });
  it("compares agent owner email and allowed pusher independently", () => {
    const agent = {...incident[0].agent!, ownerEmails: ["OWNER@example.invalid"], allowedPushers: ["Owner"]};
    const commits = [{sha: "a", message: "msg", authorName: "Owner", authorEmail: "owner@example.invalid"}];
    expect(result({agent, pusher: "owner", commits}).findings).toEqual([]);
    expect(result({agent, pusher: "stranger", commits}).findings[0].code).toBe("author_pusher_mismatch");
    expect(result({agent, pusher: "owner", commits: [...commits, {...commits[0], authorEmail: "other@example.invalid"}]}).findings[0].code).toBe("author_pusher_mismatch");
    expect(result({commits}).findings).toEqual([]);
  });
  it("checks scope (including an explicitly empty scope) and all limits", () => {
    const files = [{path: "lib/a.ts", status: "added" as const, after: "text"}];
    expect(result({files, declaredScope: ["lib/**"]}).matchesPromise).toBe(true);
    expect(result({files, declaredScope: []}).findings[0]).toMatchObject({code: "outside_scope", tier: "review"});
    expect(result({files, declaredScope: [], limits: ["stay_in_scope"]}).findings.map(f => f.code)).toContain("broke_limit");
    const protectedFiles = [{path: "auth.ts", status: "modified" as const, after: "new"}];
    expect(result({files: protectedFiles, claim: "Update auth", limits: ["no_protected_files"]}).findings.map(f => f.code)).toContain("broke_limit");
    expect(result({files, limits: ["no_new_dependencies", "stay_in_scope", "no_protected_files"]}).findings).toEqual([]);
    expect(result({files: [{path: "package.json", status: "modified", before: '{"dependencies":{"x":"1"}}', after: '{"dependencies":{"x":"2"}}'}], claim: "Bump dependency", limits: ["no_new_dependencies"]}).findings.map(f => f.code)).not.toContain("broke_limit");
  });
  it("uses category keywords or declared scope as promise evidence", () => {
    for (const [path, claim] of [["scripts/a.sh", "Update build config"], ["auth.ts", "Fix login"], ["AGENTS.md", "Update instructions"]]) {
      const files = [{path, status: "modified" as const, after: "new"}];
      expect(result({files, claim}).findings.map(f => f.code)).not.toContain("claim_mismatch");
      expect(result({files, claim: "Tiny typo"}).findings.map(f => f.code)).toContain("claim_mismatch");
      expect(result({files, declaredScope: [path]}).findings.map(f => f.code)).not.toContain("claim_mismatch");
    }
    expect(result({files: [{path: "scripts/a.sh", status: "added", after: "text"}], claim: "special typo"}).findings.map(f => f.code)).toContain("claim_mismatch");
  });
  it("aggregates unexplained protected paths by category", () => {
    const value = result({claim: "Build config", files: ["scripts/a.sh", "scripts/b.sh"].map(path => ({path, status: "modified", after: "text"}))});
    expect(value.findings.filter(f => f.code === "protected_path")).toHaveLength(1);
    expect(value.findings[0].evidence?.excerpt).toContain("scripts/a.sh, scripts/b.sh");
  });
  it("uses defaults and delegation while keeping locked and unknown categories human", () => {
    expect(classify(["docs", "tests"], [])).toBe("auto"); expect(classify(["ui", "code"], [])).toBe("review");
    expect(classify(["code"], [], {code: "auto"})).toBe("auto"); expect(classify(["docs"], [], {docs: "ask"})).toBe("human");
    for (const category of [...LOCKED_CATEGORIES, "unknown" as const]) expect(classify([category], [], {[category]: "auto"})).toBe("human");
    expect(classify([], [{code: "claim_mismatch", tier: "auto", title: "Mismatch."}])).toBe("review");
    expect(classify(["ui"], [{code: "claim_mismatch", tier: "review", title: "Mismatch."}])).toBe("human");
  });
  it("provides agent-first summaries and branch fallback", () => {
    expect(runGuard({...benign[0].input, agent: incident[0].agent, pusher: "nova-owner"}).summary).toBe("Nova updated documentation.");
    expect(result({files: [{path: "a.ts", status: "modified", after: "text"}]}).summary).toContain("A change on feature/docs changed 1 files");
    expect(runGuard({...benign[3].input, agent: incident[0].agent}).summary).toBe("Nova broke a limit you set.");
    expect(runGuard({...benign[2].input, agent: incident[0].agent}).summary).toBe("Nova wants to change dependencies.");
  });
  it("classification stays monotonic under randomized category/finding additions", () => {
    let seed = 731;
    const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    const all: Category[] = ["docs", "tests", "ui", "code", ...LOCKED_CATEGORIES, "unknown"];
    for (let i = 0; i < 1000; i++) {
      const categories = Array.from({length: rand(5)}, () => all[rand(all.length)]);
      const findings: Finding[] = Array.from({length: rand(4)}, () => ({code: FINDING_CODES[rand(FINDING_CODES.length)], tier: (["auto", "review", "human"] as const)[rand(3)], title: "Fixture finding."}));
      const before = classify(categories, findings);
      expect(tierRank[classify([...categories, all[rand(all.length)]], findings)]).toBeGreaterThanOrEqual(tierRank[before]);
      expect(tierRank[classify(categories, [...findings, {code: "outside_scope", tier: "review", title: "New finding."}])]).toBeGreaterThanOrEqual(tierRank[before]);
    }
  });
  it("adding files cannot lower the engine tier", () => {
    const candidates = [...benign.map(f => f.input.files[0]), ...incident[0].files];
    for (const a of candidates) for (const b of candidates) expect(tierRank[result({files: [a, b]}).tier]).toBeGreaterThanOrEqual(tierRank[result({files: [a]}).tier]);
  });
});
describe("paths and globs", () => {
  it.each([["**/*.ts", "a.ts", true], ["**/*.ts", "a/b.ts", true], ["a/*.ts", "a/b/c.ts", false], ["a?.ts", "ab.ts", true], ["a?.ts", "abc.ts", false], ["a[1].ts", "a[1].ts", true], ["a[1].ts", "a1.ts", false], ["/lib/**", "lib\\a.ts", true], ["./lib/**", "./lib/a.ts", true]] as const)("matches %s against %s", (pattern, path, expected) => expect(matchGlob(pattern, path)).toBe(expected));
  it.each([
    ["AGENTS.md", "agent_rules"], ["nested/AGENTS.md", "agent_rules"], ["CLAUDE.md", "agent_rules"], [".claude/settings.json", "agent_rules"], [".cursor/rules/a.md", "agent_rules"], [".mcp.json", "agent_rules"], ["mcp.local.json", "agent_rules"],
    [".env.local", "auth"], ["lib/auth/token.ts", "auth"], ["lib/mysecret.ts", "auth"], ["lib/permissions/a.ts", "auth"], ["auth.config.ts", "auth"], ["middleware.ts", "auth"],
    [".github/workflows/a.yml", "ci_build"], ["Dockerfile.dev", "ci_build"], ["docker-compose.dev.yml", "ci_build"], ["vercel.json", "ci_build"], ["next.config.ts", "ci_build"], ["postcss.config.mjs", "ci_build"], ["tailwind.config.ts", "ci_build"], ["vite.config.ts", "ci_build"], ["webpack.config.js", "ci_build"], ["tsconfig.build.json", "ci_build"], ["Makefile", "ci_build"], ["scripts/a.ts", "ci_build"], [".husky/a", "ci_build"], ["prisma/migrations/a.sql", "ci_build"],
    ["requirements-dev.txt", "deps"], ["pubspec.yaml", "deps"], ["LICENSE", "docs"], ["docs/design.txt", "docs"], ["README.md", "docs"], ["a.test.ts", "tests"], ["a.spec.tsx", "tests"], ["lib/__tests__/a.ts", "tests"], ["e2e/a.ts", "tests"], ["components/a.tsx", "ui"], ["app/a/page.tsx", "ui"], ["a.css", "ui"], ["public/a.svg", "ui"], ["public/a.js", "code"], ["lib/a.py", "code"], ["lib/a.ts", "code"], ["file.bin", "unknown"], ["api.js", "unknown"], ["new.mjs", "unknown"], ["new.sh", "unknown"],
  ])("categorizes %s as %s", (path, category) => expect(categorize({path, status: "added"})).toEqual([category]));
  it("treats renamed root scripts as new paths", () => expect(categorize({path: "api.js", status: "renamed"})).toEqual(["unknown"]));
  it("does not flag existing root scripts as unknown", () => expect(categorize({path: "existing.js", status: "modified"})).toEqual(["code"]));
});
