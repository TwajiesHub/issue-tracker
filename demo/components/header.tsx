"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { usePulse } from "@/lib/pulse";
import { POINTS_BASE, formatPoints } from "@/lib/pulse-model";
import { TodayNote } from "./pulse/note";

/* Ported from Ziki's components/app-header.tsx, ziki-mark.tsx and theme-toggle.tsx.
   Same classes and tokens; the data comes from the demo store instead of the database. */

const linkFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent";

export function ZikiMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 32" fill="none" className={className} aria-hidden="true">
      <path d="M5 13h16L5 27.5h16" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 2.5 21 9h-9Z" fill="#38A3FF" stroke="#38A3FF" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function useDismiss(open: boolean, close: () => void, containerRef: React.RefObject<HTMLElement | null>, triggerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => { if (!containerRef.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open, close, containerRef, triggerRef]);
}

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function NavIcon({ children }: { children: React.ReactNode }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="1.9" aria-hidden="true" className="shrink-0" {...stroke}>{children}</svg>;
}

function TopNavLink({ href, active, label, dot, children }: { href: string; active: boolean; label: string; dot?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex shrink-0 items-center whitespace-nowrap font-medium ${linkFocus} max-lg:min-w-16 max-lg:flex-1 max-lg:flex-col max-lg:gap-0.5 max-lg:rounded-xl max-lg:py-1.5 max-lg:text-[11px] lg:h-9 lg:gap-2 lg:rounded-full lg:px-2.5 lg:text-[13px] ${
        active ? "text-zk-accent lg:bg-zk-tint" : "text-zk-text2 hover:text-zk-text lg:hover:bg-zk-chip"
      }`}
    >
      <span className={`relative flex items-center justify-center max-lg:h-7 max-lg:w-12 max-lg:rounded-full ${active ? "max-lg:bg-zk-tint" : ""}`}>
        {children}
        {dot ? (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-zk-surface bg-zk-bad-fg max-lg:right-2.5 max-lg:top-0.5" />
        ) : null}
      </span>
      {label}
      {dot ? <span className="sr-only">, something is paused for you</span> : null}
    </Link>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => {
      const t = document.documentElement.dataset.theme;
      setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    read();
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    m.addEventListener("change", read);
    return () => m.removeEventListener("change", read);
  }, []);
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("zg-theme", next); } catch {}
        setDark(!dark);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-zk-text hover:bg-zk-chip ${linkFocus}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...stroke}>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}

function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("Zedu");
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  useDismiss(open, () => setOpen(false), ref, btn);
  return (
    <div ref={ref} className="relative w-max min-w-0 max-w-40 max-sm:max-w-44">
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-[30px] max-w-full items-center gap-2 rounded-full border border-transparent bg-transparent py-0 pl-1.5 pr-2.5 text-[13px] font-medium text-zk-text hover:bg-zk-chip max-sm:pl-0 max-sm:text-base max-sm:font-semibold ${linkFocus}`}
      >
        <span className="sr-only">Active workspace, </span>
        <span className="truncate">{current}</span>
        <svg className="h-3.5 w-3.5 shrink-0 text-zk-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-2xl border border-zk-border bg-zk-surface p-1.5 shadow-[0_16px_40px_rgba(11,23,51,0.16)]">
          <ul id={listId} role="listbox" aria-label="Workspaces">
            {["Zedu", "Personal"].map((w) => (
              <li key={w} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={w === current}
                  onClick={() => { setCurrent(w); setOpen(false); }}
                  className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${w === current ? "bg-zk-tint font-semibold text-zk-accent" : "text-zk-text hover:bg-zk-chip"}`}
                >
                  {w}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AgentsMenu() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useDismiss(open, () => setOpen(false), ref, btn);
  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        title="Agents"
        className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-zk-border bg-zk-surface px-3.5 text-[13px] font-medium text-zk-text hover:bg-zk-chip max-sm:h-9 max-sm:w-9 max-sm:border-0 max-sm:bg-transparent max-sm:px-0 ${linkFocus}`}
      >
        <span className="text-electric-blue max-sm:text-zk-text">
          <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...stroke}>
            <rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 4v4M9 14h.01M15 14h.01" />
          </svg>
        </span>
        <span className="max-sm:sr-only">Agents</span>
        <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" className="max-sm:hidden" {...stroke}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 top-12 z-50 flex w-[260px] max-w-[calc(100vw-2rem)] flex-col gap-0.5 rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-[0_16px_40px_rgba(11,23,51,0.16)]">
          <span className="px-2.5 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-zk-muted">Project agents</span>
          {Object.values(state.agents).map((a) => (
            <Link key={a.id} role="menuitem" href={`/agents/${a.id}`} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-zk-text hover:bg-zk-chip">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-zk-tint text-xs font-extrabold text-zk-accent">{a.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
              <span className="rounded-full bg-zk-info-bg px-2 py-0.5 text-[11px] font-bold text-zk-info-fg">{a.paused ? "Paused" : "Active"}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const BEFORE_ROWS = [
  { id: "b1", text: "Kite is waiting on your answer for #1491", href: "/before/dashboard", unread: true },
  { id: "b2", text: "SpecialOne commented on T-1869", href: "/before/dashboard", unread: true },
  { id: "b3", text: "Nova linked a pull request to #1474", href: "/before/dashboard", unread: false },
];

/** The points pill. On the proposal pages it ticks up when a fix ships; on the Before pages it stays as it was. */
function PointsPill() {
  const pathname = usePathname();
  const { model } = usePulse();
  const points = pathname.startsWith("/before") ? POINTS_BASE : model.points;
  return (
    <Link id="points-pill" href="/dashboard" title="Ranking" className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-zk-warn-bg px-2.5 text-[12.5px] font-semibold text-zk-warn-fg hover:brightness-95 ${linkFocus}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...stroke}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <span key={points} className="pr-flip inline-block tabular-nums">{formatPoints(points)}</span> pts
    </Link>
  );
}

function Bell() {
  const pathname = usePathname();
  const before = pathname.startsWith("/before");
  const { interrupts, ready } = usePulse();
  const unread = before ? 2 : ready ? interrupts : 1;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useDismiss(open, () => setOpen(false), ref, btn);
  const label = before
    ? `Notifications, ${unread} unread`
    : unread > 0 ? `Today’s note, ${unread} needs you` : "Today’s note, nothing needs you";
  return (
    <div ref={ref} className="flex items-center sm:relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="notification-preview"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full text-zk-text hover:bg-zk-chip ${linkFocus}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...stroke}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-zk-surface bg-electric-blue-strong px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id="notification-preview" role="region" aria-label={before ? "Recent notifications" : "Today’s note"} className="absolute right-4 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zk-border bg-zk-surface text-zk-text shadow-xl sm:right-0">
          {before ? (
            <>
              <h2 className="border-b border-zk-border px-4 py-3 text-sm font-semibold">Notifications</h2>
              <ul className="max-h-[min(26rem,calc(100dvh-11rem))] divide-y divide-zk-divider overflow-y-auto">
                {BEFORE_ROWS.map((r) => (
                  <li key={r.id}>
                    <Link href={r.href} onClick={() => setOpen(false)} className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-zk-chip ${linkFocus} ${r.unread ? "bg-zk-tint" : ""}`}>
                      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.unread ? "bg-electric-blue" : "bg-transparent"}`} />
                      <span className={`min-w-0 flex-1 break-words ${r.unread ? "font-medium text-zk-text" : "text-zk-text2"}`}>
                        {r.unread ? <span className="sr-only">Unread: </span> : null}
                        {r.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="max-h-[min(34rem,calc(100dvh-9rem))] overflow-y-auto"><TodayNote onNavigate={() => setOpen(false)} /></div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const before = pathname.startsWith("/before");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountBtn = useRef<HTMLButtonElement>(null);
  useDismiss(accountOpen, () => setAccountOpen(false), accountRef, accountBtn);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); setAccountOpen(false); }

  const product = pathname.startsWith("/dashboard") || pathname.startsWith("/whimsy") || pathname.startsWith("/issues") || pathname.startsWith("/before/dashboard") || pathname.startsWith("/before/inbox") || pathname.startsWith("/inbox") || pathname.startsWith("/agents") || pathname.startsWith("/settings");
  const security = pathname.startsWith("/before/security") || pathname.startsWith("/security");

  return (
    <header className="relative z-40 border-b border-zk-border bg-zk-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:sticky lg:top-0">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 max-sm:py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dashboard" aria-label="Ziki" className={`flex shrink-0 items-center gap-2 rounded-full ${linkFocus}`}>
            <ZikiMark className="h-7 w-auto text-electric-blue-strong max-sm:h-6" />
            <span aria-hidden="true" className="pr-1 text-[15px] font-semibold tracking-[-0.02em] text-zk-text max-sm:hidden">ziki</span>
          </Link>
          <span aria-hidden="true" className="h-[18px] w-px shrink-0 bg-zk-border max-sm:hidden" />
          <WorkspaceSwitcher />
        </div>

        <nav
          aria-label="Workspace"
          className="flex items-center max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:justify-around max-lg:border-t max-lg:border-zk-border max-lg:bg-zk-surface max-lg:px-2 max-lg:pt-1.5 max-lg:pb-[max(0.375rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-1px_3px_rgba(0,0,0,0.04)] lg:gap-1"
        >
          <TopNavLink href={before ? "/before/dashboard" : "/dashboard"} active={product} label="Product">
            <NavIcon><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></NavIcon>
          </TopNavLink>
          <TopNavLink href="/marketing" active={pathname.startsWith("/marketing")} label="Marketing">
            <NavIcon><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></NavIcon>
          </TopNavLink>
          <TopNavLink href="/before/security" active={security} label="Security">
            <NavIcon><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></NavIcon>
          </TopNavLink>
        </nav>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 max-sm:gap-1 lg:shrink-0">
          <AgentsMenu />
          <div ref={accountRef} className="relative">
            <button
              ref={accountBtn}
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              onClick={() => setAccountOpen((o) => !o)}
              className={`inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-zk-border bg-zk-surface py-[5px] pl-[5px] pr-3 text-zk-text hover:bg-zk-chip ${linkFocus} max-sm:border-0 max-sm:bg-transparent max-sm:pr-1`}
            >
              <span className="sr-only">Account menu for Alice Zendor</span>
              <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">AZ</span>
              <span className="max-w-40 truncate text-[13px] font-medium max-sm:sr-only">Alice Zendor</span>
              <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" className="shrink-0 text-zk-muted max-sm:hidden" {...stroke}>
                <path d={accountOpen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
              </svg>
            </button>
            {accountOpen ? (
              <div id="account-menu" role="menu" aria-label="Account" className="absolute right-0 top-[54px] z-50 flex w-[300px] max-w-[calc(100vw-2rem)] origin-top-right flex-col gap-1 rounded-[20px] border border-zk-border bg-zk-surface p-2 shadow-[0_24px_56px_rgba(11,23,51,0.22)] motion-safe:animate-[header-pop_120ms_ease-out]">
                <div className="flex items-center gap-3 rounded-[14px] bg-zk-tint p-3">
                  <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 font-semibold text-white">AZ</span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold text-zk-text">Alice Zendor</p>
                    <p className="mt-1 text-xs"><span className="rounded-full bg-zk-surface px-2 py-0.5 font-bold text-zk-text2">Admin</span></p>
                  </div>
                </div>
                {[["Profile", "/dashboard"], ["Settings", "/settings/preferences"], ["Documentation", "/dashboard"]].map(([l, h]) => (
                  <Link key={l} role="menuitem" href={h} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zk-text hover:bg-zk-chip ${linkFocus}`}>{l}</Link>
                ))}
                <div className="mx-2 h-px bg-zk-divider" />
                <button type="button" role="menuitem" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-zk-bad-fg hover:bg-zk-bad-soft ${linkFocus}`}>Sign out</button>
              </div>
            ) : null}
          </div>
          <PointsPill />
          <ThemeToggle />
          <Bell />
        </div>
      </div>
    </header>
  );
}
