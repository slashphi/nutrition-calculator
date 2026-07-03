import type {
  CoursePoint,
  GpxCourse,
  ManualCourse,
  RacePlan,
} from "../domain/model";
import {
  openDatabase,
  PLAN_KEY,
  requestResult,
  transactionDone,
} from "./database";

type StoredGpxCourse = Omit<GpxCourse, "points">;
type StoredPlan = Omit<RacePlan, "course"> & {
  course: ManualCourse | StoredGpxCourse | null;
};

type StoredPlanV1 = Omit<
  StoredPlan,
  "schemaVersion" | "nutritionAssignments"
> & {
  schemaVersion: 1;
};

function isPlanShape(value: unknown): value is StoredPlan | StoredPlanV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredPlan | StoredPlanV1>;
  return (
    (candidate.schemaVersion === 1 || candidate.schemaVersion === 2) &&
    (candidate.language === "en" || candidate.language === "de") &&
    typeof candidate.raceName === "string" &&
    Array.isArray(candidate.stations)
  );
}

function validSegmentIds(plan: StoredPlan | StoredPlanV1): Set<string> {
  if (plan.course?.mode === "manual") {
    return new Set(plan.course.segments.map((segment) => segment.id));
  }
  if (plan.course?.mode === "gpx") {
    const stationIds = [...plan.stations]
      .sort((left, right) => left.kilometer - right.kilometer)
      .map((station) => station.id);
    const endpointIds = ["start", ...stationIds, "finish"];
    return new Set(
      endpointIds
        .slice(0, -1)
        .map((fromId, index) => `${fromId}--${endpointIds[index + 1]!}`),
    );
  }
  return new Set();
}

function migratePlan(plan: StoredPlan | StoredPlanV1): StoredPlan {
  const segmentIds = validSegmentIds(plan);
  const rawAssignments =
    plan.schemaVersion === 2 && Array.isArray(plan.nutritionAssignments)
      ? plan.nutritionAssignments
      : [];
  const seen = new Set<string>();
  const nutritionAssignments = rawAssignments.filter((assignment) => {
    if (!assignment || typeof assignment !== "object") return false;
    const candidate = assignment as Partial<
      StoredPlan["nutritionAssignments"][number]
    >;
    if (
      typeof candidate.segmentId !== "string" ||
      !segmentIds.has(candidate.segmentId) ||
      typeof candidate.optionId !== "string" ||
      !candidate.optionId ||
      !Number.isSafeInteger(candidate.servings) ||
      (candidate.servings ?? 0) <= 0
    )
      return false;
    const key = `${candidate.segmentId}\u0000${candidate.optionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    ...plan,
    schemaVersion: 2,
    nutritionAssignments,
  };
}

export async function savePlan(plan: RacePlan): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(["plans", "courses"], "readwrite");
  let storedCourse: StoredPlan["course"] = plan.course;
  if (plan.course?.mode === "gpx") {
    storedCourse = {
      mode: "gpx",
      id: plan.course.id,
      geometry: plan.course.geometry,
    };
    transaction.objectStore("courses").put(plan.course.points, plan.course.id);
  }
  const stored: StoredPlan = { ...plan, course: storedCourse };
  transaction.objectStore("plans").put(stored, PLAN_KEY);
  await transactionDone(transaction);
}

export async function loadPlan(): Promise<RacePlan | null> {
  const database = await openDatabase();
  const transaction = database.transaction(["plans", "courses"], "readonly");
  const stored = await requestResult(
    transaction.objectStore("plans").get(PLAN_KEY) as IDBRequest<unknown>,
  );
  if (!isPlanShape(stored)) return null;
  const migrated = migratePlan(stored);
  if (migrated.course?.mode !== "gpx") return migrated as RacePlan;
  const points = await requestResult(
    transaction.objectStore("courses").get(migrated.course.id) as IDBRequest<
      CoursePoint[] | undefined
    >,
  );
  if (!Array.isArray(points) || points.length < 2) {
    return { ...migrated, course: null, courseMode: "gpx" };
  }
  return { ...migrated, course: { ...migrated.course, points } };
}
