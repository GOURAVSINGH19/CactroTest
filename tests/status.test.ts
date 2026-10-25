import { describe, expect, it } from "vitest";
import { computeStatus } from "../src/lib/status";
import { STEPS, isValidStepId } from "../src/lib/steps";

describe("computeStatus", () => {
  it("is planned with no steps", () => {
    expect(computeStatus([])).toBe("planned");
  });
  it("is ongoing with some steps", () => {
    expect(computeStatus([1])).toBe("ongoing");
  });
  it("is done with all steps", () => {
    expect(computeStatus(STEPS.map((s) => s.id))).toBe("done");
  });
  it("ignores duplicates", () => {
    expect(computeStatus([1, 1, 1])).toBe("ongoing");
  });
  it("ignores ids that are not steps (stale data)", () => {
    const allButOne = STEPS.slice(1).map((s) => s.id);
    expect(computeStatus([...allButOne, 8, 99])).toBe("ongoing");
  });
});

describe("isValidStepId", () => {
  it("rejects unknown ids", () => {
    expect(isValidStepId(1)).toBe(true);
    expect(isValidStepId(999)).toBe(false);
  });
});
