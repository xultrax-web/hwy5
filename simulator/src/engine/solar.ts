/* ============================================================
   Real solar position — compact port of the public SunCalc algorithm
   (github.com/mourner/suncalc, BSD-2; the NOAA solar formulas). Returns the
   sun's TRUE azimuth/elevation for a date + lat/lng, so the replay sun sits
   where it actually was — not an art-picked constant.

   Azimuth is returned in COMPASS degrees (0 = North, 90 = East, clockwise),
   to match the engine's convention. Altitude is degrees above the horizon.
   ============================================================ */

const rad = Math.PI / 180;
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth

function toDays(date: Date): number {
  return date.valueOf() / dayMs - 0.5 + J1970 - J2000;
}
function rightAscension(l: number, b: number): number {
  return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
}
function declination(l: number, b: number): number {
  return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
}
function siderealTime(d: number, lw: number): number {
  return rad * (280.16 + 360.9856235 * d) - lw;
}
function solarMeanAnomaly(d: number): number {
  return rad * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

export interface SunPos {
  azimuthDeg: number; // compass: 0 = N, 90 = E, clockwise
  altitudeDeg: number; // degrees above the horizon
}

export function getSunPosition(date: Date, lat: number, lng: number): SunPos {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const ra = rightAscension(L, 0);
  const H = siderealTime(d, lw) - ra;

  // SunCalc azimuth is measured from SOUTH, positive toward WEST.
  const azFromSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));

  // convert "from south, +west" → compass "from north, clockwise": N=0,E=90,S=180,W=270.
  const azimuthDeg = (180 + azFromSouth / rad + 360) % 360;
  return { azimuthDeg, altitudeDeg: altitude / rad };
}
