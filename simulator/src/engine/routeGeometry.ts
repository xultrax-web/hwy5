/* ============================================================
   Geometry seam.
   TWO distinct things live here:
   1) validatedGeometryAtMile — the gated PHYSICS provider (radius/grade/lateral-g
      for HUD + camera-feel). Inert until comma2k19-validated (validated:true).
   2) realCurvatureAtMile — the road SHAPE from the OSM-verified centerline. The
      centerline path is verified on the I-5 NB carriageway, so using its headings
      to bend the rendered road is legitimate now (geometry, not a physics claim).
      Active only in replay mode; otherwise the engine keeps its synthetic curve.
   See docs/v1-grapevine-showpiece-plan.md.
   ============================================================ */
import geom from "./data/grapevine-nb.geometry.json";
import { state } from "./store";
import { clamp } from "./mathUtils";
import { WORLD_PER_MILE } from "./constants";

export interface GeomAtMile {
  curvature: number; // signed 1/m
  grade: number; // rise/run fraction
}

export function isGeometryValidated(): boolean {
  return geom.validated === true;
}

/* PHYSICS gate — still inert until the calibration data is comma2k19-validated. */
export function validatedGeometryAtMile(_mile: number): GeomAtMile | null {
  if (!isGeometryValidated()) return null;
  // TODO(Track V): map global route mile -> segment distance, interpolate the
  // validated samples, convert radius_m/grade_pct into engine units.
  return null;
}

/* ---- Real road SHAPE from the verified centerline (active in replay) ---- */
interface SegSample {
  distance_m: number;
  heading_deg: number;
  elevation_m: number;
}
const segSamples = (geom.samples as SegSample[]) || [];
const segLen = segSamples.length ? segSamples[segSamples.length - 1].distance_m : 0;
const MI_M = 1609.344;
const CURVE_GAIN = 1.0; // >1 exaggerates bends beyond the real road; 1.0 = true-to-life

// Smoothed heading profile: the raw per-100m bearings are slightly steppy, which made
// curvature jumpy in turns. Circular moving average (~±400m) kills the step noise while
// preserving the real curves (which span well over 800m).
const HEAD_SMOOTH_R = 4;
const smoothHeadingDeg: number[] = segSamples.map((_, i) => {
  let sx = 0;
  let sy = 0;
  for (let k = i - HEAD_SMOOTH_R; k <= i + HEAD_SMOOTH_R; k++) {
    const j = k < 0 ? 0 : k >= segSamples.length ? segSamples.length - 1 : k;
    const h = (segSamples[j].heading_deg * Math.PI) / 180;
    sx += Math.cos(h);
    sy += Math.sin(h);
  }
  return ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
});

export function smoothHeadingAtSegDist(d: number): number {
  if (d <= 0) return smoothHeadingDeg[0];
  if (d >= segLen) return smoothHeadingDeg[smoothHeadingDeg.length - 1];
  let lo = 0;
  let hi = segSamples.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (segSamples[m].distance_m < d) lo = m + 1;
    else hi = m;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const t = (d - segSamples[i0].distance_m) / ((segSamples[i1].distance_m - segSamples[i0].distance_m) || 1);
  const ha = smoothHeadingDeg[i0];
  const hb = smoothHeadingDeg[i1];
  const dd = ((hb - ha + 540) % 360) - 180;
  return (ha + dd * t + 360) % 360;
}

/* Curvature in scene3d's convention (heading delta over ~0.7 mi, scaled), sourced
   from the REAL centerline headings. Returns null outside replay / off-segment so
   the caller falls back to the synthetic curve. */
export function realCurvatureAtMile(mile: number): number | null {
  if (state.mode !== "replay" || segLen <= 0) return null;
  // segD is anchored to worldPos (via mile) — the same clock the road scroll uses — so the
  // curve under the camera matches the visible road. Clamp into the segment (never fall back
  // to the jittery synthetic curve in replay).
  const segD = clamp((mile - state.routeMile) * MI_M, 0, segLen);
  const h0 = smoothHeadingAtSegDist(segD);
  const h1 = smoothHeadingAtSegDist(Math.min(segLen, segD + 0.7 * MI_M));
  const d = ((h1 - h0 + 540) % 360) - 180;
  return clamp(d, -28, 28) * 0.3 * CURVE_GAIN;
}

/* ---- Real road GRADE from the verified centerline's terrain elevations ---- */
const WU_PER_M = WORLD_PER_MILE / MI_M; // world units per metre — keeps grade true-to-life
const GRADE_GAIN = 1.0; // >1 exaggerates the climb/descent
const baseElev = segSamples.length ? segSamples[0].elevation_m : 0;

function elevationAtSegDist(d: number): number {
  if (d <= 0) return segSamples[0].elevation_m;
  if (d >= segLen) return segSamples[segSamples.length - 1].elevation_m;
  let lo = 0;
  let hi = segSamples.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (segSamples[m].distance_m < d) lo = m + 1;
    else hi = m;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const a = segSamples[i0];
  const b = segSamples[i1];
  const t = (d - a.distance_m) / ((b.distance_m - a.distance_m) || 1);
  return a.elevation_m + (b.elevation_m - a.elevation_m) * t;
}

/* Road elevation in world units, relative to the segment start, from REAL terrain
   elevations (true grade). null outside replay / off-segment -> synthetic hill. */
export function realGradeElevationAtMile(mile: number): number | null {
  if (state.mode !== "replay" || segLen <= 0) return null;
  const segD = clamp((mile - state.routeMile) * MI_M, 0, segLen);
  return (elevationAtSegDist(segD) - baseElev) * WU_PER_M * GRADE_GAIN;
}
