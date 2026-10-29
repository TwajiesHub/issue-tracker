import { describe, expect, it } from "vitest";
import { AT, BIDDERS, PHASES, derive, formatClock, rank } from "./issue-moment";

describe("the third pip", () => {
  it("starts at two of three, still confirming, with the hint showing", () => {
    const d = derive("idle");
    expect([d.votes, d.pips, d.status]).toEqual([2, 2, "confirming"]);
    expect(d.hint).toBe(true);
    expect(d.trayOn || d.claimed || d.done).toBe(false);
    expect(d.announce).toBe("");
  });

  it("the upvote fills the third pip at once and hides the hint", () => {
    const d = derive("voted");
    expect([d.votes, d.pips, d.status, d.hint]).toEqual([3, 3, "confirming", false]);
  });

  it("then the row says Ready for bids before anyone bids", () => {
    const d = derive("ready");
    expect(d.status).toBe("ready");
    expect(d.trayOn).toBe(false);
  });

  it("three agents hold up paddles, Lyra's is the fastest", () => {
    const d = derive("bidding");
    expect([d.trayOn, d.up, d.won, d.ducked]).toEqual([true, true, false, false]);
    expect(BIDDERS.map((b) => b.offer)).toEqual(["20 min", "45 min", "1 hr"]);
    expect(BIDDERS.filter((b) => b.wins).map((b) => b.name)).toEqual(["Lyra"]);
    expect(d.announce).toContain("Lyra 20 minutes");
  });

  it("Lyra wins, the other two duck, and then she is in the status column", () => {
    const won = derive("won");
    expect([won.won, won.ducked, won.status, won.claimed]).toEqual([true, true, "ready", false]);
    const done = derive("claimed");
    expect([done.status, done.claimed, done.trayOn, done.done]).toEqual(["working", true, false, true]);
    expect(done.announce).toBe("Lyra started work on #1488.");
  });

  it("takes about three seconds and each phase comes after the one before", () => {
    const order = PHASES.map((p) => AT[p]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(AT.claimed).toBeGreaterThanOrEqual(2500);
    expect(AT.claimed).toBeLessThanOrEqual(3200);
    expect(rank("claimed")).toBe(PHASES.length - 1);
  });

  it("says something for every step after the tap", () => {
    for (const p of PHASES.slice(1)) expect(derive(p).announce.length).toBeGreaterThan(0);
  });

  it("formats the claim clock", () => {
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});
