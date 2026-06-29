import { createRoot } from "react-dom/client";
import App from "./App";
import { EmbedStage } from "./components/EmbedStage";
import { state, type ViewMode } from "./engine/store";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/app.css";

// No StrictMode: the engine is imperative (Three.js + Leaflet own real GPU/DOM
// resources) and must mount exactly once.
const root = createRoot(document.getElementById("root")!);

// Embedded mode: ?embed=first|drone|overhead renders the scene only (no chrome),
// for the host dashboard's iframes. Otherwise render the full standalone app.
const embed = new URLSearchParams(location.search).get("embed");
if (embed === "first" || embed === "drone" || embed === "overhead") {
  state.view = embed as ViewMode;
  document.documentElement.classList.add("embed");
  root.render(<EmbedStage view={embed as ViewMode} />);
} else {
  root.render(<App />);
}
