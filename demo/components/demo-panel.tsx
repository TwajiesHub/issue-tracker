"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { INCIDENT_ID, KITE_BREAK_ID } from "@/lib/scenario";

/** Demo controls. These run the guard engine on fixtures, on the server. Not part of Ziki. */
export function DemoPanel() {
  const { act, state } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  if (pathname === "/" || pathname.startsWith("/before")) return null;

  const run = async (fn: () => Promise<void>, id: string) => {
    setFailed(false);
    try {
      await fn();
      router.push(`/inbox?item=${id}`);
    } catch {
      setFailed(true);
    }
  };
  const item =
    "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-zk-text hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue";

  return (
    <div
      className="fixed right-3 z-30 bottom-[8.5rem] lg:bottom-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          btn.current?.focus();
        }
      }}
    >
      {open ? (
        <div id="demo-panel" role="group" aria-label="Demo controls" className="mb-2 w-72 rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-[0_16px_40px_rgba(11,23,51,0.22)]">
          <p className="px-3 pb-1 pt-2 text-xs text-zk-muted">Runs the real engine on test pushes, on the server.</p>
          <button type="button" className={item} onClick={() => run(() => act.simulate("attack"), INCIDENT_ID)}>Simulate the attack (17 branches)</button>
          <button type="button" className={item} onClick={() => run(() => act.simulate("kite"), KITE_BREAK_ID)}>Simulate Kite breaking its limit</button>
          <button type="button" className={item} onClick={() => { act.reset(); router.push("/inbox"); }}>Reset</button>
          {failed ? <p role="alert" className="px-3 pb-2 pt-1 text-xs text-zk-bad-fg">The check didn’t run. Try again.</p> : null}
          {state.engineNote ? <p className="px-3 pb-2 pt-1 font-mono text-[11px] leading-relaxed text-zk-muted">{state.engineNote}</p> : null}
        </div>
      ) : null}
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="demo-panel"
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex h-9 items-center gap-1.5 rounded-full border border-zk-border bg-zk-surface px-3.5 text-[13px] font-bold text-zk-text shadow-[0_4px_14px_rgba(11,23,51,0.16)] hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-electric-blue" />
        Demo
      </button>
    </div>
  );
}
