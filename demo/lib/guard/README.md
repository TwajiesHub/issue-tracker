# Guard engine

Pure TypeScript implementation of `docs/ziki-guard/ENGINE.md`, relocated here so the demo can import it without the application or Prisma. Only `node:crypto` is used at runtime. Import `runGuard` and the helpers from `./index`.

```ts
const results = changes.map(change => runGuard(change));
const incidents = groupIncidents(results);
const queue = new PriorityQueue<Incident & { ageMinutes: number }>(incidentPriority);
```

`GuardResult` includes `id`, `branch`, `pusher`, and `obfuscatedHashes` correlation metadata so `groupIncidents(results)` stays stateless. Incident IDs are deterministic hashes of sorted change IDs. Results without fingerprints stay separate unless the pusher and obfuscated content hashes match. The queue preserves insertion order when computed priorities are equal; the incident priority already sorts older incidents first, up to the specified age cap.

All specified defaults remain unchanged: whitespace 200, entropy 5.0 over 1,000 characters, five obfuscated identifiers, line length 2,000, Wilson lower bound 0.75 with at least 10 observations. Optional `GuardConfig` overrides are explicit and must be positive finite numbers. `suggestDelegation` returns `"auto"` or `null`; unknown categories are never eligible, just like locked categories.

Added text is computed using a linear line-multiset subtraction of before text from after text. Repeated lines are counted. Removed/unchanged lines do not trigger added-text detectors; modified lines are inspected in full. This avoids a quadratic text diff. Translation JSON means files under `locales`, `translations`, `i18n`, or `messages` directories; ordinary JSON is still checked. Unavailable manifest text fails closed. Script removals are also reported, since removing a command changes the scripts object.

The chain accepts plain JSON values, rejects cycles and unsupported values, and recursively sorts object keys. `appendEntry("GENESIS", entry)` begins a chain. As with any hash chain, deleting the tail leaves an internally valid prefix: supply the optional trusted terminal hash to `verifyChain(entries, expectedHead)` to detect tail truncation. Internal deletion, tampering, and reordering are detected without that checkpoint. The chain authenticates consistency, not the identity of the writer.

The incident fixture is inert text, never executed, with fictional identities and no real malware. Tests use deterministic seeded property checks (no extra packages).

Run from the repository root:

```sh
pnpm exec vitest run demo/lib/guard
```
