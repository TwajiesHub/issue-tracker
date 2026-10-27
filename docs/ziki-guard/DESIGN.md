# Design: screens, words and rules

## Design rules (from our research: Linear, Things 3, Superhuman, Claude, and the oversight research)
1. **Text does the work.** Hierarchy from size, weight and space. Avoid boxes inside boxes and extra borders. No new
   uppercase section labels beyond what Ziki already uses.
2. **A quiet list.** One row per item: a small mark, a bold name, one sentence, grey details, the time on the right. No
   buttons inside "Needs you" rows. Selection is a soft fill, never colour.
3. **One thing at a time.** Pick from a calm list, then focus on one decision.
4. **One primary action per screen.** Everything else is a text button.
5. **Colour only where it means something.** One small risk mark per row; at most one coloured element per decision.
   Never repeat red icons down a list; use grey numbering (01, 02…).
6. **Two voices, kept apart.** What the agent *says* (quoted, its own words) vs what *Ziki found* (facts Ziki checked).
   The agent can never write into Ziki's voice.
7. **Effort matches risk.** Low risk: one tap. High risk: evidence first, then a deliberate 2-second hold to approve. No
   "approve all" for anything above low risk. High risk never approves from the keyboard or a notification.
8. **Silence is safe.** Every paused item says what happens if nobody answers: it stays paused.
9. **Keep Ziki's look.** Ziki's tokens (`zk-*`), components, Manrope and Geist Mono, light and dark. Risk colours map to
   Ziki's existing status tokens: needs you = `zk-bad-*`, can wait = `zk-warn-*`, done = `zk-ok-*`, info = `zk-info-*`.
   Risk is shown by shape and words as well as colour (octagon, triangle, tick).
10. **Accessible.** Real buttons, visible focus, contrast ≥ 4.5:1, `aria-live` only for status changes, reduced motion
    respected (the hold ring becomes a plain "Hold for 2 seconds" progress text).

## Words we use
Agent-first sentences: "Nova **wants to** fix #212", "Nova **did more than it promised**", "Kite **asks**: …".
Tiers: **Needs you** · **Can wait** · **Done by agents**. Paused line: "**Paused. Nothing runs until you decide.**"
Never: "guard", "risk score", "AI confidence", jargon in headlines. Code names appear only in mono, inside details.

## Screen 1: Inbox (`/issues` Inbox view; replaces today's three type-tabs)
**Header:** one sentence replacing the large "How the Inbox works" card:
"**2 decisions need you.** Your agents finished 14 things on their own." (Collapsible "How this works" text link.)

