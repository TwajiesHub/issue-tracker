"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BAR_SECONDS, TOTAL_SECONDS, derive, finalStages, type Core, type Derived, type Stages } from "./pulse-model";

export { BAR_SECONDS, TOTAL_SECONDS };
const STORAGE_KEY = "zg-pulse-v2";

export type PrefKey = "question" | "direction" | "merge" | "bids" | "reviews" | "fixes";

/** setting = the line in Preferences; chip = the short name in the bell. */
export const PREF_LABELS: Record<PrefKey, { setting: string; chip: string }> = {
  question: { setting: "An agent asks you a question", chip: "Questions that pause an agent" },
  direction: { setting: "A change to how the product works", chip: "Direction changes" },
  merge: { setting: "A merge your project’s rules hold for approval", chip: "Merges held for approval" },
  bids: { setting: "Bids, claims and offers", chip: "Bids, claims and offers" },
  reviews: { setting: "Reviews and test results", chip: "Reviews and test results" },
  fixes: { setting: "Fixes merged and points earned", chip: "Fixes merged and points earned" },
};
const DEFAULT_RIGHT_AWAY: PrefKey[] = ["question", "direction", "merge"];
const DEFAULT_DAILY: PrefKey[] = ["bids", "reviews", "fixes"];

/** Kite's answer moment: 0 waiting · 1 happy (antenna, eyes, nod) · 2 hammer up · 3 pulse updated, card settles · 4 finished */
export type Phase = 0 | 1 | 2 | 3 | 4;

interface Persisted extends Core {
  deadline: number;
  rightAway: PrefKey[];
  daily: PrefKey[];
  hour: number;
}

export interface PulseNumbers { moving: number; waiting: number; stuck: number }

interface Pulse {
  ready: boolean;
  reduced: boolean;
  remainingSec: number;
  answer: string | null;
  released: boolean;
  ship: Core["ship"];
  /** Kite's answer moment (0–4). */
  phase: Phase;
  stages: Stages;
  /** Everything the screen shows, from the two decisions and how far each moment has got. */
  model: Derived;
  /** True once Kite's question is settled (answered or released). */
  settled: boolean;
  numbers: PulseNumbers;
  rightAway: PrefKey[];
  daily: PrefKey[];
  hour: number;
  /** How many things interrupt you right now (drives the bell badge). */
  interrupts: number;
  announce: string;
  answerNow(choice: string, slow?: boolean): void;
  undo(): void;
  shipIt(): void;
  holdShip(): void;
  releaseKite(): void;
  replay(): void;
  reset(): void;
  skipAhead(): void;
  move(key: PrefKey, to: "right" | "daily"): void;
  setHour(h: number): void;
}

const Ctx = createContext<Pulse | null>(null);

const fresh = (): Persisted => ({
  deadline: 0, answer: null, released: false, ship: "ready", rightAway: DEFAULT_RIGHT_AWAY, daily: DEFAULT_DAILY, hour: 8,
});

