import { describe, expect, it } from "vitest";
import { TOTAL_SECONDS, formatRemaining, PREF_LABELS } from "./pulse";
import { tapSeconds } from "../components/pulse/robot";

describe("the pulse", () => {
  it("starts Kite's wait at 3 h 20 m", () => {
    expect(TOTAL_SECONDS).toBe(12000);
    expect(formatRemaining(TOTAL_SECONDS)).toBe("3h 20m");
  });
  it("counts down in plain words", () => {
    expect(formatRemaining(3 * 3600 + 5 * 60)).toBe("3h 05m");
    expect(formatRemaining(42 * 60)).toBe("42m");
    expect(formatRemaining(4 * 60 + 12)).toBe("4m 12s");
    expect(formatRemaining(0)).toBe("0m 00s");
  });
  it("taps faster for a fresh check-in than a stale one, and stays in a calm range", () => {
    expect(tapSeconds(0)).toBeLessThan(tapSeconds(12));
    expect(tapSeconds(0)).toBeGreaterThanOrEqual(0.5);
    expect(tapSeconds(999)).toBeLessThanOrEqual(1.8);
    expect(tapSeconds(-5)).toBe(tapSeconds(0));
  });
  it("names every interruption setting in plain words", () => {
    for (const k of Object.keys(PREF_LABELS) as (keyof typeof PREF_LABELS)[]) {
      expect(PREF_LABELS[k].setting).not.toMatch(/_|guard/i);
      expect(PREF_LABELS[k].chip.length).toBeGreaterThan(5);
    }
  });
});
