"use client";

import Link from "next/link";
import { useState } from "react";

/* Today's Ziki Dashboard, reproduced from app/(app)/dashboard/page.tsx and components/overview/*
   (stat-cards, assigned-issues-table, points-chart). Same classes, fictional data. The agents strip
   at the bottom of the real page is left out. */

function GoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

const chipClass = { tint: "bg-zk-tint text-zk-accent", ok: "bg-zk-ok-bg text-zk-ok-fg", bad: "bg-zk-bad-bg text-zk-bad-fg", chip: "bg-zk-chip text-zk-text2" } as const;
const STATS: { label: string; value: string; chip: string; tone: keyof typeof chipClass; note: string }[] = [
  { label: "Points", value: "2,340", chip: "120 to go", tone: "tint", note: "500 required this week" },
  { label: "Created by me", value: "18", chip: "+3", tone: "ok", note: "in the last 30 days" },
  { label: "Assigned to me", value: "12", chip: "2", tone: "bad", note: "high priority" },
  { label: "Resolved issues", value: "9", chip: "75%", tone: "chip", note: "of issues assigned to me" },
];

type Issue = { n: number; votes: number; title: string; type: string; sev: "High" | "Medium" | "Low"; status: "Open" | "In progress"; stage: string | null; age: string; comments: number };
const ISSUES: Issue[] = [
  { n: 1491, votes: 14, title: "Invoice dates show in two formats", type: "Bug", sev: "High", status: "In progress", stage: "Ready", age: "2d", comments: 3 },
  { n: 1470, votes: 11, title: "Webhook retries can send a duplicate email", type: "Bug", sev: "Medium", status: "Open", stage: "Ready", age: "3d", comments: 1 },
  { n: 1462, votes: 9, title: "Dark mode text on the agents page is hard to read", type: "Design", sev: "Medium", status: "In progress", stage: null, age: "5d", comments: 0 },
  { n: 1455, votes: 7, title: "Add a keyboard shortcut cheat sheet", type: "Feature", sev: "Low", status: "Open", stage: "Confirmed", age: "6d", comments: 2 },
  { n: 1448, votes: 5, title: "Export points history as CSV", type: "Feature", sev: "Low", status: "Open", stage: "Ready", age: "1w", comments: 0 },
  { n: 1433, votes: 3, title: "Search ignores accents", type: "Bug", sev: "High", status: "Open", stage: "Reported", age: "2w", comments: 4 },
];
const sevTone = {
  High: "bg-zk-bad-bg text-zk-bad-fg border-zk-bad-bd",
  Medium: "bg-zk-warn-bg text-zk-warn-fg border-zk-warn-bd",
  Low: "bg-zk-chip text-zk-text2 border-transparent",
};
const typePath = (t: string) => (t === "Design" ? "M12 3 4 9v12h16V9l-8-6zM9 21v-6h6v6" : "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5");

const WEEKS = [["14 Sep", 420], ["21 Sep", 610], ["28 Sep", 380], ["5 Oct", 540], ["12 Oct", 500], ["19 Oct", 690], ["26 Oct", 380]] as const;
const TARGET = 500;

