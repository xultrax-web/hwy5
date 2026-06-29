/* Great-circle + local-projection geo helpers — ported verbatim.
   Pure (no route dependency) so routeData can import milesBetween. */

import type { LatLng } from "./store";

export function milesBetween(a: LatLng, b: LatLng): number {
  const r = 3958.7613;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180,
    la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(((b.lng - a.lng) * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180);
  const x =
    Math.cos((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) -
    Math.sin((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.cos(((b.lng - a.lng) * Math.PI) / 180);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
export function projectLocal(p: LatLng, origin: LatLng): { x: number; y: number } {
  const latMiles = (p.lat - origin.lat) * 69.0;
  const lngMiles = (p.lng - origin.lng) * 69.0 * Math.cos((origin.lat * Math.PI) / 180);
  return { x: lngMiles, y: latMiles };
}
export function closestPointOnSegment(p: LatLng, a: LatLng, b: LatLng): { t: number; dist: number } {
  const pp = projectLocal(p, a),
    bb = projectLocal(b, a);
  const len2 = bb.x * bb.x + bb.y * bb.y;
  const rawT = len2 ? (pp.x * bb.x + pp.y * bb.y) / len2 : 0;
  const t = Math.max(0, Math.min(1, rawT));
  const x = bb.x * t,
    y = bb.y * t;
  return { t, dist: Math.hypot(pp.x - x, pp.y - y) };
}
export function fmtMiles(n: number): string {
  if (!Number.isFinite(n)) return "--";
  return n < 10 ? n.toFixed(1) : Math.round(n).toString();
}
