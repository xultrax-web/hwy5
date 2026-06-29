import type { ChromeModel } from "../engine/chromeModel";

/* Route Intel drawer — slides in from the right. Current-segment card + the
   landmark/corridor-notes timeline. */
export function RouteIntelDrawer({
  open,
  onClose,
  m,
}: {
  open: boolean;
  onClose: () => void;
  m: ChromeModel;
}) {
  return (
    <aside className={`panel-base drawer${open ? " open" : ""}`}>
      <div className="panel-head">
        <div className="t">ROUTE INTELLIGENCE</div>
        <button className="x" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="intel-now">
        <div className="seg-name">{m.intelName}</div>
        <div className="seg-sec">{m.intelSec}</div>
        <div className="note" dangerouslySetInnerHTML={{ __html: m.intelNoteHtml }} />
        <div className="intel-metrics">
          <div className="m">
            <span>PROGRESS</span>
            <strong>{m.intelProg}</strong>
          </div>
          <div className="m">
            <span>TRAFFIC</span>
            <strong>{m.intelTraffic}</strong>
          </div>
          <div className="m">
            <span>DELAY</span>
            <strong>{m.intelDelay}</strong>
          </div>
        </div>
      </div>

      <div className="sec">
        <h2>Landmarks &amp; Corridor Notes</h2>
      </div>
      <div className="timeline">
        {m.timeline.map((s, i) => (
          <div key={i} className={`stop ${s.cls}`}>
            <div className="st">{s.name}</div>
            <div className="sd">
              {s.label} · {s.caMarker}
            </div>
            <div className="sn">{s.note}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
