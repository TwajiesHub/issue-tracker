"use client";

/* Ziki's own robot (components/agent-graphic.tsx): same shapes, same body colours picked from the name, same antenna-light
   colours. Here it also has eyes that can glance, a happy face, a nod, and a hammer. Decorative: always aria-hidden. */
const BODY_COLORS = ["#3978F6", "#7C5CE0", "#0E9F8E", "#E07A2E", "#D04F7A", "#4A5BD4"];
export const LIGHTS = { working: "#22C55E", waiting: "#F59E0B", idle: "#60A5FA", offline: "#94A3B8" } as const;

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BODY_COLORS[hash % BODY_COLORS.length];
}

export type RobotMood = "working" | "waiting" | "idle";

/** How briskly the hammer taps: fresh check-in is quick, a stale one is slow. */
export function tapSeconds(minutesSinceCheckIn: number): number {
  const m = Math.min(Math.max(minutesSinceCheckIn, 0), 14);
  return Math.round((0.5 + (m / 14) * 1.3) * 100) / 100;
}

export function PulseRobot({
  name, mood, size = 32, happy = false, nod = false, glow = false, tap = 0.9, dim = 1, droop = 0, tip, asking = false, lively = false, hop = false, badge, blip,
}: {
  name: string;
  mood: RobotMood;
  size?: number;
  /** Happy eyes (just answered). */
  happy?: boolean;
  nod?: boolean;
  glow?: boolean;
  /** Seconds per hammer tap. */
  tap?: number;
  /** Antenna light opacity while waiting (1 = bright). */
  dim?: number;
  /** Degrees the "?" sign has drooped. */
  droop?: number;
  /** Shown in a tiny tooltip on hover when waiting. */
  tip?: string;
  asking?: boolean;
  /** /whimsy only: idle life (blink, foot tap, bobbing sign, pulsing light), bigger hammer swing, floating z's. */
  lively?: boolean;
  /** A small hop (just answered). */
  hop?: boolean;
  /** The small sign by the antenna. Defaults to "?" while waiting; "✓" means finished and waiting on you; null hides it. */
  badge?: "?" | "✓" | null;
  /** Seconds until the first heartbeat blip (a working robot's antenna blinks once every 20 s). Omit for none. */
  blip?: number;
}) {
  const bs = Math.max(15, Math.round(size * 0.2));
  const body = colorFor(name);
  const waiting = mood === "waiting";
  const working = mood === "working";
  return (
    <span className="pr-has-tip relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden="true" data-robot="">
      <svg viewBox="0 0 40 40" width={size} height={size} className={`pr-robot${lively ? " pr-lively" : ""}`} data-glow={glow ? "1" : "0"} data-nod={nod ? "1" : "0"} data-hop={hop ? "1" : "0"}>
        <rect x="1" y="1" width="38" height="38" rx="12" fill={body} opacity="0.12" />
        <g className="pr-head">
          <line x1="20" y1="7" x2="20" y2="12" stroke={body} strokeWidth="2" strokeLinecap="round" />
          <circle className="pr-glow" cx="20" cy="6" r="5" fill={LIGHTS.working} />
          {lively && waiting ? <circle className="pr-beat" cx="20" cy="6" r="2.6" fill={LIGHTS.waiting} /> : null}
          <circle className="pr-light" cx="20" cy="6" r="2.6" fill={LIGHTS.waiting} opacity={waiting ? dim : 0} />
          {blip !== undefined && working ? <circle className="pr-hb" cx="20" cy="6" r="2.6" fill={LIGHTS.working} style={{ animationDelay: `${blip}s` }} /> : null}
          <circle className="pr-light" cx="20" cy="6" r="2.6" fill={LIGHTS.working} opacity={working ? 1 : 0} />
          <circle className="pr-light" cx="20" cy="6" r="2.6" fill={LIGHTS.idle} opacity={mood === "idle" ? 1 : 0} />
          <rect x="9" y="12" width="22" height="17" rx="6" fill={body} />
          <rect x="12.5" y="16" width="15" height="8.5" rx="4.25" fill="white" opacity="0.92" />
          <g className="pr-eyes" opacity={happy ? 0 : 1}>
            <circle cx="17" cy="20.25" r="1.9" fill={body} />
            <circle cx="23" cy="20.25" r="1.9" fill={body} />
          </g>
          <g className="pr-eyes-happy" opacity={happy ? 1 : 0}>
            <path d={`M15.2 21 Q17 18.2 18.8 21`} fill="none" stroke={body} strokeWidth="1.7" strokeLinecap="round" />
            <path d={`M21.2 21 Q23 18.2 24.8 21`} fill="none" stroke={body} strokeWidth="1.7" strokeLinecap="round" />
          </g>
          <rect x="6.5" y="17" width="2.5" height="6" rx="1.25" fill={body} />
          <rect x="31" y="17" width="2.5" height="6" rx="1.25" fill={body} />
        </g>
        <rect className="pr-foot" x="13" y="30" width="14" height="6" rx="3" fill={body} opacity="0.75" />
      </svg>

      <span className={`pr-hammer-wrap${lively ? " pr-big" : ""}`} data-on={working ? "1" : "0"} style={{ ["--tap" as string]: `${tap}s` }}>
        <svg viewBox="0 0 24 24" className="pr-hammer" fill="none" stroke={body} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 12-8.4 8.4a2.1 2.1 0 1 1-3-3L12 9" />
          <path d="M17.6 15 22 10.6M20.9 11.7 12.3 3.1a1 1 0 0 0-1.4 0L9.6 4.4a1 1 0 0 0 0 1.4l8.6 8.6a1 1 0 0 0 1.4 0l1.3-1.3a1 1 0 0 0 0-1.4Z" />
        </svg>
      </span>

      {mood === "idle" && lively ? (
        <span className="pointer-events-none absolute -right-1 -top-1 font-mono text-[11px] font-bold leading-none text-zk-muted">
          <span className="pr-z" style={{ animationDelay: "0s" }}>z</span>
          <span className="pr-z" style={{ animationDelay: "0.9s" }}>z</span>
          <span className="pr-z" style={{ animationDelay: "1.8s" }}>z</span>
        </span>
      ) : mood === "idle" ? (
        <span className="absolute -right-1 -top-1 font-mono text-[10px] font-bold leading-none text-zk-muted">z</span>
      ) : null}

      <span
        className={`pr-q absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full border font-extrabold leading-none ${badge === "✓" ? "border-zk-ok-fg/30 bg-zk-ok-bg text-zk-ok-fg" : "border-zk-warn-bd bg-zk-warn-bg text-zk-warn-fg"}${lively ? " pr-bob" : ""}`}
        style={{ width: bs, height: bs, fontSize: Math.round(bs * 0.66), opacity: badge === null ? 0 : badge || waiting || asking ? 1 : 0, transform: `rotate(${droop}deg) translateY(${droop / 14}px)` }}
      >
        {badge ?? "?"}
      </span>

      {tip && waiting ? (
        <span className="pr-tip absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-zk-border bg-zk-surface px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-zk-text shadow-[0_2px_8px_rgba(11,23,51,0.12)]" role="presentation">
          {tip}
        </span>
      ) : null}
    </span>
  );
}
