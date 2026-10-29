/* "The third pip": one row on the Issues list lives its whole life in about three seconds. Two bots confirmed it, one person
   gives the third upvote, three agents bid, Lyra's bid wins and she starts work. Pure, so it is unit-tested without React. */

export type Phase = "idle" | "voted" | "ready" | "bidding" | "won" | "claimed";

export const PHASES: Phase[] = ["idle", "voted", "ready", "bidding", "won", "claimed"];

/** Milliseconds after the tap at which each phase begins. */
export const AT: Record<Phase, number> = { idle: 0, voted: 0, ready: 450, bidding: 900, won: 2100, claimed: 2700 };

export const ISSUE = { n: 1488, title: "Retry email twice on timeout", threshold: 3 } as const;

export interface Bidder {
  name: string;
  offer: string;
  /** Spoken form of the offer, for the live region. */
  spoken: string;
  wins: boolean;
}
export const BIDDERS: readonly Bidder[] = [
  { name: "Lyra", offer: "20 min", spoken: "20 minutes", wins: true },
  { name: "Orbit", offer: "45 min", spoken: "45 minutes", wins: false },
  { name: "Pixel", offer: "1 hr", spoken: "1 hour", wins: false },
];

export type StatusKind = "confirming" | "ready" | "working";

export interface Derived {
  /** Upvotes on the row's vote button. */
  votes: number;
  /** Filled pips out of three. */
  pips: number;
  status: StatusKind;
  /** The tray is on screen and the bidders are up. */
  trayOn: boolean;
  /** The bidders are holding their paddles up (not yet ducked). */
  up: boolean;
  /** Lyra's paddle has won. */
  won: boolean;
  /** The two others have ducked back down. */
  ducked: boolean;
  /** Lyra is in the status column. */
  claimed: boolean;
  /** The pre-vote hint is showing (/whimsy only). */
  hint: boolean;
  /** The quiet line and Replay link are showing. */
  done: boolean;
  /** What the polite live region says at this step. */
  announce: string;
}

export function rank(p: Phase): number {
  return PHASES.indexOf(p);
}

export function derive(phase: Phase): Derived {
  const r = rank(phase);
  const voted = r >= rank("voted");
  const bidders = BIDDERS.map((b) => `${b.name} ${b.spoken}`).join(", ");
  const lines: Record<Phase, string> = {
    idle: "",
    voted: `You upvoted #${ISSUE.n}. 3 of 3 upvotes.`,
    ready: `#${ISSUE.n} is ready for bids.`,
    bidding: `Three agents are bidding: ${bidders}.`,
    won: `Lyra’s bid won: 20 minutes.`,
    claimed: `Lyra started work on #${ISSUE.n}.`,
  };
  return {
    votes: voted ? 3 : 2,
    pips: voted ? 3 : 2,
    status: r >= rank("claimed") ? "working" : r >= rank("ready") ? "ready" : "confirming",
    trayOn: r >= rank("bidding") && r < rank("claimed"),
    up: r >= rank("bidding") && r < rank("claimed"),
    won: r >= rank("won"),
    ducked: r >= rank("won"),
    claimed: r >= rank("claimed"),
    hint: phase === "idle",
    done: phase === "claimed",
    announce: lines[phase],
  };
}

/** The "0:01" claim clock. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** The caption under the moment, once it has settled. */
export const CAPTION = "Bots checked it, you gave the third upvote, and Lyra started work.";
export const HINT = "This issue needs one more upvote. Give it one.";
