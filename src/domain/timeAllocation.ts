import { calculateEffort } from "./nutrition";
import type { SegmentGeometry, SegmentId } from "./model";

export function parseDuration(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

export function formatDuration(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function allocateSegmentTimes(
  segments: SegmentGeometry[],
  totalMinutes: number,
): Record<SegmentId, number> {
  if (segments.length === 0 || totalMinutes <= 0) return {};
  const efforts = segments.map((segment) =>
    calculateEffort(segment.distanceKm, segment.ascentM),
  );
  const totalEffort = efforts.reduce((sum, value) => sum + value, 0);
  if (totalEffort <= 0) return {};

  const result: Record<SegmentId, number> = {};
  let assigned = 0;
  let cumulativeEffort = 0;
  segments.forEach((segment, index) => {
    cumulativeEffort += efforts[index]!;
    const isLast = index === segments.length - 1;
    const boundary = isLast
      ? totalMinutes
      : Math.round((totalMinutes * cumulativeEffort) / totalEffort);
    const minutes = boundary - assigned;
    result[segment.id] = minutes;
    assigned = boundary;
  });
  return result;
}

export function resolveSegmentTimes(
  segments: SegmentGeometry[],
  enteredTotal: number | null,
  overrides: Record<SegmentId, number>,
): {
  times: Record<SegmentId, number>;
  totalMinutes: number | null;
  hasOverrides: boolean;
} {
  if (enteredTotal === null)
    return { times: {}, totalMinutes: null, hasOverrides: false };
  const allocated = allocateSegmentTimes(segments, enteredTotal);
  let hasOverrides = false;
  const times: Record<SegmentId, number> = {};
  for (const segment of segments) {
    const overridden = overrides[segment.id];
    if (overridden !== undefined) {
      hasOverrides = true;
      times[segment.id] = overridden;
    } else {
      times[segment.id] = allocated[segment.id] ?? 0;
    }
  }
  const totalMinutes = hasOverrides
    ? Object.values(times).reduce<number>((sum, value) => sum + value, 0)
    : enteredTotal;
  return { times, totalMinutes, hasOverrides };
}
