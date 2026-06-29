import type { ViewMode } from "../engine/store";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "first", label: "First Person" },
  { id: "drone", label: "Drone" },
  { id: "overhead", label: "Overhead" },
];

/* Mode switch (bottom-left): First Person / Drone / Overhead. */
export function ModeSwitch({ view, onSet }: { view: ViewMode; onSet: (v: ViewMode) => void }) {
  return (
    <div className="mode-switch">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          className={view === mode.id ? "active" : ""}
          onClick={() => onSet(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
