import type { ChromeModel } from "../engine/chromeModel";

interface Props {
  m: ChromeModel;
  playing: boolean;
  onControls: () => void;
  onDrawer: () => void;
  onPlayPause: () => void;
  onSync: () => void;
}

/* Persistent top status strip: shield + wordmark, live/GPS/sync chips, actions. */
export function TopStatusStrip({ m, playing, onControls, onDrawer, onPlayPause, onSync }: Props) {
  const dotCls = m.liveKind === "live" ? "dot live" : m.liveKind === "warn" ? "dot warn" : "dot";
  return (
    <header className="topbar">
      <div className="brand">
        <img className="shield" src="/i5-logo.png" alt="California Interstate 5 shield" />
        <div className="wordmark">
          <b>CALCUP26</b>
          <span>I-5 LIVE · IRVINE → ALAMEDA</span>
        </div>
      </div>
      <div className="status-strip">
        <div className="chip">
          <span className={dotCls} />
          <span>{m.liveText}</span>
        </div>
        <div className="chip mono">{m.gps}</div>
        <div className="chip mono">{m.sync}</div>
      </div>
      <div className="spacer" />
      <div className="top-actions">
        <button className="btn" onClick={onControls}>
          Controls
        </button>
        <button className="btn" onClick={onDrawer}>
          Route Intel
        </button>
        <button className="btn" onClick={onPlayPause}>
          {playing ? "Pause" : "Resume"}
        </button>
        <button className="btn primary" onClick={onSync}>
          Sync Tag
        </button>
      </div>
    </header>
  );
}
