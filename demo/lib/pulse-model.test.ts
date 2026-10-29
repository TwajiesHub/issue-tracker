import { describe, expect, it } from "vitest";
import { derive, finalStages, formatPoints, type Core, type Stages } from "./pulse-model";

const start: Core = { answer: null, released: false, ship: "ready" };
const zero: Stages = { kite: 0, ship: 0, release: 0 };

describe("the pulse model", () => {
  it("starts with two things waiting on you and Kite's card in front", () => {
    const d = derive(start, zero);
    expect([d.moving, d.waiting, d.stuck]).toEqual([14, 2, 2]);
    expect(d.slot).toBe("kite");
    expect(d.position).toBe(1);
    expect(d.points).toBe(2340);
    expect(d.goal).toMatchObject({ done: 6, total: 9, spent: 1200, pool: 2000 });
    expect(d.counts).toMatchObject({ bidding: 3, building: 6, testing: 4, merged: 9 });
  });

  it("answering Kite counts it once the moment settles, then the ship card is next", () => {
    const answered: Core = { ...start, answer: "“28 Oct”" };
    expect(derive(answered, { ...zero, kite: 2 }).waiting).toBe(2);
    const settled = derive(answered, { ...zero, kite: 3 });
    expect([settled.moving, settled.waiting]).toEqual([15, 1]);
    expect(settled.kiteLine).toBe("answered");
    expect(settled.slot).toBe("kite");
    const next = derive(answered, { ...zero, kite: 4 });
    expect(next.slot).toBe("ship");
    expect(next.position).toBe(2);
  });

  it("shipping moves Nova to Merged, ticks the count, then the points, then catches up", () => {
    const shipped: Core = { answer: "“28 Oct”", released: false, ship: "shipped" };
    const walking = derive(shipped, { kite: 4, ship: 2, release: 0 });
    expect(walking.novaStage).toBe("merged");
    expect(walking.counts).toMatchObject({ testing: 3, merged: 9 });
    const ticked = derive(shipped, { kite: 4, ship: 3, release: 0 });
    expect(ticked.counts.merged).toBe(10);
    expect(ticked.waiting).toBe(0);
    expect(ticked.goal).toMatchObject({ done: 7, spent: 1650 });
    expect(ticked.points).toBe(2340);
    const paid = derive(shipped, { kite: 4, ship: 4, release: 0 });
    expect(paid.points).toBe(2790);
    expect(paid.slot).toBe("caught-up");
    expect(paid.fixesMerged).toBe(10);
  });

  it("Not yet keeps it waiting and out of the points", () => {
    const held = derive({ answer: "x", released: false, ship: "held" }, { kite: 4, ship: 0, release: 0 });
    expect(held.slot).toBe("held");
    expect(held.waiting).toBe(1);
    expect(held.points).toBe(2340);
  });

  it("when Kite's clock runs out it walks back to Bidding and the ship card follows", () => {
    const core: Core = { ...start, released: true };
    const mid = derive(core, { ...zero, release: 2 });
    expect(mid.kiteStage).toBe("bidding");
    expect(mid.counts).toMatchObject({ bidding: 4, building: 5 });
    const done = derive(core, { ...zero, release: 3 });
    expect([done.moving, done.waiting]).toEqual([14, 1]);
    expect(done.kiteLine).toBe("released");
    expect(done.slot).toBe("ship");
  });

  it("a reload shows the settled state without replaying", () => {
    const core: Core = { answer: "x", released: false, ship: "shipped" };
    expect(derive(core, finalStages(core)).slot).toBe("caught-up");
    expect(formatPoints(2790)).toBe("2,790");
  });
});
