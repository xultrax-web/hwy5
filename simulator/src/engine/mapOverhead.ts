/* ============================================================
   Overhead mode — a REAL embedded map (Leaflet + OpenStreetMap, no API key).
   We draw the live position, the Irvine→Alameda route, milestone pins, and
   live traffic-colored segments on top of real tiles. Premium dark "ops"
   basemap (CARTO dark), with OSM as the implicit data source.
   Traffic is allowed in this mode (never in First Person).
   ============================================================ */

import L from "leaflet";
import { route } from "./routeData";
import { interpolateRoute } from "./routeMath";
import { segmentTrafficScore, trafficColor, trafficLabel } from "./traffic";
import { state } from "./store";

export interface MapOverhead {
  update(): void;
  invalidate(): void;
  destroy(): void;
}

const INTEL_CALLOUTS: { label: string; at: string }[] = [
  { label: "Tejon Pass · 5-Mile Grade", at: "Grapevine / Tejon Pass" },
  { label: "RT-99 split → Bakersfield", at: "Wheeler Ridge" },
  { label: "West Side Fwy · Aqueduct", at: "Coalinga" },
  { label: "SR-152 · San Luis Reservoir", at: "Santa Nella / SR 152" },
  { label: "Exit I-5 → I-580", at: "I-580 Split" },
];

export function createMapOverhead(container: HTMLElement): MapOverhead {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: true,
    zoomSnap: 0.25,
    preferCanvas: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
  }).addTo(map);

  const latlngs = route.map((p) => [p.lat, p.lng] as [number, number]);
  map.fitBounds(L.latLngBounds(latlngs).pad(0.12));

  // full-route casing + traveled/ahead
  const casing = L.polyline(latlngs, { color: "#0b1a2c", weight: 9, opacity: 0.9 }).addTo(map);
  const aheadLine = L.polyline([], { color: "#4f8cf7", weight: 6, opacity: 0.95 }).addTo(map);
  const traveledLine = L.polyline([], { color: "#7d8893", weight: 6, opacity: 0.9 }).addTo(map);

  // layer groups toggled by state.layers
  const trafficGroup = L.layerGroup().addTo(map);
  const milestoneGroup = L.layerGroup().addTo(map);
  const intelGroup = L.layerGroup().addTo(map);

  // live position marker (pulsing) via divIcon
  const liveIcon = L.divIcon({
    className: "live-marker",
    html: '<div class="lm-pulse"></div><div class="lm-dot"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  const liveMarker = L.marker([route[0].lat, route[0].lng], { icon: liveIcon, zIndexOffset: 1000 }).addTo(map);

  // milestone pins (built once)
  for (const p of route) {
    const isLm = p.kind === "landmark" || p.kind === "finish" || p.kind === "start";
    if (!isLm) continue;
    const color = p.kind === "finish" ? "#1a73e8" : "#ea4335";
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: "ms-pin",
        html: `<div class="ms-teardrop" style="--c:${color}"></div>`,
        iconSize: [16, 22],
        iconAnchor: [8, 22],
      }),
    })
      .bindTooltip(`<b>${p.name}</b>`, { direction: "top", offset: [0, -18], className: "ms-tip" })
      .addTo(milestoneGroup);
  }

  // intel callouts (built once)
  for (const c of INTEL_CALLOUTS) {
    const p = route.find((r) => r.name === c.at);
    if (!p) continue;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "intel-dot", html: '<div class="id-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] }),
    })
      .bindTooltip(c.label, { permanent: true, direction: "right", offset: [6, 0], className: "intel-tip" })
      .addTo(intelGroup);
  }

  let lastHeavy = 0;
  let lastW = 0;
  let lastH = 0;

  function updateProgressLines() {
    const current = interpolateRoute(state.progress);
    const traveled: [number, number][] = [];
    for (const p of route) {
      traveled.push([p.lat, p.lng]);
      if (p.mile > state.routeMile) break;
    }
    traveled[traveled.length - 1] = [current.lat, current.lng];
    const ahead: [number, number][] = [[current.lat, current.lng]];
    for (const p of route) if (p.mile > state.routeMile) ahead.push([p.lat, p.lng]);
    traveledLine.setLatLngs(traveled);
    aheadLine.setLatLngs(ahead);
    liveMarker.setLatLng([state.position.lat, state.position.lng]);
  }

  function updateTraffic() {
    trafficGroup.clearLayers();
    if (!state.layers.traffic) return;
    for (let i = 0; i < route.length - 1; i++) {
      if (route[i + 1].mile < state.routeMile) continue;
      const ts = segmentTrafficScore((route[i].mile + route[i + 1].mile) / 2);
      L.polyline(
        [
          [route[i].lat, route[i].lng],
          [route[i + 1].lat, route[i + 1].lng],
        ],
        { color: trafficColor(ts), weight: 4, opacity: 0.95 }
      )
        .bindTooltip(`${trafficLabel(ts)}`, { sticky: true })
        .addTo(trafficGroup);
    }
  }

  function applyLayerVisibility() {
    toggle(map, milestoneGroup, state.layers.milestones);
    toggle(map, intelGroup, state.layers.intel);
    toggle(map, trafficGroup, state.layers.traffic);
  }

  function update() {
    // The pane mounts hidden (display:none → 0×0). When it first becomes
    // visible (or resizes), Leaflet must be told to recompute its size or it
    // renders blank with no tiles requested.
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
      lastW = w;
      lastH = h;
      map.invalidateSize(false);
      map.fitBounds(L.latLngBounds(latlngs).pad(0.12));
    }
    updateProgressLines();
    const now = performance.now();
    if (now - lastHeavy > 900) {
      lastHeavy = now;
      updateTraffic();
      applyLayerVisibility();
    }
  }

  function invalidate() {
    map.invalidateSize();
  }
  function destroy() {
    map.remove();
  }

  // keep the casing referenced (lint) and ensure draw order
  casing.bringToBack();

  return { update, invalidate, destroy };
}

function toggle(map: L.Map, layer: L.Layer, on: boolean) {
  if (on && !map.hasLayer(layer)) map.addLayer(layer);
  else if (!on && map.hasLayer(layer)) map.removeLayer(layer);
}
