"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-zk-surface";

/** Risk is shown by shape and words as well as colour: octagon = needs you, triangle = can wait, tick = done. */
export function RiskMark({ tier, className = "" }: { tier: "needs" | "wait" | "done" | "info"; className?: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": true, className: `shrink-0 ${className}` } as const;
  if (tier === "needs") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" style={{ color: "var(--zk-bad-fg)" }}>
        <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3Z" fill="var(--zk-bad-bg)" />
        <path d="M12 8v5M12 16.2v.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (tier === "wait") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" style={{ color: "var(--zk-warn-fg)" }}>
        <path d="M12 3.5 22 20H2L12 3.5Z" fill="var(--zk-warn-bg)" />
        <path d="M12 10v4.5M12 17.3v.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (tier === "done") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--zk-ok-fg)" }}>
        <circle cx="12" cy="12" r="9" fill="var(--zk-ok-bg)" />
        <path d="m8 12.2 2.8 2.8L16 9.5" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ color: "var(--zk-info-fg)" }}>
      <circle cx="12" cy="12" r="9" fill="var(--zk-info-bg)" />
      <path d="M12 11v5M12 7.8v.1" />
    </svg>
  );
}

/** The one primary action on a screen. Ziki's filled blue pill. */
export function PrimaryButton({
  children, className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex h-11 items-center justify-center rounded-full bg-electric-blue-strong px-6 text-sm font-bold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${focus} ${className}`}
    >
      {children}
    </button>
  );
}

/** Everything that is not the primary action is a text button. */
export function TextButton({
  children, className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`-ml-1 inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-bold text-zk-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${focus} ${className}`}
    >
      {children}
    </button>
  );
}

/** A native modal dialog: focus is trapped and Esc closes it. */
export function Dialog({
  open, onClose, title, children, label,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label ?? title}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-[20px] border border-zk-border bg-zk-surface p-0 text-zk-text shadow-[0_24px_56px_rgba(11,23,51,0.3)] backdrop:bg-black/50 max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {open ? (
        <div className="p-6">
          <h2 className="text-lg font-extrabold tracking-[-0.01em]">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Hold-to-approve. Pointer or keyboard (hold Space or Enter) for 2 seconds.
 * With reduced motion the ring becomes plain progress text.
 */
export function HoldButton({
  onComplete, caption, label = "Hold to approve anyway", seconds = 2,
}: { onComplete: () => void; caption: string; label?: string; seconds?: number }) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const done = useRef(false);

  const cancel = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!done.current) setProgress(0);
  };
  const begin = () => {
    if (raf.current || done.current) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start.current) / (seconds * 1000));
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        raf.current = null;
        onComplete();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const secs = (progress * seconds).toFixed(1);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); begin(); }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") cancel(); }}
        onBlur={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-describedby="hold-caption"
        className={`relative inline-flex h-11 touch-none select-none items-center gap-2.5 overflow-hidden rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-bold text-zk-text hover:bg-zk-chip ${focus}`}
      >
        <svg width="18" height="18" viewBox="0 0 36 36" aria-hidden="true" className="motion-reduce:hidden">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--zk-border)" strokeWidth="4" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="var(--zk-accent)" strokeWidth="4" strokeLinecap="round"
            pathLength={100} strokeDasharray="100" strokeDashoffset={100 - progress * 100}
            transform="rotate(-90 18 18)"
          />
        </svg>
        {label}
        {progress > 0 && progress < 1 ? <span className="hidden font-mono text-xs tabular-nums text-zk-muted motion-reduce:inline">{secs} / {seconds}s</span> : null}
      </button>
      <p id="hold-caption" className="text-[13px] text-zk-muted">{caption}</p>
    </div>
  );
}

export function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function useHasMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
