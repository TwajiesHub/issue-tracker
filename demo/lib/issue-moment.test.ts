import { describe, expect, it } from "vitest";
import { AT, AWARD_TO_CLAIM, BIDDERS, HINT, PHASES, PICK, awardLabel, caption, derive, formatClock, rank } from "./issue-moment";

describe("the third pip", () => {
  it("starts at two of three, still confirming, with the hint showing", () => {
    const d = derive("idle");
    expect([d.votes, d.pips, d.status, d.hint]).toEqual([2, 2, "confirming", HINT]);
    expect(d.trayOn || d.claimed || d.done || d.waiting).toBe(false);
    expect(d.announce).toBe("");
  });

  it("the upvote fills the third pip at once and hides the hint", () => {
    const d = derive("voted");
    expect([d.votes, d.pips, d.status, d.hint]).toEqual([3, 3, "confirming", null]);
  });

  it("then the row says Ready for bids before anyone bids", () => {
    const d = derive("ready");
    expect([d.status, d.trayOn, d.announce]).toEqual(["ready", false, "Ready for bids."]);
  });

  it("three agents bid and then wait for a person to pick one", () => {
    const d = derive("bidding");
    expect([d.trayOn, d.waiting, d.awarded, d.claimed, d.status]).toEqual([true, true, false, false, "ready"]);
    expect(d.hint).toBe(PICK);
    expect(d.announce).toBe("3 agents bid.");
    expect(BIDDERS.map((b) => b.offer)).toEqual(["20 min", "45 min", "1 hr"]);
  });

  it("awarding any bid names that agent, then it is in the status column", () => {
    for (const b of BIDDERS) {
      const a = derive("awarded", b.name);
      expect([a.waiting, a.awarded, a.claimed, a.trayOn, a.hint]).toEqual([false, true, false, true, null]);
      expect(a.announce).toBe(`Awarded to ${b.name}. ${b.name} is on it.`);
      const c = derive("claimed", b.name);
      expect([c.status, c.claimed, c.trayOn, c.done]).toEqual(["working", true, false, true]);
      expect(caption(b.name)).toContain(b.name);
    }
  });

  it("nothing is on a timer after the bids appear except the slide into the status column", () => {
    expect(AT.voted).toBeLessThan(AT.ready);
    expect(AT.ready).toBeLessThan(AT.bidding);
    expect(AWARD_TO_CLAIM).toBeLessThanOrEqual(900);
    expect(rank("claimed")).toBe(PHASES.length - 1);
  });

  it("says something for every step after the tap", () => {
    for (const p of PHASES.slice(1)) expect(derive(p).announce.length).toBeGreaterThan(0);
  });

  it("labels each paddle for a screen reader", () => {
    expect(awardLabel(BIDDERS[0])).toBe("Award to Lyra, 20 min");
    expect(awardLabel(BIDDERS[2])).toBe("Award to Pixel, 1 hr");
  });

  it("formats the claim clock", () => {
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});
