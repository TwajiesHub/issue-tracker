"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAgeLabel, useStore } from "@/lib/store";
import { suggestDelegation } from "@/lib/guard";
import type { Item } from "@/lib/scenario";
import { DecisionPane } from "./decision";
import { BackIcon, PrimaryButton, RiskMark, TextButton, focus } from "./ui";

type Tab = "needs" | "wait" | "done";

function ItemRow({
  item, selected, tab, onOpen, revealed, setRevealed,
}: { item: Item; selected: boolean; tab: Tab; onOpen: () => void; revealed: boolean; setRevealed: (v: boolean) => void }) {
  const { act } = useStore();
  const age = useAgeLabel();
  const touch = useRef<number | null>(null);
  const quick = tab === "wait";
  return (
    <li
      className="group relative"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null || !quick) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (dx < -50) setRevealed(true);
        if (dx > 30) setRevealed(false);
        touch.current = null;
      }}
    >
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={onOpen}
        className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-transform ${focus} ${selected ? "bg-zk-chip" : "hover:bg-zk-chip/60"} ${revealed ? "max-lg:-translate-x-36" : ""}`}
      >
        <span className="mt-[3px]"><RiskMark tier={item.tier === "done" ? "done" : item.kind === "question" ? "wait" : item.tier} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug text-zk-text">
            <span className="font-bold">{item.agent}</span> {item.sentence}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-zk-muted">
            {item.details.map((d, i) => (
              <span key={d}>{i > 0 ? " · " : ""}{/^#/.test(d) ? <span className="font-mono text-[12px]">{d}</span> : d}</span>
            ))}
          </span>
        </span>
        <span className="shrink-0 pt-0.5 text-[13px] tabular-nums text-zk-muted group-hover:max-lg:hidden">{age(item.ageMin)}</span>
      </button>
      {quick ? (
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-zk-chip px-1 group-focus-within:flex group-hover:flex ${revealed ? "flex" : "hidden"}`}>
          <TextButton className="px-2" aria-label={`Approve: ${item.agent} ${item.sentence}`} onClick={() => act.waitApprove(item.id)}>Approve</TextButton>
          <TextButton className="px-2 !text-zk-text2" aria-label={`Skip: ${item.agent} ${item.sentence}`} onClick={() => act.waitSkip(item.id)}>Skip</TextButton>
        </div>
      ) : null}
    </li>
  );
}

function useIsDesktop() {
  return useCallback(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches, []);
}

