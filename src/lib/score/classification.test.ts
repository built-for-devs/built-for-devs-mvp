import { describe, it, expect } from "vitest";
import { classificationStyles, classificationLabels } from "./classification";
import type { Classification } from "./types";

const ALL_CLASSIFICATIONS: Classification[] = [
  "exceptional",
  "excellent",
  "good",
  "needs_work",
  "poor",
];

describe("classificationStyles", () => {
  it("has an entry for every Classification value", () => {
    for (const c of ALL_CLASSIFICATIONS) {
      expect(classificationStyles[c]).toBeDefined();
      expect(classificationStyles[c].length).toBeGreaterThan(0);
    }
  });

  it("has no extra keys beyond the 5 classifications", () => {
    expect(Object.keys(classificationStyles).sort()).toEqual(
      [...ALL_CLASSIFICATIONS].sort()
    );
  });
});

describe("classificationLabels", () => {
  it("has an entry for every Classification value", () => {
    for (const c of ALL_CLASSIFICATIONS) {
      expect(classificationLabels[c]).toBeDefined();
      expect(typeof classificationLabels[c]).toBe("string");
    }
  });

  it("maps needs_work to a human-readable label", () => {
    expect(classificationLabels.needs_work).toBe("Needs Work");
  });

  it("has no extra keys beyond the 5 classifications", () => {
    expect(Object.keys(classificationLabels).sort()).toEqual(
      [...ALL_CLASSIFICATIONS].sort()
    );
  });
});
