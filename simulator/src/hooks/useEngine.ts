import { useEffect } from "react";
import { createScene3D } from "../engine/scene3d";
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

    const scene3d = createScene3D(canvas);
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
    applyPosition(state.position.lat, state.position.lng, 62, null, "startup");
    startLoop();
    livePoll();
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
