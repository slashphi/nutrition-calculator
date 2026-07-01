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

function isPlanShape(value: unknown): value is StoredPlan {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredPlan>;
  return (
    candidate.schemaVersion === 1 &&
    (candidate.language === "en" || candidate.language === "de") &&
    typeof candidate.raceName === "string" &&
    Array.isArray(candidate.stations)
  );
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
  if (stored.course?.mode !== "gpx") return stored as RacePlan;
  const points = await requestResult(
    transaction.objectStore("courses").get(stored.course.id) as IDBRequest<
      CoursePoint[] | undefined
    >,
  );
  if (!Array.isArray(points) || points.length < 2) {
    return { ...stored, course: null, courseMode: "gpx" };
  }
  return { ...stored, course: { ...stored.course, points } };
}
