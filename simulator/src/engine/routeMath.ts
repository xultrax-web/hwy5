/* Route projection + interpolation — ported verbatim. Depends on route data. */

import { bearing, closestPointOnSegment } from "./geo";
import { route, totalMiles, type RouteNode } from "./routeData";
import type { LatLng } from "./store";

export interface RoutePoint {
  lat: number;
  lng: number;
  heading: number;
  index: number;
}

export function interpolateRoute(progress: number): RoutePoint {
  const target = progress * totalMiles;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i],
      b = route[i + 1];
    if (target <= b.mile) {
      const segMiles = b.mile - a.mile || 1;
      const t = (target - a.mile) / segMiles;
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
        heading: bearing(a, b),
        index: i,
      };
    }
  }
  const last = route[route.length - 1] as RouteNode;
  return { lat: last.lat, lng: last.lng, heading: 300, index: route.length - 2 };
}

export function projectToRoute(pos: LatLng): {
  mile: number;
  dist: number;
  index: number;
  t: number;
} {
  let best = { mile: 0, dist: Infinity, index: 0, t: 0 };
  for (let i = 0; i < route.length - 1; i++) {
    const hit = closestPointOnSegment(pos, route[i], route[i + 1]);
    const mile = route[i].mile + hit.t * (route[i + 1].mile - route[i].mile);
    if (hit.dist < best.dist) best = { mile, dist: hit.dist, index: i, t: hit.t };
  }
  return best;
}
