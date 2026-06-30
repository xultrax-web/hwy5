/* Route context — terrain, time-of-day lighting, curvature, grade, signage —
   ported verbatim from the handoff. Drives both the 3D corridor and the chrome. */

import { bearing } from "./geo";
import { clamp, lerp, mix, noise1 } from "./mathUtils";
import { interpolateRoute } from "./routeMath";
import { route, type RouteNode } from "./routeData";
import { state } from "./store";
import { realCurvatureAtMile, realGradeElevationAtMile } from "./routeGeometry";

export type Terrain = "urban" | "foothill" | "mountain" | "valley" | "hills" | "eastbay";

export function nextLandmark(): RouteNode {
  return route.find((p) => p.mile > state.routeMile + 0.3) || route[route.length - 1];
}
export function currentSegmentName(): string {
  const pos = interpolateRoute(state.progress);
  return `${route[pos.index].name} → ${route[pos.index + 1].name}`;
}
export function currentRoutePoint(): RouteNode {
  let best = route[0],
    bd = Infinity;
  for (const p of route) {
    const d = Math.abs(p.mile - state.routeMile);
    if (d < bd) {
      best = p;
      bd = d;
    }
  }
  return best;
}
export function currentSection(): string {
  if (state.routeMile < route[2].mile) return "Santa Ana Freeway";
  if (state.routeMile < route[5].mile) return "Golden State Freeway";
  if (state.routeMile < route[9].mile) return "Grapevine / Tejon";
  if (state.routeMile < route[17].mile) return "West Side Freeway";
  if (state.routeMile < route[18].mile) return "I-580 connector";
  return "East Bay approach";
}
export function approxCaI5Marker(): string {
  if (state.routeMile > route[17].mile) return "I-580";
  return `~${Math.round(state.routeMile + 96)}`;
}

export function headingAtMile(mile: number): number {
  for (let i = 0; i < route.length - 1; i++) {
    if (mile <= route[i + 1].mile) return bearing(route[i], route[i + 1]);
  }
  return 320;
}
export function terrainAt(mile: number): Terrain {
  if (mile < route[4].mile) return "urban";
  if (mile < route[6].mile) return "foothill";
  if (mile < route[9].mile) return "mountain";
  if (mile < route[16].mile) return "valley";
  if (mile < route[18].mile) return "hills";
  return "eastbay";
}

export interface LightKey {
  p: number;
  skyTop: string;
  skyHor: string;
  sun: string;
  ground: string;
  haze: number;
}
// dynamic lighting keyframes by progress (morning haze → clear → golden → dusk)
// Preserved verbatim incl. the two malformed hex values the prototype carried;
// lightAt()'s safe() guard neutralizes them exactly as before.
export const LIGHT_KEYS: LightKey[] = [
  { p: 0.0, skyTop: "#9fb4c4", skyHor: "#d9cdb6", sun: "#fff0d0", ground: "#9a9482", haze: 0.34 },
  { p: 0.22, skyTop: "#6f97b8", skyHor: "#cdd6cf", sun: "#fff6df", ground: "#9c9druff", haze: 0.18 },
  { p: 0.3, skyTop: "#5d92c4", skyHor: "#cfe0e2", sun: "#ffffff", ground: "#b09a6e", haze: 0.1 },
  { p: 0.55, skyTop: "#8aa6c4", skyHor: "#f3d79a", sun: "#ffe7a6", ground: "#c8a85f", haze: 0.16 },
  { p: 0.78, skyTop: "#e7b277", skyHor: "#f6c98b", sun: "#ffdf9e", ground: "#b78e57", haze: 0.22 },
  { p: 1.0, skyTop: "#3a3f63", skyHor: "#b97a86", sun: "#ffd1a0", ground: "#5c5566", haze: 0.3 },
];

export interface LightSample {
  skyTop: string;
  skyHor: string;
  sun: string;
  ground: string;
  haze: number;
}
export function lightAt(progress: number): LightSample {
  let a = LIGHT_KEYS[0],
    b = LIGHT_KEYS[LIGHT_KEYS.length - 1];
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    if (progress >= LIGHT_KEYS[i].p && progress <= LIGHT_KEYS[i + 1].p) {
      a = LIGHT_KEYS[i];
      b = LIGHT_KEYS[i + 1];
      break;
    }
  }
  const t = (progress - a.p) / Math.max(1e-6, b.p - a.p);
  const safe = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#9a9382");
  return {
    skyTop: mix(safe(a.skyTop), safe(b.skyTop), t),
    skyHor: mix(safe(a.skyHor), safe(b.skyHor), t),
    sun: mix(safe(a.sun), safe(b.sun), t),
    ground: mix(safe(a.ground), safe(b.ground), t),
    haze: lerp(a.haze, b.haze, t),
  };
}

export interface RouteContext {
  mile: number;
  terrain: Terrain;
  section: string;
  segmentName: string;
  next: RouteNode;
  milesToNext: number;
  note: string;
  article: string;
  caMarker: string;
  sign: string;
  signWord: string;
  light: LightSample;
}
export function getRouteContext(): RouteContext {
  const mile = state.routeMile;
  const next = nextLandmark();
  const terrain = terrainAt(mile);
  const pt = currentRoutePoint();
  return {
    mile,
    terrain,
    section: currentSection(),
    segmentName: currentSegmentName(),
    next,
    milesToNext: Math.max(0, next.mile - mile),
    note: pt.note,
    article: pt.article,
    caMarker: approxCaI5Marker(),
    sign: mile > route[17].mile ? "I-580" : "5",
    signWord: mile > route[17].mile ? "I-580 WEST · BAY AREA" : "I-5 NORTH",
    light: lightAt(state.progress),
  };
}

/* terrain elevation + curvature for the pseudo-3D corridor (now real 3D) */
export function curvatureAtMile(mile: number): number {
  // In replay mode, bend the road with the REAL OSM-verified I-5 centerline shape.
  // Otherwise keep the original synthetic curve (the "zen" engine, untouched).
  const real = realCurvatureAtMile(mile);
  if (real !== null) return real;
  const h0 = headingAtMile(mile),
    h1 = headingAtMile(mile + 0.7);
  let d = ((h1 - h0 + 540) % 360) - 180;
  return clamp(d, -28, 28) * 0.3 + noise1(mile * 0.7) * 1.6;
}
export function hillAtMile(mile: number): number {
  // In replay mode, climb/descend with the REAL terrain elevation profile;
  // otherwise keep the synthetic hills (the "zen" fallback, untouched).
  const real = realGradeElevationAtMile(mile);
  if (real !== null) return real;
  const terr = terrainAt(mile);
  const amp =
    terr === "mountain"
      ? 460
      : terr === "foothill"
      ? 250
      : terr === "hills"
      ? 300
      : terr === "eastbay"
      ? 210
      : 55;
  return Math.sin(mile * 0.38 + 1.3) * amp * 0.5 + noise1(mile * 0.3 + 9) * amp * 0.5;
}
