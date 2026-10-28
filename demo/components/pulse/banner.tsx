"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";

/** A slim banner on every page: this is a proposal mock-up, with a way to compare and a way to read more. Not part of Ziki. */
export function ProposalBanner() {
  const pathname = usePathname();
  const before = pathname.startsWith("/before");
  const cls = (on: boolean) => `inline-flex min-h-8 items-center rounded-full px-2.5 text-[13px] ${focus} ${on ? "bg-zk-surface font-bold text-zk-text shadow-sm" : "font-medium text-zk-text2 hover:text-zk-text"}`;
  return (
    <div className="border-b border-zk-border bg-zk-tint">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5 text-[13px] text-zk-text sm:px-6">
        <p className="min-w-0 font-semibold">
          <span aria-hidden="true">✦ </span>Proposal mock-up: The pulse and the daily note
          {pathname === "/whimsy" ? <span className="ml-2 font-normal text-zk-text2">Tap an answer and watch Kite.</span> : null}
        </p>
        <div className="flex items-center gap-3">
          <div role="group" aria-label="Compare" className="flex items-center rounded-full bg-zk-seg p-0.5">
            <Link href="/before/dashboard" aria-current={before ? "page" : undefined} className={cls(before)}>Before</Link>
            <span aria-hidden="true" className="text-zk-border">·</span>
            <Link href="/dashboard" aria-current={!before ? "page" : undefined} className={cls(!before)}>After</Link>
          </div>
          <a href="#" className={`rounded-md font-semibold text-zk-accent hover:underline ${focus}`}>Read the proposal →</a>
        </div>
      </div>
    </div>
  );
}

/** Dashboard and Issues, under the header, on the pages that belong to Product. */
export function SubTabs() {
  const pathname = usePathname();
  const before = pathname.startsWith("/before");
  const inProduct = pathname.startsWith("/dashboard") || pathname.startsWith("/whimsy") || pathname.startsWith("/issues") || pathname.startsWith("/before/dashboard") || pathname.startsWith("/before/inbox");
  if (!inProduct) return null;
  const issues = pathname.startsWith("/issues") || pathname.startsWith("/before/inbox");
  const tabs = [
    { label: "Dashboard", href: before ? "/before/dashboard" : "/dashboard", on: !issues },
    { label: "Issues", href: "/issues", on: issues },
  ];
  return (
    <nav aria-label="Product" className="border-b border-zk-border bg-zk-surface">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 px-4 sm:px-6">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              aria-current={t.on ? "page" : undefined}
              className={`-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm ${focus} ${t.on ? "border-electric-blue-strong font-semibold text-zk-text" : "border-transparent font-medium text-zk-text2 hover:text-zk-text"}`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
