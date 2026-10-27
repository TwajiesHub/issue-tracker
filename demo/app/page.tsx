import Link from "next/link";

export const metadata = { title: "Ziki Guard" };

const link =
  "font-bold text-zk-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-zk-bg rounded";

const JOURNEYS = [
  { href: "/security", title: "The night attack", line: "Security → Stop and restore. About 30 seconds, no code reading." },
  { href: "/inbox?item=prop-kite-212", title: "A normal day", line: "Kite’s proposal → Add limits → Approve. Then use Demo to make Kite break its limit." },
  { href: "/inbox?tab=done", title: "A week later", line: "Done by agents → Let Kite do docs and tell you after. The Inbox gets quieter." },
];

export default function Start() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 py-6">
      <section className="space-y-4">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text max-sm:text-2xl">Ziki Guard</h1>
        <p className="text-[17px] leading-relaxed text-zk-text2">
          A reproduction of Ziki with one change: agents promise what they’ll do, Ziki checks each change against that promise and your rules, and you only see the gaps.
        </p>
      </section>

      <section aria-labelledby="compare" className="space-y-3 border-t border-zk-divider pt-6">
        <h2 id="compare" className="text-base font-bold text-zk-text">Compare</h2>
        <ul className="space-y-1">
          <li className="min-h-11 py-2 text-[15px] text-zk-text">
            <Link href="/before/inbox" className={link}>Before: today’s Inbox and Security</Link>
            <span className="text-zk-muted"> · </span>
            <Link href="/before/security" className={link}>Security</Link>
          </li>
          <li className="min-h-11 py-2 text-[15px] text-zk-text">
            <Link href="/inbox" className={link}>After: the new Inbox</Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="journeys" className="space-y-3 border-t border-zk-divider pt-6">
        <h2 id="journeys" className="text-base font-bold text-zk-text">Three journeys</h2>
        <ol className="space-y-3">
          {JOURNEYS.map((j, i) => (
            <li key={j.href} className="text-[15px] leading-snug text-zk-text">
              <Link href={j.href} className={link}>{i + 1}. {j.title}</Link>
              <span className="block text-[13px] text-zk-muted">{j.line}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[13px] text-zk-muted">
        Every name and change here is fictional. Your progress is kept for this tab; the Demo button resets it.
      </p>
    </div>
  );
}
