import { describe, expect, it } from "vitest";
import { runGuard, type FileChange } from "./index";
import { baseChange } from "./fixtures/benign";
const areas = [{label: "Rewards", globs: ["lib/points/**"]}];
const check = (files: FileChange[], protectedAreas = areas) => runGuard({...baseChange, delegation: {code: "auto", tests: "auto"}, files}, {protectedAreas});
describe("owner-defined protected areas", () => {
  it("defaults to no behaviour change, including explicit empty/undefined config", () => {
    const input = {...baseChange, files: [{path: "lib/points/rules.ts", status: "modified" as const, after: "readable"}]};
    expect(runGuard(input, {})).toEqual(runGuard(input, {protectedAreas: []}));
    expect(runGuard(input, {protectedAreas: undefined})).toEqual(runGuard(input));
    expect(runGuard(input).tier).toBe("review");
  });
  it.each(["added", "modified", "removed", "renamed"] as const)("keeps %s matches human despite delegation", status => {
    const result = check([{path: "lib/points/rules.ts", status, before: "before", after: status === "removed" ? null : "after"}]);
    expect(result.tier).toBe("human");
    expect(result.findings).toEqual([expect.objectContaining({code: "protected_path", tier: "human", title: "This touches an area you marked as protected: Rewards."})]);
    expect(result.matchesPromise).toBe(true);
  });
  it("does not lock nonmatching or similarly named files", () => {
    expect(check([{path: "lib/points-summary.ts", status: "added", after: "readable"}]).tier).toBe("auto");
    expect(check([], areas).findings).toEqual([]);
  });
  it("aggregates multiple matches per area and preserves several overlapping areas", () => {
    const result = check(["lib/points/a.ts", "lib/points/b.test.ts", "lib/other.ts"].map(path => ({path, status: "modified", after: "text"})), [...areas, {label: "Audited tests", globs: ["**/*.test.ts"]}, {label: "Other", globs: ["lib/other.ts"]}]);
    expect(result.findings).toHaveLength(3);
    expect(result.findings.map(f => f.title)).toEqual(["Rewards", "Audited tests", "Other"].map(label => `This touches an area you marked as protected: ${label}.`));
    expect(result.findings[0].evidence?.excerpt).toContain("lib/points/a.ts");
    expect(result.findings[0].evidence?.excerpt).toContain("lib/points/b.test.ts");
  });
  it("treats an owner-protected file as protected for the no_protected_files limit", () => {
    const result = runGuard({...baseChange, limits: ["no_protected_files"], files: [{path: "lib/points/a.ts", status: "added", after: "text"}]}, {protectedAreas: areas});
    expect(result.findings.map(f => f.code)).toContain("broke_limit");
  });
  it("leaves built-in locks active with an empty project config", () => expect(check([{path: "auth.ts", status: "modified", after: "text"}], []).tier).toBe("human"));
  it("is pure and monotonic as areas/files are added", () => {
    const input = [{path: "lib/points/a.ts", status: "modified" as const, after: "text"}], snapshot = JSON.stringify(areas);
    expect(check(input)).toEqual(check(input)); expect(JSON.stringify(areas)).toBe(snapshot);
    expect(check([...input, {path: "README.md", status: "modified", after: "typo"}]).tier).toBe("human");
  });
  it("rejects malformed policy instead of silently ignoring it", () => {
    expect(() => check([], [{label: "", globs: ["**"]}])).toThrow("Invalid protected areas");
  });
});
