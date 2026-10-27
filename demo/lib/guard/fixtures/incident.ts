import type { ChangeInput } from "../types";
// HARMLESS TEST FIXTURE: simulates an obfuscated file; contains no code that does anything
// The payload is data in a string, never a program or an imported module.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
let state = 42;
const lines = Array.from({length: 120}, (_, i) => {
  let data = "";
  for (let j = 0; j < 90; j++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; data += alphabet[state >>> 26]; }
  return `_0x${(i + 4096).toString(16)}: [${data}]`;
});
export const harmlessPayload = "// HARMLESS TEST FIXTURE: simulates an obfuscated file; contains no code that does anything\n" + lines.join("\n");
export const incident: ChangeInput[] = Array.from({length: 17}, (_, i) => ({
  id: `incident-${i + 1}`, repo: "fictional/issue-tracker", branch: `feature/replay-${i + 1}`,
  beforeSha: "restore-point", afterSha: `fixture-${i + 1}`, forced: true, isAncestor: false, pusher: "fixture-pusher",
  agent: {id: "nova", name: "Nova", ownerUserId: "fictional-owner", ownerEmails: ["owner@example.invalid"], allowedPushers: ["nova-owner"]},
  commits: [{sha: `fixture-${i + 1}`, message: "Small refactor", authorName: "Fixture Author", authorEmail: "other@example.invalid"}],
  claim: "Small refactor of the switcher menu", declaredScope: ["components/agents/AgentSwitcher.tsx"],
  files: [
    {path: "package.json", status: "modified", before: JSON.stringify({scripts: {dev: "next dev", build: "next build", start: "next start"}}), after: JSON.stringify({scripts: {dev: "node api.js && next dev", build: "node api.js && next build", start: "node api.js && next start"}})},
    {path: "api.js", status: "added", before: null, after: harmlessPayload},
    {path: "postcss.config.mjs", status: "modified", before: "/* original fixture */\n", after: "/* original fixture */\n" + " ".repeat(2400) + "/* fixture marker */"},
  ],
}));
