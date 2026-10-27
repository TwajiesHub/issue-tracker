import type { Finding, LimitKind } from "./guard";

/** Limit codes in plain words, for sentences like "This breaks a limit you set: add no new libraries." */
export const LIMIT_PHRASES: Record<LimitKind, string> = {
  no_new_dependencies: "add no new libraries",
  stay_in_scope: "stay inside the files it promised",
  no_protected_files: "leave protected files alone",
};

/** Category codes the engine prints in evidence, in plain words. */
const CATEGORY_WORDS: Record<string, string> = {
  docs: "Documentation", tests: "Tests", ui: "Interface", code: "Application code",
  scripts: "Script commands", deps: "Dependencies", ci_build: "Build and CI", auth: "Sign-in and secrets",
  agent_rules: "Agent rules", unknown: "Other files",
};

/** Replaces any raw code in a sentence. Safe to run on text that has none. */
export function plainText(text: string): string {
  let out = text;
  for (const [code, phrase] of Object.entries(LIMIT_PHRASES)) out = out.split(code).join(phrase);
  return out;
}

const humanKey = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();

/** Evidence excerpts are sometimes JSON or "category: files". Turn them into lines a person can read. */
function plainExcerpt(code: string, excerpt: string): string {
  const t = excerpt.trim();
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      if (code === "author_pusher_mismatch") {
        const authors = Array.isArray(o.authors) ? o.authors.join(", ") : String(o.authors ?? "");
        return `Pushed by ${String(o.pusher ?? "someone")}\nCommit author: ${authors}`;
      }
      if (code === "obfuscated_file") {
        const size = typeof o.size === "number" ? `${o.size.toLocaleString("en-US")} bytes` : null;
        const names = typeof o.identifiers === "number" ? `${o.identifiers} scrambled-looking names` : null;
        return [size, names, o.longLine ? "has a very long line" : "no very long line"].filter(Boolean).join("\n");
      }
      return Object.entries(o).map(([k, v]) => `${humanKey(k)}: ${String(v)}`).join("\n");
    } catch {
      return t;
    }
  }
  // "ci_build: postcss.config.mjs" from the protected_path finding
  const m = /^([a-z_]+):\s(.+)$/.exec(t);
  if (m && CATEGORY_WORDS[m[1]]) return `${CATEGORY_WORDS[m[1]]}: ${m[2]}`;
  return plainText(t);
}

/** Findings as the screens show them: titles and evidence with no snake_case codes. */
export function plainFinding(f: Finding): Finding {
  const ev = f.evidence;
  return {
    ...f,
    title: plainText(f.title),
    evidence: ev && {
      ...ev,
      before: ev.before && plainText(ev.before),
      // protected_path carries a hash list as "after"; it is not for people.
      after: f.code === "protected_path" ? undefined : ev.after && plainText(ev.after),
      excerpt: ev.excerpt && plainExcerpt(f.code, ev.excerpt),
    },
  };
}
