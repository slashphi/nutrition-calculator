import { parseGpx } from "./parseGpx";

describe("large GPX performance", () => {
  it("parses a representative 1,000-point route within ten seconds in jsdom", () => {
    const points = Array.from({ length: 1_000 }, (_, index) => {
      const latitude = 47 + index * 0.00001;
      const elevation = 1000 + (index % 200);
      return `<rtept lat="${latitude}" lon="11"><ele>${elevation}</ele></rtept>`;
    }).join("");
    const started = performance.now();
    const result = parseGpx(`<gpx><rte>${points}</rte></gpx>`);
    const elapsed = performance.now() - started;

    expect(result.points).toHaveLength(1_000);
    expect(elapsed).toBeLessThan(10_000);
  }, 15_000);
});
