import { describe, expect, it } from "vitest";
import { detectContent, DEFAULT_CONFIG, addedText, shannonEntropy, runGuard, groupIncidents, type FileChange } from "../index";
import fixtures from "../fixtures/readable-replay.json";
import { incident } from "../fixtures/incident";
const obfuscated = (after: string, path = "lib/payload.ts", config = DEFAULT_CONFIG) => detectContent({path, status: "added", after}, config).some(f => f.code === "obfuscated_file");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function packed(whitespace: number, char = " "): string {
  return Array.from({length: 1000}, (_, i) => i % 5 === 1 && i < whitespace * 5 ? char : alphabet[i % alphabet.length]).join("");
}
describe("packed entropy gate", () => {
  it.each([0, 49, 50, 51, 200])("uses a strict 5%% whitespace ceiling: %i/1000", count => {
    const text = packed(count);
    expect(text.length).toBe(1000); expect(shannonEntropy(text)).toBeGreaterThanOrEqual(5);
    expect(obfuscated(text)).toBe(count < 50);
  });
  it.each([" ", "\t", "\n", "\r"])("counts whitespace %j", char => expect(obfuscated(packed(50, char))).toBe(false));
  it("retains configurable entropy/length/ratio thresholds", () => {
    expect(obfuscated(packed(50), "lib/a.ts", {...DEFAULT_CONFIG, entropyMaxWhitespaceRatio: 0.06})).toBe(true);
    expect(obfuscated(packed(49), "lib/a.ts", {...DEFAULT_CONFIG, entropyThreshold: 7})).toBe(false);
    expect(obfuscated(packed(49), "lib/a.ts", {...DEFAULT_CONFIG, entropyMinLength: 1001})).toBe(false);
    expect(() => runGuard(incident[0], {entropyMaxWhitespaceRatio: 1.01})).toThrow();
  });
  it("only counts added text, not the readable pre-existing wrapper", () => {
    const before = "readable wrapper " + " ".repeat(300);
    expect(detectContent({path: "lib/a.ts", status: "modified", before, after: before + "\n" + packed(0)}, DEFAULT_CONFIG).some(f => f.code === "obfuscated_file")).toBe(true);
  });
  it.each(["public/art.svg", "components/art.SVG"])("skips entropy only for %s", path => {
    expect(obfuscated(packed(0), path)).toBe(false);
    expect(obfuscated("_0xabc _0xabd _0xabe _0xabf _0xab0", path)).toBe(true);
  });
  it("retains identifier and JS-family long-line triggers despite high whitespace", () => {
    expect(obfuscated("_0xabc\n\t_0xabd\n\t_0xabe\n\t_0xabf\n\t_0xab0")).toBe(true);
    for (const ext of ["js", "mjs", "cjs", "ts"]) expect(obfuscated("x ".repeat(1000), `lib/a.${ext}`)).toBe(true);
    // SVG still uses the original extension-limited long-line rule, not a new SVG-specific trigger.
    expect(obfuscated("x ".repeat(1000), "public/a.svg")).toBe(false);
  });
  it("still detects and groups the incident", () => {
    const results = incident.map(input => runGuard(input));
    expect(results.every(r => r.findings.some(f => f.code === "obfuscated_file"))).toBe(true);
    expect(results.every(r => r.tier === "human")).toBe(true);
    expect(groupIncidents(results)).toHaveLength(1); expect(groupIncidents(results)[0].branches).toHaveLength(17);
  });
});
describe("inert excerpts copied from replay history", () => {
  it.each(fixtures)("does not call $sourcePath obfuscated", fixture => {
    const file = fixture.file as FileChange;
    if (fixture.previousEntropyAlert) {
      const text = addedText(file);
      // Prove this fixture would exercise the old entropy-only trigger, not just a trivial small input.
      expect(text.length).toBeGreaterThanOrEqual(DEFAULT_CONFIG.entropyMinLength);
      expect(shannonEntropy(text)).toBeGreaterThanOrEqual(DEFAULT_CONFIG.entropyThreshold);
    }
    expect(detectContent(file, DEFAULT_CONFIG).some(f => f.code === "obfuscated_file")).toBe(false);
  });
});
