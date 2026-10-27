import { describe, expect, it } from "vitest";
import { runGuard, groupIncidents, UnionFind, PriorityQueue, incidentPriority, wilsonLowerBound, suggestDelegation, LOCKED_CATEGORIES, appendEntry, verifyChain, canonicalJSON, fingerprint, normalizeEvidence, type ChainEntry } from "./index";
import { incident } from "./fixtures/incident";
import { benign } from "./fixtures/benign";
describe("fingerprint and union-find grouping", () => {
  it("groups all 17 variants into a single incident", () => {
    const results = incident.map(input => runGuard(input));
    expect(new Set(results.map(r => r.fingerprint)).size).toBe(1);
    const groups = groupIncidents(results);
    expect(groups).toHaveLength(1); expect(groups[0].changeIds).toHaveLength(17); expect(groups[0].branches).toHaveLength(17); expect(groups[0].tier).toBe("human");
    expect(groupIncidents([...results].reverse())).toEqual(groups);
  });
  it("changes fingerprints for different attackers or payloads, not file/finding order", () => {
    const original = runGuard(incident[0]);
    expect(runGuard({...incident[0], pusher: "other"}).fingerprint).not.toBe(original.fingerprint);
    expect(runGuard({...incident[0], files: incident[0].files.map(file => file.path === "api.js" ? {...file, after: file.after + " altered fixture"} : file)}).fingerprint).not.toBe(original.fingerprint);
    expect(runGuard({...incident[0], branch: "another", files: [...incident[0].files].reverse()}).fingerprint).toBe(original.fingerprint);
    expect(fingerprint("review", [], [], "pusher")).toBeNull();
    expect(normalizeEvidence("  a  b\t ")).toBe("a<ws:2>b");
  });
  it("distinguishes different protected content without an obfuscated payload", () => {
    const first = runGuard({...benign[0].input, claim: "Fix auth", files: [{path: "auth.ts", status: "modified", before: "before", after: "first"}]});
    const second = runGuard({...benign[0].input, claim: "Fix auth", files: [{path: "auth.ts", status: "modified", before: "before", after: "second"}]});
    expect(first.fingerprint).not.toBe(second.fingerprint);
  });
  it("unions shared pusher/payload even with different fingerprints, transitively", () => {
    const a = runGuard(incident[0]), b = {...a, id: "b", branch: "b", fingerprint: "different", obfuscatedHashes: [...a.obfuscatedHashes, "bridge"]}, c = {...a, id: "c", branch: "c", fingerprint: "third", obfuscatedHashes: ["bridge"]};
    expect(groupIncidents([a, b, c])).toHaveLength(1);
    expect(groupIncidents([a, {...b, pusher: "unrelated"}])).toHaveLength(2);
    expect(groupIncidents([a, {...b, obfuscatedHashes: ["unrelated"]}])).toHaveLength(2);
  });
  it("does not group null fingerprints and supports empty results", () => {
    const value = runGuard(benign[0].input);
    expect(groupIncidents([value, {...value, id: "second"}])).toHaveLength(2); expect(groupIncidents([])).toEqual([]);
  });
  it("supports union by rank and path compression without losing sets", () => {
    const uf = new UnionFind(8);
    uf.union(0, 1); uf.union(2, 3); uf.union(0, 2); uf.union(4, 5); uf.union(6, 7); uf.union(4, 6); uf.union(0, 4); uf.union(1, 7);
    expect(new Set(Array.from({length: 8}, (_, i) => uf.find(i))).size).toBe(1);
    expect(() => uf.find(8)).toThrow(); expect(() => new UnionFind(-1)).toThrow();
  });
});
describe("priority max-heap", () => {
  it("uses exact incident weights, caps, and older-first ties", () => {
    expect(incidentPriority({tier: "human", branches: ["main"], ageMinutes: 10})).toBe(2_001_510);
    expect(incidentPriority({tier: "review", branches: Array(1001).fill("branch"), ageMinutes: 500})).toBe(1_999_499);
    const queue = new PriorityQueue<{id: string; age: number}>(v => incidentPriority({tier: "human", branches: ["feature"], ageMinutes: v.age}));
    queue.push({id: "newer", age: 2}); queue.push({id: "older", age: 3}); queue.push({id: "same-age-later", age: 3});
    expect(queue.toSortedArray().map(v => v.id)).toEqual(["older", "same-age-later", "newer"]); expect(queue.size).toBe(3);
    expect(queue.pop()?.id).toBe("older"); expect(queue.peek()?.id).toBe("same-age-later");
  });
  it("handles empty queues, one item and invalid priorities", () => {
    const q = new PriorityQueue<number>(x => x);
    expect(q.pop()).toBeUndefined(); expect(q.peek()).toBeUndefined(); expect(q.toSortedArray()).toEqual([]);
    q.push(1); expect(q.pop()).toBe(1); expect(q.size).toBe(0); expect(() => q.push(NaN)).toThrow();
  });
  it("preserves heap ordering through randomized pushes/pops against a sorted oracle", () => {
    const q = new PriorityQueue<{value: number; id: number}>(v => v.value), oracle: {value: number; id: number}[] = [];
    let seed = 42;
    const rand = (n: number) => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n;};
    for (let i = 0; i < 2000; i++) {
      if (rand(3) || !oracle.length) { const value = {value: rand(20), id: i}; q.push(value); oracle.push(value); }
      else { oracle.sort((a, b) => b.value - a.value || a.id - b.id); expect(q.pop()).toEqual(oracle.shift()); }
      oracle.sort((a, b) => b.value - a.value || a.id - b.id);
      expect(q.size).toBe(oracle.length); expect(q.peek()).toEqual(oracle[0]);
      if (i % 50 === 0) expect(q.toSortedArray()).toEqual(oracle);
    }
    expect(q.toSortedArray()).toEqual(oracle);
  });
});
describe("earned autonomy", () => {
  it("uses the specified Wilson bounds", () => {
    expect(wilsonLowerBound(12, 12)).toBeCloseTo(0.7575, 3);
    expect(wilsonLowerBound(10, 10)).toBeCloseTo(0.7225, 3);
    expect(wilsonLowerBound(0, 0)).toBe(0); expect(wilsonLowerBound(0, 10)).toBeCloseTo(0);
    expect(wilsonLowerBound(5, 10, 0)).toBe(0.5);
  });
  it.each([[12, 12, "auto"], [10, 10, null], [11, 12, null], [3, 3, null]] as const)("evaluates %i/%i", (approvals, total, expected) => expect(suggestDelegation({category: "code", approvals, total, brokenPromisesInWindow: 0})).toBe(expected));
  it("never delegates locked or unknown categories, or broken promises", () => {
    for (const category of [...LOCKED_CATEGORIES, "unknown" as const]) expect(suggestDelegation({category, approvals: 100, total: 100, brokenPromisesInWindow: 0})).toBeNull();
    expect(suggestDelegation({category: "docs", approvals: 12, total: 12, brokenPromisesInWindow: 1})).toBeNull();
  });
  it.each([[-1, 1], [2, 1], [1.5, 2], [0, -1], [NaN, 10]])("rejects invalid successes/n %i/%i", (a, b) => expect(() => wilsonLowerBound(a, b)).toThrow());
});
describe("canonical hash chain", () => {
  const makeChain = () => {
    const entries: ChainEntry[] = [];
    for (let i = 0; i < 4; i++) entries.push(appendEntry(entries.at(-1)?.hash ?? "GENESIS", {decision: i, nested: {z: 1, a: [2, {b: 3, a: 4}]}}));
    return entries;
  };
  it("sorts keys recursively and uses the prescribed hash formula", () => {
    expect(canonicalJSON({b: {z: 1, a: 2}, a: [3, 2]})).toBe('{"a":[3,2],"b":{"a":2,"z":1}}');
    expect(appendEntry("GENESIS", {b: 1, a: 2})).toEqual(appendEntry("GENESIS", {a: 2, b: 1}));
    expect(verifyChain(makeChain())).toEqual({ok: true}); expect(verifyChain([])).toEqual({ok: true});
  });
  it.each([0, 1, 2, 3])("detects editing entry %i", i => {
    const chain = makeChain(); chain[i] = {...chain[i], entry: {edited: true}};
    expect(verifyChain(chain)).toEqual({ok: false, brokenAt: i});
  });
  it("detects reordering and deletion at the first broken index", () => {
    const chain = makeChain();
    expect(verifyChain([chain[0], chain[2], chain[1], chain[3]])).toEqual({ok: false, brokenAt: 1});
    expect(verifyChain([chain[0], chain[2], chain[3]])).toEqual({ok: false, brokenAt: 1});
    expect(verifyChain(chain.slice(1))).toEqual({ok: false, brokenAt: 0});
    expect(verifyChain(chain.slice(0, -1), chain.at(-1)!.hash)).toEqual({ok: false, brokenAt: 3});
    expect(verifyChain([], chain.at(-1)!.hash)).toEqual({ok: false, brokenAt: 0});
  });
  it("rejects non-JSON/cyclic input and reports corrupted data", () => {
    const cycle: unknown[] = []; cycle.push(cycle);
    for (const value of [cycle, undefined, NaN, new Date(), {a: undefined}]) expect(() => canonicalJSON(value)).toThrow();
    expect(verifyChain([{hash: "bad", entry: cycle}])).toEqual({ok: false, brokenAt: 0});
  });
});
