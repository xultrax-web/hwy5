/* Live data layer — DO NOT BREAK. Ported verbatim from the handoff:
   viewer login → public group → active invite → delta-decoded trail poll,
   plus manual GPS application and the optional Google TrafficLayer. */

import { clamp } from "./mathUtils";
import { milesBetween } from "./geo";
import { interpolateRoute, projectToRoute } from "./routeMath";
import { totalMiles } from "./routeData";
import { decodeSpeed, updateTrafficModel } from "./traffic";
import { glympse, log, setLive, state } from "./store";
import { setLayer, setView } from "./controls";

export interface TrailPoint {
  time: number;
  lat: number;
  lng: number;
  altitude: number;
  speedRaw: number;
  headingRaw: number;
}

export function decodeTrail(rows: number[][]): TrailPoint[] | null {
  if (!Array.isArray(rows) || !rows.length) return null;
  let cur = rows[0].slice();
  const points: TrailPoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) cur = rows[i].slice();
    else cur = cur.map((v, idx) => v + rows[i][idx]);
    points.push({
      time: cur[0],
      lat: cur[1] / 1000000,
      lng: cur[2] / 1000000,
      altitude: cur[3],
      speedRaw: cur[4],
      headingRaw: cur[5],
    });
  }
  return points;
}

/* Speed (mph) from the trail's recent GPS fixes: total distance / total time
   over the last few samples, which smooths per-fix jitter. Returns null when it
   can't be computed (too few points or bad timestamps) or is implausible. */
function derivePointSpeed(points: TrailPoint[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const from = Math.max(0, n - 5);
  let dist = 0;
  for (let i = from + 1; i < n; i++) dist += milesBetween(points[i - 1], points[i]);
  const dtHours = (points[n - 1].time - points[from].time) / 3600000;
  if (!(dtHours > 0)) return null;
  const mph = dist / dtHours;
  if (!Number.isFinite(mph) || mph < 0 || mph > 120) return null; // reject GPS spikes
  return mph;
}

export function applyPosition(
  lat: number,
  lng: number,
  speedMph: number | null,
  headingDeg: number | null,
  source: string
): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const projected = projectToRoute({ lat, lng });
  state.position = { lat, lng };
  state.routeMile = projected.mile;
  state.progress = clamp(projected.mile / totalMiles, 0, 1);
  const along = interpolateRoute(state.progress);
  state.heading = Number.isFinite(headingDeg as number) ? (headingDeg as number) : along.heading;
  state.speedMph =
    Number.isFinite(speedMph as number) && (speedMph as number) > 0 ? (speedMph as number) : 62;
  state.source = source;
  updateTrafficModel();
  updateGoogleTrafficMap();
}

