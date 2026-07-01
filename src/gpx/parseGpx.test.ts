import { parseGpx } from "./parseGpx";
import { segmentGpxCourse } from "./segmentCourse";
import { createEndpoints } from "../domain/segmentation";

const track = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg>
    <trkpt lat="47.0000" lon="11.0000"><ele>1000</ele></trkpt>
    <trkpt lat="47.0100" lon="11.0000"><ele>1100</ele></trkpt>
    <trkpt lat="47.0200" lon="11.0000"><ele>1050</ele></trkpt>
  </trkseg></trk>
</gpx>`;

const route = `<?xml version="1.0"?>
<gpx><rte>
  <rtept lat="47" lon="11"><ele>1000</ele></rtept>
  <rtept lat="47.01" lon="11"><ele>1050</ele></rtept>
</rte></gpx>`;

describe("GPX", () => {
  it("parses namespaced tracks using raw elevation", () => {
    const result = parseGpx(track);
    expect(result.points).toHaveLength(3);
    expect(result.geometry.distanceKm).toBeGreaterThan(2);
    expect(result.geometry.ascentM).toBe(100);
    expect(result.geometry.descentM).toBe(50);
  });

  it("parses routes", () => {
    expect(parseGpx(route).geometry.ascentM).toBe(50);
  });

  it("rejects multiple track segments", () => {
    const invalid = track.replace("</trkseg>", "</trkseg><trkseg></trkseg>");
    expect(() => parseGpx(invalid)).toThrowError("gpx.multipleSegments");
  });

  it("rejects multiple tracks and multiple routes", () => {
    const secondTrack = track.replace("</gpx>", "<trk><trkseg /></trk></gpx>");
    const secondRoute = route.replace("</gpx>", "<rte><rtept /></rte></gpx>");
    expect(() => parseGpx(secondTrack)).toThrowError("gpx.multipleTracks");
    expect(() => parseGpx(secondRoute)).toThrowError("gpx.multipleRoutes");
  });

  it("rejects malformed and waypoint-only files", () => {
    expect(() => parseGpx("<gpx><trk>")).toThrowError("gpx.invalidXml");
    expect(() =>
      parseGpx("<gpx><wpt lat='47' lon='11'><ele>1</ele></wpt></gpx>"),
    ).toThrowError("gpx.unsupported");
  });

  it("rejects points without elevation", () => {
    expect(() => parseGpx(track.replace("<ele>1100</ele>", ""))).toThrowError(
      "gpx.missingElevation",
    );
  });

  it("interpolates segment elevation at a race kilometre", () => {
    const course = parseGpx(track);
    const midpoint = course.geometry.distanceKm / 2;
    const endpoints = createEndpoints(
      [
        {
          id: "mid",
          name: "Mid",
          nameSource: "custom",
          kilometer: midpoint,
          waterOnly: false,
        },
      ],
      course.geometry.distanceKm,
      { start: "Start", finish: "Finish" },
    );
    const segments = segmentGpxCourse(course.points, endpoints);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.distanceKm + segments[1]!.distanceKm).toBeCloseTo(
      course.geometry.distanceKm,
    );
    expect(segments[0]!.ascentM + segments[1]!.ascentM).toBeCloseTo(
      course.geometry.ascentM,
    );
  });
});
