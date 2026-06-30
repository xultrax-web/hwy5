import { createRoot } from "react-dom/client";
import App from "./App";
import { EmbedStage } from "./components/EmbedStage";
import { state, type ViewMode } from "./engine/store";
import { initReplay } from "./engine/replay";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/app.css";

// No StrictMode: the engine is imperative (Three.js + Leaflet own real GPU/DOM
// resources) and must mount exactly once.
const root = createRoot(document.getElementById("root")!);

// Embedded mode: ?embed=first|drone|overhead renders the scene only (no chrome),
// for the host dashboard's iframes. Otherwise render the full standalone app.
const params = new URLSearchParams(location.search);
const embed = params.get("embed");
// Replay mode: ?replay=<segment> drives the camera along a recorded route segment
// (Phase 1 of the Grapevine showpiece). Works in both embed and standalone.
if (params.get("replay")) {
  state.mode = "replay";
  initReplay();
}
if (embed === "first" || embed === "drone" || embed === "overhead") {
  state.view = embed as ViewMode;
  document.documentElement.classList.add("embed");
  root.render(<EmbedStage view={embed as ViewMode} />);
} else {
  root.render(<App />);
}
