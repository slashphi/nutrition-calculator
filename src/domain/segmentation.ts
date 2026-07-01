import {
  FINISH_ID,
  START_ID,
  segmentId,
  type AidStation,
  type CourseGeometry,
  type Endpoint,
  type SegmentGeometry,
} from "./model";

export function sortStations(stations: AidStation[]): AidStation[] {
  return [...stations].sort((a, b) => a.kilometer - b.kilometer);
}

export function createEndpoints(
  stations: AidStation[],
  courseDistanceKm: number,
  labels: { start: string; finish: string },
): Endpoint[] {
  const middle: Endpoint[] = sortStations(stations).map((station) => ({
    ...station,
    kind: "station",
  }));
  return [
    {
      id: START_ID,
      name: labels.start,
      kilometer: 0,
      waterOnly: false,
      kind: "start",
    },
    ...middle,
    {
      id: FINISH_ID,
      name: labels.finish,
      kilometer: courseDistanceKm,
      waterOnly: false,
      kind: "finish",
    },
  ];
}

export function totalGeometry(segments: SegmentGeometry[]): CourseGeometry {
  return segments.reduce(
    (total, segment) => ({
      distanceKm: total.distanceKm + segment.distanceKm,
      ascentM: total.ascentM + segment.ascentM,
      descentM: total.descentM + segment.descentM,
    }),
    { distanceKm: 0, ascentM: 0, descentM: 0 },
  );
}

export function initialManualSegment(
  geometry: CourseGeometry,
): SegmentGeometry {
  return {
    id: segmentId(START_ID, FINISH_ID),
    fromId: START_ID,
    toId: FINISH_ID,
    ...geometry,
  };
}

export function splitManualSegment(
  segments: SegmentGeometry[],
  station: AidStation,
  left: Pick<CourseGeometry, "ascentM" | "descentM">,
  right: Pick<CourseGeometry, "ascentM" | "descentM">,
  stationKilometers: Record<string, number>,
): SegmentGeometry[] {
  const index = segments.findIndex((segment) => {
    const fromKm = stationKilometers[segment.fromId];
    const toKm = stationKilometers[segment.toId];
    return (
      fromKm !== undefined &&
      toKm !== undefined &&
      station.kilometer > fromKm &&
      station.kilometer < toKm
    );
  });
  if (index < 0) throw new Error("station.outOfRange");
  const current = segments[index]!;
  const fromKm = stationKilometers[current.fromId]!;
  const toKm = stationKilometers[current.toId]!;
  const replacement: SegmentGeometry[] = [
    {
      id: segmentId(current.fromId, station.id),
      fromId: current.fromId,
      toId: station.id,
      distanceKm: station.kilometer - fromKm,
      ...left,
    },
    {
      id: segmentId(station.id, current.toId),
      fromId: station.id,
      toId: current.toId,
      distanceKm: toKm - station.kilometer,
      ...right,
    },
  ];
  return [
    ...segments.slice(0, index),
    ...replacement,
    ...segments.slice(index + 1),
  ];
}

export function mergeManualSegments(
  segments: SegmentGeometry[],
  stationId: string,
): SegmentGeometry[] {
  const leftIndex = segments.findIndex((segment) => segment.toId === stationId);
  const rightIndex = segments.findIndex(
    (segment) => segment.fromId === stationId,
  );
  if (leftIndex < 0 || rightIndex !== leftIndex + 1) return segments;
  const left = segments[leftIndex]!;
  const right = segments[rightIndex]!;
  const merged: SegmentGeometry = {
    id: segmentId(left.fromId, right.toId),
    fromId: left.fromId,
    toId: right.toId,
    distanceKm: left.distanceKm + right.distanceKm,
    ascentM: left.ascentM + right.ascentM,
    descentM: left.descentM + right.descentM,
  };
  return [
    ...segments.slice(0, leftIndex),
    merged,
    ...segments.slice(rightIndex + 1),
  ];
}
