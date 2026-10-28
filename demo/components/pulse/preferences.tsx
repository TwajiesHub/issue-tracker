"use client";

import Link from "next/link";
import { PREF_LABELS, usePulse, type PrefKey } from "@/lib/pulse";
import { TodayNote } from "./note";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";

function Group({
  title, hint, keys, to, children,
}: { title: string; hint: string; keys: PrefKey[]; to: "right" | "daily"; children?: React.ReactNode }) {
  const { move } = usePulse();
  const target = to === "right" ? "daily" : "right";
  const targetLabel = target === "daily" ? "my daily note" : "right away";
  const control = target === "daily" ? "Let it wait" : "Tell me right away";
  return (
    <section aria-labelledby={`g-${to}`} className="flex flex-col gap-3 rounded-[20px] border border-zk-border bg-zk-surface p-5">
      <div>
        <h3 id={`g-${to}`} className="text-base font-bold text-zk-text">{title}</h3>
        <p className="mt-0.5 text-[13px] text-zk-muted">{hint}</p>
      </div>
      {keys.length ? (
        <ul className="divide-y divide-zk-divider">
          {keys.map((k) => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
              <span className="min-w-0 flex-1 text-[15px] text-zk-text">{PREF_LABELS[k].setting}</span>
              <button
                type="button"
                onClick={() => move(k, target)}
                aria-label={`Move “${PREF_LABELS[k].setting}” to ${targetLabel}`}
                className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md px-1 text-[13px] font-semibold text-zk-accent hover:underline ${focus}`}
              >
                {control}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-zk-muted">{to === "right" ? "Nothing. Everything waits for your note." : "Nothing here yet."}</p>
      )}
      {children}
    </section>
  );
}

export function Preferences() {
  const { rightAway, daily, hour, setHour } = usePulse();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1.5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-zk-muted">
          <span>Settings</span><span aria-hidden="true">›</span><Link href="/settings/preferences" aria-current="page" className="font-semibold text-zk-text">Preferences</Link>
        </nav>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text max-sm:text-2xl">When should Ziki interrupt you?</h1>
        <p className="text-sm text-zk-muted">Only the first group can interrupt you. Everything else waits for one note a day.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Group title="Right away" hint="An agent is paused or something can’t be undone." keys={rightAway} to="right" />
        <Group title="In my daily note" hint="Good to know, never urgent." keys={daily} to="daily">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zk-divider pt-3">
            <label htmlFor="note-hour" className="text-[15px] text-zk-text">Send my note at</label>
            <select
              id="note-hour"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className={`h-10 rounded-xl border border-zk-border bg-zk-surface px-3 text-sm font-medium text-zk-text ${focus}`}
            >
              {[7, 8, 9].map((h) => <option key={h} value={h}>{h}:00 AM</option>)}
            </select>
          </div>
        </Group>
      </div>

      <section aria-labelledby="preview" className="space-y-3">
        <h2 id="preview" className="text-base font-bold text-zk-text">Your note, as it looks now</h2>
        <div className="max-w-md overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface">
          <TodayNote />
        </div>
      </section>
    </div>
  );
}
