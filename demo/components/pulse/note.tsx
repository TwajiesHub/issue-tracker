"use client";

import Link from "next/link";
import { PREF_LABELS, usePulse } from "@/lib/pulse";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";
const AMBER = "#F59E0B";

const hourLabel = (h: number) => `${h}:00 AM`;

/** The daily note: what happened while you were away, and the only things that interrupt you. */
export function TodayNote({ onNavigate }: { onNavigate?: () => void }) {
  const { settled, rightAway, hour } = usePulse();
  const needsYou = settled ? 0 : 1;
  return (
    <div className="flex flex-col gap-3.5 p-4 text-sm text-zk-text">
      <div>
        <h2 className="text-[15px] font-bold">Today’s note · {hourLabel(hour)}</h2>
        <p className="mt-0.5 text-[13px] text-zk-muted">While you were away</p>
      </div>

      <ul className="flex flex-col gap-1.5">
        <li className="flex items-start gap-2.5 rounded-xl px-2.5 py-2">
          <span aria-hidden="true" className="mt-px text-zk-ok-fg">✓</span>
          <span><span className="font-semibold tabular-nums">9</span> fixes merged · <span className="font-semibold tabular-nums">120</span> pts earned</span>
        </li>
        {needsYou ? (
          <li className="flex items-start gap-2.5 rounded-xl border border-zk-warn-bd bg-zk-warn-bg px-2.5 py-2">
            <span aria-hidden="true" className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AMBER }} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold tabular-nums">1</span> needs you: Kite’s date-format question{" "}
              <Link href="/dashboard#waiting" onClick={onNavigate} className={`rounded-md font-bold text-zk-accent hover:underline ${focus}`}>Answer</Link>
            </span>
          </li>
        ) : (
          <li className="flex items-start gap-2.5 rounded-xl px-2.5 py-2">
            <span aria-hidden="true" className="mt-px text-zk-ok-fg">✓</span>
            <span>Kite’s date-format question is answered. <span className="font-semibold tabular-nums">0</span> need you.</span>
          </li>
        )}
        <li className="flex items-start gap-2.5 rounded-xl px-2.5 py-2">
          <span aria-hidden="true" className="mt-px text-zk-muted">○</span>
          <span><span className="font-semibold tabular-nums">2</span> stuck on other agents{" "}
            <Link href="/dashboard#stuck" onClick={onNavigate} className={`rounded-md font-bold text-zk-accent hover:underline ${focus}`}>See why</Link>
          </span>
        </li>
      </ul>

      <div className="border-t border-zk-divider pt-3">
        <p className="text-[13px] font-semibold text-zk-text2">Only these interrupt you:</p>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Things that interrupt you">
          {rightAway.length ? rightAway.map((k) => (
            <li key={k} className="rounded-full bg-zk-chip px-2.5 py-1 text-xs font-semibold text-zk-text2">{PREF_LABELS[k].chip}</li>
          )) : <li className="text-[13px] text-zk-muted">Nothing. Everything waits for this note.</li>}
        </ul>
        <p className="mt-2.5 text-[13px] text-zk-muted">
          Everything else waits for this note.{" "}
          <Link href="/settings/preferences" onClick={onNavigate} className={`rounded-md font-semibold text-zk-accent hover:underline ${focus}`}>Change</Link>
        </p>
      </div>
      <p className="text-xs text-zk-muted">Next note tomorrow at {hourLabel(hour)}</p>
    </div>
  );
}
