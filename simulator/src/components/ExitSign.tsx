import type { ChromeModel } from "../engine/chromeModel";

/* Classic California green freeway guide sign — AR HUD element on the top-right
   (opposite the hero), showing the next city, an EXIT tab, and the diagonal
   up-right arrow. Shown in First Person + Drone; hidden in Overhead. */
export function ExitSign({ m }: { m: ChromeModel }) {
  return (
    <div className="exit-sign">
      <div className="exit-tab">EXIT {m.exitMarker}</div>
      <div className="exit-panel">
        <div className="exit-cities">
          {m.nextCityLines.map((line, i) => (
            <div key={i} className="exit-city">
              {line}
            </div>
          ))}
          <div className="exit-dist">{m.nextMiles} MILES</div>
        </div>
        <svg className="exit-arrow" viewBox="0 0 100 100" aria-hidden="true">
          <line x1="26" y1="74" x2="58" y2="42" stroke="#fff" strokeWidth="13" strokeLinecap="butt" />
          <polygon points="76,24 68,54 46,32" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}
