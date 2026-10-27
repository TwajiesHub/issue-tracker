import { NextResponse } from "next/server";
import { simulateAttack, simulateKite } from "@/lib/simulate";

// The engine hashes with node:crypto, so it runs here and not in the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let kind: unknown;
  try {
    kind = ((await request.json()) as { kind?: unknown }).kind;
  } catch {
    return NextResponse.json({ error: "Expected JSON like {\"kind\":\"attack\"}" }, { status: 400 });
  }
  if (kind === "attack") return NextResponse.json(simulateAttack());
  if (kind === "kite") return NextResponse.json(simulateKite());
  return NextResponse.json({ error: "kind must be \"attack\" or \"kite\"" }, { status: 400 });
}
