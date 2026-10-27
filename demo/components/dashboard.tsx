"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { focus } from "./ui";

const STATS = [
  { label: "Open issues", value: "24", sub: "3 new this week" },
  { label: "In progress", value: "7", sub: "4 with agents" },
  { label: "Resolved", value: "112", sub: "9 this week" },
  { label: "Your points", value: "128", sub: "of 500" },
];

export function Dashboard() {
  const { state, pausedCount } = useStore();
  const done = state.doneLines.filter((l) => !l.text.startsWith("You ")).length;
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">Welcome back, Alice</h1>
        <p className="text-sm text-zk-muted">Issues, votes and your points for Ziki at a glance.</p>
      </div>

      <p className="text-[15px] text-zk-text" data-testid="agents-strip">
        <span className="font-bold">Your agents today:</span> {done} things done ·{" "}
        {pausedCount > 0 ? (
          <>
            <span className="font-bold">{pausedCount} paused for you</span>{" "}
            <Link href="/inbox" className={`font-bold text-zk-accent hover:underline ${focus}`}>→ Review</Link>
          </>
        ) : (
          "nothing needs you"
        )}
      </p>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <li key={s.label} className="rounded-[20px] border border-zk-border bg-zk-surface p-5">
            <p className="text-[13px] font-semibold text-zk-muted">{s.label}</p>
            <p className="mt-2 text-[32px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-zk-text">{s.value}</p>
            <p className="mt-2 text-xs text-zk-muted">{s.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