function Vote({ count }: { count: number }) {
  const [up, setUp] = useState(false);
  const n = count + (up ? 1 : 0);
  return (
    <button
      type="button"
      aria-pressed={up}
      aria-label={up ? `Upvoted, ${n} votes, click to remove your vote` : `Upvote this issue, ${n} votes`}
      onClick={() => setUp((v) => !v)}
      className={`inline-flex h-9 w-[52px] shrink-0 items-center justify-center gap-1 rounded-full border text-[13px] font-bold tabular-nums transition ${up ? "border-electric-blue-strong bg-electric-blue-strong text-white" : "border-zk-border bg-zk-surface text-zk-text hover:border-electric-blue-strong hover:text-zk-accent"}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      {n}
    </button>
  );
}

export function BeforeDashboard() {
  const [range, setRange] = useState("Weekly");
  const max = Math.max(...WEEKS.map((w) => w[1]), TARGET * 1.15);
  const targetPct = Math.round((TARGET / max) * 100);
  const total = WEEKS.reduce((a, w) => a + w[1], 0);
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">Welcome back, Alice</h1>
          <p className="text-sm text-zk-muted">Issues, votes and your points for Ziki at a glance.</p>
        </div>
        <Link href="/issues" className="inline-flex h-[42px] items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-semibold text-zk-text hover:bg-zk-chip">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          New issue
        </Link>
      </div>

      <div aria-label="Workspace summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s, i) => (
          <article
            key={s.label}
            className="overview-stat-card zk-motion group relative flex flex-col gap-[18px] overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface p-[22px] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[#BFD6FB] hover:shadow-[0_18px_40px_rgba(11,23,51,0.10),0_2px_6px_rgba(57,120,246,0.10)] motion-reduce:transform-none motion-reduce:transition-none dark:hover:border-electric-blue-strong dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(57,120,246,0.25)]"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-electric-blue to-sky-tint transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none" />
            <span aria-hidden="true" className="pointer-events-none absolute -right-[60px] -bottom-20 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(143,201,255,0.35),rgba(143,201,255,0)_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none dark:bg-[radial-gradient(circle,rgba(57,120,246,0.30),rgba(57,120,246,0)_70%)]" />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-base font-bold text-zk-text">{s.label}</span>
              <Link href="/issues" aria-label={`Open ${s.label}`} className="zk-motion flex h-[38px] w-[38px] items-center justify-center rounded-full border border-zk-border text-zk-text transition-[background,color,border-color,transform] duration-300 group-hover:rotate-45 group-hover:border-electric-blue-strong group-hover:bg-electric-blue-strong group-hover:text-white motion-reduce:transform-none">
                <GoIcon />
              </Link>
            </div>
            <p className="zk-motion relative text-[30px] font-extrabold leading-none tabular-nums text-zk-text transition-colors duration-300 group-hover:text-zk-accent">{s.value}</p>
            <div className="relative flex items-center gap-2 text-[13px] text-zk-muted">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${chipClass[s.tone]}`}>{s.chip}</span>
              <span>{s.note}</span>
            </div>
          </article>
        ))}
      </div>

      <section aria-labelledby="assigned-issues-heading" className="flex flex-col gap-3.5 rounded-[20px] border border-zk-border bg-zk-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 id="assigned-issues-heading" className="text-lg font-bold text-zk-text">Issues assigned to me</h2>
            <span className="text-[13px] text-zk-muted">6 issues · sorted by top votes</span>
          </div>
          <Link href="/issues" className="inline-flex h-9 items-center rounded-full border border-zk-border bg-zk-surface px-3.5 text-[13px] font-bold text-zk-accent transition hover:bg-zk-tint">View all issues</Link>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="flex items-center gap-4 rounded-full bg-zk-tint px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-zk-accent" role="row">
              <span className="w-[52px]">Votes</span>
              <span className="min-w-0 flex-1">Issue</span>
              <span className="w-[92px]">Type</span>
              <span className="w-24">Priority</span>
              <span className="w-[76px]">Status</span>
              <span className="w-[104px]">Stage</span>
              <span className="w-[84px]">Reported</span>
            </div>
            <ul>
              {ISSUES.map((it, i) => {
                const open = it.status === "Open" || it.status === "In progress";
                return (
                  <li key={it.n} className={`flex items-center gap-4 px-4 py-3.5 ${i < ISSUES.length - 1 ? "border-b border-zk-divider" : ""}`}>
                    <Vote count={it.votes} />
                    <Link href="/issues" className="flex min-w-0 flex-1 items-center gap-3 text-left text-zk-text">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zk-tint text-zk-accent">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={typePath(it.type)} /></svg>
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold leading-snug">{it.title}</span>
                        <span className="flex items-center gap-2 text-xs text-zk-muted">
                          <span>#{it.n}</span>
                          {it.comments > 0 ? <span>{it.comments} comment{it.comments === 1 ? "" : "s"}</span> : null}
                        </span>
                      </span>
                    </Link>
                    <span className="w-[92px] shrink-0 text-[13px] text-zk-text2">{it.type}</span>
                    <span className="w-24 shrink-0"><span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${sevTone[it.sev]}`}>{it.sev}</span></span>
                    <span className="w-[76px] shrink-0">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${open ? "bg-zk-info-bg text-zk-info-fg" : "bg-zk-chip text-zk-text2"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-zk-info-fg" : "bg-zk-muted"}`} aria-hidden="true" />
                        {it.status}
                      </span>
                    </span>
                    <span className="w-[104px] shrink-0">
                      {it.stage ? (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${it.stage === "Reported" ? "bg-zk-chip text-zk-text2" : "bg-zk-ok-bg text-zk-ok-fg"}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                          {it.stage}
                        </span>
                      ) : <span className="text-[13px] text-zk-muted">—</span>}
                    </span>
                    <span className="w-[84px] shrink-0 text-[13px] text-zk-text2">{it.age}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <span className="text-[13px] text-zk-muted">Showing 6 issues</span>
      </section>

      <section aria-label="Your points" className="flex flex-col gap-5 rounded-[20px] border border-zk-border bg-zk-surface p-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-zk-text">Your points</h2>
            <span className="text-[13px] text-zk-muted">Points per week, last 7 weeks</span>
            <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-zk-text2">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-electric-blue-strong" />500 reached</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-tint" />Below 500</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-zk-text opacity-55" aria-hidden="true" />Weekly requirement · 500 pts</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Activity range" className="flex gap-0.5 rounded-full bg-zk-seg p-1">
              {["Daily", "Weekly", "Monthly", "Yearly"].map((r) => (
                <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`min-h-[34px] rounded-full border-0 px-3.5 text-[13px] ${range === r ? "bg-zk-surface font-bold text-zk-text shadow-[0_1px_3px_rgba(21,18,31,0.12)]" : "bg-transparent font-medium text-zk-text2"}`}>{r}</button>
              ))}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[26px] font-extrabold leading-none tabular-nums text-zk-text">{total.toLocaleString("en-US")}</span>
              <span className="text-xs text-zk-muted">pts in this range</span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-3 overflow-x-auto pb-0.5">
          {WEEKS.map(([label, pts], i) => {
            const met = pts >= TARGET;
            const pct = Math.max(6, Math.round((pts / max) * 100));
            return (
              <div key={label} className="flex min-w-9 flex-1 flex-col items-center gap-2">
                <span className="flex min-h-[34px] flex-col items-center justify-end gap-0.5">
                  {pts > TARGET ? <span className="rounded-full bg-zk-ok-bg px-1.5 py-px text-[11px] font-bold text-zk-ok-fg">+{pts - TARGET}</span> : null}
                  <span className="text-xs font-semibold tabular-nums text-zk-text2">{pts}</span>
                </span>
                <div className="relative h-[180px] w-full max-w-12 overflow-hidden rounded-full bg-zk-tint">
                  <div className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: `${pct}%`, background: met ? "#2E6FEF" : "#8FC9FF" }} />
                  <div className="absolute inset-x-0 border-t-2 border-dashed border-zk-text opacity-55" style={{ bottom: `${targetPct}%` }} aria-hidden="true" />
                </div>
                <span className={`whitespace-nowrap text-xs text-zk-muted ${i === WEEKS.length - 1 ? "font-semibold text-zk-text2" : ""}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