export async function livePoll(): Promise<void> {
  state.source = "syncing";
  setLive("warn", "Syncing public Glympse tag");
  try {
    if (!glympse.token) {
      const loginUrl = `https://api.glympse.com/v2/account/login?username=viewer&password=password&api_key=${encodeURIComponent(
        glympse.apiKey
      )}`;
      const loginRes = await fetch(loginUrl);
      if (!loginRes.ok) throw new Error(`viewer login HTTP ${loginRes.status}`);
      const login = await loginRes.json();
      glympse.token = login.response && login.response.access_token;
      if (!glympse.token) throw new Error("viewer login did not return a token");
      log("Viewer token acquired.");
    }
    if (!glympse.invite) {
      const groupRes = await fetch(`https://api.glympse.com/v2/groups/${glympse.tag}`, {
        headers: { Authorization: `Bearer ${glympse.token}` },
      });
      if (!groupRes.ok) throw new Error(`group HTTP ${groupRes.status}`);
      const group = await groupRes.json();
      const member = group.response && group.response.members && group.response.members[0];
      if (!member || !member.invite) throw new Error("tag has no active invite");
      glympse.invite = member.invite;
      log(`Active invite ${glympse.invite} found for !${glympse.tag}.`);
    }
    const inviteRes = await fetch(`https://api.glympse.com/v2/invites/${glympse.invite}`, {
      headers: { Authorization: `Bearer ${glympse.token}` },
    });
    if (!inviteRes.ok) throw new Error(`invite HTTP ${inviteRes.status}`);
    const invite = await inviteRes.json();
    const points = decodeTrail(invite.response && invite.response.location);
    if (!points || !points.length) throw new Error("invite has no location trail");
    const last = points[points.length - 1];
    // Speed: derive from actual GPS position/time (ground truth) rather than the
    // raw Glympse speed field, whose unit/scale is unreliable (the prototype's
    // decodeSpeed produced ~2× too-fast values, e.g. 143 mph on a 75 mph drive).
    const mph = derivePointSpeed(points) ?? decodeSpeed(last.speedRaw);
    applyPosition(last.lat, last.lng, mph, last.headingRaw / 10, "live");
    state.lastLiveTime = Date.now();
    glympse.lastPoll = Date.now();
    setLive("live", `Live · ${points.length} samples`);
    log(`Live GPS ${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}.`);
  } catch (err) {
    setLive("warn", "Live unavailable · sim/manual");
    log(`Live sync failed: ${(err as Error).message}`);
    if (state.mode === "live") state.source = "fallback";
  }
}

/* ---------- optional official Google TrafficLayer (distinct from local model) ---------- */
declare global {
  interface Window {
    google?: any;
    __initCalcupTraffic?: () => void;
  }
}

export function updateGoogleTrafficMap(): void {
  if (!state.googleTrafficReady || !state.googleMap || !window.google) return;
  const pos = { lat: state.position.lat, lng: state.position.lng };
  state.googleMap.setCenter(pos);
  if (state.googleMarker) state.googleMarker.setPosition(pos);
  else
    state.googleMarker = new window.google.maps.Marker({
      position: pos,
      map: state.googleMap,
      title: "Live Glympse position",
    });
}

function trafficStatusEl(): HTMLElement | null {
  return document.getElementById("trafficStatus");
}

export function enableGoogleTrafficLayer(): void {
  const keyEl = document.getElementById("googleMapsKey") as HTMLInputElement | null;
  const key = keyEl ? keyEl.value.trim() : "";
  const status = trafficStatusEl();
  if (!key) {
    if (status)
      status.textContent =
        "Paste a Google Maps JavaScript API key to enable the real TrafficLayer. The simulator traffic model is active now.";
    log("Google TrafficLayer needs a Maps JavaScript API key.");
    return;
  }
  if (status) status.textContent = "Loading Google Maps TrafficLayer…";
  window.__initCalcupTraffic = () => {
    const pos = { lat: state.position.lat, lng: state.position.lng };
    const pane = document.getElementById("googleTrafficMap");
    state.googleMap = new window.google.maps.Map(pane, {
      center: pos,
      zoom: 9,
      mapTypeId: "roadmap",
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
    new window.google.maps.TrafficLayer({ autoRefresh: true }).setMap(state.googleMap);
    state.googleTrafficReady = true;
    setLayer("google", true);
    if (status)
      status.textContent =
        "Google TrafficLayer enabled. Route colors still use live Glympse speed as the trip-specific traffic signal.";
    updateGoogleTrafficMap();
    log("Google TrafficLayer enabled.");
  };
  if (window.google && window.google.maps) {
    window.__initCalcupTraffic();
    return;
  }
  if (document.getElementById("googleMapsApiScript")) {
    if (status) status.textContent = "Google Maps script is already loading.";
    return;
  }
  const script = document.createElement("script");
  script.id = "googleMapsApiScript";
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    if (status)
      status.textContent =
        "Google Maps script failed to load. Check the API key, billing, and Maps JavaScript API access.";
    log("Google Maps TrafficLayer script failed to load.");
  };
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    key
  )}&callback=__initCalcupTraffic`;
  document.head.appendChild(script);
}
