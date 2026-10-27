import type { ChangeInput, Finding } from "../types";
export function detectHistory(input: ChangeInput): Finding[] {
  const findings: Finding[] = [];
  if (input.forced || input.isAncestor === false) findings.push({code: "history_rewritten", tier: "human", title: "It replaced an earlier commit by force.", evidence: {before: input.beforeSha ?? undefined}});
  if (input.agent && (!input.agent.allowedPushers.some(p => p.toLowerCase() === input.pusher.toLowerCase()) || input.commits.some(commit => !input.agent!.ownerEmails.some(email => email.toLowerCase() === commit.authorEmail.toLowerCase())))) {
    findings.push({code: "author_pusher_mismatch", tier: "human", title: "The commit says one author but was pushed by someone else.", evidence: {excerpt: JSON.stringify({pusher: input.pusher, authors: [...new Set(input.commits.map(commit => commit.authorEmail))].sort()})}});
  }
  return findings;
}
