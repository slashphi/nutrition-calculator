export type GpxErrorCode =
  | "gpx.invalidXml"
  | "gpx.mixedTypes"
  | "gpx.multipleTracks"
  | "gpx.multipleRoutes"
  | "gpx.multipleSegments"
  | "gpx.unsupported"
  | "gpx.tooFewPoints"
  | "gpx.invalidCoordinate"
  | "gpx.missingElevation";

export class GpxError extends Error {
  constructor(public readonly code: GpxErrorCode) {
    super(code);
    this.name = "GpxError";
  }
}
