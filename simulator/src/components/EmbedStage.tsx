import { useRef } from "react";
import { useEngine } from "../hooks/useEngine";
import type { ViewMode } from "../engine/store";

/* Scene-only shell for iframe embedding (?embed=first|drone|overhead).
   Renders just the WebGL canvas (or the Leaflet pane for overhead) with none of
   the standalone app chrome — the host page (index.html) supplies its own HUD. */
export function EmbedStage({ view }: { view: ViewMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  useEngine(canvasRef, mapRef, stageRef);

  const is3D = view !== "overhead";
  return (
    <section className="stage embed-stage" ref={stageRef}>
      <canvas className="surface" ref={canvasRef} style={{ display: is3D ? "block" : "none" }} />
      <div className="surface map-pane" ref={mapRef} style={{ display: view === "overhead" ? "block" : "none" }} />
    </section>
  );
}
