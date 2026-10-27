import { sha256, canonicalJSON } from "./chain";
import { maxTier } from "./classify";
import type { GuardResult, Incident } from "./types";
export class UnionFind {
  private parents: number[];
  private ranks: number[];
  constructor(size: number) {
    if (!Number.isInteger(size) || size < 0) throw new RangeError("Invalid size");
    this.parents = Array.from({length: size}, (_, i) => i);
    this.ranks = Array(size).fill(0);
  }
  find(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.parents.length) throw new RangeError("Invalid index");
    if (this.parents[index] !== index) this.parents[index] = this.find(this.parents[index]);
    return this.parents[index];
  }
  union(a: number, b: number): void {
    let x = this.find(a), y = this.find(b);
    if (x === y) return;
    if (this.ranks[x] < this.ranks[y]) [x, y] = [y, x];
    this.parents[y] = x;
    if (this.ranks[x] === this.ranks[y]) this.ranks[x]++;
  }
}
export function groupIncidents(results: readonly GuardResult[]): Incident[] {
  const uf = new UnionFind(results.length), fingerprints = new Map<string, number>(), payloads = new Map<string, number>();
  results.forEach((result, i) => {
    const connect = (map: Map<string, number>, key: string) => {
      const previous = map.get(key);
      if (previous === undefined) map.set(key, i); else uf.union(i, previous);
    };
    if (result.fingerprint) connect(fingerprints, result.fingerprint);
    for (const hash of result.obfuscatedHashes) connect(payloads, canonicalJSON([result.pusher.toLowerCase(), hash]));
  });
  const groups = new Map<number, GuardResult[]>();
  results.forEach((result, i) => { const root = uf.find(i); const group = groups.get(root) ?? []; group.push(result); groups.set(root, group); });
  return [...groups.values()].map(group => {
    const changeIds = [...new Set(group.map(r => r.id))].sort();
    return {id: sha256(canonicalJSON(changeIds)), changeIds, branches: [...new Set(group.map(r => r.branch))].sort(), tier: maxTier(...group.map(r => r.tier)), fingerprint: group.map(r => r.fingerprint).filter((v): v is string => v !== null).sort()[0] ?? null};
  }).sort((a, b) => a.id.localeCompare(b.id));
}
