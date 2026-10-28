"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { LIMIT_LABELS, groupFindings, type Item } from "@/lib/scenario";
import { plainFinding, plainText } from "@/lib/plain";
import type { LimitKind } from "@/lib/guard";
import { Dialog, HoldButton, PrimaryButton, RiskMark, TextButton, focus } from "./ui";

/** How long the "Stopped…" confirmation stays before the Inbox moves on (see inbox.tsx). */
export const CONFIRM_MS = 4500;

/** The fixed bar holding the one primary button on phones; inline on desktop. */
function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[3.8rem] max-lg:z-30 max-lg:border-t max-lg:border-zk-divider max-lg:bg-zk-surface max-lg:p-3 [&>button]:max-lg:w-full">
      {children}
    </div>
  );
}

/** Level 1: headline. */
function Headline({ children }: { children: React.ReactNode }) {
  return <h2 className="t-headline text-[26px] leading-tight max-sm:text-2xl">{children}</h2>;
}

/** Level 3 paragraph under a headline. */
function Lede({ children }: { children: React.ReactNode }) {
  return <p className="t-support max-w-xl text-[15px] font-normal leading-relaxed">{children}</p>;
}

/** Section label: body colour, weight 500, so each block has an anchor. */
function Label({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h3 id={id} className="t-body text-sm">{children}</h3>;
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-zk-divider pt-5 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="t-body text-sm">{k}</dt>
          <dd className="t-support mt-1 text-sm font-normal leading-relaxed">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[13px] font-medium text-zk-text">{children}</code>;
}

/** The silence line. Level 4. */
function Silence({ children }: { children: React.ReactNode }) {
  return <p className="t-quiet text-[13px]">{children}</p>;
}

function Resolved({ title, body, extra }: { title: string; body: string; extra?: React.ReactNode }) {
  return (
    <div className="zg-in space-y-3">
      <Headline>{title}</Headline>
      <Lede>{body}</Lede>
      {extra}
    </div>
  );
}

const linkCls = `rounded-md text-sm font-semibold text-zk-accent hover:underline ${focus}`;

function Evidence({ f }: { f: Item["paused"] extends infer P ? P extends { findings: (infer F)[] } ? F : never : never }) {
  const ev = f.evidence;
  const lines: string[] = [];
  if (ev?.before) lines.push(`- ${ev.before}`);
  if (ev?.after) lines.push(`+ ${ev.after.length > 90 ? ev.after.slice(0, 12) + "… (hash)" : ev.after}`);
  if (ev?.excerpt) lines.push(ev.excerpt);
  if (typeof ev?.metric === "number") lines.push(`measured: ${Number.isInteger(ev.metric) ? ev.metric.toLocaleString("en-US") : ev.metric.toFixed(2)}`);
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-zk-chip p-3 font-mono text-[12.5px] leading-relaxed text-zk-text">
      {lines.length ? lines.join("\n") : "No excerpt."}
    </pre>
  );
}

// ------------------------------------------------------------------ A. paused change

