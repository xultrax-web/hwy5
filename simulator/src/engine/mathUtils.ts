/* Math helpers — ported verbatim from the handoff prototype. */

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function fract(x: number): number {
  return x - Math.floor(x);
}
export function noise1(x: number): number {
  const i = Math.floor(x),
    f = x - i;
  const a = fract(Math.sin(i * 127.13) * 43758.5453);
  const b = fract(Math.sin((i + 1) * 127.13) * 43758.5453);
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}
export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1),
    b = hexToRgb(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(
    lerp(a[2], b[2], t)
  )})`;
}
