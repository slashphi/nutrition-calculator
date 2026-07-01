import type { CourseGeometry, CoursePoint } from "../domain/model";

const EARTH_RADIUS_KM = 6371.0088;

export interface RawCoursePoint {
  latitude: number;
  longitude: number;
  elevationM: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: RawCoursePoint, b: RawCoursePoint): number {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinLat = Math.sin(latDelta / 2);
  const sinLon = Math.sin(lonDelta / 2);
  const h = sinLat ** 2 + Math.cos(lat1) * Math.cos(lat2) * sinLon ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function buildCoursePoints(raw: RawCoursePoint[]): {
  points: CoursePoint[];
  geometry: CourseGeometry;
} {
  let distanceKm = 0;
  let ascentM = 0;
  let descentM = 0;
  const points: CoursePoint[] = raw.map((point, index) => {
    if (index > 0) {
      const previous = raw[index - 1]!;
      distanceKm += haversineKm(previous, point);
      const delta = point.elevationM - previous.elevationM;
      if (delta > 0) ascentM += delta;
      else descentM += Math.abs(delta);
    }
    return { ...point, distanceKm };
  });
  return { points, geometry: { distanceKm, ascentM, descentM } };
}
