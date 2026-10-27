"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  DELEGATION_LABELS, LIMIT_LABELS, LOCKED_LABELS, WORK_LABELS, type WorkKind,
} from "@/lib/scenario";
import type { Delegation } from "@/lib/guard";
import { Dialog, PrimaryButton, TextButton, focus } from "./ui";

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Segmented({ name, value, onChange }: { name: string; value: Delegation; onChange: (v: Delegation) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex rounded-full bg-zk-seg p-0.5">
      {(["ask", "tell_after", "auto"] as Delegation[]).map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          className={`min-h-9 rounded-full px-3 text-[13px] font-semibold ${focus} ${value === d ? "bg-zk-surface text-zk-text shadow-sm" : "text-zk-text2 hover:text-zk-text"}`}
        >
          {DELEGATION_LABELS[d]}
        </button>
      ))}
    </div>
  );
}

export function AgentPage({ id }: { id: string }) {
  const { state, act } = useStore();
  const agent = state.agents[id];
  const [confirm, setConfirm] = useState(false);
  if (!agent) {
    return (
      <div className="space-y-2">
        <h1 className="text-[28px] font-extrabold text-zk-text">No agent called “{id}”.</h1>
        <Link href="/agents/nova" className="text-sm font-bold text-zk-accent hover:underline">Open Nova</Link>
      </div>
    );
  }
  const brokenCount = agent.total - agent.kept;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-[13px] text-zk-muted">
          <Link href="/inbox" className="hover:text-zk-text">Inbox</Link><span aria-hidden="true">›</span><span>Agents</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-zk-tint text-base font-extrabold text-zk-accent">{agent.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text max-sm:text-2xl">{agent.name}</h1>
            <p className="text-sm text-zk-muted">{agent.blurb}</p>
          </div>
        </div>
        {agent.paused ? (
          <p className="mt-4 text-[15px] text-zk-text" role="status">
            <span className="font-bold">{agent.name} is paused.</span> It can’t push, run code or bid until you resume it.
          </p>
        ) : null}
      </div>

      <section className="space-y-1.5 border-t border-zk-divider pt-6">
        <h2 className="text-base font-bold text-zk-text">Promises kept</h2>
        <p className="text-[15px] text-zk-text">
          <span className="text-2xl font-extrabold tabular-nums">{agent.kept} of {agent.total}</span>
        </p>
        {agent.broken ? (
          <p className="text-[13px] text-zk-text2">
            The one broken: <a href="#broken" className={`font-bold text-zk-accent hover:underline ${focus}`}>{agent.broken.ref}</a>
          </p>
        ) : (
          <p className="text-[13px] text-zk-text2">{brokenCount === 0 ? "Every promise kept." : ""}</p>
        )}
        {agent.broken ? (
          <p id="broken" className="text-[13px] text-zk-muted"><span className="font-mono">{agent.broken.ref}</span> · {agent.broken.when} · {agent.broken.text}</p>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-zk-divider pt-6">
        <h2 className="text-base font-bold text-zk-text">Delegation</h2>
        <p className="text-[13px] text-zk-muted">How much {agent.name} may do before asking you, per kind of work.</p>
        <ul className="divide-y divide-zk-divider">
          {(Object.keys(WORK_LABELS) as WorkKind[]).map((k) => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <span className="text-[15px] text-zk-text">{WORK_LABELS[k]}</span>
              <Segmented name={`${WORK_LABELS[k]} delegation`} value={agent.delegation[k]} onChange={(v) => act.setDelegation(agent.id, k, v)} />
            </li>
          ))}
          {LOCKED_LABELS.map((l) => (
            <li key={l} className="flex items-center justify-between gap-4 py-3 text-zk-text2">
              <span className="text-[15px]">{l}</span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold"><Lock />Always me</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-zk-divider pt-6">
        <h2 className="text-base font-bold text-zk-text">Active limits</h2>
        {agent.limits.length ? (
          <ul className="divide-y divide-zk-divider">
            {agent.limits.map((l) => (
              <li key={l} className="flex items-center justify-between gap-4 py-1.5 text-[15px] text-zk-text">
                {LIMIT_LABELS[l]}
                <TextButton aria-label={`Remove limit: ${LIMIT_LABELS[l]}`} onClick={() => act.removeLimit(agent.id, l)}>Remove</TextButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zk-muted">None. Add limits when you approve a proposal or reply to a pause.</p>
        )}
      </section>

      <section className="space-y-3 border-t border-zk-divider pt-6">
        <h2 className="text-base font-bold text-zk-text">Access</h2>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="pause" className="text-[15px] text-zk-text">Pause agent</label>
          <button
            id="pause"
            type="button"
            role="switch"
            aria-checked={agent.paused}
            onClick={() => act.pauseAgent(agent.id, !agent.paused)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full ${focus} ${agent.paused ? "bg-electric-blue-strong" : "bg-zk-border"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${agent.paused ? "translate-x-6" : "translate-x-1"}`} />
            <span className="sr-only">{agent.paused ? "Paused" : "Running"}</span>
          </button>
        </div>
        <p className="text-[13px] text-zk-muted">
          Key <span className="font-mono">zk_live_••••{agent.keySuffix}</span>
          {agent.rotations ? ` · rotated ${agent.rotations} ${agent.rotations === 1 ? "time" : "times"} in this demo` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-x-5">
          <TextButton onClick={() => setConfirm(true)}>Pause and rotate key</TextButton>
        </div>
      </section>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Pause ${agent.name} and rotate its key?`}>
        <ul className="mt-3 space-y-2 text-sm text-zk-text">
          <li className="flex gap-2"><span aria-hidden="true" className="text-zk-muted">•</span>{agent.name} can’t push, run code or bid</li>
          <li className="flex gap-2"><span aria-hidden="true" className="text-zk-muted">•</span>Its current key stops working at once</li>
        </ul>
        <div className="mt-5 flex items-center justify-end gap-3">
          <TextButton onClick={() => setConfirm(false)}>Cancel</TextButton>
          <PrimaryButton autoFocus onClick={() => { act.pauseRotate(agent.id); setConfirm(false); }}>Pause and rotate key</PrimaryButton>
        </div>
      </Dialog>
    </div>
  );
}
