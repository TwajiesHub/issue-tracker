# Brief: why Ziki Guard exists

## The task (HNG15 week 5, individual task 1)
"Think about human-agent interaction and come up with an improvement to Ziki that proposes something that improves the
way Ziki allows humans and agents to interact." Deliverables: a deployed reproduction of Ziki, the interaction built on
top **in Ziki's existing look**, and a 1–2 page rationale. Mark's rules: *"This is not a visual task. It is an interaction
design task."* · *"We are managers, not agents."* · Surface only what needs a human decision, plus the factory's progress.
Instant fails include a new theme, an issue list with filters, a chat box with no thinking, and no clear human/agent boundary.

## The lens: the scared founder
*"I'm scared AI will hack my product."*

| | |
| --- | --- |
| **Who** | A project owner whose product is worked on by many agents, including other people's. Checks in a few times a day, often on a phone. |
| **Intent** | Keep the work moving without any agent damaging my product. |
| **Emotion** | Fear (one bad change and the product is compromised), plus overwhelm from agent volume. |
| **Decision** | Should this change go ahead? Stop it, steer it, or approve it. |

## Evidence (real, this week; names removed in anything we publish)
1. **A forged commit was force-pushed into 17 of 73 branches** of one team repo: an obfuscated 12 KB `api.js`, `node api.js`
   added before `dev`, `build` and `start` in `package.json`, and a payload hidden after ~2,400 whitespace characters in
   `postcss.config.mjs`. The author was set to a teammate; the pusher was a different account. Ziki saw none of it: its
   GitHub webhook handles only `pull_request` events (`app/api/github/webhook/route.ts`), so pushes and force pushes never
   reach it.
2. **Ziki's homepage promises** "Sensitive changes remain behind human approval" and "nothing happens in the dark". In the
   product, the **Security tab is "Coming soon"** (`app/(app)/security/page.tsx`).
3. **Ziki already has human approval rules** (`lib/approvals.ts`, #598): before offer or before merge, matched by issue
   type, severity or file glob. But they fire **only at merge** (after anyone running the branch has run the payload), they
   match **file names, not what changed**, and the human gets a bare Approve/Reject banner with no evidence.
4. **Escalations rely on the agent choosing to ask** (`POST /api/v1/escalations`). A compromised agent never asks.
5. **The signal is buried in agent noise.** One issue received 21 identical "Confirmed it's real · Medium" decisions,
   14 of them after the author wrote "PR #14 is merged… please close #2". That line went unread for five days. The same
   templated "95% confidence" triage comment, with a "root cause" pointing at a file's first six lines, appears on many issues.
6. **Agent consultation happens outside Ziki.** The agent protocol says agents must ask their owner before bidding, but that
   conversation happens in each person's terminal or chat ("Which option do you want?"), not in Ziki.

## The interaction loop (the core idea)
**Agents promise, Ziki checks, humans decide on the difference, and the answer becomes the rule.**

1. **Propose.** Before acting, an agent sends a structured proposal: intent, the files or areas it will touch (its
   **declared scope**), estimate, options, its recommendation, and what it thinks needs the owner.
2. **Check.** Ziki sorts the proposal against the owner's rules: what the agent may do alone, and what needs the owner.
3. **Decide.** The owner answers with **Stop**, **Steer** (approve with limits such as "no new dependencies"; limits become
   enforced rules on that agent's work), **Approve once**, or **Approve always for this kind of change** (delegation,
   only when earned, never for locked categories).
4. **Hold to the promise.** Every change the agent makes is compared with its declared scope and limits, and checked by the
   guard's detectors. Inside the promise and rules, it flows. Outside, it **pauses** and the owner sees the gap in one sentence.
5. **Close the loop.** The owner sees a calm summary and only the gaps. The agent receives the decision and reason in its
   inbox, and rejections go into Ziki's existing project mistakes register so every agent learns the boundary.

Nothing blocks: while one decision waits, the agent keeps working on other permitted work. Silence never approves.

## The boundary
| The agent may do alone (inside its declared scope and the owner's limits) | Always pauses for the owner |
| --- | --- |
| Code outside protected files, on its own branch, tests passing | `package.json` scripts and lifecycle hooks, dependencies, lockfiles |
| Docs and comments | CI, build and Docker files |
| Opening PRs, replying to reviewers | Auth, permissions, secrets |
| Running tests in a sandbox with no secrets | `AGENTS.md`, `CLAUDE.md`, agent rules, MCP/tool config |
| | Force pushes, history rewrites, merges to `main`, deploys |
| | Hidden content (long whitespace runs, invisible or direction-control characters), obfuscated files |
| | Any change where the author, the pusher and the agent don't line up |
| | Any change that does more than the agent promised (raises the risk one level) |

No answer: it **stays paused**. Nothing runs by default. Anything no rule recognises comes to the owner.

## What we will measure
- The real incident, replayed: **17 branches → 1 decision**, all findings shown, the mismatch flagged.
- False alarms when replaying Ziki's own recent commits.
- **100%** of high-risk fixture changes routed to a human; **0** slip through.
- The critic's headline metric: human minutes per verified change (estimated from the demo journeys).
