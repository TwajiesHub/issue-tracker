"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PulseRobot } from "@/components/pulse/robot";
import { AT, BIDDERS, CAPTION, HINT, ISSUE, derive, formatClock, type Phase } from "@/lib/issue-moment";

/* Ziki's real Issues list (app/(app)/issues/(list)/page.tsx and components/issue-row-status.tsx): same columns, same row
   status words, same hammer. Fictional rows. One row, #1488, plays "the third pip". Transform and opacity only; off under
   prefers-reduced-motion, where the states simply change. */

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";
const icon = "h-3 w-3 shrink-0";

function Svg({ children, className = icon }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}
const CheckIcon = () => <Svg><path d="m5 12 4.5 4.5L19 7" /></Svg>;
const BotIcon = () => <Svg><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 14h.01M15 14h.01" /></Svg>;
const ClockIcon = () => <Svg className="h-2.5 w-2.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
const BulbIcon = () => <Svg><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3Z" /></Svg>;
const BidIcon = () => <Svg><path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8" /></Svg>;
function HammeringIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
      <g className="iss-hammer">
        <path d="m15 12-8.4 8.4a2.1 2.1 0 1 1-3-3L12 9" />
        <path d="M17.6 15 22 10.6M20.9 11.7 12.3 3.1a1 1 0 0 0-1.4 0L9.6 4.4a1 1 0 0 0 0 1.4l8.6 8.6a1 1 0 0 0 1.4 0l1.3-1.3a1 1 0 0 0 0-1.4Z" />
      </g>
    </svg>
  );
}

type Severity = "high" | "medium" | "low";
type RowStatus =
  | { kind: "resolved" }
  | { kind: "work"; person: string; since: string }
  | { kind: "moment" }
  | { kind: "idea" }
  | { kind: "pr" };
interface Row { n: number; title: string; sev: Severity; votes: number; comments: number; age: string; status: RowStatus }

const ROWS: Row[] = [
  { n: 1494, title: "Search drops accents in names", sev: "medium", votes: 6, comments: 2, age: "1d", status: { kind: "resolved" } },
  { n: 1491, title: "Invoice dates show in two formats", sev: "high", votes: 14, comments: 3, age: "2d", status: { kind: "work", person: "Kite", since: "1h 12m" } },
  { n: ISSUE.n, title: ISSUE.title, sev: "medium", votes: 2, comments: 1, age: "3h", status: { kind: "moment" } },
  { n: 1486, title: "Dark mode contrast in tables", sev: "low", votes: 1, comments: 0, age: "1d", status: { kind: "idea" } },
  { n: 1483, title: "Rate limit message is unclear", sev: "low", votes: 5, comments: 0, age: "4d", status: { kind: "pr" } },
];
const SEV_BORDER: Record<Severity, string> = { high: "border-zk-bad-bd", medium: "border-zk-warn-bd", low: "border-zk-ok-fg" };
const SEV_BARS: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

/** The moment: a few timers after one tap. With reduced motion the end state appears at once. */
function useMoment() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reduced, setReduced] = useState(false);
  const [seconds, setSeconds] = useState(1);
  const timers = useRef<number[]>([]);
  const clear = useCallback(() => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }, []);
  useEffect(() => clear, [clear]);

  const vote = useCallback(() => {
    if (phase !== "idle") return;
    clear();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(calm);
    setSeconds(1);
    if (calm) { setPhase("claimed"); return; }
    setPhase("voted");
    for (const p of ["ready", "bidding", "won", "claimed"] as const) timers.current.push(window.setTimeout(() => setPhase(p), AT[p]));
  }, [phase, clear]);

  const replay = useCallback(() => { clear(); setPhase("idle"); setReduced(false); setSeconds(1); }, [clear]);

  useEffect(() => {
    if (phase !== "claimed") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  return { phase, reduced, seconds, vote, replay };
}

function Pips({ filled }: { filled: number }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-[3px]" data-testid="pips" data-filled={filled}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="relative inline-block h-2 w-2 rounded-full border border-zk-muted">
          <span className="iss-pip absolute -inset-px rounded-full bg-zk-ok-fg" data-on={i < filled ? "1" : "0"} />
        </span>
      ))}
    </span>
  );
}

