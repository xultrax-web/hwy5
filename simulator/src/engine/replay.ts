/* ============================================================
   Replay clock — drives the camera along a recorded/real route segment by
   feeding the existing applyPosition() hub, decoupled from frame rate.
   Phase 1 of the Grapevine showpiece. The segment path (lat/lng/heading per
   sample) comes from the geometry data contract; physics fields in that file
   stay gated (validated:false) until comma2k19 validation.
   See docs/v1-grapevine-showpiece-plan.md.
   ============================================================ */
import geom from "./data/grapevine-nb.geometry.json";
import { applyPosition } from "./glympse";
import { state } from "./store";
import { smoothHeadingAtSegDist } from "./routeGeometry";
import { projectToRoute } from "./routeMath";
import { totalMiles } from "./routeData";
import { clamp } from "./mathUtils";
import { WORLD_PER_MILE } from "./constants";

const MI_M = 1609.344;

interface GeomSample {
  distance_m: number;
  lat: number;
  lng: number;
  heading_deg: number;
  elevation_m: number;
}

const samples = geom.samples as GeomSample[];
const segLengthM = samples[samples.length - 1].distance_m || 1;
const REPLAY_MPH = 70; // real-world cruise (user); speedScale is a fast-forward multiplier
const MPH_TO_MPS = 0.44704;

/* Map the geometry segment onto the GLOBAL corridor mileage ONCE (stable endpoints).
   Replay lighting (lightAt(state.progress)) ramps smoothly between these. Doing this
   per-frame via projectToRoute(live GPS) teleported progress up to ~10 route-mi/frame
   on the coarse zigzag route -> the sun/sky/fog COLOR "seizure" (measured). The endpoints
   are projected once; the ramp between them is monotonic and smooth. */
const startMile = projectToRoute({ lat: samples[0].lat, lng: samples[0].lng }).mile;
const endMile = projectToRoute({
  lat: samples[samples.length - 1].lat,
  lng: samples[samples.length - 1].lng,
}).mile;

/* Overwrite the noisy projected routeMile/progress (set by applyPosition) with a smooth
   ramp from the replay's own distance. Safe: realCurvature/realGrade cancel routeMile
   against worldPos, and AR tags are hidden in first-person replay. */
function applySmoothProgress(): void {
  const frac = segLengthM > 0 ? clamp(state.replayDistM / segLengthM, 0, 1) : 0;
  state.routeMile = startMile + frac * (endMile - startMile);
  state.progress = clamp(state.routeMile / totalMiles, 0, 1);
}

/* Seed the position at the segment start so the first frame isn't at boot coords. */
export function initReplay(): void {
  state.replayDistM = 0;
  state.worldPos = 0;
  const s = samples[0];
  state.elevationM = s.elevation_m;
  applyPosition(s.lat, s.lng, REPLAY_MPH, smoothHeadingAtSegDist(0), "replay");
  applySmoothProgress();
}

/* Advance along the segment by dt and apply the interpolated position.
   speedScale fast-forwards the drive (1× ≈ refSpeedMph). Loops at the end. */
export function stepReplay(dt: number): void {
  // TRUE-METRIC pacing: the spline engine now builds the road at real metre scale, so advance
  // by ACTUAL ground speed. speedScale (default 2.6) = 1.0x = real 70 mph; slider 0.4x–4x.
  const mph = REPLAY_MPH * Math.min(4, Math.max(0.4, state.speedScale / 2.6));
  const mps = mph * MPH_TO_MPS; // real metres per second
  if (state.playing) state.replayDistM += mps * dt;
  if (segLengthM > 0) state.replayDistM = ((state.replayDistM % segLengthM) + segLengthM) % segLengthM;
  // keep worldPos in sync (drives the legacy renderer's visual scroll; spline reads replayDistM)
  state.worldPos = state.replayDistM * (WORLD_PER_MILE / MI_M);
  const p = sampleAt(state.replayDistM);
  state.elevationM = p.elevation;
  applyPosition(p.lat, p.lng, mph, p.heading, "replay");
  applySmoothProgress();
}

/* Interpolate lat/lng/heading at a distance along the (monotonic) sample list. */
function sampleAt(distM: number): { lat: number; lng: number; heading: number; elevation: number } {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].distance_m < distM) lo = mid + 1;
    else hi = mid;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const a = samples[i0];
  const b = samples[i1];
  const span = b.distance_m - a.distance_m || 1;
  const t = Math.min(1, Math.max(0, (distM - a.distance_m) / span));
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    heading: smoothHeadingAtSegDist(distM),
    elevation: a.elevation_m + (b.elevation_m - a.elevation_m) * t,
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}
