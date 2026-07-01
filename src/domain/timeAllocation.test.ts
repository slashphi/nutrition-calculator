import type { SegmentGeometry } from "./model";
import {
  allocateSegmentTimes,
  formatDuration,
  parseDuration,
  resolveSegmentTimes,
} from "./timeAllocation";

const segments: SegmentGeometry[] = [
  {
    id: "a",
    fromId: "start",
    toId: "one",
    distanceKm: 10,
    ascentM: 1000,
    descentM: 0,
  },
  {
    id: "b",
    fromId: "one",
    toId: "finish",
    distanceKm: 10,
    ascentM: 0,
    descentM: 0,
  },
];

describe("race time", () => {
  it("parses durations beyond 24 hours", () => {
    expect(parseDuration("30:05")).toBe(1805);
    expect(formatDuration(1805)).toBe("30:05");
    expect(parseDuration("10:60")).toBeNull();
    expect(parseDuration("00:00")).toBeNull();
  });

  it("allocates by effort and keeps the exact total", () => {
    const result = allocateSegmentTimes(segments, 901);
    expect(result).toEqual({ a: 601, b: 300 });
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(
      901,
    );
  });

  it("derives the total after an override", () => {
    expect(resolveSegmentTimes(segments, 900, { a: 700 })).toEqual({
      times: { a: 700, b: 300 },
      totalMinutes: 1000,
      hasOverrides: true,
    });
  });
});
