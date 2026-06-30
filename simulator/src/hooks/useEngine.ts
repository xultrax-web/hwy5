import { useEffect } from "react";
import { createScene3D } from "../engine/scene3d";
import { createTilesScene } from "../engine/scene3dTiles";
import { createRoadScene } from "../engine/scene3dRoad";
import { createMapOverhead } from "../engine/mapOverhead";
import { initRuntime, startLoop, stopLoop, setPollTimer } from "../engine/runtime";
import { applyPosition, livePoll } from "../engine/glympse";
import { log, state } from "../engine/store";

/* Boots the imperative engine once: 3D scene on the WebGL canvas, the Leaflet
   overhead map on its pane, the rAF loop, resize handling, and the live poll. */
export function useEngine(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  mapRef: React.RefObject<HTMLDivElement>,
  stageRef: React.RefObject<HTMLElement>
): void {
  useEffect(() => {
    const canvas = canvasRef.current!;
    const mapEl = mapRef.current!;
    const stage = stageRef.current!;

    // Renderer selection (all share the Scene3D interface, so the runtime is unchanged):
    //  ?tiles=1        → photoreal Google-tiles renderer
    //  replay mode     → the stable spline driving engine (scene3dRoad) — DEFAULT for replay
    //  ?engine=legacy  → force the old per-frame-integration renderer (scene3d) as a fallback
    //  otherwise       → synthetic "zen" engine (scene3d)
    const params = new URLSearchParams(location.search);
    const tilesMode = params.get("tiles") === "1";
    const legacyEngine = params.get("engine") === "legacy";
    const useSplineEngine = state.mode === "replay" && !tilesMode && !legacyEngine;
    const scene3d = tilesMode
      ? createTilesScene(canvas)
      : useSplineEngine
      ? createRoadScene(canvas)
      : createScene3D(canvas);
    const map = createMapOverhead(mapEl);

    const stageSize = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      return { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr };
    };

    initRuntime({ scene3d, map, mainCanvas: canvas, stageSize });

    const ro = new ResizeObserver(() => {
      const { w, h, dpr } = stageSize();
      scene3d.resize(w, h, dpr);
      map.invalidate();
    });
    ro.observe(stage);

    // boot sequence (mirrors the prototype's bottom-of-script init)
    log("Live journey simulator loaded.");
    // Replay mode seeds its own position (initReplay) and must not be overwritten
    // by the live poll; only live mode seeds from startup + polls Glympse at boot.
    if (state.mode !== "replay") {
      applyPosition(state.position.lat, state.position.lng, 62, null, "startup");
    }
    startLoop();
    if (state.mode === "live") livePoll();
    const id = window.setInterval(() => {
      if (state.mode === "live") livePoll();
    }, 30000);
    setPollTimer(id);

    // make sure the map sizes correctly once laid out
    requestAnimationFrame(() => map.invalidate());

    return () => {
      stopLoop();
      ro.disconnect();
      scene3d.dispose();
      map.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
