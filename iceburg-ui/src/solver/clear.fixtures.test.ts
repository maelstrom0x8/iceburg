import { describe, expect, it } from "vitest";
import { clear } from "./clear";
import { allFixtures } from "./clear.fixtures";

describe.each(allFixtures)("$name", (fixture) => {
  it("matches the hand-verified expected result", () => {
    const result = clear(fixture.bids, fixture.params);
    expect(result).toEqual(fixture.expected);
  });
});
