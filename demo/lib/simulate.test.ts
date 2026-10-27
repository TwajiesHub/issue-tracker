import { describe, expect, it } from "vitest";
import { simulateAttack, simulateKite, kiteBreak } from "./simulate";
import { runGuard } from "./guard/index";
import { zikiProtectedAreas } from "./guard-profile";
import { parseAreas, validateArea } from "./areas";

describe("simulate", () => {
  it("turns the 17-branch attack into one incident", () => {
    const r = simulateAttack();
    expect(r.incidents).toBe(1);
    expect(r.branches).toBe(17);
    expect(r.summary).toBe("Nova did more than it promised.");
  });

  it("an area the owner adds affects the next simulated push", () => {
    const before = simulateKite();
    expect(before.findings.some((f) => f.title.includes("Composer"))).toBe(false);
    const after = simulateKite([{ label: "Composer", globs: ["lib/composer/**"] }]);
    const hit = after.findings.find((f) => f.code === "protected_path" && f.title.includes("Composer"));
    expect(hit?.title).toBe("This touches an area you marked as protected: Composer.");
  });

  it("Ziki's own profile is passed to the engine", () => {
    const change = { ...kiteBreak, files: [{ path: "lib/points/ledger.ts", status: "modified" as const, before: "a", after: "b" }] };
    const withProfile = runGuard(change, { protectedAreas: zikiProtectedAreas });
    expect(withProfile.findings.some((f) => f.title.includes("Points and rewards"))).toBe(true);
    expect(runGuard(change).findings.some((f) => f.title.includes("Points and rewards"))).toBe(false);
  });

  it("uses the reworded unknown-file title", () => {
    const r = runGuard({ ...kiteBreak, files: [{ path: "tool.sh", status: "added", before: null, after: "echo hi" }] });
    expect(r.findings.find((f) => f.code === "unknown_file")?.title).toBe("Ziki doesn't recognise this kind of file, so it needs you.");
  });
});

describe("areas", () => {
  const existing = [{ label: "Points and rewards", globs: ["lib/points/**"] }];
  it("validates the form", () => {
    expect(validateArea("", "lib/x/**", existing)).toMatch(/name/);
    expect(validateArea("X", "", existing)).toMatch(/pattern/);
    expect(validateArea("X", "/etc/**", existing)).toMatch(/repo root/);
    expect(validateArea("X", "../a", existing)).toMatch(/repo root/);
    expect(validateArea("points and rewards", "lib/x/**", existing)).toMatch(/already/);
    expect(validateArea("Composer", "lib/composer/**", existing)).toBeNull();
  });
  it("rejects malformed areas from the browser", () => {
    expect(parseAreas("x")).toBeNull();
    expect(parseAreas([{ label: "A", globs: [] }])).toBeNull();
    expect(parseAreas([{ label: "A", globs: [1] }])).toBeNull();
    expect(parseAreas([{ label: "A", globs: ["a/**"] }])).toEqual([{ label: "A", globs: ["a/**"] }]);
  });
});
