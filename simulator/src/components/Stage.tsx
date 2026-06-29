import { forwardRef } from "react";
import type { ChromeModel } from "../engine/chromeModel";
import type { Layers, ViewMode } from "../engine/store";
import { ARHeader } from "./ARHeader";
import { ExitSign } from "./ExitSign";
import { LayerToggles } from "./LayerToggles";
import { ModeSwitch } from "./ModeSwitch";
import { ARDataRail } from "./ARDataRail";
import { PreviewThumbnails } from "./PreviewThumbnails";

interface Props {
  view: ViewMode;
  layers: Layers;
  m: ChromeModel;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mapRef: React.RefObject<HTMLDivElement>;
  googleTrafficReady: boolean;
  onSetView: (v: ViewMode) => void;
  onToggleLayer: (name: keyof Layers, on: boolean) => void;
}

/* The full-bleed stage: WebGL canvas (first/drone) + Leaflet pane (overhead),
   with all in-stage AR overlays layered on top by z-index. */
export const Stage = forwardRef<HTMLElement, Props>(function Stage(
  { view, layers, m, canvasRef, mapRef, googleTrafficReady, onSetView, onToggleLayer },
  ref
) {
  const is3D = view === "first" || view === "drone";
  const showGoogle = view === "overhead" && layers.google;
  return (
    <section className="stage" ref={ref as React.RefObject<HTMLElement>}>
      <canvas className="surface" ref={canvasRef} style={{ display: is3D ? "block" : "none" }} />
      <div
        className="surface map-pane"
        ref={mapRef}
        style={{ display: view === "overhead" ? "block" : "none" }}
      />

      <div className="vignette" />
      <div className="opframe">
        <i className="tl" />
        <i className="tr" />
        <i className="bl" />
        <i className="br" />
      </div>

      {/* optional Google panes (overhead only) */}
      <iframe
        id="googleMapFrame"
        title="Google Maps overhead"
        className={`google-pane${showGoogle && !googleTrafficReady ? " show" : ""}`}
        referrerPolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps?q=34.639104,-118.746817&z=9&output=embed"
      />
      <div
        id="googleTrafficMap"
        aria-label="Google traffic map"
        className={`google-pane${showGoogle && googleTrafficReady ? " show" : ""}`}
      />

      <ARHeader m={m} />
      <ExitSign m={m} />
      <LayerToggles layers={layers} onToggle={onToggleLayer} />
      <ModeSwitch view={view} onSet={onSetView} />
      <ARDataRail m={m} />
      <PreviewThumbnails view={view} onSet={onSetView} />
    </section>
  );
});