export function Inbox() {
  const { state, needs, wait, act } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const isDesktop = useIsDesktop();
  const [stopOpen, setStopOpen] = useState(false);
  const [how, setHow] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  const tab: Tab = (["needs", "wait", "done"] as const).find((t) => t === params.get("tab")) ?? "needs";
  const itemParam = params.get("item");
  const openNeeds = needs.filter((i) => i.state !== "restored" && i.state !== "approved" && i.state !== "declined" && i.state !== "answered" && !(i.tier === "done"));
  const list: Item[] = tab === "needs" ? openNeeds : tab === "wait" ? wait : [];
  const doneByAgents = state.doneLines.filter((l) => !l.text.startsWith("You "));
  const counts = { needs: openNeeds.length, wait: wait.length, done: doneByAgents.length };

  const itemFromParam = state.items.find((i) => i.id === itemParam) ?? null;
  const selected = itemFromParam ?? (tab === "done" ? null : list[0] ?? null);

  const go = useCallback((next: { tab?: Tab; item?: string | null }, replace = false) => {
    const sp = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "needs") sp.set("tab", t);
    const it = next.item === undefined ? itemParam : next.item;
    if (it) sp.set("item", it);
    const url = `/inbox${sp.toString() ? `?${sp}` : ""}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }, [router, tab, itemParam]);

  // Keyboard: J/K move, Enter open, S stop and restore (Needs you), A approve (Can wait only), Esc back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      const idx = selected ? list.findIndex((i) => i.id === selected.id) : -1;
      if (k === "j" || k === "k") {
        if (!list.length) return;
        const n = Math.min(list.length - 1, Math.max(0, idx + (k === "j" ? 1 : -1)));
        e.preventDefault();
        go({ item: list[n].id }, isDesktop());
      } else if (k === "enter" && t?.tagName !== "BUTTON" && t?.tagName !== "A") {
        if (selected && !itemParam) { e.preventDefault(); go({ item: selected.id }); }
      } else if (k === "s") {
        if (tab === "needs" && selected?.kind === "paused" && selected.tier === "needs") { e.preventDefault(); setStopOpen(true); }
      } else if (k === "a") {
        if (tab === "wait" && selected && selected.tier === "wait") {
          e.preventDefault();
          const next = list[idx + 1] ?? list[idx - 1];
          act.waitApprove(selected.id);
          go({ item: next && isDesktop() ? next.id : null }, true);
        }
      } else if (k === "escape") {
        if (itemParam) { e.preventDefault(); go({ item: null }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, list, tab, itemParam, go, isDesktop, act]);

  const n = counts.needs;
  const headline = n === 0 ? "All clear." : `${n} ${n === 1 ? "decision needs" : "decisions need"} you.`;
  const showSuggestion = state.suggestion === "open" && suggestDelegation({ category: "docs", approvals: 12, total: 12, brokenPromisesInWindow: 0 }).suggest;

  const tabs: { id: Tab; label: string }[] = [
    { id: "needs", label: "Needs you" }, { id: "wait", label: "Can wait" }, { id: "done", label: "Done by agents" },
  ];

  return (
    <div className="space-y-5">
      <div className={itemParam ? "max-lg:hidden" : ""}>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text max-sm:text-2xl">
          {headline} <span className="font-semibold text-zk-text2">Your agents finished {counts.done} things on their own.</span>
        </h1>
        <TextButton aria-expanded={how} aria-controls="how-it-works" onClick={() => setHow((v) => !v)}>How this works</TextButton>
        {how ? (
          <p id="how-it-works" className="max-w-2xl text-[13px] leading-relaxed text-zk-text2">
            Agents work on their own. When a change doesn’t match what they promised, or breaks a rule you set, it pauses here and nothing runs until you decide. Low-risk changes wait in Can wait. Everything else they did is in Done by agents.
          </p>
        ) : null}
      </div>

      <nav aria-label="Inbox lists" className={`overflow-x-auto ${itemParam ? "max-lg:hidden" : ""}`}>
        <ul className="flex w-max gap-1 border-b border-zk-divider">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => go({ tab: t.id, item: null })}
                  className={`-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] ${focus} ${on ? "border-electric-blue-strong font-semibold text-zk-text" : "border-transparent font-medium text-zk-text2 hover:text-zk-text"}`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${on ? "bg-zk-tint text-zk-accent" : "bg-zk-chip text-zk-muted"}`}>{counts[t.id]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "needs" && n === 0 && !itemFromParam ? (
        <div className="py-16 text-center">
          <p className="text-xl font-extrabold text-zk-text">Nothing needs you.</p>
          <p className="mt-1.5 text-sm text-zk-muted">Your agents finished {counts.done} things today.</p>
          <TextButton className="mt-2" onClick={() => go({ tab: "done", item: null })}>See what they did →</TextButton>
        </div>
      ) : tab === "done" && !itemFromParam ? (
        <div className="max-w-3xl space-y-5">
          {showSuggestion ? (
            <section aria-label="Suggestion" className="space-y-1.5 border-b border-zk-divider pb-5">
              <p className="text-[15px] text-zk-text"><span className="font-bold">Kite kept its promise on all 12 docs changes.</span> Let it just do these and tell you after?</p>
              <div className="flex flex-wrap items-center gap-x-4">
                <PrimaryButton className="!h-10" onClick={() => act.suggestion(true)}>Yes</PrimaryButton>
                <TextButton onClick={() => act.suggestion(false)}>Not now</TextButton>
              </div>
              <p className="text-[13px] text-zk-muted">Scripts, CI, auth and AGENTS.md always need you.</p>
            </section>
          ) : state.suggestion === "accepted" ? (
            <p className="border-b border-zk-divider pb-4 text-sm text-zk-text2">Done. Kite will do docs changes and tell you after. <span className="text-zk-muted">Scripts, CI, auth and AGENTS.md always need you.</span></p>
          ) : null}
          <ul className="divide-y divide-zk-divider">
            {state.doneLines.map((l) => (
              <li key={l.id} className="flex gap-4 py-2.5 text-[15px] text-zk-text">
                <span className="w-11 shrink-0 font-mono text-[13px] leading-[1.6] tabular-nums text-zk-muted">{l.time}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className={itemParam ? "max-lg:hidden" : ""}>
            {list.length ? (
              <ul aria-label={tab === "needs" ? "Needs you" : "Can wait"} className="space-y-0.5">
                {list.map((i) => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    tab={tab}
                    selected={selected?.id === i.id}
                    revealed={revealed === i.id}
                    setRevealed={(v) => setRevealed(v ? i.id : null)}
                    onOpen={() => go({ item: i.id }, isDesktop())}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-3 py-6 text-sm text-zk-muted">Nothing here.</p>
            )}
            {tab === "wait" ? <p className="px-3 pt-4 text-[13px] text-zk-muted">These never run code.</p> : null}
            <p className="px-3 pt-4 text-xs text-zk-muted max-lg:hidden">
              <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> move · <kbd className="font-mono">Enter</kbd> open ·{" "}
              {tab === "needs" ? <><kbd className="font-mono">S</kbd> stop and restore · </> : <><kbd className="font-mono">A</kbd> approve · </>}
              <kbd className="font-mono">Esc</kbd> back
            </p>
          </div>
          <section
            aria-label="Decision"
            className={`min-w-0 lg:border-l lg:border-zk-divider lg:pl-8 ${itemParam ? "" : "max-lg:hidden"}`}
          >
            {itemParam ? (
              <button type="button" onClick={() => go({ item: null })} className={`mb-3 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-bold text-zk-accent hover:underline lg:hidden ${focus}`}>
                <BackIcon /> Inbox
              </button>
            ) : null}
            {selected ? <DecisionPane key={selected.id} item={selected} stopOpen={stopOpen} setStopOpen={setStopOpen} /> : <p className="text-sm text-zk-muted">Pick something from the list.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
