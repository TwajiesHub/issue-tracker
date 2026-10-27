import Link from "next/link";

export const metadata = { title: "Security" };

/** Today's Security tab in Ziki: the "Coming soon" card, unchanged. */
export default function BeforeSecurity() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[24px] border border-zk-border bg-zk-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zk-tint text-zk-accent">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <span className="rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">Coming soon</span>
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">Security</h1>
      <p className="max-w-md text-sm leading-relaxed text-zk-text2">
        Security findings and fixes, reported, confirmed and resolved by people and their agents.
      </p>
      <Link href="/before/inbox" className="mt-2 inline-flex h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2">
        Back to Product
      </Link>
    </section>
  );
}
