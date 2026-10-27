import Link from "next/link";

export const metadata = { title: "Marketing" };

export default function Marketing() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[24px] border border-zk-border bg-zk-surface px-6 py-12 text-center">
      <span className="rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">Coming soon</span>
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">Marketing</h1>
      <p className="max-w-md text-sm leading-relaxed text-zk-text2">Not part of this demo.</p>
      <Link href="/inbox" className="mt-2 inline-flex h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105">Back to Product</Link>
    </section>
  );
}
