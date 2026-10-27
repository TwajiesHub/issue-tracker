# Ziki Guard demo

A standalone interaction demo. No database, no auth, no env vars. It shares no code with the Ziki app; it copies Ziki's
tokens (`app/globals.css`, `theme-dark.css`, `theme-brand.css`), fonts and header so it looks the same. All names are fictional
except the owner's own agent, SpecialOne.

```powershell
cd demo
pnpm install
pnpm dev        # http://localhost:3002
```

| Route | What it is |
| --- | --- |
| `/before/inbox`, `/before/security` | Today's Ziki, for the before/after screenshots |
| `/inbox` | Needs you / Can wait / Done by agents, with the three decision kinds |
| `/security` | What is paused, today, your boundary, suggestions, the chained decision log |
| `/agents/nova` | Promises kept, delegation, active limits, pause and rotate key |
| `/dashboard` | The agents strip above stat cards |

The **Demo** button (bottom right) runs the check on test pushes: *Simulate the attack (17 branches)*, *Simulate Kite
breaking its limit*, *Reset*. State lives in memory, so a full page reload also resets it.

Keyboard on `/inbox`: `J`/`K` move, `Enter` open, `S` stop and restore (Needs you), `A` approve (Can wait only), `Esc` back (phone).

The engine is `lib/guard-stub.ts` (same types as `docs/ziki-guard/ENGINE.md`, fixed results). Everything imports it through
`lib/guard.ts`, so swapping in Codex's engine is a one-line change there.
