/* The pulse's story as plain data: two things wait on you (Kite's question, Nova's fix ready to ship), and what every number,
   stage count, robot position and card says at each moment. Pure, so it is unit-tested without React or a browser. */

/** Kite's claim is released this long after it asks, if nobody answers (3 h 20 m). */
export const TOTAL_SECONDS = 3 * 3600 + 20 * 60;
/** The countdown bar is drawn against a 4-hour claim window, so 3h 20m reads as about 83%. */
export const BAR_SECONDS = 4 * 3600;

export const POINTS_BASE = 2340;
export const SHIP_POINTS = 450;
export const WEEK_BASE = 380;
export const WEEK_GOAL = 500;
export const GOAL = { title: "New onboarding", total: 9, doneBase: 6, spentBase: 1200, pool: 2000 } as const;

/** What the person has decided so far. Persisted for the tab. */
export interface Core {
  /** Kite's answer, or null. */
  answer: string | null;
  /** Kite's clock ran out (demo panel) and it set its claim down. */
  released: boolean;
  ship: "ready" | "held" | "shipped";
}

/** Where each short staged moment has got to. 0 means it has not started. */
export interface Stages {
  /** 1 happy · 2 hammer up · 3 pulse updated, card settles · 4 finished (the next card may slide in) */
  kite: 0 | 1 | 2 | 3 | 4;
  /** 1 happy · 2 Nova walks to Merged · 3 count ticks, +450 floats · 4 points pill ticks · 5 settled */
  ship: 0 | 1 | 2 | 3 | 4 | 5;
  /** 1 claim set down · 2 Kite walks to Bidding · 3 numbers and card update */
  release: 0 | 1 | 2 | 3;
}

export type StageId = "reported" | "confirmed" | "bidding" | "building" | "testing" | "merged";

export interface Derived {
  moving: number;
  waiting: number;
  stuck: number;
  counts: Record<StageId, number>;
  kiteStage: StageId;
  novaStage: StageId;
  points: number;
  goal: { done: number; total: number; spent: number; pool: number };
  /** The line that replaces Kite's card, once it is decided. */
  kiteLine: "answered" | "released" | null;
  shipVisible: boolean;
  /** What the decision slot shows now. */
  slot: "kite" | "ship" | "held" | "caught-up";
  /** "1 of 2" / "2 of 2" for the card on show. */
  position: 1 | 2;
  kiteWaiting: boolean;
  shipWaiting: boolean;
  fixesMerged: number;
  pointsEarned: number;
  /** The Points this week card; follows the header pill. */
  weekPoints: number;
}

export function derive(core: Core, st: Stages): Derived {
  const kiteAnswered = !!core.answer;
  const kiteSettled = (kiteAnswered && st.kite >= 3) || (core.released && st.release >= 3);
  const kiteBid = core.released && st.release >= 2;
  const novaMerged = core.ship === "shipped" && st.ship >= 2;
  const shipTicked = core.ship === "shipped" && st.ship >= 3;
  const caughtUp = core.ship === "shipped" && st.ship >= 4;
  const kiteDone = kiteAnswered || core.released;
  const kiteLine = kiteSettled ? (core.released ? "released" : "answered") : null;
  const shipVisible = (kiteAnswered && st.kite >= 4) || (core.released && st.release >= 3) || core.ship !== "ready";

  const kiteWaiting = !kiteSettled;
  const shipWaiting = !shipTicked;
  const counts: Record<StageId, number> = {
    reported: 6,
    confirmed: 4,
    bidding: 3 + (kiteBid ? 1 : 0),
    building: 6 - (kiteBid ? 1 : 0),
    testing: 4 - (novaMerged ? 1 : 0),
    merged: 9 + (shipTicked ? 1 : 0),
  };
  const slot: Derived["slot"] = caughtUp ? "caught-up" : core.ship === "held" ? "held" : kiteDone && shipVisible ? "ship" : "kite";
  const done = GOAL.doneBase + (shipTicked ? 1 : 0);
  return {
    moving: 14 + (kiteAnswered && st.kite >= 3 ? 1 : 0) - (shipTicked ? 1 : 0),
    waiting: (kiteWaiting ? 1 : 0) + (shipWaiting ? 1 : 0),
    stuck: 2,
    counts,
    kiteStage: kiteBid ? "bidding" : "building",
    novaStage: novaMerged ? "merged" : "testing",
    points: POINTS_BASE + (core.ship === "shipped" && st.ship >= 4 ? SHIP_POINTS : 0),
    goal: { done, total: GOAL.total, spent: GOAL.spentBase + (shipTicked ? SHIP_POINTS : 0), pool: GOAL.pool },
    kiteLine,
    shipVisible,
    slot,
    position: slot === "kite" ? 1 : 2,
    kiteWaiting,
    shipWaiting,
    fixesMerged: 9 + (shipTicked ? 1 : 0),
    pointsEarned: 120 + (shipTicked ? SHIP_POINTS : 0),
    weekPoints: WEEK_BASE + (core.ship === "shipped" && st.ship >= 4 ? SHIP_POINTS : 0),
  };
}

/** Stages for a state that is already settled (a reload, or reduced motion). */
export function finalStages(core: Core): Stages {
  return { kite: core.answer ? 4 : 0, ship: core.ship === "shipped" ? 5 : 0, release: core.released ? 3 : 0 };
}

export function formatPoints(n: number): string {
  return n.toLocaleString("en-US");
}
