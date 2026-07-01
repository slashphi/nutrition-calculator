import { FINISH_ID, START_ID, type AidStation } from "./model";
import {
  initialManualSegment,
  mergeManualSegments,
  splitManualSegment,
  totalGeometry,
} from "./segmentation";

describe("manual segmentation", () => {
  const station: AidStation = {
    id: "aid-1",
    name: "Aid station 1",
    nameSource: "default",
    kilometer: 10,
    waterOnly: false,
  };

  it("splits and merges atomically", () => {
    const initial = initialManualSegment({
      distanceKm: 20,
      ascentM: 1500,
      descentM: 1200,
    });
    const split = splitManualSegment(
      [initial],
      station,
      { ascentM: 1000, descentM: 400 },
      { ascentM: 500, descentM: 800 },
      { [START_ID]: 0, [FINISH_ID]: 20, [station.id]: 10 },
    );
    expect(split).toHaveLength(2);
    expect(totalGeometry(split)).toEqual({
      distanceKm: 20,
      ascentM: 1500,
      descentM: 1200,
    });
    expect(mergeManualSegments(split, station.id)).toEqual([initial]);
  });
});
