export type Language = "en" | "de";
export type CourseMode = "manual" | "gpx";
export type SegmentId = string;

export interface CoursePoint {
  distanceKm: number;
  latitude: number;
  longitude: number;
  elevationM: number;
}

export interface CourseGeometry {
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

export interface ManualCourse {
  mode: "manual";
  segments: SegmentGeometry[];
}

export interface GpxCourse {
  mode: "gpx";
  id: string;
  points: CoursePoint[];
  geometry: CourseGeometry;
}

export type Course = ManualCourse | GpxCourse;

export interface AidStation {
  id: string;
  name: string;
  nameSource: "default" | "custom";
  kilometer: number;
  waterOnly: boolean;
}

export interface Endpoint {
  id: string;
  name: string;
  kilometer: number;
  waterOnly: boolean;
  kind: "start" | "station" | "finish";
}

export interface SegmentGeometry {
  id: SegmentId;
  fromId: string;
  toId: string;
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

export interface Segment extends SegmentGeometry {
  from: Endpoint;
  to: Endpoint;
  durationMinutes: number | null;
}

export interface RacePlan {
  schemaVersion: 1;
  language: Language;
  raceName: string;
  weightKg: number | null;
  intakePercent: number;
  enteredFinishMinutes: number | null;
  timingMode: "allocated" | "overridden";
  courseMode: CourseMode;
  course: Course | null;
  stations: AidStation[];
  segmentTimeOverrides: Record<SegmentId, number>;
}

export interface NutritionResult {
  energyNeedKcal: number;
  intakeTargetKcal: number;
  carbohydratesG: number;
  waterL: number;
  sodiumMg: number;
}

export interface ValidationIssue {
  code: string;
  fieldPath: string;
  values?: Record<string, string | number>;
}

export interface CalculatedPlan {
  geometry: CourseGeometry;
  totalMinutes: number;
  nutrition: NutritionResult;
  segments: Array<Segment & { nutrition: NutritionResult }>;
}

export const START_ID = "start";
export const FINISH_ID = "finish";

export function segmentId(fromId: string, toId: string): SegmentId {
  return `${fromId}--${toId}`;
}

export function createDefaultPlan(language: Language): RacePlan {
  return {
    schemaVersion: 1,
    language,
    raceName: "My race",
    weightKg: null,
    intakePercent: 30,
    enteredFinishMinutes: null,
    timingMode: "allocated",
    courseMode: "manual",
    course: null,
    stations: [],
    segmentTimeOverrides: {},
  };
}
