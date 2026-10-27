import { isLocked } from "./categorize";
import type { Category, Delegation } from "./types";
export function wilsonLowerBound(successes: number, n: number, z = 1.96): number {
  if (!Number.isInteger(n) || !Number.isInteger(successes) || successes < 0 || successes > n || n < 0 || !Number.isFinite(z) || z < 0) throw new RangeError("Invalid Wilson inputs");
  if (n === 0) return 0;
  const p = successes / n, z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}
export function suggestDelegation(input: {category: Category; approvals: number; total: number; brokenPromisesInWindow: number}): Delegation | null {
  if (isLocked(input.category) || input.category === "unknown" || input.total < 10 || input.brokenPromisesInWindow !== 0) return null;
  return wilsonLowerBound(input.approvals, input.total) >= 0.75 ? "auto" : null;
}