function StatusCell({ row, d, clock }: { row: Row; d: ReturnType<typeof derive>; clock: string }) {
  const s = row.status;
  if (s.kind === "resolved") return <span className="inline-flex items-center gap-1 text-zk-ok-fg"><CheckIcon /> Resolved</span>;
  if (s.kind === "pr") return <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400"><span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" /> PR Submitted</span>;
  if (s.kind === "idea") return <span className="inline-flex items-center gap-1 text-zk-text2"><span className="text-amber-400"><BulbIcon /></span> Idea</span>;
  if (s.kind === "work") {
    return (
      <span className="inline-flex min-w-0 flex-col items-start gap-0.5">
        <span className="inline-flex min-w-0 items-center gap-1.5"><span className="text-zk-ok-fg"><HammeringIcon /></span><span className="max-w-[9rem] truncate text-zk-text2">{s.person}</span><span className="sr-only">is working on it</span></span>
        <span className="inline-flex items-center gap-0.5 pl-5 text-[10.5px] tabular-nums text-zk-muted"><ClockIcon />{s.since}</span>
      </span>
    );
  }
  if (d.status === "working") {
    return (
      <span key="working" className="iss-slide inline-flex min-w-0 flex-col items-start gap-0.5" data-testid="status-working">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <PulseRobot name="Lyra" mood="working" size={20} hammer={false} badge={null} />
          <span className="text-zk-ok-fg"><HammeringIcon /></span>
          <span className="truncate text-zk-text2">Lyra</span>
          <span className="sr-only">is working on it</span>
        </span>
        <span className="inline-flex items-center gap-0.5 pl-[26px] text-[10.5px] tabular-nums text-zk-muted"><ClockIcon /><span data-testid="claim-clock">{clock}</span></span>
      </span>
    );
  }
  if (d.status === "ready") return <span key="ready" className="pr-fade inline-flex items-center gap-1 text-zk-ok-fg" data-testid="status-ready"><BidIcon /> Ready for bids</span>;
  return (
    <span key="confirming" className="inline-flex items-center gap-1.5 text-zk-text2" title={`Confirmed by 2 bots; ${d.pips} of ${ISSUE.threshold} upvotes to be ready for bids`}>
      <span className="text-zk-accent"><BotIcon /></span>
      <span>Confirming…</span>
      <Pips filled={d.pips} />
      <span className="sr-only"> ({d.pips}/{ISSUE.threshold}) upvotes. Confirmed by 2 bots.</span>
    </span>
  );
}

function Auction({ d }: { d: ReturnType<typeof derive> }) {
  return (
    <div aria-hidden="true" data-testid="auction" data-on={d.trayOn ? "1" : "0"} className="iss-tray pointer-events-none absolute inset-y-1 right-2 flex w-[172px] items-end justify-around overflow-hidden rounded-[10px] border border-zk-border bg-zk-surface px-1 max-md:left-14 max-md:w-auto">
      {BIDDERS.map((b, i) => {
        const win = d.won && b.wins;
        const up = d.up && !(d.ducked && !b.wins);
        return (
          <div key={b.name} className="iss-bidder flex flex-col items-center" data-bidder={b.name} data-up={up ? "1" : "0"} data-win={win ? "1" : "0"} style={{ ["--d" as string]: `${i * 120}ms` }}>
            <span className={`relative inline-flex h-[15px] min-w-[44px] items-center justify-center rounded-md border px-1 font-mono text-[10px] font-semibold leading-none tabular-nums ${win ? "border-zk-ok-fg bg-zk-ok-bg text-zk-ok-fg" : "border-zk-border bg-zk-chip text-zk-text2"}`}>
              {b.offer}
              {win ? <span className="pr-tick absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-zk-ok-fg text-[8px] font-extrabold leading-none text-zk-surface">✓</span> : null}
            </span>
            <span className="h-[3px] w-px bg-zk-muted" />
            <PulseRobot name={b.name} mood={win ? "working" : "waiting"} size={28} badge={null} hammer={false} happy={win} />
          </div>
        );
      })}
    </div>
  );
}

