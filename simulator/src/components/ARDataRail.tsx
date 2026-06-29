import type { ChromeModel } from "../engine/chromeModel";

/* AR data rail (bottom-center). The TRAFFIC stat is CSS-hidden in First Person. */
export function ARDataRail({ m }: { m: ChromeModel }) {
  return (
    <div className="ar-rail">
      <div className="stat accent">
        <div className="k">SPEED</div>
        <div className="v">
          {m.vSpeed} <small>mph</small>
        </div>
      </div>
      <div className="stat">
        <div className="k">ROUTE MILE</div>
        <div className="v">{m.vMile}</div>
      </div>
      <div className="stat">
        <div className="k">NEXT</div>
        <div className="v" style={{ fontSize: 14 }}>
          {m.vNext}
        </div>
      </div>
      <div className="stat">
        <div className="k">SECTION</div>
        <div className="v" style={{ fontSize: 13 }}>
          {m.vSection}
        </div>
      </div>
      <div className="stat">
        <div className="k">CA I-5 MARKER</div>
        <div className="v" style={{ fontSize: 16 }}>
          {m.vMarker}
        </div>
      </div>
      <div className="stat traffic">
        <div className="k">TRAFFIC</div>
        <div className="v" style={{ fontSize: 15 }}>
          {m.vTraffic}
        </div>
      </div>
    </div>
  );
}
