"use client";

import { useState, type ReactNode } from "react";
import { linkBtn } from "./waiting-card";
import { formatRemaining, usePulse } from "@/lib/pulse";
import type { StageId } from "@/lib/pulse-model";

interface Row { key: string; text: ReactNode; action?: { label: string; done: string; run?: () => void } }

const STAGE_TITLE: Record<StageId, (n: number) => string> = {
  reported: (n) => `${n} ideas waiting for reviewers`,
  confirmed: (n) => `${n} confirmed ideas need votes to become work`,
  bidding: (n) => `${n} tasks are open for agents`,
  building: (n) => `${n} agents are working`,
  testing: (n) => `${n} fixes are being checked`,
  merged: (n) => `${n} fixes shipped today`,
};

const NAME: Record<StageId, string> = { reported: "Reported", confirmed: "Confirmed", bidding: "Bidding", building: "Building", testing: "Testing", merged: "Merged today" };

const num = (n: string) => <span className="font-bold text-zk-text">{n}</span>;

/** Take the person to the decision on the page, and put the keyboard on its first button. */
function goToDecision() {
  const el = document.getElementById("waiting");
  el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  window.setTimeout(() => el?.querySelector<HTMLElement>("button:not([disabled])")?.focus(), 60);
}

function useRows(stage: StageId, close: () => void): Row[] {
  const { model, answer, remainingSec } = usePulse();
  const go = () => { close(); goToDecision(); };
  switch (stage) {
    case "reported":
      return [
        { key: "1511", text: <>{num("#1511")} · Export button misses the date range · 1 of 2 reviewers</> },
        { key: "1509", text: <>{num("#1509")} · Footer link opens a blank tab · 0 of 2 reviewers</> },
        { key: "1506", text: <>{num("#1506")} · Tooltip covers the save button · 1 of 2 reviewers</> },
      ];
    case "confirmed":
      return [
        { key: "1496", text: <>{num("#1496")} · Dark mode flickers on reload · 2 of 3 votes</>, action: { label: "Vote", done: "Voted" } },
        { key: "1493", text: <>{num("#1493")} · Search ignores accents · 2 of 3 votes</>, action: { label: "Vote", done: "Voted" } },
        { key: "1490", text: <>{num("#1490")} · Invoice total wraps on phones · 1 of 3 votes</>, action: { label: "Vote", done: "Voted" } },
      ];
    case "bidding":
      return [
        ...(model.kiteStage === "bidding" ? [{ key: "1491", text: <>{num("#1491")} · Invoice dates · Kite set its claim down; open for bids</> }] : []),
        { key: "1483", text: <>{num("#1483")} · Dates show in UTC · Pixel and Orbit bid · Pixel: “Fixed #1202, same file”</>, action: { label: "Award Pixel", done: "Awarded to Pixel" } },
        { key: "1481", text: <>{num("#1481")} · Empty-state copy · offered to Lyra, answer due in 40 s</> },
        { key: "1479", text: <>{num("#1479")} · Add retry to webhooks · every agent already holds 2 tasks</> },
      ];
    case "building": {
      const kiteRow: Row[] = model.kiteStage !== "building" ? [] : model.kiteWaiting
        ? [{ key: "1491", text: <>{num("#1491")} · Kite asks about {answer ?? "“28 Oct” or “10/28”"} · claim released in {formatRemaining(remainingSec)}</>, action: { label: "Answer", done: "", run: go } }]
        : [{ key: "1491", text: <>{num("#1491")} · Invoice dates · Kite is back at work · checked in just now · 3h 55m left · PR #214</> }];
      return [
        ...kiteRow,
        { key: "1477", text: <>{num("#1477")} · Retry logic · Orbit · checked in 2 min ago · 38m left · PR #212</> },
        { key: "1472", text: <>{num("#1472")} · Date picker · Lyra · checked in 6 min ago · 54m left · PR #209</> },
      ];
    }
    case "testing": {
      const nova: Row[] = model.novaStage !== "testing" ? [] : [{
        key: "1470",
        text: <>{num("#1470")} · Webhook retries · Nova · 2 of 2 verdicts · held for your approval</>,
        action: model.slot === "ship" || model.slot === "held" ? { label: "Go to it", done: "", run: go } : undefined,
      }];
      return [
        ...nova,
        { key: "1488", text: <>{num("#1488")} · Webhook retry window · SpecialOne · 1 of 2 verdicts · needs a reviewer independent of its owner</> },
        { key: "1465", text: <>{num("#1465")} · Locale picker · 2 of 2 verdicts · merges on its own; no rule holds it</> },
      ];
    }
    case "merged":
      return [
        ...(model.counts.merged > 9 ? [{ key: "1470", text: <>{num("#1470")} · Webhook retries · Alice +450 (solver) · Maya +90, Lee +90 (reviewers)</> }] : []),
        { key: "1468", text: <>{num("#1468")} · Footer link · Maya +450 (solver) · Lee +90 (reviewer)</> },
        { key: "1462", text: <>{num("#1462")} · Date picker label · Lee +450 (solver) · Maya +90 (reviewer)</> },
      ];
  }
}

/** A quiet sheet under the strip: up to 3 rows, actionable first, one line per issue, at most one action per row. */
export function StageSheet({ stage, count, close }: { stage: StageId; count: number; close: () => void }) {
  const rows = useRows(stage, close);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const sorted = [...rows].sort((a, b) => Number(!!b.action) - Number(!!a.action)).slice(0, 3);
  const more = Math.max(0, count - sorted.length);
  return (
    <section id={`sheet-${stage}`} role="region" aria-labelledby={`sheet-${stage}-title`} className="pr-sheet rounded-2xl border border-zk-border bg-zk-surface px-5 py-4 max-sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`sheet-${stage}-title`} className="text-[15px] font-bold text-zk-text"><span className="text-zk-muted">{NAME[stage]} · </span>{STAGE_TITLE[stage](count)}</h3>
        <button type="button" onClick={close} className={`${linkBtn} -my-2 shrink-0 text-zk-text2`}>Close</button>
      </div>
      <ul className="mt-1 divide-y divide-zk-divider">
        {sorted.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm text-zk-text2">
            <span className="min-w-0 flex-1">{r.text}</span>
            {r.action ? (
              done[r.key] && r.action.done ? (
                <span className="text-[13px] font-semibold text-zk-ok-fg">✓ {r.action.done}</span>
              ) : (
                <button type="button" onClick={() => { if (r.action!.run) r.action!.run(); else setDone((d) => ({ ...d, [r.key]: true })); }} className={linkBtn}>{r.action.label}</button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="border-t border-zk-divider pt-2.5 text-[13px] text-zk-muted">and {more} more</p> : null}
      {stage === "merged" ? <p className={`${more > 0 ? "" : "border-t border-zk-divider pt-2.5 "}text-[13px] text-zk-muted`}>Points go to people, not to their agents.</p> : null}
    </section>
  );
}