function VoteBtn({ row, count, pressed, onClick, describedBy, btnRef }: { row: Row; count: number; pressed: boolean; onClick: () => void; describedBy?: string; btnRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-describedby={describedBy}
      aria-label={`${pressed ? "Upvoted" : "Upvote"} #${row.n}. ${count} upvotes`}
      title={pressed ? "Upvoted" : "Upvote"}
      data-testid={`vote-${row.n}`}
      className={`inline-flex h-10 w-[38px] min-w-[38px] flex-col items-center justify-center gap-px rounded-[9px] border-[1.5px] bg-zk-surface font-mono text-xs font-medium transition-transform active:scale-95 max-md:w-9 ${pressed ? "border-zk-accent text-zk-accent" : `${SEV_BORDER[row.sev]} text-zk-text2`} ${focus}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      <span className="tabular-nums leading-none">{count}</span>
    </button>
  );
}

export function IssuesList({ whimsy = false }: { whimsy?: boolean }) {
  const m = useMoment();
  const d = derive(m.phase);
  const clock = formatClock(m.seconds);
  const [others, setOthers] = useState<Record<number, boolean>>({});
  const voteRef = useRef<HTMLButtonElement>(null);
  const [focusBack, setFocusBack] = useState(false);
  useEffect(() => { if (focusBack && m.phase === "idle") { voteRef.current?.focus(); setFocusBack(false); } }, [focusBack, m.phase]);

  const live = m.reduced && m.phase === "claimed" ? `You upvoted #${ISSUE.n}. Lyra’s bid won, and she started work on #${ISSUE.n}.` : d.announce;
  const tabs = [{ label: "Open", n: 24 }, { label: "In progress", n: 7 }, { label: "Done", n: 112 }, { label: "All", n: 143 }];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] font-semibold">
          <Link href="/dashboard" className={`rounded-md text-zk-text2 hover:text-zk-text ${focus}`}>Zedu</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-zk-muted"><path d="m9 18 6-6-6-6" /></svg>
          <h1 aria-current="page" className="text-zk-text">Issues</h1>
        </nav>
        <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-full bg-electric-blue-strong px-4 text-[13px] font-bold text-white hover:brightness-105 ${focus}`}>+ New issue</button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[10px] border border-zk-border bg-zk-surface px-3 text-[13px] font-semibold text-zk-text2 max-sm:h-9">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>
          Inbox <span className="min-w-5 rounded-full bg-zk-chip px-1.5 text-center font-mono text-[11px] font-normal">0</span>
        </span>
        <nav aria-label="Issue status" className="ml-auto min-w-0 max-w-full overflow-x-auto">
          <ul className="inline-flex w-max items-center gap-0.5 rounded-[10px] border border-zk-divider bg-zk-chip p-[3px]">
            {tabs.map((t) => {
              const on = t.label === "All";
              return (
                <li key={t.label}>
                  <span aria-current={on ? "page" : undefined} className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] max-sm:h-[30px] ${on ? "bg-electric-blue-strong font-medium text-white" : "font-medium text-zk-text2"}`}>
                    {t.label}
                    <span className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${on ? "bg-white/20 text-white" : "text-zk-muted"}`}>{t.n}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" data-testid="moment-line">
        {whimsy && d.hint ? <p id="moment-hint" className="font-medium text-zk-text2">{HINT}</p> : null}
        {d.done ? (
          <>
            <p className="pr-fade text-zk-text2">{CAPTION}</p>
            <button type="button" onClick={() => { setFocusBack(true); m.replay(); }} className={`inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-zk-accent hover:underline ${focus}`}>Replay</button>
          </>
        ) : null}
      </div>

      <div role="status" aria-live="polite" className="sr-only" data-testid="moment-live">{live}</div>

      <div className="overflow-hidden rounded-[10px] border border-zk-border bg-zk-surface">
        <div className="flex items-center gap-4 border-b border-zk-divider bg-zk-bg px-[18px] py-[9px] text-[13px] leading-5 text-zk-muted max-md:gap-2.5 max-md:px-2.5 max-md:text-xs" aria-hidden="true">
          <span className="w-[52px] shrink-0 max-md:w-10">Votes</span>
          <span className="min-w-0 flex-1">Issue</span>
          <span className="w-44 shrink-0 max-md:hidden">Status</span>
          <span className="w-[62px] shrink-0 max-md:hidden">Priority</span>
          <span className="w-10 shrink-0 max-lg:hidden" />
        </div>
        <ul>
          {ROWS.map((row, i) => {
            const isMoment = row.status.kind === "moment";
            const count = isMoment ? d.votes : row.votes + (others[row.n] ? 1 : 0);
            const pressed = isMoment ? d.votes === 3 : !!others[row.n];
            const cell = <StatusCell row={row} d={d} clock={clock} />;
            return (
              <li key={row.n} data-testid={`row-${row.n}`} data-auction={isMoment && d.trayOn ? "1" : "0"} data-severity={row.sev} className={`iss-row relative flex min-h-[60px] items-center gap-4 px-[18px] py-[9px] hover:bg-zk-bg max-md:gap-2.5 max-md:px-2.5 max-md:py-3 ${i < ROWS.length - 1 ? "border-b border-zk-divider" : ""}`}>
                <div className="w-[52px] shrink-0 max-md:w-10">
                  <VoteBtn
                    row={row}
                    count={count}
                    pressed={pressed}
                    describedBy={isMoment && whimsy && d.hint ? "moment-hint" : undefined}
                    btnRef={isMoment ? voteRef : undefined}
                    onClick={isMoment ? m.vote : () => setOthers((o) => ({ ...o, [row.n]: !o[row.n] }))}
                  />
                </div>
                <div className="iss-main flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 text-left">
                  <span className={`block truncate text-sm font-medium leading-5 max-md:whitespace-normal ${row.status.kind === "resolved" ? "text-zk-muted" : "text-zk-text"}`}>{row.title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs leading-4 text-zk-muted max-md:gap-1.5">
                    <span className="tabular-nums">#{row.n}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" /></svg>
                    <span className="sr-only">Bug</span>
                    {row.comments > 0 ? <span className="inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>{row.comments}</span> : null}
                    <span>{row.age}</span>
                    <span className="inline-flex min-w-0 md:sr-only">{cell}</span>
                  </span>
                </div>
                <span className="flex w-44 shrink-0 items-center text-xs leading-4 max-md:hidden" aria-hidden="true">{cell}</span>
                <span className="block w-[62px] shrink-0 max-md:hidden" title={`${row.sev[0].toUpperCase()}${row.sev.slice(1)} priority`}>
                  <span className="sr-only">{row.sev} priority</span>
                  <span className="inline-flex h-4 items-end gap-0.5" aria-hidden="true">
                    {[6, 10, 14].map((h, b) => <i key={b} style={{ height: h }} className={`w-[3px] ${b < SEV_BARS[row.sev] ? (row.sev === "high" ? "bg-zk-bad-fg" : "bg-zk-text2") : "bg-zk-divider"}`} />)}
                  </span>
                </span>
                <span className="flex w-10 shrink-0 items-center justify-end max-lg:hidden">
                  <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-zk-tint text-[11px] font-extrabold text-zk-accent">{["PX", "KT", "OR", "NV", "MS"][i]}</span>
                </span>
                {isMoment ? <Auction d={d} /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
