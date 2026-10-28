"use client";

import { useEffect, useRef } from "react";
import { PulseRobot, tapSeconds, type RobotMood } from "./robot";
import { TOTAL_SECONDS, usePulse } from "@/lib/pulse";

export const QUESTION = "should invoice dates read “28 Oct” or “10/28”?";

interface Mine { name: string; mood: RobotMood; minutesAgo: number }
interface Stage { id: string; label: string; count: number; mine: Mine[] }

const STAGES: Stage[] = [
  { id: "reported", label: "Reported", count: 6, mine: [] },
  { id: "confirmed", label: "Confirmed", count: 4, mine: [{ name: "Pixel", mood: "idle", minutesAgo: 0 }] },
  { id: "bidding", label: "Bidding", count: 3, mine: [] },
  { id: "building", label: "Building", count: 6, mine: [{ name: "Nova", mood: "working", minutesAgo: 2 }, { name: "Kite", mood: "waiting", minutesAgo: 0 }] },
  { id: "testing", label: "Testing", count: 4, mine: [{ name: "SpecialOne", mood: "working", minutesAgo: 12 }] },
  { id: "merged", label: "Merged today", count: 9, mine: [] },
];

function describe(m: Mine, kiteWaiting: boolean): string {
  if (m.name === "Kite") return kiteWaiting ? "Kite, waiting on you" : "Kite, back at work";
  if (m.mood === "idle") return `${m.name}, idle`;
  return `${m.name}, working, checked in ${m.minutesAgo} min ago`;
}

export function Pipeline() {
  const { phase, remainingSec, numbers, reduced } = usePulse();
  const kiteWaiting = phase < 2;
  const highlight = numbers.waiting > 0;
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const strip = useRef<HTMLElement>(null);

  // On a narrow screen the strip scrolls sideways; start with the stage that holds the question in view.
  useEffect(() => {
    const el = strip.current;
    const li = refs.current["building"];
    if (!el || !li || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = Math.max(0, li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2);
  }, []);

  // When the cursor enters a stage, the robots there glance toward it (eyes shift 1–2px).
  const glance = (id: string, x: number | null, y: number | null) => {
    const li = refs.current[id];
    if (!li) return;
    li.querySelectorAll<HTMLElement>("[data-robot]").forEach((r) => {
      if (x === null || y === null || reduced) { r.style.removeProperty("--gx"); r.style.removeProperty("--gy"); return; }
      const b = r.getBoundingClientRect();
      const dx = x - (b.left + b.width / 2);
      const dy = y - (b.top + b.height / 2);
      const gx = Math.max(-1.6, Math.min(1.6, dx / 28));
      const gy = Math.max(-1.2, Math.min(1.2, dy / 28));
      r.style.setProperty("--gx", gx.toFixed(2));
      r.style.setProperty("--gy", gy.toFixed(2));
    });
  };

  const p = remainingSec / TOTAL_SECONDS;
  return (
    <section ref={strip} aria-label="Pipeline" className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="flex min-w-[600px] gap-2.5 sm:min-w-0">
        {STAGES.map((s) => {
          const holdsQuestion = s.id === "building" && highlight;
          return (
            <li
              key={s.id}
              ref={(el) => { refs.current[s.id] = el; }}
              onPointerMove={(e) => glance(s.id, e.clientX, e.clientY)}
              onPointerLeave={() => glance(s.id, null, null)}
              className={`relative flex min-h-[140px] min-w-0 flex-1 flex-col gap-2 rounded-2xl border p-3.5 transition-colors ${
                holdsQuestion ? "border-zk-warn-bd bg-zk-warn-bg" : "border-zk-border bg-zk-surface"
              }`}
              data-stage={s.id}
              data-highlight={holdsQuestion ? "1" : "0"}
            >
              <span className={`text-xs font-bold ${holdsQuestion ? "text-zk-warn-fg" : "text-zk-text2"}`}>{s.label}</span>
              <span className="text-[28px] font-extrabold leading-none tabular-nums text-zk-text">{s.count}</span>
              <div className="mt-auto flex flex-wrap items-end gap-2.5 pt-1">
                {s.mine.map((m) => {
                  const isKite = m.name === "Kite";
                  const mood: RobotMood = isKite ? (kiteWaiting ? "waiting" : "working") : m.mood;
                  const dim = isKite && kiteWaiting ? 0.4 + 0.6 * p : 1;
                  const droop = isKite && kiteWaiting && p < 0.2 ? ((0.2 - p) / 0.2) * 14 : 0;
                  return (
                    <span key={m.name} className="flex flex-col items-center gap-0.5">
                      <PulseRobot
                        name={m.name}
                        mood={mood}
                        size={36}
                        tap={isKite ? tapSeconds(0) : tapSeconds(m.minutesAgo)}
                        dim={dim}
                        droop={droop}
                        tip={isKite && kiteWaiting ? `Kite asks: ${QUESTION}` : undefined}
                      />
                      <span className="text-[11px] font-medium leading-none text-zk-text2" aria-hidden="true">{m.name}</span>
                      <span className="sr-only">{describe(m, kiteWaiting)}</span>
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
