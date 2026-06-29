/* Live "next useful stop" layer — Places API (New), via the local /api/places
   function. Self-throttled (time + distance) and fully optional: if no backend
   is serving the function the call fails quietly and the AR/route UI just falls
   back to the researched landmark set. */

import { milesBetween } from "./geo";
import { log, state, type LatLng } from "./store";

let inFlight = false;
let lastFetch = 0;
let anchor: LatLng | null = null;
let loggedFail = false;

export async function maybeFetchPlaces(): Promise<void> {
  const now = Date.now();
  if (inFlight) return;
  const moved = !anchor || milesBetween(anchor, state.position) > 8;
  if (!moved && now - lastFetch < 90000) return;
  inFlight = true;
  lastFetch = now;
  anchor = { lat: state.position.lat, lng: state.position.lng };
  try {
    const q = new URLSearchParams({
      lat: state.position.lat.toFixed(6),
      lng: state.position.lng.toFixed(6),
      radius: "45000",
      max: "3",
    });
    const res = await fetch(`/api/places?${q.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    state.places = (data.places || []).filter(
      (p: { lat: number; lng: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
    );
    state.placesStatus = data.sources?.errors?.length ? "Partial" : "Live";
    loggedFail = false;
    log(`Places · ${state.places.length} stops nearby.`);
  } catch {
    state.placesStatus = "Unavailable";
    if (!loggedFail) {
      log("Places unavailable (needs the Places API backend).");
      loggedFail = true;
    }
  } finally {
    inFlight = false;
  }
}
