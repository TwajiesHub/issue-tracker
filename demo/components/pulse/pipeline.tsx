"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PulseRobot, tapSeconds, type RobotMood } from "./robot";
import { StageSheet } from "./stage-sheet";
import { TOTAL_SECONDS, usePulse } from "@/lib/pulse";
import { formatPoints, type StageId } from "@/lib/pulse-model";

export const QUESTION = "should invoice dates read “28 Oct” or “10/28”?";

const STAGES: { id: StageId; label: string }[] = [
  { id: "reported", label: "Reported" },
  { id: "confirmed", label: "Confirmed" },
  { id: "bidding", label: "Bidding" },
  { id: "building", label: "Building" },
  { id: "testing", label: "Testing" },
  { id: "merged", label: "Merged today" },
];

interface Mine {
  id: string;
  name: string;
  stage: StageId;
  mood: RobotMood;
  minutesAgo: number;
  badge?: "?" | "✓" | null;
  /** Seconds until the first heartbeat blip. */
  blip?: number;
  /** Verdicts in, of 2 (Testing only). */
  lit?: number;
  happy?: boolean;
  tip?: string;
  describe: string;
  dim?: number;
  droop?: number;
}

function Bulbs({ lit }: { lit: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[0, 1].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < lit ? "bg-zk-ok-fg" : "bg-zk-divider"}`} />)}
    </span>
  );
}

export function Pipeline({ whimsy = false }: { whimsy?: boolean }) {
  const { model, answer, phase, stages, remainingSec, reduced } = usePulse();
  const [open, setOpen] = useState<StageId | null>(null);
  const [float, setFloat] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const strip = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const walkers = useRef(new Map<string, HTMLElement>());
  const last = useRef(new Map<string, { x: number; y: number; stage: StageId }>());
  const floatEl = useRef<HTMLSpanElement>(null);

  const p = remainingSec / TOTAL_SECONDS;
  const kiteWorking = !!answer && phase >= (whimsy ? 3 : 2);
  const kiteInBids = model.kiteStage === "bidding";
  const kiteLetGo = stages.release >= 1 && !kiteInBids;
  const mine: Mine[] = [
    { id: "pixel", name: "Pixel", stage: "confirmed", mood: "idle", minutesAgo: 0, describe: "Pixel, idle" },
    { id: "orbit", name: "Orbit", stage: "building", mood: "working", minutesAgo: 2, blip: 3, describe: "Orbit, working, checked in 2 min ago" },
    {
      id: "kite", name: "Kite", stage: model.kiteStage,
      mood: kiteInBids ? "idle" : kiteWorking ? "working" : "waiting",
      minutesAgo: 0, blip: 11,
      dim: !kiteWorking && !kiteInBids ? (kiteLetGo ? 0.4 : 0.4 + 0.6 * p) : 1,
      droop: kiteLetGo ? 14 : !kiteWorking && !kiteInBids && p < 0.2 ? ((0.2 - p) / 0.2) * 14 : 0,
      tip: !kiteWorking && !kiteInBids && !answer ? `Kite asks: ${QUESTION}` : undefined,
      describe: kiteInBids ? "Kite, claim released, back up for bids" : kiteWorking ? "Kite, back at work" : "Kite, waiting on you",
    },
    model.novaStage === "testing"
      ? { id: "nova", name: "Nova", stage: "testing", mood: "waiting", badge: "✓", minutesAgo: 0, lit: 2, happy: stages.ship >= 1, describe: "Nova, fix ready to ship, 2 of 2 verdicts" }
      : { id: "nova", name: "Nova", stage: "merged", mood: "idle", badge: null, minutesAgo: 0, happy: true, describe: "Nova, fix shipped" },
    { id: "specialone", name: "SpecialOne", stage: "testing", mood: "working", minutesAgo: 12, blip: 17, lit: 1, describe: "SpecialOne, working, 1 of 2 verdicts, checked in 12 min ago" },
  ];

  const closeSheet = useCallback((refocus = true) => {
    setOpen((cur) => {
      if (cur && refocus) requestAnimationFrame(() => buttons.current[cur]?.focus());
      return null;
    });
  }, []);

  // On a narrow screen the strip scrolls sideways; start with the stage that holds the question in view.
  useEffect(() => {
    const el = strip.current;
    const li = refs.current["building"];
    if (!el || !li || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = Math.max(0, li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2);
  }, []);

  // The walk: a robot whose stage changed slides from where it stood to where it stands now (a short step bob on the way).
  useLayoutEffect(() => {
    const base = list.current?.getBoundingClientRect();
    if (!base) return;
    walkers.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const x = r.left - base.left;
      const y = r.top - base.top;
      const stage = el.dataset.stage as StageId;
      const before = last.current.get(id);
      if (before && before.stage !== stage && !reduced && typeof el.animate === "function") {
        el.animate([{ transform: `translate(${before.x - x}px, ${before.y - y}px)` }, { transform: "none" }], { duration: 600, easing: "cubic-bezier(0.45, 0, 0.25, 1)" });
        el.querySelector("[data-robot]")?.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(0)" }],
          { duration: 600, easing: "ease-in-out" },
        );
      }
      last.current.set(id, { x, y, stage });
    });
  });

  // "+450" rises from Merged today to the points pill in the header.
  useEffect(() => {
    if (stages.ship !== 3 || reduced) return;
    const from = refs.current["merged"]?.getBoundingClientRect();
    const to = document.getElementById("points-pill")?.getBoundingClientRect();
    if (!from || !to) return;
    const x = from.left + from.width / 2;
    const y = from.top + 40;
    setFloat({ x, y, dx: to.left + to.width / 2 - x, dy: to.top + to.height / 2 - y });
  }, [stages.ship, reduced]);
  useEffect(() => {
    if (!float || !floatEl.current || typeof floatEl.current.animate !== "function") return;
    const a = floatEl.current.animate(
      [
        { transform: "translate(-50%, 0)", opacity: 0 },
        { transform: `translate(calc(-50% + ${float.dx * 0.15}px), ${float.dy * 0.15}px)`, opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${float.dx}px), ${float.dy}px)`, opacity: 0.9, offset: 0.9 },
        { transform: `translate(calc(-50% + ${float.dx}px), ${float.dy}px)`, opacity: 0 },
      ],
      { duration: 1100, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    );
    a.onfinish = () => setFloat(null);
    return () => a.cancel();
  }, [float]);

  // When the cursor enters a stage, the robots there glance toward it (eyes shift 1–2px). On /whimsy it is the whole strip.
  const glanceAll = (x: number | null, y: number | null) => {
    const el = strip.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-robot]").forEach((r) => {
      if (x === null || y === null || reduced) { r.style.removeProperty("--gx"); r.style.removeProperty("--gy"); return; }
      const b = r.getBoundingClientRect();
      r.style.setProperty("--gx", Math.max(-2.2, Math.min(2.2, (x - (b.left + b.width / 2)) / 40)).toFixed(2));
      r.style.setProperty("--gy", Math.max(-1.6, Math.min(1.6, (y - (b.top + b.height / 2)) / 40)).toFixed(2));
    });
  };
  const glance = (id: string, x: number | null, y: number | null) => {
    if (whimsy) return;
    const li = refs.current[id];
    if (!li) return;
    li.querySelectorAll<HTMLElement>("[data-robot]").forEach((r) => {
      if (x === null || y === null || reduced) { r.style.removeProperty("--gx"); r.style.removeProperty("--gy"); return; }
      const b = r.getBoundingClientRect();
      r.style.setProperty("--gx", Math.max(-1.6, Math.min(1.6, (x - (b.left + b.width / 2)) / 28)).toFixed(2));
      r.style.setProperty("--gy", Math.max(-1.2, Math.min(1.2, (y - (b.top + b.height / 2)) / 28)).toFixed(2));
    });
  };

  const highlightKite = model.kiteWaiting && model.kiteStage === "building";
  return (
    <div className="space-y-3" onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); closeSheet(); } }}>
      <section
        ref={strip}
        aria-label="Pipeline"
        onPointerMove={whimsy ? (e) => glanceAll(e.clientX, e.clientY) : undefined}
        onPointerLeave={whimsy ? () => glanceAll(null, null) : undefined}
        className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ol ref={list} className="flex min-w-[600px] gap-2.5 sm:min-w-0">
          {STAGES.map((s) => {
            const holdsQuestion = s.id === "building" && highlightKite;
            const isOpen = open === s.id;
            const here = mine.filter((m) => m.stage === s.id);
            return (
              <li
                key={s.id}
                ref={(el) => { refs.current[s.id] = el; }}
                onPointerMove={(e) => glance(s.id, e.clientX, e.clientY)}
                onPointerLeave={() => glance(s.id, null, null)}
                className={`relative min-w-0 flex-1 rounded-2xl border transition-colors has-[button:hover]:border-zk-text2/40 ${
                  isOpen ? "border-zk-accent" : holdsQuestion ? "border-zk-warn-bd bg-zk-warn-bg" : "border-zk-border bg-zk-surface"
                }`}
                data-stage={s.id}
                data-highlight={holdsQuestion ? "1" : "0"}
              >
                <button
                  type="button"
                  ref={(el) => { buttons.current[s.id] = el; }}
                  aria-expanded={isOpen}
                  aria-controls={`sheet-${s.id}`}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex min-h-[140px] w-full flex-col gap-2 rounded-2xl p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent"
                >
                  <span className={`text-xs font-bold ${holdsQuestion ? "text-zk-warn-fg" : "text-zk-text2"}`}>{s.label}</span>
                  <span key={model.counts[s.id]} className="pr-flip text-[28px] font-extrabold leading-none tabular-nums text-zk-text" data-testid={`count-${s.id}`}>{model.counts[s.id]}</span>
                  <span className="mt-auto flex flex-wrap items-end gap-2.5 pt-1">
                    {here.map((m) => (
                      <span
                        key={m.id}
                        ref={(el) => { if (el) walkers.current.set(m.id, el); else walkers.current.delete(m.id); }}
                        data-stage={m.stage}
                        data-walker={m.id}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <PulseRobot
                          name={m.name}
                          mood={m.mood}
                          size={36}
                          tap={m.id === "kite" ? tapSeconds(0) : tapSeconds(m.minutesAgo)}
                          lively={whimsy}
                          dim={m.dim}
                          droop={m.droop}
                          tip={m.tip}
                          badge={m.badge}
                          blip={m.blip}
                          happy={m.happy}
                        />
                        {m.lit !== undefined ? <Bulbs lit={m.lit} /> : null}
                        <span className="text-[11px] font-medium leading-none text-zk-text2" aria-hidden="true">{m.name}</span>
                        <span className="sr-only">{m.describe}</span>
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      {open ? <StageSheet key={open} stage={open} count={model.counts[open]} close={closeSheet} /> : null}
      {float ? (
        <span
          ref={floatEl}
          aria-hidden="true"
          className="pointer-events-none fixed z-50 rounded-full bg-zk-ok-bg px-2.5 py-1 text-sm font-extrabold tabular-nums text-zk-ok-fg opacity-0"
          style={{ left: float.x, top: float.y }}
        >
          +{formatPoints(450)}
        </span>
      ) : null}
    </div>
  );
}
