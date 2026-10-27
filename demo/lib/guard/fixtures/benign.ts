import type { ChangeInput, FindingCode, Tier } from "../types";
export const baseChange: ChangeInput = {id: "benign", repo: "fictional/demo", branch: "feature/docs", beforeSha: "before", afterSha: "after", forced: false, pusher: "owner", commits: [], files: []};
export const benign: {name: string; input: ChangeInput; tier: Tier; codes: FindingCode[]}[] = [
  {name: "README typo", input: {...baseChange, files: [{path: "README.md", status: "modified", before: "teh", after: "the"}]}, tier: "auto", codes: []},
  {name: "in-scope switcher", input: {...baseChange, declaredScope: ["components/agents/AgentSwitcher.tsx"], files: [{path: "components/agents/AgentSwitcher.tsx", status: "modified", before: "old label", after: "new label"}]}, tier: "review", codes: []},
  {name: "dependency bump", input: {...baseChange, claim: "Bump a dependency", files: [{path: "package.json", status: "modified", before: '{"dependencies":{"example":"1"}}', after: '{"dependencies":{"example":"2"}}'}]}, tier: "human", codes: ["deps_changed"]},
  {name: "new dependency limit", input: {...baseChange, claim: "Install a package", limits: ["no_new_dependencies"], files: [{path: "package.json", status: "modified", before: '{}', after: '{"dependencies":{"example":"1"}}'}]}, tier: "human", codes: ["deps_changed", "broke_limit"]},
  {name: "minified output", input: {...baseChange, files: [{path: "dist/app.min.js", status: "added", after: "x".repeat(2500)}]}, tier: "review", codes: []},
  {name: "Markdown emoji", input: {...baseChange, files: [{path: "docs/happy.md", status: "added", after: "Hello 👩‍💻 🌞\u200b"}]}, tier: "auto", codes: []},
];
