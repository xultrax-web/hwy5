/* Derived chrome strings — mirrors the prototype's updateDOM() + buildTimeline().
   Pure read of `state`; called by React components on each throttled render. */

import { fmtMiles } from "./geo";
import { getRouteContext, nextLandmark } from "./routeContext";
import { route } from "./routeData";
import { trafficLabel } from "./traffic";
import { liveStatus, state } from "./store";

export interface TimelineStop {
  name: string;
  cls: "" | "passed" | "next";
  label: string;
  caMarker: string;
  note: string;
}

export interface ChromeModel {
  liveKind: string;
  liveText: string;
  gps: string;
  sync: string;
  arMode: string;
  roadSign: string;
  arSub: string;
  vSpeed: string;
  vMile: string;
  vNext: string;
  vSection: string;
  vMarker: string;
  vTraffic: string;
  nextCityLines: string[];
  nextMiles: string;
  exitMarker: string;
  intelName: string;
  intelSec: string;
  intelNoteHtml: string;
  intelProg: string;
  intelTraffic: string;
  intelDelay: string;
  timeline: TimelineStop[];
}

export function getChromeModel(): ChromeModel {
  const c = getRouteContext();
  const age = state.lastLiveTime ? Math.round((Date.now() - state.lastLiveTime) / 1000) : null;
  const next = nextLandmark();
  const timeline: TimelineStop[] = route.map((p) => {
    const delta = p.mile - state.routeMile;
    const cls: TimelineStop["cls"] = delta < -0.3 ? "passed" : p === next ? "next" : "";
    const label = delta >= 0 ? `${fmtMiles(delta)} MI AHEAD` : `${fmtMiles(Math.abs(delta))} MI BEHIND`;
    const caMarker =
      p.mile > route[17].mile ? "I-580 connector" : `CA I-5 ~mi ${Math.round(p.mile + 96)}`;
    return { name: p.name, cls, label, caMarker, note: p.note };
  });

  return {
    liveKind: liveStatus.kind,
    liveText: liveStatus.text,
    gps: `${state.position.lat.toFixed(4)}, ${state.position.lng.toFixed(4)}`,
    sync: age == null ? `SRC ${state.source.toUpperCase()}` : `SYNC ${age}s`,
    arMode: state.view === "first" ? "FIRST PERSON" : state.view === "drone" ? "DRONE CHASE" : "OVERHEAD OPS",
    roadSign: c.signWord,
    arSub: state.view === "overhead" ? `${Math.round(state.progress * 100)}% of corridor mapped` : c.segmentName,
    vSpeed: state.speedMph ? Math.round(state.speedMph).toString() : "--",
    vMile: fmtMiles(state.routeMile),
    vNext: `${c.next.name.split(" / ")[0]} · ${fmtMiles(c.milesToNext)}mi`,
    vSection: c.section,
    vMarker: c.caMarker,
    vTraffic: trafficLabel(state.trafficScore),
    nextCityLines: c.next.name.split(" / "),
    nextMiles: fmtMiles(c.milesToNext),
    exitMarker: c.caMarker,
    intelName: c.segmentName,
    intelSec: c.section.toUpperCase(),
    intelNoteHtml: `<b style="color:var(--ink)">${c.article}.</b> ${c.note}`,
    intelProg: `${Math.round(state.progress * 100)}%`,
    intelTraffic: trafficLabel(state.trafficScore),
    intelDelay: `${state.trafficDelayMin} min`,
    timeline,
  };
}
