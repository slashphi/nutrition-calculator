import {
  segmentId,
  type CourseGeometry,
  type CoursePoint,
  type Endpoint,
  type SegmentGeometry,
} from "../domain/model";

interface CumulativeGeometry extends CourseGeometry {
  elevationM: number;
}

function geometryAt(
  points: CoursePoint[],
  targetKm: number,
): CumulativeGeometry {
  let ascentM = 0;
  let descentM = 0;
  if (targetKm <= 0) {
    return {
      distanceKm: 0,
      ascentM: 0,
      descentM: 0,
      elevationM: points[0]!.elevationM,
    };
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const edgeDistance = current.distanceKm - previous.distanceKm;
    const elevationDelta = current.elevationM - previous.elevationM;
    if (targetKm <= current.distanceKm) {
      const fraction =
        edgeDistance <= 0
          ? 0
          : Math.max(
              0,
              Math.min(1, (targetKm - previous.distanceKm) / edgeDistance),
            );
      const partialDelta = elevationDelta * fraction;
      if (partialDelta > 0) ascentM += partialDelta;
      else descentM += Math.abs(partialDelta);
      return {
        distanceKm: targetKm,
        ascentM,
        descentM,
        elevationM: previous.elevationM + partialDelta,
      };
    }
    if (elevationDelta > 0) ascentM += elevationDelta;
    else descentM += Math.abs(elevationDelta);
  }
  const last = points[points.length - 1]!;
  return {
    distanceKm: last.distanceKm,
    ascentM,
    descentM,
    elevationM: last.elevationM,
  };
}

export function segmentGpxCourse(
  points: CoursePoint[],
  endpoints: Endpoint[],
): SegmentGeometry[] {
  if (points.length < 2) return [];
  return endpoints.slice(1).map((to, index) => {
    const from = endpoints[index]!;
    const start = geometryAt(points, from.kilometer);
    const end = geometryAt(points, to.kilometer);
    return {
      id: segmentId(from.id, to.id),
      fromId: from.id,
      toId: to.id,
      distanceKm: end.distanceKm - start.distanceKm,
      ascentM: end.ascentM - start.ascentM,
      descentM: end.descentM - start.descentM,
    };
  });
}
