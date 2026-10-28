"use client";

import { useState } from "react";
import { PulseRobot, RobotMood } from "./robot";
import { QUESTION } from "./pipeline";
import { TOTAL_SECONDS, formatRemaining, usePulse } from "@/lib/pulse";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";

/**
 * The one card that waits on you. Tapping an answer plays a short moment (see lib/pulse.tsx for the timing):
 * Kite's antenna goes green, its eyes smile, it nods, picks up its hammer, the pulse updates, and the card
 * settles into one quiet line. Under reduced motion the line simply appears.
 */
export function WaitingCard({ showReplay = false }: { showReplay?: boolean }) {
  const { answer, phase, remainingSec, answerNow, undo, replay } = usePulse();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");

  const settled = !!answer && phase >= 3;
  const happy = !!answer && phase >= 1;
  const working = !!answer && phase >= 2;
  const p = remainingSec / TOTAL_SECONDS;
  const mood: RobotMood = working ? "working" : "waiting";
  const dim = answer ? 1 : 0.4 + 0.6 * p;
  const droop = !answer && p < 0.2 ? ((0.2 - p) / 0.2) * 14 : 0;

  if (settled) {
    return (
      <section id="waiting" aria-label="Answered" className="pr-fade flex flex-wrap items-center gap-3 rounded-[20px] border border-zk-border bg-zk-surface px-5 py-4">
        <PulseRobot name="Kite" mood="working" size={32} tap={0.5} />
        <p className="min-w-0 flex-1 text-[15px] font-semibold text-zk-text">
          <span className="text-zk-ok-fg">✓</span> Answered. Kite is back at work on #1491.
          <span className="ml-2 text-[13px] font-normal text-zk-muted">You said {answer}.</span>
        </p>
        <button type="button" onClick={undo} className={`inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-zk-accent hover:underline ${focus}`}>Undo</button>
        {showReplay && phase >= 4 ? (
          <button type="button" onClick={replay} className={`inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-zk-accent hover:underline ${focus}`}>Play again</button>
        ) : null}
      </section>
    );
  }

  const send = (choice: string) => { if (!answer) answerNow(choice); };

  return (
    <section id="waiting" aria-labelledby="waiting-title" className="relative flex flex-col gap-4 rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:flex-row sm:items-start sm:gap-5">
      <div className="shrink-0">
        <PulseRobot name="Kite" mood={mood} size={64} happy={happy} nod={happy} glow={happy} tap={0.5} dim={dim} droop={droop} asking={!answer} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {answer ? (
            <span className="pr-tick inline-flex items-center gap-1.5 rounded-full bg-zk-ok-bg px-2.5 py-0.5 text-xs font-bold text-zk-ok-fg">✓ Answered</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zk-warn-bg px-2.5 py-0.5 text-xs font-bold text-zk-warn-fg">Waiting on you · #1491</span>
          )}
        </div>
        <h2 id="waiting-title" className="text-lg font-bold leading-snug text-zk-text">Kite asks: {QUESTION}</h2>
        <p className="text-sm leading-relaxed text-zk-text2">
          Kite has paused its work. If no one answers, its claim is released in{" "}
          <span className="font-bold tabular-nums text-zk-text" data-testid="remaining">{formatRemaining(remainingSec)}</span>.
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zk-chip" aria-hidden="true">
          <div className="pr-bar h-full w-full rounded-full" style={{ background: "#F59E0B", transform: `scaleX(${p})`, opacity: answer ? 0.35 : 1 }} />
        </div>
        {replying && !answer ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(`“${text.trim()}”`); }}
          >
            <label htmlFor="reply" className="sr-only">Your reply to Kite</label>
            <input id="reply" autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Type your answer" className={`h-11 min-w-0 flex-1 rounded-xl border border-zk-border bg-zk-bg px-3 text-sm text-zk-text ${focus}`} />
            <button type="submit" disabled={!text.trim()} className={`inline-flex h-11 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50 ${focus}`}>Send</button>
            <button type="button" onClick={() => setReplying(false)} className={`inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-zk-accent hover:underline ${focus}`}>Cancel</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!answer} onClick={() => send("“28 Oct”")} className={`inline-flex h-11 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-60 ${focus}`}>“28 Oct”</button>
            <button type="button" disabled={!!answer} onClick={() => send("“10/28”")} className={`inline-flex h-11 items-center rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-bold text-zk-text hover:bg-zk-chip disabled:opacity-60 ${focus}`}>“10/28”</button>
            <button type="button" disabled={!!answer} onClick={() => setReplying(true)} className={`inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-zk-accent hover:underline disabled:opacity-60 ${focus}`}>Reply…</button>
          </div>
        )}
      </div>
    </section>
  );
}
