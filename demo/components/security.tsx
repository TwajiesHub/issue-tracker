"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, useAgeLabel } from "@/lib/store";
import { zikiProtectedAreas } from "@/lib/guard-profile";
import { validateArea, MAX_LABEL, MAX_PATTERN } from "@/lib/areas";
import { suggestDelegation } from "@/lib/guard";
import { verifyChain } from "@/lib/chain";
import { Dialog, PrimaryButton, RiskMark, TextButton, focus, panel } from "./ui";

/** One panel per section. The action, if any, sits in the section's own header row. */
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${panel} zg-fade space-y-4 p-5 sm:p-6`}>
      <div className="flex min-h-6 items-center justify-between gap-4">
        <h2 className="t-body text-base">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const BOUNDARY = [
  { title: "Agents do alone", body: "Typos, docs and tests that stay inside the files they promised." },
  { title: "Ask me", body: "Changes to the app’s code and UI, and proposals that may add a library." },
  { title: "Always me", body: "Scripts, dependencies, CI and build, auth and secrets, AGENTS.md, deploys and force pushes." },
];

function ProtectedAreas() {
  const { state, act } = useStore();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pattern, setPattern] = useState("");
  const [error, setError] = useState<string | null>(null);
  const areas = [...zikiProtectedAreas, ...state.areas];
  const field = `mt-1 w-full rounded-xl border border-zk-border bg-zk-bg px-3 text-sm text-zk-text ${focus}`;

  const close = () => { setOpen(false); setError(null); setLabel(""); setPattern(""); };
  const save = () => {
    const problem = validateArea(label, pattern, areas);
    if (problem) { setError(problem); return; }
    act.addArea(label, pattern);
    close();
  };
  return (
    <div className="space-y-2 border-t border-zk-divider pt-4">
      <div className="flex min-h-6 items-center justify-between gap-4">
        <h3 className="t-body text-sm">Protected areas</h3>
        <TextButton className="-my-2" onClick={() => setOpen(true)}>Add an area</TextButton>
      </div>
      <p className="t-support text-[13px] font-normal">Any change that touches these always needs you.</p>
      <ul aria-label="Protected areas" className="divide-y divide-zk-divider">
        {areas.map((a) => (
          <li key={a.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <span className="t-body min-w-0 text-[15px] font-normal">{a.label}</span>
            <span className="t-quiet shrink-0 text-[13px] tabular-nums">{a.globs.length} file {a.globs.length === 1 ? "pattern" : "patterns"}</span>
          </li>
        ))}
      </ul>

      <Dialog open={open} onClose={close} title="Add a protected area">
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="mt-3 space-y-3"
        >
          <div>
            <label htmlFor="area-label" className="t-body text-sm">Name</label>
            <input id="area-label" value={label} maxLength={MAX_LABEL} onChange={(e) => { setLabel(e.target.value); setError(null); }} placeholder="Composer" className={`${field} h-11`} autoFocus />
          </div>
          <div>
            <label htmlFor="area-pattern" className="t-body text-sm">File pattern</label>
            <input id="area-pattern" value={pattern} maxLength={MAX_PATTERN} onChange={(e) => { setPattern(e.target.value); setError(null); }} placeholder="lib/composer/**" aria-describedby="area-help" className={`${field} h-11 font-mono`} />
            <p id="area-help" className="t-support mt-1 text-[13px] font-normal">A path from the repo root. <span className="font-mono">*</span> matches inside a folder, <span className="font-mono">**</span> matches everything below it.</p>
          </div>
          {error ? <p role="alert" className="text-[13px] font-semibold text-zk-bad-fg">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 pt-1">
            <TextButton onClick={close}>Cancel</TextButton>
            <PrimaryButton type="submit">Add area</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function Security() {
  const { state, needs, act } = useStore();
  const age = useAgeLabel();
  const paused = needs.filter((i) => i.kind === "paused");
  const restored = state.items.filter((i) => i.kind === "paused" && i.state === "restored").length;
  const doneByAgents = state.doneLines.filter((l) => !l.text.startsWith("You ")).length;
  const checked = 3;
  const chain = verifyChain(state.log);
  const showSuggestion = state.suggestion === "open" && suggestDelegation({ category: "docs", approvals: 12, total: 12, brokenPromisesInWindow: 0 }) !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="t-headline text-[28px] leading-tight max-sm:text-2xl">
        {paused.length > 0 ? (
          <>
            <span><span className="tabular-nums">{paused.length}</span> {paused.length === 1 ? "change to Zedu is" : "changes to Zedu are"} paused for you.</span>{" "}
            <span className="t-support font-medium tracking-normal">Everything else your agents did today passed.</span>
          </>
        ) : (
          <>
            <span>All clear.</span>{" "}
            <span className="t-support font-medium tracking-normal">Your agents made <span className="tabular-nums">{doneByAgents + checked + restored + 6}</span> changes today; all passed.</span>
          </>
        )}
      </h1>

      {paused.length > 0 ? (
        <Section title="Paused for you">
          <ul className="-mx-2">
            {paused.map((i) => (
              <li key={i.id}>
                <Link href={`/inbox?item=${i.id}`} className={`flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zk-chip ${focus}`}>
                  <span className="mt-[3px]"><RiskMark tier="needs" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body block text-[15px] leading-snug"><span className="font-bold">{i.agent}</span> {i.sentence}</span>
                    <span className="t-support mt-0.5 block truncate text-[13px] font-normal">{i.details.join(" · ")}</span>
                  </span>
                  <span className="t-quiet shrink-0 pt-0.5 text-[13px] tabular-nums">{age(i.ageMin)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Today">
        <p className="t-support text-[15px] font-normal tabular-nums">
          {doneByAgents} changes passed · {checked} checked by your rules · {restored} restored.
        </p>
      </Section>

      <Section
        title="Your boundary"
        action={<Link href="/agents/nova" className={`-my-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-zk-accent hover:underline ${focus}`}>Change rules</Link>}
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          {BOUNDARY.map((b) => (
            <div key={b.title}>
              <dt className="t-body text-sm">{b.title}</dt>
              <dd className="t-support mt-1 text-[13px] font-normal leading-relaxed">{b.body}</dd>
            </div>
          ))}
        </dl>
        <ProtectedAreas />
      </Section>

      <Section title="Suggestions">
        {showSuggestion ? (
          <div className="space-y-2">
            <p className="t-body text-[15px]"><span className="font-bold">Kite kept its promise on all 12 docs changes.</span> Let it just do these and tell you after?</p>
            <div className="flex items-center gap-4">
              <TextButton onClick={() => act.suggestion(true)}>Yes</TextButton>
              <TextButton className="!text-zk-text2" onClick={() => act.suggestion(false)}>Not now</TextButton>
            </div>
            <p className="t-quiet text-[13px]">Scripts, CI, auth and AGENTS.md always need you.</p>
          </div>
        ) : (
          <p className="t-support text-sm font-normal">{state.suggestion === "accepted" ? "Kite now tells you after docs changes. Nothing else to suggest." : "Nothing to suggest right now."}</p>
        )}
      </Section>

      <Section title="Decision log">
        <p className="t-support text-[13px] font-normal">
          Every decision is chained to the one before it, so an edit anywhere breaks the chain.{" "}
          <span role="status" className="font-semibold tabular-nums text-zk-ok-fg">{chain.ok ? `Chain intact · ${state.log.length} entries` : `Chain broken at entry ${chain.brokenAt + 1}`}</span>
        </p>
        <ol className="divide-y divide-zk-divider">
          {[...state.log].reverse().map((e, i) => (
            <li key={e.hash} className="flex flex-wrap gap-x-4 gap-y-0.5 py-2.5 text-sm">
              <span className="t-quiet w-32 shrink-0 text-[13px] tabular-nums">{e.entry.t}</span>
              <span className="t-body min-w-0 flex-1"><span className="font-semibold">{e.entry.actor}</span> · <span className="font-normal">{e.entry.text}</span></span>
              <span className="t-quiet font-mono text-xs tabular-nums" title={e.hash}>#{state.log.length - i} {e.hash.slice(0, 8)}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
