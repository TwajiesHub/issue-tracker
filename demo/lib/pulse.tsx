"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Kite's claim is released this long after it asks, if nobody answers (3 h 20 m). */
export const TOTAL_SECONDS = 3 * 3600 + 20 * 60;
/** The countdown bar is drawn against a 4-hour claim window, so 3h 20m reads as about 83%. */
export const BAR_SECONDS = 4 * 3600;
const STORAGE_KEY = "zg-pulse-v1";

export type PrefKey = "question" | "direction" | "merge" | "bids" | "reviews" | "fixes";

/** setting = the line in Preferences; chip = the short name in the bell. */
export const PREF_LABELS: Record<PrefKey, { setting: string; chip: string }> = {
  question: { setting: "An agent asks you a question", chip: "Questions that pause an agent" },
  direction: { setting: "A change to how the product works", chip: "Direction changes" },
  merge: { setting: "A merge to the live site", chip: "Merges to the live site" },
  bids: { setting: "Bids, claims and offers", chip: "Bids, claims and offers" },
  reviews: { setting: "Reviews and test results", chip: "Reviews and test results" },
  fixes: { setting: "Fixes merged and points earned", chip: "Fixes merged and points earned" },
};
const DEFAULT_RIGHT_AWAY: PrefKey[] = ["question", "direction", "merge"];
const DEFAULT_DAILY: PrefKey[] = ["bids", "reviews", "fixes"];

/** 0 waiting · 1 happy (antenna, eyes, nod) · 2 hammer up · 3 pulse updated, card settles · 4 finished */
export type Phase = 0 | 1 | 2 | 3 | 4;

interface Persisted {
  deadline: number;
  answer: string | null;
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
  phase: Phase;
  /** True once the pulse numbers have moved on (answered and settled). */
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
  replay(): void;
  reset(): void;
  skipAhead(): void;
  move(key: PrefKey, to: "right" | "daily"): void;
  setHour(h: number): void;
}

const Ctx = createContext<Pulse | null>(null);

const fresh = (): Persisted => ({ deadline: 0, answer: null, rightAway: DEFAULT_RIGHT_AWAY, daily: DEFAULT_DAILY, hour: 8 });

export function PulseProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(fresh);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [phase, setPhase] = useState<Phase>(0);
  const [reduced, setReduced] = useState(false);
  const [announce, setAnnounce] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
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
    setPhase(next.answer ? 4 : 0);
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
    setP((s) => (s.answer ? s : { ...s, answer: choice }));
    clearTimers();
    if (reduced) {
      setPhase(4);
      setAnnounce("Answered. Kite is back at work on #1491. 15 moving, 0 waiting on you.");
      return;
    }
    // slow is /whimsy: hop and nod (0.9s), three hammer swings (1.2s), then the pipeline and the pulse update (~2.5s in all).
    const at = slow ? [900, 2100, 2500] : [500, 1100, 1600];
    setPhase(1);
    timers.current = [
      setTimeout(() => setPhase(2), at[0]),
      setTimeout(() => { setPhase(3); setAnnounce("Answered. Kite is back at work on #1491. 15 moving, 0 waiting on you."); }, at[1]),
      setTimeout(() => setPhase(4), at[2]),
    ];
  }, [reduced]);

  const undo = useCallback(() => {
    clearTimers();
    setP((s) => ({ ...s, answer: null }));
    setPhase(0);
    setAnnounce("Undone. Kite is waiting on you again. 14 moving, 1 waiting on you.");
  }, []);

  const replay = useCallback(() => {
    clearTimers();
    setP((s) => ({ ...s, answer: null, deadline: Date.now() + TOTAL_SECONDS * 1000 }));
    setNow(Date.now());
    setPhase(0);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    const t = Date.now();
    setP({ ...fresh(), deadline: t + TOTAL_SECONDS * 1000 });
    setNow(t);
    setPhase(0);
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

  const settled = !!p.answer && phase >= 3;
  const value = useMemo<Pulse>(() => {
    const numbers: PulseNumbers = { moving: settled ? 15 : 14, waiting: settled ? 0 : 1, stuck: 2 };
    const waiting = numbers.waiting > 0;
    return {
      ready, reduced, remainingSec, answer: p.answer, phase, settled, numbers,
      rightAway: p.rightAway, daily: p.daily, hour: p.hour,
      interrupts: waiting && p.rightAway.includes("question") ? 1 : 0,
      announce, answerNow, undo, replay, reset, skipAhead, move, setHour,
    };
  }, [ready, reduced, remainingSec, p, phase, settled, announce, answerNow, undo, replay, reset, skipAhead, move, setHour]);

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
