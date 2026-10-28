"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAgeLabel, useStore } from "@/lib/store";
import { suggestDelegation } from "@/lib/guard";
import type { Item } from "@/lib/scenario";
import { CONFIRM_MS, DecisionPane } from "./decision";
import { BackIcon, Kbd, PrimaryButton, RiskMark, TextButton, focus, panel } from "./ui";

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
          <span className="t-body block text-[15px] leading-snug">
            <span className="font-bold">{item.agent}</span> {item.sentence}
          </span>
          <span className="t-support mt-0.5 block truncate text-[13px] font-normal">
            {item.details.map((d, i) => (
              <span key={d}>{i > 0 ? " · " : ""}{/^#/.test(d) ? <span className="font-mono text-xs">{d}</span> : d}</span>
            ))}
          </span>
        </span>
        <span className="t-quiet shrink-0 pt-0.5 text-[13px] tabular-nums group-hover:max-lg:hidden">{age(item.ageMin)}</span>
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

  // On desktop the first item opens by default. Writing it into the URL keeps the decision on screen
  // after it resolves (otherwise the pane would jump to the next item and hide the confirmation).
  useEffect(() => {
    if (!itemParam && tab !== "done" && list[0] && isDesktop()) go({ item: list[0].id }, true);
  }, [itemParam, tab, list, go, isDesktop]);

  // After Stop and restore, the confirmation stays for a few seconds, then the Inbox moves on to the next decision.
  const moveOn = useRef<() => void>(() => {});
  moveOn.current = () => go({ item: isDesktop() ? openNeeds[0]?.id ?? null : null }, true);
  const prev = useRef<{ id?: string; state?: string }>({});
  useEffect(() => {
    const was = prev.current;
    prev.current = { id: selected?.id, state: selected?.state };
    if (selected?.kind === "paused" && selected.state === "restored" && was.id === selected.id && was.state !== "restored") {
      const t = setTimeout(() => moveOn.current(), CONFIRM_MS);
      return () => clearTimeout(t);
    }
  }, [selected?.id, selected?.state, selected?.kind]);

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
  const showSuggestion = state.suggestion === "open" && suggestDelegation({ category: "docs", approvals: 12, total: 12, brokenPromisesInWindow: 0 }) !== null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "needs", label: "Needs you" }, { id: "wait", label: "Can wait" }, { id: "done", label: "Done by agents" },
  ];

  return (
    <div className="space-y-6">
      <div className={`space-y-1 ${itemParam ? "max-lg:hidden" : ""}`}>
        <h1 className="t-headline text-[28px] leading-tight max-sm:text-2xl">
          {headline} <span className="t-support font-medium tracking-normal">Your agents finished <span className="tabular-nums">{counts.done}</span> things on their own.</span>
        </h1>
        <TextButton aria-expanded={how} aria-controls="how-it-works" onClick={() => setHow((v) => !v)}>How this works</TextButton>
        {how ? (
          <p id="how-it-works" className="t-support zg-in max-w-2xl text-sm font-normal leading-relaxed">
            Agents work on their own. When a change doesn’t match what they promised, or breaks a rule you set, it pauses here and nothing runs until you decide. Low-risk changes wait in Can wait. Everything else they did is in Done by agents.
          </p>
        ) : null}
      </div>

      <nav aria-label="Inbox lists" className={`overflow-x-auto ${itemParam ? "max-lg:hidden" : ""}`}>
        <ul className="flex w-max border-b border-zk-divider sm:gap-1">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => go({ tab: t.id, item: null })}
                  className={`-mb-px inline-flex h-11 items-center gap-1 whitespace-nowrap rounded-t-md border-b-2 px-2 text-[13px] sm:gap-1.5 sm:px-3 sm:text-sm ${focus} ${on ? "t-body border-electric-blue-strong font-semibold" : "t-support border-transparent hover:text-zk-text"}`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 font-mono text-xs tabular-nums ${on ? "bg-zk-tint text-zk-accent" : "bg-zk-chip text-zk-text2"}`}>{counts[t.id]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "needs" && n === 0 && !itemFromParam ? (
        <div className={`${panel} zg-fade px-6 py-16 text-center`}>
          <p className="t-headline text-xl">You’re all caught up.</p>
          <p className="t-support mt-1.5 text-[15px] font-normal">Your agents keep going.</p>
          <TextButton className="mt-2" onClick={() => go({ tab: "done", item: null })}>See what they did →</TextButton>
        </div>
      ) : tab === "done" && !itemFromParam ? (
        <div key="done" className={`${panel} zg-fade max-w-3xl space-y-5 p-5 sm:p-6`}>
          {showSuggestion ? (
            <section aria-label="Suggestion" className="space-y-2 border-b border-zk-divider pb-5">
              <p className="t-body text-[15px]"><span className="font-bold">Kite kept its promise on all 12 docs changes.</span> Let it just do these and tell you after?</p>
              <div className="flex flex-wrap items-center gap-x-4">
                <PrimaryButton className="!h-10" onClick={() => act.suggestion(true)}>Yes</PrimaryButton>
                <TextButton onClick={() => act.suggestion(false)}>Not now</TextButton>
              </div>
              <p className="t-quiet text-[13px]">Scripts, CI, auth and AGENTS.md always need you.</p>
            </section>
          ) : state.suggestion === "accepted" ? (
            <p className="t-support border-b border-zk-divider pb-4 text-sm font-normal">Done. Kite will do docs changes and tell you after. <span className="t-quiet">Scripts, CI, auth and AGENTS.md always need you.</span></p>
          ) : null}
          <ul className="divide-y divide-zk-divider">
            {state.doneLines.map((l) => (
              <li key={l.id} className="t-body flex gap-4 py-2.5 text-[15px]">
                <span className="t-quiet w-11 shrink-0 font-mono text-[13px] leading-[1.6] tabular-nums">{l.time}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className={itemParam ? "max-lg:hidden" : ""}>
            <div className={`${panel} p-2`}>
              {list.length ? (
                <ul key={tab} aria-label={tab === "needs" ? "Needs you" : "Can wait"} className="zg-fade space-y-0.5">
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
                <p className="t-support px-3 py-6 text-sm font-normal">Nothing here.</p>
              )}
            </div>
            {tab === "wait" ? <p className="t-quiet px-3 pt-3 text-[13px]">These never run code.</p> : null}
            <p className="t-quiet flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pt-3 text-xs max-lg:hidden">
              <span className="whitespace-nowrap"><Kbd>J</Kbd> <Kbd>K</Kbd> move</span>
              <span className="whitespace-nowrap"><Kbd>Enter</Kbd> open</span>
              {tab === "needs" ? <span className="whitespace-nowrap"><Kbd>S</Kbd> stop and restore</span> : <span className="whitespace-nowrap"><Kbd>A</Kbd> approve</span>}
              <span className="whitespace-nowrap"><Kbd>Esc</Kbd> back</span>
            </p>
          </div>
          <section
            aria-label="Decision"
            className={`${panel} min-w-0 p-5 sm:p-7 lg:p-8 ${itemParam ? "" : "max-lg:hidden"}`}
          >
            {itemParam ? (
              <button type="button" onClick={() => go({ item: null })} className={`mb-3 inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-zk-accent hover:underline lg:hidden ${focus}`}>
                <BackIcon /> Inbox
              </button>
            ) : null}
            {selected ? <DecisionPane key={selected.id} item={selected} stopOpen={stopOpen} setStopOpen={setStopOpen} /> : <p className="t-support text-sm font-normal">Pick something from the list.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
