import { useState } from "react";
import { state } from "../engine/store";
import { setLiveMode, setSimMode, setSpeedScale } from "../engine/controls";
import { applyPosition, enableGoogleTrafficLayer, livePoll } from "../engine/glympse";

/* Controls panel — slides in from the left. Live source, manual GPS fallback,
   sim speed, Google TrafficLayer key, adapter log. */
export function ControlsPanel({ open, onClose, log }: { open: boolean; onClose: () => void; log: string[] }) {
  const [mode, setMode] = useState<"live" | "sim">(state.mode);
  const [lat, setLat] = useState("34.639104");
  const [lng, setLng] = useState("-118.746817");
  const [speed, setSpeed] = useState(state.speedScale);

  return (
    <aside className={`panel-base settings${open ? " open" : ""}`}>
      <div className="panel-head">
        <div className="t">CONTROLS</div>
        <button className="x" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sec">
        <h2>Live Source</h2>
        <div className="seg">
          <button
            className={mode === "live" ? "active" : ""}
            onClick={() => {
              setMode("live");
              setLiveMode();
              livePoll();
            }}
          >
            Live tag
          </button>
          <button
            className={mode === "sim" ? "active" : ""}
            onClick={() => {
              setMode("sim");
              setSimMode();
            }}
          >
            Sim drive
          </button>
        </div>
        <p className="hint">
          Live mode polls the public Glympse tag <b style={{ color: "var(--teal)" }}>!calcup26</b> and
          decodes its latest trail point. Sim drive runs the route locally.
        </p>
      </div>

      <div className="sec">
        <h2>Manual GPS Fallback</h2>
        <div className="row">
          <div>
            <label htmlFor="manualLat">Latitude</label>
            <input id="manualLat" value={lat} inputMode="decimal" onChange={(e) => setLat(e.target.value)} />
          </div>
          <div>
            <label htmlFor="manualLng">Longitude</label>
            <input id="manualLng" value={lng} inputMode="decimal" onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
        <button
          className="full-btn"
          onClick={() => applyPosition(Number(lat), Number(lng), 62, null, "manual GPS")}
        >
          Apply GPS Point
        </button>
        <p className="hint">For browser/CORS failures or an expired tag.</p>
      </div>

      <div className="sec">
        <h2>Sim Speed</h2>
        <input
          type="range"
          min={0.2}
          max={8}
          step={0.2}
          value={speed}
          onChange={(e) => {
            const v = Number(e.target.value);
            setSpeed(v);
            setSpeedScale(v);
          }}
        />
      </div>

      <div className="sec">
        <h2>Google Traffic Layer</h2>
        <label htmlFor="googleMapsKey">Maps JavaScript API key</label>
        <input id="googleMapsKey" type="password" autoComplete="off" placeholder="Optional — paste to enable real TrafficLayer" />
        <button className="full-btn" onClick={enableGoogleTrafficLayer}>
          Enable TrafficLayer
        </button>
        <div id="trafficStatus" className="mini-status">
          No API key loaded. Using the live-speed traffic model (drone &amp; overhead) and the Google
          Maps link fallback.
        </div>
      </div>

      <div className="sec">
        <h2>Adapter Log</h2>
        <div className="log">{log.join("\n")}</div>
      </div>
    </aside>
  );
}
