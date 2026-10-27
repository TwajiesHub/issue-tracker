import { describe, expect, it } from "vitest";
import { plainFinding, plainText, LIMIT_PHRASES } from "./plain";
import { simulateAttack, simulateKite } from "./simulate";
import { pausedItem } from "./scenario";

const SNAKE = /\b[a-z]+(?:_[a-z]+)+\b/;

describe("plain words", () => {
  it("maps the three limit codes", () => {
    expect(plainText("This breaks a limit you set: no_new_dependencies.")).toBe("This breaks a limit you set: add no new libraries.");
    expect(LIMIT_PHRASES.stay_in_scope).toBe("stay inside the files it promised");
    expect(LIMIT_PHRASES.no_protected_files).toBe("leave protected files alone");
  });
  it("leaves ordinary text alone", () => {
    expect(plainText("A long run of whitespace hides content on this line.")).toBe("A long run of whitespace hides content on this line.");
  });
  it("no finding on a decision shows a snake_case code", () => {
    for (const sim of [simulateAttack(), simulateKite(), simulateKite([{ label: "Composer", globs: ["lib/composer/**"] }])]) {
      const item = pausedItem(sim, 0);
      const shown = [item.paused!.note, item.paused!.paragraph, ...item.paused!.findings.flatMap((f) => [f.title, f.evidence?.before, f.evidence?.after, f.evidence?.excerpt])];
      for (const text of shown) if (text) expect(text, text).not.toMatch(SNAKE);
    }
  });
  it("reads the Kite limit sentence in plain words", () => {
    const f = pausedItem(simulateKite(), 0).paused!.findings.find((x) => x.code === "broke_limit")!;
    expect(f.title).toBe("This breaks a limit you set: add no new libraries.");
    expect(plainFinding(f).title).toBe(f.title);
  });
});
