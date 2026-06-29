/* ============================================================
   Engine store — single source of truth, mutated imperatively by
   the rAF loop OUTSIDE React. React chrome subscribes via a throttled
   version bump (see subscribeChrome / chromeVersion) and reads fields
   directly, so the 60fps hot path never triggers React renders.
   Field names are preserved from the handoff prototype's `state`.
   ============================================================ */

export type ViewMode = "first" | "drone" | "overhead";
export type SourceMode = "live" | "sim";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Layers {
  traffic: boolean;
  milestones: boolean;
  intel: boolean;
  google: boolean;
}

/* Nearby point of interest (gas / EV / food / rest / lodging) from the Places API. */
export interface Poi {
  category: string;
  label: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount?: number | null;
  address?: string | null;
  distanceMiles: number | null;
}

export interface SimState {
  view: ViewMode;
  mode: SourceMode;
  playing: boolean;
  progress: number;
  simProgress: number;
  speedScale: number;
  source: string;
  position: LatLng;
  routeMile: number;
  speedMph: number;
  heading: number;
  trafficLevel: string;
  trafficScore: number;
  trafficDelayMin: number;
  trafficSummary: string;
  googleTrafficReady: boolean;
  googleMap: any;
  googleMarker: any;
  lastLiveTime: number;
  lastMapFrameUpdate: number;
  log: string[];
  places: Poi[];
  placesStatus: string;
  // render state
  worldPos: number;
  camCurve: number;
  camElev: number;
  camHeadingEase: number;
  layers: Layers;
}

export const state: SimState = {
  view: "first",
  mode: "live",
  playing: true,
  progress: 0,
  simProgress: 0,
  speedScale: 2.6,
  source: "boot",
  position: { lat: 34.639104, lng: -118.746817 },
  routeMile: 0,
  speedMph: 0,
  heading: 0,
  trafficLevel: "clear",
  trafficScore: 0.15,
  trafficDelayMin: 0,
  trafficSummary: "Flowing",
  googleTrafficReady: false,
  googleMap: null,
  googleMarker: null,
  lastLiveTime: 0,
  lastMapFrameUpdate: 0,
  log: [],
  places: [],
  placesStatus: "Waiting",
  worldPos: 0,
  camCurve: 0,
  camElev: 0,
  camHeadingEase: 0,
  layers: { traffic: true, milestones: true, intel: true, google: false },
};

export const glympse = {
  tag: "calcup26",
  token: "",
  invite: "",
  apiKey: "0SLq661pXHmqdWgI8Yb1",
  lastPoll: 0,
};

// dev inspection hook (stripped from production builds)
if (import.meta.env.DEV && typeof window !== "undefined") (window as any).__sim = { state, glympse };

/* ---------- chrome subscription (throttled, React-facing) ---------- */
let chromeVersion = 0;
const chromeListeners = new Set<() => void>();

export function subscribeChrome(cb: () => void): () => void {
  chromeListeners.add(cb);
  return () => chromeListeners.delete(cb);
}
export function getChromeVersion(): number {
  return chromeVersion;
}
export function notifyChrome(): void {
  chromeVersion++;
  chromeListeners.forEach((cb) => cb());
}

/* ---------- live status (was setLive, decoupled from DOM) ---------- */
export type LiveKind = "live" | "warn" | "off";
export const liveStatus = { kind: "warn" as LiveKind, text: "Preparing live adapter" };
export function setLive(kind: LiveKind, text: string): void {
  liveStatus.kind = kind;
  liveStatus.text = text;
  notifyChrome();
}

/* ---------- adapter log (was log(), decoupled from DOM) ---------- */
export function log(message: string): void {
  const stamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  state.log.unshift(`${stamp}  ${message}`);
  state.log = state.log.slice(0, 9);
  notifyChrome();
}
