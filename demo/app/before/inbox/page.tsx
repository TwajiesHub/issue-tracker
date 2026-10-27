import Link from "next/link";

export const metadata = { title: "Issues (the Inbox today)" };

const TABS = [
  { label: "Need your input", n: 0 },
  { label: "Design feedback needed", n: 0 },
  { label: "New ideas", n: 0 },
];
const AGENTS = [
  { name: "Nova", activity: "Working on #212", done: "Last 30 days: 12 fixes" },
  { name: "Kite", activity: "Idle", done: "Last 30 days: 27 fixes" },
  { name: "SpecialOne", activity: "Idle", done: "Last 30 days: 19 reviews" },
];

/** Today's Inbox in Ziki, as it is: the "How the Inbox works" card and three empty type-tabs. Static on purpose. */
export default function BeforeInbox() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] font-semibold">
          <Link href="/dashboard" className="text-zk-text2 hover:text-zk-text">Zedu</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-zk-muted"><path d="m9 18 6-6-6-6" /></svg>
          <h1 aria-current="page" className="text-zk-text">Issues</h1>
        </nav>
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-electric-blue-strong px-4 text-[13px] font-bold text-white">+ New issue</button>
      </div>

      <div className="flex items-center gap-2.5">
        <span aria-current="page" className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[10px] border border-electric-blue-strong bg-electric-blue-strong px-3 text-[13px] font-semibold text-white max-sm:h-9">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
          </svg>
          Inbox <span className="min-w-5 rounded-full bg-white/25 px-1.5 text-center font-mono text-[11px] font-normal">0</span>
        </span>
        <ul className="ml-auto flex min-w-0 gap-1 overflow-x-auto text-[13px] font-medium text-zk-text2">
          {["Open 24", "In progress 7", "Done 112", "All 143"].map((t) => (
            <li key={t} className="shrink-0 rounded-full px-3 py-1.5">{t}</li>
          ))}
        </ul>
      </div>

      <section aria-label="How the Inbox works" className="grid overflow-hidden rounded-[14px] border border-zk-border bg-zk-surface md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zk-tint text-zk-accent" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zk-text">How the Inbox works</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-zk-text2">
              Agents work through issues on their own and stop here when they need a person: to answer a question, give feedback on a design, or weigh in on a new idea.
            </p>
          </div>
        </div>
        <div role="group" aria-label="Your agents" className="flex flex-col gap-2 border-zk-divider p-3 max-md:border-t md:border-l">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Your agents</h2>
          <ul className="flex flex-col gap-2">
            {AGENTS.map((a) => (
              <li key={a.name} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-zk-tint text-[11px] font-extrabold text-zk-accent">{a.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-zk-text">{a.name}</span>
                  <span className="block truncate text-xs text-zk-muted">{a.activity} · {a.done}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <nav aria-label="Inbox lists" className="overflow-x-auto">
        <ul className="flex w-max gap-1 border-b border-zk-divider">
          {TABS.map((t, i) => {
            const on = i === 0;
            return (
              <li key={t.label}>
                <span
                  aria-current={on ? "page" : undefined}
                  className={`-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] ${on ? "border-electric-blue-strong font-semibold text-zk-text" : "border-transparent font-medium text-zk-text2"}`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${on ? "bg-zk-tint text-zk-accent" : "bg-zk-chip text-zk-muted"}`}>{t.n}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-12 text-center">
        <p className="font-bold text-zk-text">Nothing here right now.</p>
        <p className="mt-1.5 text-sm text-zk-muted">No agent is waiting on an answer.</p>
      </div>
    </div>
  );
}
