import { useRef, useState } from "react";
import { useChrome } from "./hooks/useChrome";
import { useEngine } from "./hooks/useEngine";
import { getChromeModel } from "./engine/chromeModel";
import { state, type Layers, type ViewMode } from "./engine/store";
import { setLayer, setView, togglePlay } from "./engine/controls";
import { livePoll } from "./engine/glympse";
import { TopStatusStrip } from "./components/TopStatusStrip";
import { Stage } from "./components/Stage";
import { ControlsPanel } from "./components/ControlsPanel";
import { RouteIntelDrawer } from "./components/RouteIntelDrawer";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useChrome(); // re-render chrome on throttled engine bumps
  useEngine(canvasRef, mapRef, stageRef);

  const m = getChromeModel();

  const onSetView = (v: ViewMode) => setView(v);
  const onToggleLayer = (name: keyof Layers, on: boolean) => setLayer(name, on);

  return (
    <div className="app" id="app" data-view={state.view}>
      <TopStatusStrip
        m={m}
        playing={state.playing}
        onControls={() => setSettingsOpen((o) => !o)}
        onDrawer={() => setDrawerOpen((o) => !o)}
        onPlayPause={() => togglePlay()}
        onSync={() => livePoll()}
      />

      <Stage
        ref={stageRef}
        view={state.view}
        layers={state.layers}
        m={m}
        canvasRef={canvasRef}
        mapRef={mapRef}
        googleTrafficReady={state.googleTrafficReady}
        onSetView={onSetView}
        onToggleLayer={onToggleLayer}
      />

      <ControlsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} log={state.log} />
      <RouteIntelDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} m={m} />
    </div>
  );
}
