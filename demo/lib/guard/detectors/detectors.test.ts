import { describe, expect, it } from "vitest";
import { runGuard, detectContent, inspectManifest, DEFAULT_CONFIG, shannonEntropy, addedText, type FileChange } from "../index";
import { baseChange } from "../fixtures/benign";
const codes = (file: FileChange) => runGuard({...baseChange, claim: "Update scripts dependencies build auth rules", files: [file]}).findings.map(f => f.code);
const manifest = (before: unknown, after: unknown): FileChange => ({path: "package.json", status: "modified", before: JSON.stringify(before), after: JSON.stringify(after)});
const content = (after: string, path = "lib/example.ts", before = "") => detectContent({path, status: "modified", before, after}, DEFAULT_CONFIG);
describe("manifest detector", () => {
  it("compares individual script keys including removals, independent of key order", () => {
    const result = inspectManifest(manifest({scripts: {dev: "old", start: "start"}}, {scripts: {start: "start", dev: "new", build: "build"}}));
    expect(result.findings.map(f => f.title)).toEqual(["The build script command changed.", "The dev script command changed."]);
    expect(result.findings[1].evidence).toMatchObject({before: '"old"', after: '"new"'});
    expect(codes(manifest({scripts: {dev: "x"}}, {}))).toContain("scripts_changed");
    expect(codes(manifest({scripts: {a: "a", b: "b"}}, {scripts: {b: "b", a: "a"}}))).toEqual([]);
  });
  it("does not treat version-only metadata changes as scripts/deps", () => expect(codes(manifest({version: "1"}, {version: "2"}))).toEqual([]));
  it.each(["preinstall", "install", "postinstall", "prepare", "prepublish", "prepack"])("detects %s additions and changes, not unchanged hooks", hook => {
    expect(codes(manifest({}, {scripts: {[hook]: "fixture"}}))).toContain("lifecycle_hook");
    expect(codes(manifest({scripts: {[hook]: "old"}}, {scripts: {[hook]: "new"}}))).toContain("lifecycle_hook");
    expect(codes(manifest({scripts: {[hook]: "same"}}, {scripts: {[hook]: "same"}}))).not.toContain("lifecycle_hook");
  });
  it.each(["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"])("detects added/removed/changed %s", section => {
    for (const [before, after] of [[{}, {[section]: {x: "1"}}], [{[section]: {x: "1"}}, {}], [{[section]: {x: "1"}}, {[section]: {x: "2"}}]]) expect(codes(manifest(before, after))).toEqual(["deps_changed"]);
  });
  it.each(["bundledDependencies", "bundleDependencies"])("handles %s arrays", section => expect(codes(manifest({[section]: ["x"]}, {[section]: ["x", "y"]}))).toEqual(["deps_changed"]));
  it.each(["git+https://example.invalid/a", "git://example.invalid/a", "https://example.invalid/a.tgz", "file:../local", "link:../local", "github:fixture/pkg", "fixture/pkg#abc", "ssh://example.invalid/pkg"])("flags unusual source %s", source => expect(codes(manifest({}, {dependencies: {x: source}}))).toContain("deps_unusual_source"));
  it.each(["^1.2.3", "~2", "workspace:*", "npm:example@1"])("allows registry/workspace spec %s", source => expect(codes(manifest({}, {dependencies: {x: source}}))).not.toContain("deps_unusual_source"));
  it.each(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb", "pubspec.lock"])("detects lockfile %s", path => expect(codes({path, status: "modified", before: "old", after: "new"})).toEqual(["deps_changed"]));
  it("fails closed when manifest contents are unavailable", () => expect(codes({path: "package.json", status: "modified", before: null, after: null})).toContain("unreadable_manifest"));
  it.each(["{", "null", "[]", '"x"'])("fails closed on malformed manifest %s", after => expect(codes({path: "package.json", status: "modified", before: "{}", after})).toContain("unreadable_manifest"));
  it("checks invalid before text too and handles added/removed manifests", () => {
    expect(codes({path: "package.json", status: "modified", before: "{", after: "{}"})).toContain("unreadable_manifest");
    expect(codes({path: "package.json", status: "added", after: '{"scripts":{"dev":"fixture"}}'})).toContain("scripts_changed");
    expect(codes({path: "package.json", status: "removed", before: '{"dependencies":{"x":"1"}}', after: null})).toContain("deps_changed");
  });
});
describe("content detectors", () => {
  it.each([199, 200, 201])("checks horizontal whitespace boundary %i", size => expect(content("x" + " \t".repeat(size).slice(0, size) + "marker").some(f => f.code === "hidden_whitespace")).toBe(size >= 200));
  it("reports original line numbers and counts trailing mixed whitespace", () => {
    expect(content("old\nx" + " ".repeat(200) + "marker", "lib/a.ts", "old")[0]).toMatchObject({line: 2, evidence: {metric: 200}});
    expect(content("x" + "\n \t".repeat(70)).some(f => f.code === "hidden_whitespace")).toBe(true);
    expect(content("x" + "\n".repeat(199)).some(f => f.code === "hidden_whitespace")).toBe(false);
  });
  it("does not flag existing trailing whitespace when another line changes", () => {
    const tail = "\n".repeat(240);
    expect(content("new" + tail, "lib/a.ts", "old" + tail).some(f => f.code === "hidden_whitespace")).toBe(false);
  });
  it("does not flag unchanged or removed payload", () => {
    const text = "x" + " ".repeat(220) + "marker";
    expect(content(text, "lib/a.ts", text)).toEqual([]);
    expect(detectContent({path: "lib/a.ts", status: "removed", before: text}, DEFAULT_CONFIG)).toEqual([]);
    expect(addedText({path: "a", status: "modified", before: "a\nb\na", after: "a\nb\na\na"})).toBe("a");
  });
  it.each([0x200b, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069, 0xfeff, 0xe0000, 0xe007f, 0xe0100, 0xe01ef])("detects invisible code point %i", cp => expect(content("x" + String.fromCodePoint(cp)).some(f => f.code === "invisible_chars")).toBe(true));
  it("allows a leading BOM, ordinary emoji and translation JSON, but checks ordinary JSON", () => {
    for (const [text, path] of [["\ufeffconst x = 1", "lib/a.ts"], ["Hello 👩‍💻", "README.md"], ["x\u200b", "locales/en.json"], ["x\u200b", "translations/en.json"], ["x\u200b", "messages/en.json"]]) expect(content(text, path).some(f => f.code === "invisible_chars")).toBe(false);
    expect(content("x\u200b", "config.json").some(f => f.code === "invisible_chars")).toBe(true);
    expect(content("a\n\ufeffb").some(f => f.code === "invisible_chars")).toBe(true);
  });
  it("computes entropy and checks both size and entropy boundaries", () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    expect(shannonEntropy("")).toBe(0); expect(shannonEntropy("aaaa")).toBe(0); expect(shannonEntropy(alphabet)).toBe(6);
    expect(content(alphabet.repeat(15)).some(f => f.code === "obfuscated_file")).toBe(false);
    expect(content(alphabet.repeat(16)).some(f => f.code === "obfuscated_file")).toBe(true);
    expect(content("a".repeat(1000)).some(f => f.code === "obfuscated_file")).toBe(false);
  });
  it("uses the exact entropy threshold inclusively", () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
    expect(shannonEntropy(alphabet)).toBe(5);
    expect(content(alphabet.repeat(32)).some(f => f.code === "obfuscated_file")).toBe(true);
    expect(content(alphabet.repeat(31)).some(f => f.code === "obfuscated_file")).toBe(false);
  });
  it.each([4, 5])("checks identifier count %i", count => expect(content(Array.from({length: count}, (_, i) => `_0x${100 + i}`).join(" ")).some(f => f.code === "obfuscated_file")).toBe(count >= 5));
  it.each([1999, 2000])("checks long-line boundary %i", count => expect(content("x".repeat(count)).some(f => f.code === "obfuscated_file")).toBe(count >= 2000));
  it.each(["a.min.ts", "dist/a.js", "build/a.ts", ".next/a.js", "public/assets/a.js", "pnpm-lock.yaml"])("allowlists generated payload at %s", path => expect(content("x".repeat(2400), path).some(f => f.code === "obfuscated_file")).toBe(false));
  it.each([".env", "Dockerfile", "Makefile", "lib/a.rb", "lib/a.go"])("checks invisible characters in %s", path => expect(content("x\u200b", path).some(f => f.code === "invisible_chars")).toBe(true));
  it("does not measure pre-existing obfuscated text", () => {
    const old = "_0xabc _0xabd _0xabe _0xabf _0xab0";
    expect(content(old + "\ncomment", "lib/a.ts", old).some(f => f.code === "obfuscated_file")).toBe(false);
  });
});
