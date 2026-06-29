/* Local traffic model — ported verbatim. Driven by live speed + zone bases.
   Traffic is consumed only by Drone + Overhead + the rail, never First Person. */

import { clamp } from "./mathUtils";
import { trafficZones, type TrafficZone } from "./routeData";
import { state } from "./store";

export function decodeSpeed(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw > 220) return raw / 4.47;
  return raw;
}
export function zoneForMile(mile: number): TrafficZone {
  return (
    trafficZones.find((z) => mile >= z.start && mile <= z.end) ||
    trafficZones[trafficZones.length - 1]
  );
}
export function trafficColor(s: number): string {
  if (s >= 0.82) return "#ff5247";
  if (s >= 0.58) return "#ff9d2e";
  if (s >= 0.34) return "#ffd84a";
  return "#34e3a0";
}
export function trafficLabel(s: number): string {
  if (s >= 0.82) return "Jammed";
  if (s >= 0.58) return "Heavy";
  if (s >= 0.34) return "Moderate";
  return "Clear";
}

export function updateTrafficModel(): void {
  const zone = zoneForMile(state.routeMile);
  const speed = Number.isFinite(state.speedMph) ? state.speedMph : 65;
  let speedScore = 0.12;
  if (speed < 8) speedScore = 0.92;
  else if (speed < 22) speedScore = 0.78;
  else if (speed < 42) speedScore = 0.55;
  else if (speed < 58) speedScore = 0.32;
  const timePulse = (Math.sin(Date.now() / 180000 + state.routeMile * 0.035) + 1) * 0.07;
  const score = clamp(zone.base * 0.55 + speedScore * 0.45 + timePulse, 0, 1);
  state.trafficScore = score;
  state.trafficLevel = trafficLabel(score).toLowerCase();
  state.trafficSummary = `${trafficLabel(score)} near ${zone.name}`;
  state.trafficDelayMin = Math.round(score * score * 34);
}

export function segmentTrafficScore(mile: number): number {
  const zone = zoneForMile(mile);
  const near = Math.max(0, 1 - Math.abs(mile - state.routeMile) / 24);
  const liveBoost = state.trafficScore * near * 0.55;
  const pulse = (Math.sin(Date.now() / 230000 + mile * 0.071) + 1) * 0.06;
  return clamp(zone.base * 0.75 + liveBoost + pulse, 0, 1);
}
