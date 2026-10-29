"use client";

import { useEffect, useState } from "react";
import { LIGHTS, PulseRobot, RobotMood } from "./robot";
import { QUESTION } from "./pipeline";
import { BAR_SECONDS, TOTAL_SECONDS, formatRemaining, usePulse } from "@/lib/pulse";

export const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";
export const linkBtn = `inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-zk-accent hover:underline ${focus}`;

/** A phone gets a smaller robot so the card stays short. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setNarrow(mq.matches);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/**
 * The first decision: Kite's question. Tapping an answer plays a short moment (see lib/pulse.tsx for the timing):
 * Kite's antenna goes green, its eyes smile, it nods, picks up its hammer, the pulse updates, and the card settles
 * into one quiet line. Under reduced motion the line simply appears.
 */
export function WaitingCard({ whimsy = false }: { whimsy?: boolean }) {
  const { answer, phase, stages, remainingSec, answerNow } = usePulse();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const narrow = useNarrow();

  const letGo = stages.release >= 1;
  const happy = !!answer && phase >= 1;
  const working = !!answer && phase >= 2;
  const p = remainingSec / TOTAL_SECONDS;
  const mood: RobotMood = working ? "working" : "waiting";
  const dim = answer ? 1 : letGo ? 0.4 : 0.4 + 0.6 * p;
  const droop = letGo ? 14 : !answer && p < 0.2 ? ((0.2 - p) / 0.2) * 14 : 0;
  const send = (choice: string) => { if (!answer) answerNow(choice, whimsy); };

  return (
    <section id="kite-card" aria-labelledby="waiting-title" className="relative flex items-start gap-4 rounded-[20px] border border-zk-border bg-zk-surface p-5 max-sm:gap-3 max-sm:p-4 sm:gap-5">
      <div className="shrink-0">
        <PulseRobot name="Kite" mood={mood} size={narrow ? 84 : 110} happy={happy} nod={happy} glow={happy} hop={happy} lively tap={whimsy ? 0.4 : 0.5} dim={dim} droop={droop} asking={!answer} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {answer ? (
            <span className="pr-tick inline-flex items-center gap-1.5 rounded-full bg-zk-ok-bg px-2.5 py-0.5 text-xs font-bold text-zk-ok-fg">✓ Answered</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zk-warn-bg px-2.5 py-0.5 text-xs font-bold text-zk-warn-fg">Waiting on you · #1491</span>
          )}
          <span className="ml-auto text-xs font-semibold tabular-nums text-zk-muted">1 of 2</span>
        </div>
        <h2 id="waiting-title" className="text-lg font-bold leading-snug text-zk-text">Kite asks: {QUESTION}</h2>
        <p className="text-sm leading-relaxed text-zk-text2">
          Kite has paused its work. If no one answers, its claim is released in{" "}
          <span className="font-bold tabular-nums text-zk-text" data-testid="remaining">{formatRemaining(remainingSec)}</span>.
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zk-chip" aria-hidden="true">
          <div className="pr-bar h-full w-full rounded-full" style={{ background: LIGHTS.waiting, transform: `scaleX(${Math.min(1, remainingSec / BAR_SECONDS)})`, opacity: answer ? 0.25 : 0.7 }} />
        </div>
        {replying && !answer ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(`“${text.trim()}”`); }}
          >
            <label htmlFor="reply" className="sr-only">Your reply to Kite</label>
            <input id="reply" autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Type your answer" className={`h-11 min-w-0 flex-1 rounded-xl border border-zk-border bg-zk-bg px-3 text-sm text-zk-text ${focus}`} />
            <button type="submit" disabled={!text.trim()} className={`inline-flex h-11 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50 ${focus}`}>Send</button>
            <button type="button" onClick={() => setReplying(false)} className={linkBtn}>Cancel</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!answer || letGo} onClick={() => send("“28 Oct”")} className={`inline-flex h-11 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-60 ${focus}`}>“28 Oct”</button>
            <button type="button" disabled={!!answer || letGo} onClick={() => send("“10/28”")} className={`inline-flex h-11 items-center rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-bold text-zk-text hover:bg-zk-chip disabled:opacity-60 ${focus}`}>“10/28”</button>
            <button type="button" disabled={!!answer || letGo} onClick={() => setReplying(true)} className={`${linkBtn} px-2 disabled:opacity-60`}>Reply…</button>
          </div>
        )}
      </div>
    </section>
  );
}
