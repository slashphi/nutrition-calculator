import { GpxError } from "./gpxErrors";
import { buildCoursePoints, type RawCoursePoint } from "./geometry";

function elementsByLocalName(
  root: Document | Element,
  name: string,
): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", name));
}

function directChildren(element: Element, name: string): Element[] {
  return Array.from(element.children).filter(
    (child) => child.localName === name,
  );
}

function parsePoints(elements: Element[]): RawCoursePoint[] {
  if (elements.length < 2) throw new GpxError("gpx.tooFewPoints");
  return elements.map((element) => {
    const latitudeAttribute = element.getAttribute("lat");
    const longitudeAttribute = element.getAttribute("lon");
    const latitude = Number(latitudeAttribute);
    const longitude = Number(longitudeAttribute);
    if (
      latitudeAttribute === null ||
      latitudeAttribute.trim() === "" ||
      longitudeAttribute === null ||
      longitudeAttribute.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new GpxError("gpx.invalidCoordinate");
    }
    const elevationElement = directChildren(element, "ele")[0];
    if (!elevationElement || elevationElement.textContent?.trim() === "") {
      throw new GpxError("gpx.missingElevation");
    }
    const elevationM = Number(elevationElement.textContent);
    if (!Number.isFinite(elevationM))
      throw new GpxError("gpx.missingElevation");
    return { latitude, longitude, elevationM };
  });
}

export function parseGpx(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (elementsByLocalName(document, "parsererror").length > 0) {
    throw new GpxError("gpx.invalidXml");
  }
  const tracks = elementsByLocalName(document, "trk");
  const routes = elementsByLocalName(document, "rte");
  if (tracks.length > 0 && routes.length > 0)
    throw new GpxError("gpx.mixedTypes");
  if (tracks.length > 1) throw new GpxError("gpx.multipleTracks");
  if (routes.length > 1) throw new GpxError("gpx.multipleRoutes");

  let pointElements: Element[];
  if (tracks.length === 1) {
    const segments = directChildren(tracks[0]!, "trkseg");
    if (segments.length !== 1) {
      throw new GpxError(
        segments.length > 1 ? "gpx.multipleSegments" : "gpx.unsupported",
      );
    }
    pointElements = directChildren(segments[0]!, "trkpt");
  } else if (routes.length === 1) {
    pointElements = directChildren(routes[0]!, "rtept");
  } else {
    throw new GpxError("gpx.unsupported");
  }

  return buildCoursePoints(parsePoints(pointElements));
}