export function PulseProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(fresh);
  const [stages, setStages] = useState<Stages>({ kite: 0, ship: 0, release: 0 });
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [announce, setAnnounce] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reducedRef = useRef(false);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  const setStage = <K extends keyof Stages>(k: K, v: Stages[K]) => setStages((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    reducedRef.current = mq.matches;
    const onChange = () => { setReduced(mq.matches); reducedRef.current = mq.matches; };
    mq.addEventListener("change", onChange);
    let saved: Persisted | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as Persisted;
    } catch {}
    const t = Date.now();
    const base = saved ?? fresh();
    const next = { ...fresh(), ...base, deadline: base.deadline || t + TOTAL_SECONDS * 1000 };
    setP(next);
    setStages(finalStages(next));
    setNow(t);
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  }, [p, ready]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => clearTimers, []);

  const remainingSec = ready ? Math.max(0, Math.floor((p.deadline - now) / 1000)) : TOTAL_SECONDS;

  const answerNow = useCallback((choice: string, slow = false) => {
    setP((s) => (s.answer || s.released ? s : { ...s, answer: choice }));
    if (reducedRef.current) {
      setStage("kite", 4);
      setAnnounce("Answered. Kite is back at work on #1491. 15 moving, 1 waiting on you.");
      return;
    }
    // slow is /whimsy: hop and nod (0.9s), three hammer swings (1.2s), then the pipeline and the pulse update (~2.5s in all).
    const at = slow ? [900, 2100, 2500] : [500, 1100, 1600];
    setStage("kite", 1);
    later(at[0], () => setStage("kite", 2));
    later(at[1], () => { setStage("kite", 3); setAnnounce("Answered. Kite is back at work on #1491. 15 moving, 1 waiting on you."); });
    later(at[2], () => setStage("kite", 4));
  }, []);

  const undo = useCallback(() => {
    clearTimers();
    setP((s) => (s.ship === "ready" ? { ...s, answer: null } : s));
    setStages((s) => ({ ...s, kite: 0 }));
    setAnnounce("Undone. Kite is waiting on you again. 14 moving, 2 waiting on you.");
  }, []);

  const shipIt = useCallback(() => {
    setP((s) => (s.ship === "shipped" ? s : { ...s, ship: "shipped" }));
    const done = "Shipped. Nova’s fix for #1470 is live. You earned 450 points. 14 moving, 0 waiting on you. You’re all caught up.";
    if (reducedRef.current) {
      setStage("ship", 5);
      setAnnounce(done);
      return;
    }
    setStage("ship", 1);
    later(450, () => setStage("ship", 2));
    later(1100, () => { setStage("ship", 3); setAnnounce("Shipped. Nova’s fix for #1470 moved to Merged today."); });
    later(2000, () => { setStage("ship", 4); setAnnounce(done); });
    later(2500, () => setStage("ship", 5));
  }, []);

  const holdShip = useCallback(() => {
    setP((s) => (s.ship === "shipped" ? s : { ...s, ship: "held" }));
    setAnnounce("Kept on hold. Nova’s fix waits for you. 1 waiting on you.");
  }, []);

  const releaseKite = useCallback(() => {
    setP((s) => (s.answer || s.released ? s : { ...s, released: true }));
    const msg = "Kite’s claim was released. It’s back up for bids. 14 moving, 1 waiting on you.";
    if (reducedRef.current) {
      setStage("release", 3);
      setAnnounce(msg);
      return;
    }
    setStage("release", 1);
    later(600, () => setStage("release", 2));
    later(1400, () => { setStage("release", 3); setAnnounce(msg); });
  }, []);

  const replay = useCallback(() => {
    clearTimers();
    setP((s) => ({ ...s, answer: null, released: false, ship: "ready", deadline: Date.now() + TOTAL_SECONDS * 1000 }));
    setStages({ kite: 0, ship: 0, release: 0 });
    setNow(Date.now());
    setAnnounce("");
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    const t = Date.now();
    setP({ ...fresh(), deadline: t + TOTAL_SECONDS * 1000 });
    setStages({ kite: 0, ship: 0, release: 0 });
    setNow(t);
    setAnnounce("");
  }, []);

  const skipAhead = useCallback(() => {
    const t = Date.now();
    setP((s) => ({ ...s, deadline: t + 6 * 60 * 1000 }));
    setNow(t);
  }, []);

  const move = useCallback((key: PrefKey, to: "right" | "daily") => {
    setP((s) => {
      const rightAway = s.rightAway.filter((k) => k !== key);
      const daily = s.daily.filter((k) => k !== key);
      if (to === "right") rightAway.push(key); else daily.push(key);
      const order = Object.keys(PREF_LABELS) as PrefKey[];
      const sort = (a: PrefKey[]) => [...a].sort((x, y) => order.indexOf(x) - order.indexOf(y));
      return { ...s, rightAway: sort(rightAway), daily: sort(daily) };
    });
  }, []);

  const setHour = useCallback((h: number) => setP((s) => ({ ...s, hour: h })), []);

  const value = useMemo<Pulse>(() => {
    const model = derive(p, stages);
    const interrupts = (model.kiteWaiting && p.rightAway.includes("question") ? 1 : 0) + (model.shipWaiting && p.rightAway.includes("merge") ? 1 : 0);
    return {
      ready, reduced, remainingSec, answer: p.answer, released: p.released, ship: p.ship,
      phase: stages.kite, stages, model, settled: !model.kiteWaiting,
      numbers: { moving: model.moving, waiting: model.waiting, stuck: model.stuck },
      rightAway: p.rightAway, daily: p.daily, hour: p.hour, interrupts,
      announce, answerNow, undo, shipIt, holdShip, releaseKite, replay, reset, skipAhead, move, setHour,
    };
  }, [ready, reduced, remainingSec, p, stages, announce, answerNow, undo, shipIt, holdShip, releaseKite, replay, reset, skipAhead, move, setHour]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">{announce}</div>
    </Ctx.Provider>
  );
}

export function usePulse(): Pulse {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePulse outside PulseProvider");
  return v;
}

/** "3h 20m", "42m", "4m 12s". */
export function formatRemaining(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m >= 5) return `${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