**Tabs (Ziki's existing tab style), by urgency:**
- **Needs you (n)**: paused changes, proposals that need approval, questions/escalations. Ordered by the guard's priority
  queue (tier, then reach, then age).
- **Can wait (n)**: low-risk items, one-tap decisions.
- **Done by agents (n)**: what happened without you today.
The old type (paused, proposal, question, design feedback, new idea) becomes a small grey word in each row. Design
feedback and new ideas still appear (in Can wait unless a rule says otherwise).

**Layout:** desktop is two panes (list on the left, decision on the right). Phone: list, then the decision as its own page
with the primary button fixed at the bottom.

**Row:** `[risk mark] **Agent**  one sentence                     time`
`            grey detail · grey detail`
Examples:
- ⬣ **Nova** did more than it promised · `paused · 17 branches · nothing has run` · 4m
- ⬣ **Kite** wants to fix #212 Emoji picker · `proposal · may add 1 dependency` · 12m
- ▲ **SpecialOne** asks: "Should the survey include pricing questions?" · `question · #1881` · 1h

### Decision pane: one skeleton for every kind
Headline sentence (large, Ziki's heading style) → one plain paragraph → details → **one primary button** → text buttons →
the silence line where relevant.

**A. Paused change (Ziki raised it)**
- Headline: "**Nova did more than it promised.**"
- Paragraph: "Nova said it would refactor the switcher menu. Ziki found four changes it didn't mention. Nothing has run."
- Two short columns, plain text, no boxes:
  - **Nova promised**: "Small refactor of the switcher menu" · scope `components/agents/AgentSwitcher.tsx`
  - **Ziki found**: 01 A script that now runs before dev, build and start · 02 A new 12 KB file that looks obfuscated ·
    03 2,400 hidden characters at the end of a config file · 04 It replaced an earlier commit by force
  - One note (the only red on the page): "**Doesn't match what Nova promised.**"
- Text link: "See the changes" → each finding expands to a short diff excerpt (mono), file and line.
- Sidebar cards (as on Ziki's issue page): **Status** (Paused 4 min · stays paused until you decide) · **Agent** (Nova ·
  yours · promises kept 41/42 · *Pause agent and rotate key*) · **Reach** (17 branches · 0 runs · not on main) ·
  **Restore point** (f58bb07 for each branch).
- **Primary:** "**Stop and restore**" → confirmation listing exactly what happens (restore 17 branches to their restore
  points, pause Nova, rotate its key) → after: "**Restored. Nothing ran.** Logged at 10:24."
- Text buttons: "**Reply with limits**" (sheet; quick replies depend on risk: for a mismatch, never offer "do it":
  offer "Explain this change first", "Undo your last push", "Stop and wait for me") · "**Review and approve**" (approve
  unlocks only after all findings are opened, then a 2-second hold; caption: "You've seen all 4. Hold to approve anyway.").
- Silence line: "If you don't answer, it stays paused."

**B. Proposal (the agent asks first)**
- Headline: "**Kite wants to fix #212.**"
- Paragraph: "It will change the composer files and estimates 30 minutes. It may need one new library, which is your call."
- Details: Will touch `lib/composer/*` · Estimate 30 min · Needs you: may add 1 dependency · Kite's recommendation.
- **Primary:** "**Approve**". Text buttons: "**Add limits**" (inline choices: No new dependencies · Stay in these files ·
  No protected files; chosen limits are shown as "Active limits" and enforced), "**Ask Kite**", "**Decline**".
- After: "Approved with 1 limit. Kite is working." The proposal row moves to Done by agents when finished.

**C. Question (Ziki's existing escalations, now here)**
- The question as a quote, 2–3 suggested replies, an answer box. **Primary:** "**Send**".

### Can wait tab
Same quiet rows. Hover (desktop) or swipe (phone) reveals **Approve** · **Skip** in the row. Grey footer: "These never run code."

### Done by agents tab
Optional suggestion at the top (earned autonomy, see ENGINE.md):
"**Kite kept its promise on all 12 docs changes.** Let it just do these and tell you after?" · **Yes** · Not now ·
grey lock line: "Scripts, CI, auth and AGENTS.md always need you."
Below: time-ordered one-liners, grey time left: "10:24 · SpecialOne reviewed T-1869", "09:41 · Nova fixed a typo in README.md".

### Empty state
"**Nothing needs you.** Your agents finished 14 things today." · "See what they did →"

### Keyboard (Ziki already has shortcuts; extend, don't clash)
J/K move · Enter open · S stop and restore (Needs you) · A approve (**Can wait only**) · Esc back.

## Screen 2: Security tab (`/security`, replaces "Coming soon")
Top to bottom, no table, no filters:
1. One sentence: "**1 change to Zedu is paused for you.** Everything else your agents did today passed." (Or: "**All clear.**
   Your agents made 23 changes today; all passed.")
2. **Paused for you**: one row per *incident* (grouped), same row style as the Inbox, opening the same decision.
3. **Today**: "14 changes passed · 3 checked by your rules · 0 restored."
4. **Your boundary**: three short groups (Agents do alone · Ask me · Always me) linking to Rules.
5. **Suggestions**: earned-autonomy suggestions.
Top bar: a small dot on the Security tab when something is paused. Nothing else in the top bar changes.

## Screen 3: Agent (Settings → Agents row, and the Agents dropdown)
Added to each agent's row/page (keep Regenerate key / Revoke / Delete):
- **Promises kept: 41 of 42** (with a link to the one broken).
- **Delegation** per kind of work: *Ask me* · *Tell me after* · *Just do it*. Locked rows show a lock (scripts and
  dependencies, CI and build, auth and secrets, AGENTS.md and agent rules, deploys and force pushes).
- **Active limits** (from "Add limits"/"Reply with limits"), each removable.
- **Pause agent** (one switch). **Pause and rotate key** does both in one confirmation.
- Paused state sentence: "**Nova is paused.** It can't push, run code or bid until you resume it."

## Screen 4: Dashboard strip
Above the stat cards: "**Your agents today:** 14 things done · **1 paused for you** → Review". Hidden when nothing is paused
(then: "14 things done · nothing needs you").

## Screen 5: Bell, email, issue page
- Bell: "Nova did more than it promised. Paused, nothing has run." sorts first.
- Settings → Preferences → Email notifications: new row "**Paused changes**: when an agent's change is paused for you.
  Always on." (disabled switch).
- Issue page: when the issue has a paused change or a waiting proposal, show the decision skeleton inline (replacing the
  bare approval banner for guard holds).

## The three demo journeys
1. **The night attack:** bell + Security dot → Security → one incident row → Promised / Ziki found → Stop and restore →
   "Restored. Nothing ran." (~30 seconds, no code reading).
2. **A normal day:** Kite's proposal in the Inbox → Add limits: no new dependencies → Approve → Kite works → Done by agents.
   (Simulate a second push that adds a dependency → it pauses with "broke a limit you set".)
3. **A week later:** suggestion → "Tell me after" for docs → the app gets quieter.
