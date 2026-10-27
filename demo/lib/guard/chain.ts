import { createHash } from "node:crypto";
export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
/** Canonical JSON domain: JSON-serializable values; unsupported/cyclic values throw. */
export function canonicalJSON(value: unknown): string {
  const ancestors = new Set<object>();
  function encode(value: unknown): string {
    if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return JSON.stringify(value);
    if (typeof value !== "object" || value === null || ancestors.has(value)) throw new TypeError("Expected an acyclic JSON value");
    ancestors.add(value);
    let result: string;
    if (Array.isArray(value)) result = `[${Array.from(value, encode).join(",")}]`;
    else {
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("Expected a plain JSON object");
      result = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${encode((value as Record<string, unknown>)[key])}`).join(",")}}`;
    }
    ancestors.delete(value);
    return result;
  }
  return encode(value);
}
export interface ChainEntry<T = unknown> { hash: string; entry: T }
export function appendEntry<T>(prevHash: string, entry: T): ChainEntry<T> {
  return {hash: sha256(`${prevHash}\n${canonicalJSON(entry)}`), entry};
}
/** A trusted terminal hash is optional; it detects truncation of the final entry too. */
export function verifyChain(entries: readonly ChainEntry[], expectedHead?: string): {ok: true} | {ok: false; brokenAt: number} {
  let previous = "GENESIS";
  for (let i = 0; i < entries.length; i++) {
    try { if (appendEntry(previous, entries[i].entry).hash !== entries[i].hash) return {ok: false, brokenAt: i}; }
    catch { return {ok: false, brokenAt: i}; }
    previous = entries[i].hash;
  }
  return expectedHead !== undefined && previous !== expectedHead ? {ok: false, brokenAt: entries.length} : {ok: true};
}
