"use client";

import { useEffect, useRef, useState } from "react";
import { Pipeline } from "./pipeline";
import { DecisionSlot } from "./decision-slot";
import { usePulse } from "@/lib/pulse";
import { WEEK_GOAL, formatPoints } from "@/lib/pulse-model";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";
const AMBER = "#F59E0B";
const GREEN = "#22C55E";

function Dot({ color, className = "" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}

/** The pulse: what is moving, what waits on you, what is stuck. */
function PulseLine() {
  const { numbers } = usePulse();
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-zk-text" aria-label={`${numbers.moving} moving, ${numbers.waiting} waiting on you, ${numbers.stuck} stuck`}>
      <span className="inline-flex items-center gap-2"><Dot color={GREEN} /><span key={numbers.moving} className="pr-flip font-bold tabular-nums">{numbers.moving}</span> moving</span>
      <span className="inline-flex items-center gap-2"><Dot color={AMBER} /><span key={numbers.waiting} className="pr-flip font-bold tabular-nums">{numbers.waiting}</span> waiting on you</span>
      <span className="inline-flex items-center gap-2"><Dot color="var(--zk-muted)" /><span className="font-bold tabular-nums">{numbers.stuck}</span> stuck</span>
    </p>
  );
}

function Hint() {
  const { model } = usePulse();
  const text = model.kiteWaiting ? "Kite is waiting on you. Tap an answer and watch." : model.shipWaiting ? "Kite is back at work. One more thing is ready for you." : "Everything is moving.";
  return <p className="text-[15px] font-semibold text-zk-text2">{text}</p>;
}

/** One quiet line for where the crew is heading, with a thin bar for how much is done. */
function GoalLine() {
  const { model } = usePulse();
  const g = model.goal;
  return (
    <div className="space-y-1.5" aria-label="Goal progress">
      <p className="text-[15px] text-zk-text2">
        <span className="font-semibold text-zk-text">Goal: {GOAL_TITLE}</span> · <span key={g.done} className="pr-flip inline-block font-semibold tabular-nums text-zk-text">{g.done}</span> of <span className="tabular-nums">{g.total}</span> done · <span key={g.spent} className="pr-flip inline-block tabular-nums">{formatPoints(g.spent)}</span> of <span className="tabular-nums">{formatPoints(g.pool)}</span> pts spent
      </p>
      <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-zk-chip" role="progressbar" aria-valuemin={0} aria-valuemax={g.total} aria-valuenow={g.done} aria-label={`${g.done} of ${g.total} issues done`}>
        <div className="pr-fill h-full w-full rounded-full bg-zk-accent" style={{ transform: `scaleX(${g.done / g.total})` }} />
      </div>
    </div>
  );
}

const GOAL_TITLE = "New onboarding";

const STUCK = [
  { id: "#1488", why: "1 of 2 test verdicts; no free reviewer has picked it up", who: "Reviewer agents" },
  { id: "#1479", why: "open for bids, but every contributor agent already has 2 tasks", who: "Contributor agents" },
];

function Stuck() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#stuck") {
        setOpen(true);
        ref.current?.scrollIntoView({ block: "center" });
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  return (
    <section id="stuck" ref={ref} aria-label="Stuck issues" className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-zk-text2">
        <Dot color="var(--zk-muted)" />
        <span><span className="font-semibold tabular-nums text-zk-text">2</span> issues are stuck waiting on other agents.</span>
        <button type="button" aria-expanded={open} aria-controls="stuck-panel" onClick={() => setOpen((v) => !v)} className={`inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-zk-accent hover:underline ${focus}`}>
          {open ? "Hide" : "See why →"}
        </button>
      </p>
      {open ? (
        <ul id="stuck-panel" className="pr-fade divide-y divide-zk-divider rounded-[20px] border border-zk-border bg-zk-surface px-5">
          {STUCK.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 text-sm">
              <span className="min-w-0 flex-1 text-zk-text"><span className="font-bold">{s.id}</span> · {s.why}</span>
              <span className="rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-bold text-zk-text2">Waiting on {s.who.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

const STATS_AFTER = [
  { label: "Assigned to me", value: "12", chip: "2", tone: "bg-zk-bad-bg text-zk-bad-fg", note: "high priority" },
  { label: "Resolved", value: "9", chip: "75%", tone: "bg-zk-chip text-zk-text2", note: "of issues assigned to me" },
];

export function PulseDashboard({ whimsy = false }: { whimsy?: boolean }) {
  const { model } = usePulse();
  const reached = model.weekPoints >= WEEK_GOAL;
  const STATS = [
    {
      label: "Points this week", value: formatPoints(model.weekPoints), note: "500 required this week",
      chip: reached ? "Goal reached" : `${WEEK_GOAL - model.weekPoints} to go`,
      tone: reached ? "bg-zk-ok-bg text-zk-ok-fg" : "bg-zk-tint text-zk-accent",
    },
    ...STATS_AFTER,
  ];
  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-1.5">
        <p className="text-sm text-zk-muted">Good evening, Alice</p>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text max-sm:text-2xl">Your work right now</h1>
        {whimsy ? <Hint /> : null}
        <PulseLine />
        <GoalLine />
      </div>
      <div className="space-y-4">
        <Pipeline whimsy={whimsy} />
        <DecisionSlot whimsy={whimsy} />
      </div>
      <Stuck />
      <div aria-label="Workspace summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <article key={s.label} className="flex flex-col gap-3 rounded-[20px] border border-zk-border bg-zk-surface p-5">
            <span className="text-sm font-bold text-zk-text">{s.label}</span>
            <p key={s.value} className="pr-flip text-[26px] font-extrabold leading-none tabular-nums text-zk-text">{s.value}</p>
            <div className="flex items-center gap-2 text-[13px] text-zk-muted">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.tone}`}>{s.chip}</span>
              <span>{s.note}</span>
            </div>
          </article>
        ))}
      </div>
      <p className="text-[13px] leading-relaxed text-zk-muted">
        Your agents move work along on their own. Questions, product-direction changes and merges your project’s rules hold for approval wait for you.
      </p>
    </div>
  );
}
