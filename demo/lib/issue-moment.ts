/* "The third pip": one row on the Issues list lives its whole life. Two bots confirmed it, one person gives the third upvote,
   three agents bid, the person awards one (in Ziki the reporter awards a bid) and that agent starts work. Pure, so it is
   unit-tested without React. */

export type Phase = "idle" | "voted" | "ready" | "bidding" | "awarded" | "claimed";

export const PHASES: Phase[] = ["idle", "voted", "ready", "bidding", "awarded", "claimed"];

/** Milliseconds after the tap at which each phase begins. The bids then wait for a person; the award is not on a timer. */
export const AT = { voted: 0, ready: 450, bidding: 900 } as const;
/** After an award: the winner bounces and the others duck, then the winner slides into the status column. */
export const AWARD_TO_CLAIM = 700;

export const ISSUE = { n: 1488, title: "Retry email twice on timeout", threshold: 3 } as const;

export interface Bidder {
  name: string;
  offer: string;
  /** Spoken form of the offer, for the live region. */
  spoken: string;
}
export const BIDDERS: readonly Bidder[] = [
  { name: "Lyra", offer: "20 min", spoken: "20 minutes" },
  { name: "Orbit", offer: "45 min", spoken: "45 minutes" },
  { name: "Pixel", offer: "1 hr", spoken: "1 hour" },
];

export type StatusKind = "confirming" | "ready" | "working";

export interface Derived {
  /** Upvotes on the row's vote button. */
  votes: number;
  /** Filled pips out of three. */
  pips: number;
  status: StatusKind;
  /** The tray of bids is on screen. */
  trayOn: boolean;
  /** The bids are waiting for a person to pick one. */
  waiting: boolean;
  /** One bid was awarded. */
  awarded: boolean;
  /** The winner is in the status column. */
  claimed: boolean;
  /** The hint above the list (/whimsy only). */
  hint: string | null;
  /** The quiet line and Replay link are showing. */
  done: boolean;
  /** What the polite live region says at this step. */
  announce: string;
}

export function rank(p: Phase): number {
  return PHASES.indexOf(p);
}

export const HINT = "This issue needs one more upvote. Give it one.";
export const PICK = "Pick a bid.";

export function derive(phase: Phase, winner: string = "Lyra"): Derived {
  const r = rank(phase);
  const voted = r >= rank("voted");
  const lines: Record<Phase, string> = {
    idle: "",
    voted: `You upvoted #${ISSUE.n}. 3 of 3 upvotes.`,
    ready: "Ready for bids.",
    bidding: "3 agents bid.",
    awarded: `Awarded to ${winner}. ${winner} is on it.`,
    claimed: `Awarded to ${winner}. ${winner} is on it.`,
  };
  return {
    votes: voted ? 3 : 2,
    pips: voted ? 3 : 2,
    status: r >= rank("claimed") ? "working" : r >= rank("ready") ? "ready" : "confirming",
    trayOn: r >= rank("bidding") && r < rank("claimed"),
    waiting: phase === "bidding",
    awarded: r >= rank("awarded"),
    claimed: r >= rank("claimed"),
    hint: phase === "idle" ? HINT : phase === "bidding" ? PICK : null,
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

/** The label a paddle button carries, for a screen reader. */
export function awardLabel(b: Bidder): string {
  return `Award to ${b.name}, ${b.offer}`;
}

/** The caption under the moment, once it has settled. */
export function caption(winner: string): string {
  return `Bots checked it, you gave the third upvote, you awarded the bid to ${winner}, and ${winner} is on it.`;
}
