import type { ProtectedArea } from "./guard/types";

export const MAX_AREAS = 20;
export const MAX_LABEL = 60;
export const MAX_PATTERN = 200;

/** Checks a label and file pattern from the form. Returns a message to show, or null when fine. */
export function validateArea(label: string, pattern: string, existing: ProtectedArea[]): string | null {
  const l = label.trim();
  const p = pattern.trim();
  if (!l) return "Give the area a name.";
  if (l.length > MAX_LABEL) return `Keep the name under ${MAX_LABEL} characters.`;
  if (!p) return "Add a file pattern, like lib/composer/**.";
  if (p.length > MAX_PATTERN) return `Keep the pattern under ${MAX_PATTERN} characters.`;
  if (p.startsWith("/") || p.includes("..") || /\s/.test(p)) return "Use a path from the repo root, with no spaces. For example lib/composer/**.";
  if (existing.some((a) => a.label.toLowerCase() === l.toLowerCase())) return "You already have an area with that name.";
  if (existing.length >= MAX_AREAS) return "That's the most areas this demo keeps.";
  return null;
}

/** Server-side check of areas sent by the browser. Returns null if anything is off. */
export function parseAreas(value: unknown): ProtectedArea[] | null {
  if (!Array.isArray(value) || value.length > MAX_AREAS) return null;
  const out: ProtectedArea[] = [];
  for (const a of value) {
    if (!a || typeof a !== "object") return null;
    const { label, globs } = a as { label?: unknown; globs?: unknown };
    if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL) return null;
    if (!Array.isArray(globs) || globs.length === 0 || globs.length > 10) return null;
    if (globs.some((g) => typeof g !== "string" || !g || g.length > MAX_PATTERN)) return null;
    out.push({ label: label.trim(), globs: globs as string[] });
  }
  return out;
}
