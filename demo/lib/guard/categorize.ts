import { matchesAny, normalizePath } from "./glob";
import type { Category, FileChange } from "./types";
export const LOCKED_CATEGORIES: readonly Category[] = ["scripts", "deps", "ci_build", "auth", "agent_rules"];
export const isLocked = (category: Category) => LOCKED_CATEGORIES.includes(category);
export const isManifest = (path: string) => matchesAny(path, ["**/package.json"]);
export const isLockfile = (path: string) => matchesAny(path, ["**/pnpm-lock.yaml", "**/package-lock.json", "**/yarn.lock", "**/bun.lockb", "**/bun.lock", "**/pubspec.lock"]);
export function categorize(file: FileChange): Category[] {
  const path = normalizePath(file.path);
  // A manifest's actual categories come from its parsed changes, not its filename.
  if (isManifest(path)) return [];
  if (matchesAny(path, ["**/AGENTS.md", "**/CLAUDE.md", ".cursor/**", ".claude/**", "**/mcp*.json", "**/.mcp.json"])) return ["agent_rules"];
  if (matchesAny(path, ["**/auth*.ts", "**/middleware.ts", "**/auth/**", "**/*secret*", "**/.env*", "**/permissions/**"])) return ["auth"];
  if (isLockfile(path) || matchesAny(path, ["**/requirements*.txt", "**/pubspec.yaml"])) return ["deps"];
  if (matchesAny(path, [".github/**", "**/Dockerfile*", "**/docker-compose*.yml", "**/vercel.json", "**/next.config.*", "**/postcss.config.*", "**/tailwind.config.*", "**/vite.config.*", "**/webpack.config.*", "**/tsconfig*.json", "**/Makefile", "scripts/**", ".husky/**", "prisma/migrations/**"])) return ["ci_build"];
  if (!path.includes("/") && (file.status === "added" || file.status === "renamed") && /\.(?:js|mjs|cjs|sh)$/.test(path)) return ["unknown"];
  if (matchesAny(path, ["**/*.md", "docs/**", "LICENSE"])) return ["docs"];
  if (matchesAny(path, ["**/*.test.*", "**/*.spec.*", "e2e/**", "**/__tests__/**"])) return ["tests"];
  if (!/\.(?:js|mjs|cjs)$/.test(path) && matchesAny(path, ["components/**", "app/**/*.tsx", "**/*.css", "public/**"])) return ["ui"];
  if (/\.(?:ts|tsx|js|jsx|mjs|cjs|dart|py|rb|go|rs|java|kt|swift|c|cpp|h|cs|sh)$/.test(path)) return ["code"];
  return ["unknown"];
}
