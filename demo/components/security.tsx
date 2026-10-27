"use client";

import Link from "next/link";
import { useStore, useAgeLabel } from "@/lib/store";
import { suggestDelegation } from "@/lib/guard";
import { verifyChain } from "@/lib/chain";
import { RiskMark, TextButton, focus } from "./ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-zk-divider pt-6">
      <h2 className="text-base font-bold text-zk-text">{title}</h2>
      {children}
    </section>
  );
}

const BOUNDARY = [
  { title: "Agents do alone", body: "Typos, docs and tests that stay inside the files they promised." },
  { title: "Ask me", body: "Changes to the app’s code and UI, and proposals that may add a library." },
  { title: "Always me", body: "Scripts, dependencies, CI and build, auth and secrets, AGENTS.md, deploys and force pushes." },
];

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
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text max-sm:text-2xl">
        {paused.length > 0 ? (
          <>
            <span>{paused.length} {paused.length === 1 ? "change to Zedu is" : "changes to Zedu are"} paused for you.</span>{" "}
            <span className="font-semibold text-zk-text2">Everything else your agents did today passed.</span>
          </>
        ) : (
          <>
            <span>All clear.</span>{" "}
            <span className="font-semibold text-zk-text2">Your agents made {doneByAgents + checked + restored + 6} changes today; all passed.</span>
          </>
        )}
      </h1>

      {paused.length > 0 ? (
        <Section title="Paused for you">
          <ul className="-mx-3">
            {paused.map((i) => (
              <li key={i.id}>
                <Link href={`/inbox?item=${i.id}`} className={`flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zk-chip ${focus}`}>
                  <span className="mt-[3px]"><RiskMark tier="needs" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-snug text-zk-text"><span className="font-bold">{i.agent}</span> {i.sentence}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-zk-muted">{i.details.join(" · ")}</span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-[13px] tabular-nums text-zk-muted">{age(i.ageMin)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Today">
        <p className="text-[15px] text-zk-text2">
          {doneByAgents} changes passed · {checked} checked by your rules · {restored} restored.
        </p>
      </Section>

      <Section title="Your boundary">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          {BOUNDARY.map((b) => (
            <div key={b.title}>
              <dt className="text-[13px] font-bold text-zk-text">{b.title}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-zk-text2">{b.body}</dd>
            </div>
          ))}
        </dl>
        <Link href="/agents/nova" className={`inline-flex min-h-11 items-center text-sm font-bold text-zk-accent hover:underline ${focus}`}>Change rules</Link>
      </Section>

      <Section title="Suggestions">
        {showSuggestion ? (
          <div className="space-y-1.5">
            <p className="text-[15px] text-zk-text"><span className="font-bold">Kite kept its promise on all 12 docs changes.</span> Let it just do these and tell you after?</p>
            <div className="flex items-center gap-4">
              <TextButton onClick={() => act.suggestion(true)}>Yes</TextButton>
              <TextButton className="!text-zk-text2" onClick={() => act.suggestion(false)}>Not now</TextButton>
            </div>
            <p className="text-[13px] text-zk-muted">Scripts, CI, auth and AGENTS.md always need you.</p>
          </div>
        ) : (
          <p className="text-sm text-zk-muted">{state.suggestion === "accepted" ? "Kite now tells you after docs changes. Nothing else to suggest." : "Nothing to suggest right now."}</p>
        )}
      </Section>

      <Section title="Decision log">
        <p className="text-[13px] text-zk-muted">
          Every decision is chained to the one before it, so an edit anywhere breaks the chain.{" "}
          <span role="status" className="font-semibold text-zk-ok-fg">{chain.ok ? `Chain intact · ${state.log.length} entries` : `Chain broken at entry ${chain.brokenAt + 1}`}</span>
        </p>
        <ol className="divide-y divide-zk-divider">
          {[...state.log].reverse().map((e, i) => (
            <li key={e.hash} className="flex flex-wrap gap-x-4 gap-y-0.5 py-2.5 text-sm">
              <span className="w-32 shrink-0 text-[13px] tabular-nums text-zk-muted">{e.entry.t}</span>
              <span className="min-w-0 flex-1 text-zk-text"><span className="font-semibold">{e.entry.actor}</span> · {e.entry.text}</span>
              <span className="font-mono text-[11px] text-zk-muted" title={e.hash}>#{state.log.length - i} {e.hash.slice(0, 8)}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
