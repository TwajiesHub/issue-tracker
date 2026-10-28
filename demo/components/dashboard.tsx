"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { focus, panel } from "./ui";

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
    <div className="min-w-0 space-y-6">
      <div className="space-y-1.5">
        <h1 className="t-headline text-[28px] leading-tight max-sm:text-2xl">Welcome back, Alice</h1>
        <p className="t-support text-sm font-normal">Issues, votes and your points for Ziki at a glance.</p>
      </div>

      <p className={`${panel} zg-fade t-body px-5 py-4 text-[15px]`} data-testid="agents-strip">
        <span className="font-bold">Your agents today:</span> <span className="tabular-nums">{done}</span> things done ·{" "}
        {pausedCount > 0 ? (
          <>
            <span className="font-bold tabular-nums">{pausedCount} paused for you</span>{" "}
            <Link href="/inbox" className={`rounded-md font-semibold text-zk-accent hover:underline ${focus}`}>→ Review</Link>
          </>
        ) : (
          <span className="t-support font-normal">nothing needs you</span>
        )}
      </p>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <li key={s.label} className={`${panel} p-5`}>
            <p className="t-support text-sm">{s.label}</p>
            <p className="t-headline mt-2 text-[32px] leading-none tabular-nums">{s.value}</p>
            <p className="t-quiet mt-2 text-xs">{s.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
