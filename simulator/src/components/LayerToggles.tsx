import type { Layers } from "../engine/store";

const LAYER_DEFS: { id: keyof Layers; label: string }[] = [
  { id: "traffic", label: "TRAFFIC" },
  { id: "milestones", label: "MILESTONES" },
  { id: "intel", label: "ROUTE INTEL" },
  { id: "google", label: "GOOGLE PANE" },
];

/* Overhead-only layer toggles (top-right of stage). */
export function LayerToggles({
  layers,
  onToggle,
}: {
  layers: Layers;
  onToggle: (name: keyof Layers, on: boolean) => void;
}) {
  return (
    <div className="layers">
      {LAYER_DEFS.map((l) => (
        <button
          key={l.id}
          className={`lbtn${layers[l.id] ? " on" : ""}`}
          onClick={() => onToggle(l.id, !layers[l.id])}
        >
          {l.label}
          <span className="sw" />
        </button>
      ))}
    </div>
  );
}
