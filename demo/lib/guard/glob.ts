export function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/, "");
}
export function matchGlob(pattern: string, path: string): boolean {
  const glob = normalizePath(pattern);
  let expression = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        expression += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
        i += glob[i + 2] === "/" ? 2 : 1;
      } else expression += "[^/]*";
    } else if (c === "?") expression += "[^/]";
    else expression += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${expression}$`).test(normalizePath(path));
}
export const matchesAny = (path: string, patterns: readonly string[]) => patterns.some(pattern => matchGlob(pattern, path));
