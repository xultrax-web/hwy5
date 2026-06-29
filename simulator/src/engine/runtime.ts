/* ============================================================
   Unified rAF loop — owns per-frame physics (preserved verbatim from the
   prototype's frame()) and dispatches rendering to the active view's renderer.
   Runs entirely OUTSIDE React; chrome is notified at a throttled cadence.
   ============================================================ */

import { SPEED_K } from "./constants";
import { applyPosition } from "./glympse";
import { maybeFetchPlaces } from "./places";
import { interpolateRoute } from "./routeMath";
import { curvatureAtMile, hillAtMile } from "./routeContext";
import { notifyChrome, state } from "./store";
import type { Scene3D } from "./scene3d";
import type { MapOverhead } from "./mapOverhead";

interface RuntimeDeps {
  scene3d: Scene3D;
  map: MapOverhead;
  mainCanvas: HTMLCanvasElement;
  stageSize: () => { w: number; h: number; dpr: number };
}

let deps: RuntimeDeps | null = null;
let raf = 0;
let lastFrame = performance.now();
let lastChrome = 0;
let lastPlaces = 0;
let pollTimer: number | null = null;

export function initRuntime(d: RuntimeDeps): void {
  deps = d;
}

export function stepPhysics(dt: number): void {
  // sim / live drift (preserved behavior)
  if (state.mode === "sim" && state.playing) {
    state.simProgress = (state.simProgress + dt * 0.0032 * state.speedScale) % 1;
    const pos = interpolateRoute(state.simProgress);
    applyPosition(pos.lat, pos.lng, 70, pos.heading, "simulated");
  }
  if (state.mode === "live" && state.playing && Date.now() - state.lastLiveTime > 45000) {
    const nudge = interpolateRoute(Math.min(1, state.progress + dt * 0.00045));
    if (state.source !== "live") applyPosition(nudge.lat, nudge.lng, 62, nudge.heading, "fallback drift");
  }

  // visual scroll + camera easing
  if (state.playing) state.worldPos += (state.speedMph || 0) * SPEED_K * dt;
  const targetCurve = curvatureAtMile(state.routeMile + 0.15) * 18;
  state.camCurve += (targetCurve - state.camCurve) * Math.min(1, dt * 1.6);
  // camera follows the road grade smoothly so the near road never pops vertically
  const targetElev = hillAtMile(state.routeMile);
  state.camElev += (targetElev - state.camElev) * Math.min(1, dt * 1.3);
  state.camHeadingEase +=
    (((state.heading - state.camHeadingEase + 540) % 360) - 180) * Math.min(1, dt * 1.6);
  state.camHeadingEase = (state.camHeadingEase + 360) % 360;
}

function frame(now: number): void {
  raf = requestAnimationFrame(frame);
  if (!deps) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  stepPhysics(dt);

  // live "next stops" poll (self-throttled by time + distance; no-ops offline)
  if (now - lastPlaces > 5000) {
    lastPlaces = now;
    void maybeFetchPlaces();
  }

  const { w, h, dpr } = deps.stageSize();
  if (state.view === "overhead") {
    deps.map.update();
  } else {
    deps.scene3d.render(state.view, w, h, dpr);
  }

  // chrome text updates throttled to ~10/s (no React render on the 60fps path)
  if (now - lastChrome > 100) {
    lastChrome = now;
    notifyChrome();
  }
}

export function startLoop(): void {
  lastFrame = performance.now();
  raf = requestAnimationFrame(frame);
}
export function stopLoop(): void {
  cancelAnimationFrame(raf);
  if (pollTimer != null) clearInterval(pollTimer);
}
export function setPollTimer(id: number): void {
  pollTimer = id as unknown as number;
}
