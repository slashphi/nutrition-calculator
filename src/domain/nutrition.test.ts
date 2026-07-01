import { calculateNutrition, roundNutrition } from "./nutrition";

describe("nutrition calculation", () => {
  it("calculates the reference scenario", () => {
    const result = calculateNutrition(
      { distanceKm: 10, ascentM: 1000 },
      80,
      30,
    );
    expect(result).toEqual({
      energyNeedKcal: 1600,
      intakeTargetKcal: 480,
      carbohydratesG: 120,
      waterL: 1.5,
      sodiumMg: 750,
    });
  });

  it("does not accept descent as an input to the formula", () => {
    expect(
      calculateNutrition({ distanceKm: 50, ascentM: 2500 }, 70, 30),
    ).toEqual(calculateNutrition({ distanceKm: 50, ascentM: 2500 }, 70, 30));
  });

  it("rounds only display values to specified increments", () => {
    expect(
      roundNutrition({
        energyNeedKcal: 1234,
        intakeTargetKcal: 370.2,
        carbohydratesG: 92.55,
        waterL: 1.1569,
        sodiumMg: 578.45,
      }),
    ).toEqual({
      energyNeedKcal: 1230,
      intakeTargetKcal: 370,
      carbohydratesG: 93,
      waterL: 1.2,
      sodiumMg: 578,
    });
  });
});
