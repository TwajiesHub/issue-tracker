"use client";

import { useState } from "react";
import { PulseRobot } from "./robot";
import { WaitingCard, focus, linkBtn, useNarrow } from "./waiting-card";
import { usePulse } from "@/lib/pulse";

const line = "pr-fade flex flex-wrap items-center gap-3 rounded-[20px] border border-zk-border bg-zk-surface px-5 py-4 max-sm:px-4";

/** Nova's fix is done and tested, and the project's rules hold the merge for you. */
function ShipCard() {
  const { ship, stages, shipIt, holdShip } = usePulse();
  const [proof, setProof] = useState(false);
  const narrow = useNarrow();
  const shipping = stages.ship >= 1;
  const happy = stages.ship >= 1;
  const btn = "inline-flex h-11 items-center rounded-full px-5 text-sm font-bold disabled:opacity-60";
  return (
    <section id="ship-card" aria-labelledby="ship-title" className="pr-in relative flex items-start gap-4 rounded-[20px] border border-zk-border bg-zk-surface p-5 max-sm:gap-3 max-sm:p-4 sm:gap-5">
      <div className="shrink-0">
        <PulseRobot name="Nova" mood="waiting" badge="✓" size={narrow ? 84 : 110} happy={happy} nod={happy} glow={happy} hop={happy} lively dim={1} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {shipping ? (
            <span className="pr-tick inline-flex items-center gap-1.5 rounded-full bg-zk-ok-bg px-2.5 py-0.5 text-xs font-bold text-zk-ok-fg">✓ Shipped</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zk-warn-bg px-2.5 py-0.5 text-xs font-bold text-zk-warn-fg">Ready to ship · #1470</span>
          )}
          <span className="ml-auto text-xs font-semibold tabular-nums text-zk-muted">2 of 2</span>
        </div>
        <h2 id="ship-title" className="text-lg font-bold leading-snug text-zk-text">Nova’s fix for “Webhook retries can send a duplicate email” is ready to ship</h2>
        <p className="text-sm text-zk-text">CI green · 2 of 2 verdicts · commit <span className="font-mono text-[13px]">a1b2c3d</span></p>
        <p className="-mt-1.5 text-[13px] text-zk-muted">Your project’s rules hold this merge for you.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={shipping} onClick={shipIt} className={`${btn} bg-electric-blue-strong text-white hover:brightness-105 ${focus}`}>Ship it</button>
          <button type="button" disabled={shipping} onClick={holdShip} className={`${btn} border border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip ${focus}`}>Not yet</button>
          <button type="button" aria-expanded={proof} aria-controls="proof" onClick={() => setProof((v) => !v)} className={`${linkBtn} px-2`}>{proof ? "Hide the proof" : "See the proof"}</button>
        </div>
        {proof ? (
          <ul id="proof" className="pr-sheet divide-y divide-zk-divider rounded-xl border border-zk-border text-[13px] text-zk-text2">
            <li className="px-3 py-2"><span className="font-semibold text-zk-text">Checks</span> · build, tests and lint passed on <span className="font-mono">a1b2c3d</span></li>
            <li className="px-3 py-2"><span className="font-semibold text-zk-text">Verdicts</span> · Orbit and Lyra, both independent of Nova’s owner, said good to merge</li>
            <li className="px-3 py-2"><span className="font-semibold text-zk-text">Pull request</span> · <a href="#" onClick={(e) => e.preventDefault()} className={`rounded-md font-semibold text-zk-accent hover:underline ${focus}`}>#212 in zedu/invoices</a></li>
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/** The slot holds one decision at a time. Settled ones become a single quiet line. */
export function DecisionSlot({ whimsy = false }: { whimsy?: boolean }) {
  const { model, ship, answer, undo, replay, shipIt, stages } = usePulse();

  if (model.slot === "caught-up") {
    return (
      <section id="waiting" aria-label="All caught up" className={`${line} pr-in`}>
        <PulseRobot name="Nova" mood="idle" size={32} happy />
        <p className="min-w-0 flex-1 text-[15px] font-semibold text-zk-text"><span className="text-zk-ok-fg">✓</span> You’re all caught up. <span className="font-normal text-zk-text2">Your agents keep going.</span></p>
        {whimsy ? <button type="button" onClick={replay} className={linkBtn}>Play again</button> : null}
      </section>
    );
  }

  return (
    <div id="waiting" className="flex flex-col gap-3">
      {model.kiteLine === "answered" ? (
        <section aria-label="Answered" className={line}>
          <PulseRobot name="Kite" mood="working" size={32} tap={0.5} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-zk-text">
            <span className="text-zk-ok-fg">✓</span> Answered. Kite is back at work on #1491.
            <span className="ml-2 text-[13px] font-normal text-zk-muted">You said {answer}.</span>
          </p>
          {ship === "ready" && stages.ship === 0 ? <button type="button" onClick={undo} className={linkBtn}>Undo</button> : null}
          {whimsy && ship === "ready" ? <button type="button" onClick={replay} className={linkBtn}>Play again</button> : null}
        </section>
      ) : null}
      {model.kiteLine === "released" ? (
        <section aria-label="Released" className={line}>
          <PulseRobot name="Kite" mood="idle" size={32} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-zk-text">Kite’s claim was released. <span className="font-normal text-zk-text2">It’s back up for bids.</span></p>
        </section>
      ) : null}
      {!model.kiteLine && model.slot === "kite" ? <WaitingCard whimsy={whimsy} /> : null}
      {model.slot === "ship" ? <ShipCard /> : null}
      {model.slot === "held" ? (
        <section aria-label="On hold" className={line}>
          <PulseRobot name="Nova" mood="waiting" badge="✓" size={32} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-zk-text">Nova’s fix is on hold. <span className="font-normal text-zk-text2">It waits for you.</span></p>
          <button type="button" onClick={shipIt} className={linkBtn}>Ship it</button>
        </section>
      ) : null}
    </div>
  );
}