function PausedDecision({ item, stopOpen, setStopOpen }: { item: Item; stopOpen: boolean; setStopOpen: (v: boolean) => void }) {
  const { state, act } = useStore();
  const p = item.paused!;
  const agent = state.agents[p.agentId];
  const [showChanges, setShowChanges] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quick, setQuick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const wasOpen = useRef(item.state !== "restored");
  const opened = state.opened[item.id] ?? [];
  // The mismatch note under "promised" already says what the claim_mismatch finding says; show it once.
  const groups = groupFindings(p.findings.map(plainFinding)).filter((g) => !(g.code === "claim_mismatch" && p.note.startsWith("Doesn't match")));
  const total = groups.length;
  const allOpened = opened.length >= total;
  const branches = p.branches === 1 ? "1 branch" : `${p.branches} branches`;

  // The inline confirmation shows only when the change was resolved while this pane was on screen.
  useEffect(() => {
    if (item.state === "restored" && wasOpen.current) {
      wasOpen.current = false;
      setConfirmed(true);
      const t = setTimeout(() => setConfirmed(false), CONFIRM_MS);
      return () => clearTimeout(t);
    }
  }, [item.state]);

  if (item.state === "restored") {
    return (
      <div className="space-y-5">
        {confirmed ? (
          <p className="zg-in flex items-start gap-2.5 rounded-xl bg-zk-ok-bg px-4 py-3 text-sm font-medium leading-snug text-zk-ok-fg">
            <RiskMark tier="done" className="mt-px" />
            <span>Stopped. {branches} restored to <span className="font-mono">{p.restorePoint}</span>. {agent.name} is paused.</span>
          </p>
        ) : null}
        <Resolved
          title="Restored. Nothing ran."
          body={`Logged at ${item.resolvedAt}. ${agent.name} is paused and its key was replaced. ${branches} went back to ${p.restorePoint}.`}
          extra={<Link href="/security" className={linkCls}>See it in the decision log</Link>}
        />
      </div>
    );
  }
  if (item.state === "approved") {
    return (
      <Resolved
        title="Approved after review."
        body={`You opened all ${total} findings first. Logged at ${item.resolvedAt}. ${agent.name} stays under your limits.`}
        extra={<Link href="/security" className={linkCls}>See it in the decision log</Link>}
      />
    );
  }

  const quickReplies = p.agentId === "nova"
    ? ["Explain this change first", "Undo your last push", "Stop and wait for me"]
    : ["Explain why you needed it", "Do it without the library", "Stop and wait for me"];

  return (
    <div className="zg-fade space-y-6 max-lg:pb-24">
      <div className="space-y-3">
        <Headline>{p.headline}</Headline>
        <Lede>{p.paragraph}</Lede>
      </div>

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <section aria-labelledby={`promised-${item.id}`} className="space-y-2">
          <Label id={`promised-${item.id}`}>{agent.name} promised</Label>
          <p className="t-body text-[15px] italic leading-relaxed">“{p.agentSaid}”</p>
          <p className="t-support text-sm font-normal"><span className="t-quiet">Scope</span> <Mono>{p.scope}</Mono></p>
          <p className="pt-1 text-sm font-semibold leading-snug text-zk-bad-fg">{plainText(p.note)}</p>
        </section>
        <section aria-labelledby={`found-${item.id}`} className="space-y-2">
          <Label id={`found-${item.id}`}>Ziki found</Label>
          <ol className="space-y-2">
            {groups.map((g, i) => (
              <li key={g.code} className="t-body flex gap-2.5 text-[15px] leading-snug">
                <span aria-hidden="true" className="t-quiet w-5 shrink-0 font-mono text-xs leading-[1.7] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span>{g.title}{g.items.length > 1 ? <span className="t-quiet font-normal"> +{g.items.length - 1} more</span> : null}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div>
        <TextButton aria-expanded={showChanges} aria-controls={`changes-${item.id}`} onClick={() => setShowChanges((v) => !v)}>
          {showChanges ? "Hide the changes" : "See the changes"}
        </TextButton>
        {showChanges || reviewing ? (
          <ul id={`changes-${item.id}`} className="zg-in mt-1 divide-y divide-zk-divider border-y border-zk-divider">
            {groups.map((g, i) => {
              const isOpen = opened.includes(g.code);
              return (
                <li key={g.code}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => act.openFinding(item.id, g.code)}
                    className={`flex min-h-11 w-full items-start gap-2.5 rounded-md py-2.5 text-left text-sm ${focus}`}
                  >
                    <span aria-hidden="true" className="t-quiet w-5 shrink-0 font-mono text-xs leading-[1.7] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="t-body">{g.title}</span>
                      {g.items.length > 1 ? <span className="t-quiet ml-2 text-xs tabular-nums">{g.items.length} found</span> : null}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${isOpen ? "text-zk-muted" : "text-zk-accent"}`}>{isOpen ? "Opened" : "Open"}</span>
                  </button>
                  {isOpen ? (
                    <div className="zg-in mb-3 ml-[30px] space-y-3">
                      {g.items.map((f, k) => (
                        <div key={k}>
                          {g.items.length > 1 ? <p className="t-support mb-1 text-[13px]">{f.title}</p> : null}
                          <p className="t-quiet mb-1 font-mono text-xs">{f.file ?? "this push"}{f.line ? `:${f.line}` : ""}</p>
                          <Evidence f={f} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <Facts
        rows={[
          ["Status", <>Paused {p.paused} · stays paused until you decide</>],
          ["Agent", <>{agent.name} · yours · promises kept <span className="tabular-nums">{agent.kept}/{agent.total}</span> · <Link href={`/agents/${agent.id}`} className={`rounded-md font-semibold text-zk-accent hover:underline ${focus}`}>Pause agent and rotate key</Link></>],
          ["Reach", <><span className="tabular-nums">{branches}</span> · 0 runs · not on main</>],
          ["Restore point", <><Mono>{p.restorePoint}</Mono> for {p.branches === 1 ? "the branch" : "each branch"}</>],
        ]}
      />

      {item.state === "replied" ? (
        <p className="t-support text-[15px] font-normal">You replied: “{item.note}”. {agent.name} hasn’t answered. It stays paused.</p>
      ) : null}

      <div className="space-y-3">
        <ActionBar>
          <PrimaryButton onClick={() => setStopOpen(true)}>Stop and restore</PrimaryButton>
        </ActionBar>
        <div className="flex flex-wrap items-center gap-x-5">
          <TextButton onClick={() => setReplyOpen(true)}>Reply with limits</TextButton>
          <TextButton aria-expanded={reviewing} onClick={() => setReviewing((v) => !v)}>Review and approve</TextButton>
        </div>
        {!allOpened ? (
          <p className="t-quiet -mt-1 text-[13px]">Opens after you’ve looked at all {total} findings.</p>
        ) : reviewing ? (
          <div className="zg-in border-l-2 border-zk-border pl-4">
            <HoldButton caption={`You’ve seen all ${total}. Hold to approve anyway.`} onComplete={() => act.approveReview(item.id)} />
          </div>
        ) : null}
        <Silence>Paused. Nothing runs until you decide. If you don’t answer, it stays paused.</Silence>
      </div>

      <Dialog open={stopOpen} onClose={() => setStopOpen(false)} title="Stop and restore?">
        <p className="t-support mt-2 text-sm">This is exactly what will happen:</p>
        <ul className="t-body mt-3 space-y-2 text-sm">
          <li className="flex gap-2"><span aria-hidden="true" className="t-quiet">•</span>Restore {branches} to {p.branches === 1 ? "its restore point" : "their restore points"} (<Mono>{p.restorePoint}</Mono>)</li>
          <li className="flex gap-2"><span aria-hidden="true" className="t-quiet">•</span>Pause {agent.name}</li>
          <li className="flex gap-2"><span aria-hidden="true" className="t-quiet">•</span>Rotate its key</li>
        </ul>
        <p className="t-quiet mt-3 text-[13px]">Nothing runs. You can resume {agent.name} later.</p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <TextButton onClick={() => setStopOpen(false)}>Cancel</TextButton>
          <PrimaryButton autoFocus onClick={() => { act.stopRestore(item.id); setStopOpen(false); }}>Stop and restore</PrimaryButton>
        </div>
      </Dialog>

      <Dialog open={replyOpen} onClose={() => setReplyOpen(false)} title={`Reply to ${agent.name}`}>
        <p className="t-support mt-2 text-sm">It stays paused while you wait.</p>
        <fieldset className="mt-3">
          <legend className="sr-only">Quick replies</legend>
          <div className="space-y-1">
            {quickReplies.map((q) => (
              <label key={q} className={`t-body flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm hover:bg-zk-chip ${quick === q ? "bg-zk-chip" : ""}`}>
                <input type="radio" name="quick" checked={quick === q} onChange={() => setQuick(q)} className="h-4 w-4 accent-[var(--zk-accent)]" />
                {q}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="t-body mt-3 block text-sm" htmlFor="reply-note">Add a note (optional)</label>
        <textarea id="reply-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`mt-1 w-full rounded-xl border border-zk-border bg-zk-bg p-3 text-sm text-zk-text ${focus}`} />
        <div className="mt-4 flex items-center justify-end gap-3">
          <TextButton onClick={() => setReplyOpen(false)}>Cancel</TextButton>
          <PrimaryButton disabled={!quick} onClick={() => { act.replyLimits(item.id, note.trim() ? `${quick}. ${note.trim()}` : quick!); setReplyOpen(false); setQuick(null); setNote(""); }}>Send</PrimaryButton>
        </div>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------ B. proposal

function ProposalDecision({ item }: { item: Item }) {
  const { act, state } = useStore();
  const p = item.proposal!;
  const agent = state.agents[p.agentId];
  void agent;
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<LimitKind[]>([]);
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState("");

  if (item.state === "working" || item.state === "finished") {
    const n = p.appliedLimits.length;
    return (
      <Resolved
        title={item.state === "working" ? `${n ? `Approved with ${n === 1 ? "1 limit" : `${n} limits`}` : "Approved"}. ${item.agent} is working.` : `${item.agent} finished ${p.issue}.`}
        body={item.state === "working" ? "It will show up in Done by agents when it passes your rules." : "It passed your rules. Find it in Done by agents."}
        extra={n ? <ActiveLimits limits={p.appliedLimits} /> : undefined}
      />
    );
  }
  if (item.state === "held") {
    return <Resolved title="Paused. Kite broke a limit you set." body="Its second push added a library. The new item is waiting in Needs you." extra={<Link href="/inbox?item=inc-kite" className={linkCls}>Open it</Link>} />;
  }
  if (item.state === "declined") return <Resolved title="Declined." body={`${item.agent} won’t start. Logged at ${item.resolvedAt}.`} />;

  const toggle = (l: LimitKind) => setChosen((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]));

  return (
    <div className="zg-fade space-y-6 max-lg:pb-24">
      <div className="space-y-3">
        <Headline>{item.agent} wants to fix {p.issue}.</Headline>
        <Lede>{p.paragraph}</Lede>
      </div>
      <Facts
        rows={[
          ["Will touch", <Mono key="t">{p.touches}</Mono>],
          ["Estimate", <span key="e" className="tabular-nums">{p.estimateMin} min</span>],
          ["Needs you", p.needs ?? "Nothing"],
          [`${item.agent}’s recommendation`, p.recommendation],
        ]}
      />
      {picking ? (
        <fieldset className="zg-in space-y-1">
          <legend className="t-body mb-1 text-sm">Add limits</legend>
          {(Object.keys(LIMIT_LABELS) as LimitKind[]).map((l) => (
            <label key={l} className={`t-body flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm hover:bg-zk-chip ${chosen.includes(l) ? "bg-zk-chip" : ""}`}>
              <input type="checkbox" checked={chosen.includes(l)} onChange={() => toggle(l)} className="h-4 w-4 accent-[var(--zk-accent)]" />
              {LIMIT_LABELS[l]}
            </label>
          ))}
        </fieldset>
      ) : null}
      {chosen.length ? <ActiveLimits limits={chosen} /> : null}
      {asking ? (
        <div className="zg-in space-y-2">
          <label htmlFor="ask-agent" className="t-body text-sm">Ask {item.agent}</label>
          <div className="flex gap-2">
            <input id="ask-agent" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Why does it need a library?" className={`h-11 min-w-0 flex-1 rounded-xl border border-zk-border bg-zk-bg px-3 text-sm text-zk-text ${focus}`} />
            <TextButton disabled={!ask.trim()} onClick={() => { act.ask(item.id, ask.trim()); setAsking(false); setAsk(""); }}>Send</TextButton>
          </div>
        </div>
      ) : null}
      {item.state === "asked" ? <p className="t-support text-[15px] font-normal">You asked: “{item.note}”. {item.agent} hasn’t started. Nothing runs until you approve.</p> : null}
      <div className="space-y-3">
        <ActionBar>
          <PrimaryButton onClick={() => act.approveProposal(item.id, chosen)}>Approve{chosen.length ? ` with ${chosen.length === 1 ? "1 limit" : `${chosen.length} limits`}` : ""}</PrimaryButton>
        </ActionBar>
        <div className="flex flex-wrap items-center gap-x-5">
          <TextButton aria-expanded={picking} onClick={() => setPicking((v) => !v)}>Add limits</TextButton>
          <TextButton aria-expanded={asking} onClick={() => setAsking((v) => !v)}>Ask {item.agent}</TextButton>
          <TextButton onClick={() => act.decline(item.id)}>Decline</TextButton>
        </div>
        <Silence>If you don’t answer, {item.agent} doesn’t start.</Silence>
      </div>
    </div>
  );
}

function ActiveLimits({ limits }: { limits: LimitKind[] }) {
  return (
    <div>
      <p className="t-body text-sm">Active limits</p>
      <ul className="t-support mt-1 space-y-0.5 text-sm">
        {limits.map((l) => <li key={l}>{LIMIT_LABELS[l]}</li>)}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ C. question

function QuestionDecision({ item }: { item: Item }) {
  const { act } = useStore();
  const q = item.question!;
  const [text, setText] = useState("");
  if (item.state === "answered") return <Resolved title={`Sent to ${item.agent}.`} body={`You answered: “${q.answer}”. Logged at ${item.resolvedAt}.`} />;
  return (
    <div className="zg-fade space-y-6 max-lg:pb-24">
      <div className="space-y-3">
        <Headline>{item.agent} asks.</Headline>
        <blockquote className="t-body max-w-xl border-l-2 border-zk-border pl-4 text-lg italic leading-relaxed">“{q.text}”</blockquote>
        <p className="t-quiet text-[13px]">On <Mono>{q.issue}</Mono></p>
      </div>
      <div>
        <p className="t-body text-sm">Suggested replies</p>
        <div className="mt-1 flex flex-col items-start">
          {q.replies.map((r) => <TextButton key={r} onClick={() => setText(r)}>{r}</TextButton>)}
        </div>
      </div>
      <div>
        <label htmlFor="answer" className="t-body text-sm">Your answer</label>
        <textarea id="answer" rows={3} value={text} onChange={(e) => setText(e.target.value)} className={`mt-1 w-full max-w-xl rounded-xl border border-zk-border bg-zk-bg p-3 text-sm text-zk-text ${focus}`} />
      </div>
      <div className="space-y-3">
        <ActionBar>
          <PrimaryButton disabled={!text.trim()} onClick={() => act.answer(item.id, text.trim())}>Send</PrimaryButton>
        </ActionBar>
        <Silence>If you don’t answer, {item.agent} keeps waiting.</Silence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ low risk (Can wait)

function WaitDecision({ item }: { item: Item }) {
  const { act } = useStore();
  if (item.state === "approved") return <Resolved title="Approved." body={`${item.agent} is on it. Find it in Done by agents. Logged at ${item.resolvedAt}.`} />;
  if (item.state === "skipped") return <Resolved title="Skipped." body="Nothing ran." />;
  const tail = item.sentence.replace(/^(wants to |asks for |has an idea: )/, "");
  return (
    <div className="zg-fade space-y-6 max-lg:pb-24">
      <div className="space-y-3">
        <Headline>{item.agent} {item.kind === "proposal" ? "wants to" : item.kind === "design" ? "asks for" : "has an idea:"} {tail.replace(/\.$/, "")}.</Headline>
        <Lede>
          {item.kind === "proposal" ? "A low-risk change. It never runs code and can’t touch scripts, CI, auth or your agent rules." : "Nothing runs. This is a note for you to weigh in on."}
        </Lede>
      </div>
      <Facts rows={[["Kind", item.details.join(" · ")], ["Reach", "One file, not on main"]]} />
      <div className="space-y-3">
        <ActionBar>
          <PrimaryButton onClick={() => act.waitApprove(item.id)}>Approve</PrimaryButton>
        </ActionBar>
        <div className="flex gap-5"><TextButton onClick={() => act.waitSkip(item.id)}>Skip</TextButton></div>
        <Silence>If you don’t answer, nothing happens.</Silence>
      </div>
    </div>
  );
}

export function DecisionPane({ item, stopOpen, setStopOpen }: { item: Item; stopOpen: boolean; setStopOpen: (v: boolean) => void }) {
  if (item.kind === "paused") return <PausedDecision item={item} stopOpen={stopOpen} setStopOpen={setStopOpen} />;
  if (item.kind === "question") return <QuestionDecision item={item} />;
  if (item.tier === "wait" || (item.tier === "done" && !item.proposal && !item.question)) return <WaitDecision item={item} />;
  return <ProposalDecision item={item} />;
}
