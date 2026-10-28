import Link from "next/link";

export const metadata = { title: { absolute: "Ziki Guard" } };

const link = "rounded-md font-semibold text-zk-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";

const JOURNEYS = [
  { href: "/security", title: "The night attack", line: "Security → Stop and restore. About 30 seconds, no code reading." },
  { href: "/inbox?item=prop-kite-212", title: "A normal day", line: "Kite’s proposal → Add limits → Approve. Then use Demo to make Kite break its limit." },
  { href: "/inbox?tab=done", title: "A week later", line: "Done by agents → Let Kite do docs and tell you after. The Inbox gets quieter." },
];

export default function Start() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <section className="space-y-3 px-1">
        <h1 className="t-headline text-[28px] leading-tight max-sm:text-2xl">Ziki Guard</h1>
        <p className="t-support text-[17px] font-normal leading-relaxed">
          A reproduction of Ziki with one change: agents promise what they’ll do, Ziki checks each change against that promise and your rules, and you only see the gaps.
        </p>
      </section>

      <section aria-labelledby="compare" className="zg-fade space-y-3 rounded-[20px] border border-zk-divider bg-zk-surface p-5 sm:p-6">
        <h2 id="compare" className="t-body text-base">Compare</h2>
        <ul className="space-y-1">
          <li className="t-body min-h-11 py-2 text-[15px] font-normal">
            <Link href="/before/inbox" className={link}>Before: today’s Inbox and Security</Link>
            <span className="t-quiet"> · </span>
            <Link href="/before/security" className={link}>Security</Link>
          </li>
          <li className="t-body min-h-11 py-2 text-[15px] font-normal">
            <Link href="/inbox" className={link}>After: the new Inbox</Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="journeys" className="zg-fade space-y-3 rounded-[20px] border border-zk-divider bg-zk-surface p-5 sm:p-6">
        <h2 id="journeys" className="t-body text-base">Three journeys</h2>
        <ol className="space-y-3">
          {JOURNEYS.map((j, i) => (
            <li key={j.href} className="text-[15px] leading-snug">
              <Link href={j.href} className={link}>{i + 1}. {j.title}</Link>
              <span className="t-support mt-0.5 block text-[13px] font-normal">{j.line}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="t-quiet px-1 text-[13px]">
        Every name and change here is fictional. Your progress is kept for this tab; the Demo button resets it.
      </p>
    </div>
  );
}
