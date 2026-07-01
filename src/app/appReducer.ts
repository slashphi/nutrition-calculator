import type { Language, RacePlan } from "../domain/model";

export type AppAction =
  | { type: "replace"; plan: RacePlan }
  | { type: "patch"; patch: Partial<RacePlan> }
  | { type: "language"; language: Language };

export function appReducer(state: RacePlan, action: AppAction): RacePlan {
  switch (action.type) {
    case "replace":
      return action.plan;
    case "patch":
      return { ...state, ...action.patch };
    case "language":
      return { ...state, language: action.language };
  }
}
