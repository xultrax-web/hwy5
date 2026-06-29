/* View / layer / playback controls. Pure state mutations + chrome notify;
   no glympse import here (keeps the dependency graph acyclic — components call
   livePoll/applyPosition directly). React renders data-view & google panes
   declaratively from `state`, so these need not touch the DOM. */

import { log, notifyChrome, setLive, state, type Layers, type ViewMode } from "./store";

export function setView(v: ViewMode): void {
  state.view = v;
  notifyChrome();
}

export function setLayer(name: keyof Layers, on: boolean): void {
  state.layers[name] = on;
  notifyChrome();
}

export function togglePlay(): boolean {
  state.playing = !state.playing;
  notifyChrome();
  return state.playing;
}

export function setSimMode(): void {
  state.mode = "sim";
  state.simProgress = state.progress;
  setLive("warn", "Local simulated drive");
  log("Switched to local drive simulation.");
}

export function setLiveMode(): void {
  state.mode = "live";
  notifyChrome();
}

export function setSpeedScale(v: number): void {
  state.speedScale = v;
}
