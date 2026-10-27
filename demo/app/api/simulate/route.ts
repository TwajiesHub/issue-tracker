import { NextResponse } from "next/server";
import { simulateAttack, simulateKite } from "@/lib/simulate";
import { parseAreas } from "@/lib/areas";

// The engine hashes with node:crypto, so it runs here and not in the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { kind?: unknown; areas?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected JSON like {\"kind\":\"attack\"}" }, { status: 400 });
  }
  const areas = parseAreas(body.areas ?? []);
  if (!areas) return NextResponse.json({ error: "areas must be [{label, globs[]}] with short strings" }, { status: 400 });
  if (body.kind === "attack") return NextResponse.json(simulateAttack(areas));
  if (body.kind === "kite") return NextResponse.json(simulateKite(areas));
  return NextResponse.json({ error: "kind must be \"attack\" or \"kite\"" }, { status: 400 });
}
