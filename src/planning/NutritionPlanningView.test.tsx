import { fireEvent, render, screen } from "@testing-library/react";
import type { NutritionOption } from "../catalogue/model";
import type { CalculatedPlan } from "../domain/model";
import {
  AUTOMATIC_PLANNING_DEADLINE_MS,
  NutritionPlanningView,
} from "./NutritionPlanningView";

const requestOptimizationMock = vi.hoisted(() => vi.fn());

vi.mock("./optimizer/optimizerClient", () => ({
  requestOptimization: requestOptimizationMock,
}));

const calculated = {
  nutrition: {
    energyNeedKcal: 100,
    intakeTargetKcal: 30,
    carbohydratesG: 10,
    waterL: 0.1,
    sodiumMg: 20,
  },
  segments: [
    {
      id: "start--finish",
      from: { id: "start", name: "Start" },
      to: { id: "finish", name: "Finish" },
      nutrition: {
        energyNeedKcal: 100,
        intakeTargetKcal: 30,
        carbohydratesG: 10,
        waterL: 0.1,
        sodiumMg: 20,
      },
    },
  ],
} as CalculatedPlan;

const options: NutritionOption[] = [
  {
    id: "gel",
    brand: "Test",
    name: "Gel",
    carbohydratesG: 10,
    waterDeciliters: 1,
    sodiumMg: 20,
    available: true,
    source: "custom",
  },
];

describe("NutritionPlanningView", () => {
  it("shows accessible progress while using the ten-second deadline", () => {
    requestOptimizationMock.mockReturnValue({
      promise: new Promise(() => undefined),
      cancel: vi.fn(),
    });

    const { container } = render(
      <NutritionPlanningView
        language="en"
        calculated={calculated}
        assignments={[]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Create automatic plan" }),
    );

    expect(requestOptimizationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deadlineMs: AUTOMATIC_PLANNING_DEADLINE_MS,
      }),
    );
    expect(AUTOMATIC_PLANNING_DEADLINE_MS).toBe(10_000);
    expect(screen.getByRole("status")).toHaveTextContent("Creating best plan…");
    expect(container.querySelector(".nutrition-planner")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(container.querySelector(".planning-loader")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel planning" }),
    ).toBeInTheDocument();
  });

  it("shows target, plan, and signed delta in a nutrient table", () => {
    render(
      <NutritionPlanningView
        language="en"
        calculated={calculated}
        assignments={[
          { segmentId: "start--finish", optionId: "gel", servings: 1.1 },
        ]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    const firstTable = screen.getAllByRole("table")[0] as HTMLTableElement;
    expect(firstTable).toHaveTextContent("CategoryTargetPlanDelta");
    expect(firstTable).toHaveTextContent("Carbohydrates10 g11 g+1 g");
    expect(
      firstTable.querySelector(".nutrition-delta-warning"),
    ).toHaveTextContent("+1 g");
    expect(firstTable).not.toHaveTextContent("Shortfall");
    expect(firstTable).not.toHaveTextContent("Surplus");
  });

  it("marks deltas over twenty percent as critical", () => {
    render(
      <NutritionPlanningView
        language="en"
        calculated={calculated}
        assignments={[]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    const firstTable = screen.getAllByRole("table")[0] as HTMLTableElement;
    expect(
      firstTable.querySelectorAll(".nutrition-delta-critical"),
    ).toHaveLength(3);
  });

  it("applies highlighting only above the percentage thresholds", () => {
    const { unmount } = render(
      <NutritionPlanningView
        language="en"
        calculated={calculated}
        assignments={[
          { segmentId: "start--finish", optionId: "gel", servings: 1.05 },
        ]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    const fivePercentTable = screen.getAllByRole(
      "table",
    )[0] as HTMLTableElement;
    const fivePercentDelta = fivePercentTable.rows[1]!.cells[3]!;
    expect(fivePercentDelta).not.toHaveClass("nutrition-delta-warning");
    expect(fivePercentDelta).not.toHaveClass("nutrition-delta-critical");
    unmount();

    render(
      <NutritionPlanningView
        language="en"
        calculated={calculated}
        assignments={[
          { segmentId: "start--finish", optionId: "gel", servings: 1.2 },
        ]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    const twentyPercentTable = screen.getAllByRole(
      "table",
    )[0] as HTMLTableElement;
    const twentyPercentDelta = twentyPercentTable.rows[1]!.cells[3]!;
    expect(twentyPercentDelta).toHaveClass("nutrition-delta-warning");
    expect(twentyPercentDelta).not.toHaveClass("nutrition-delta-critical");
  });
});
