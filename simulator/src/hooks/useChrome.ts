import { useSyncExternalStore } from "react";
import { getChromeVersion, subscribeChrome } from "../engine/store";

/* Re-render the calling component whenever the engine bumps the (throttled)
   chrome version. Components then read `state` fields directly. */
export function useChrome(): number {
  return useSyncExternalStore(subscribeChrome, getChromeVersion, getChromeVersion);
}
