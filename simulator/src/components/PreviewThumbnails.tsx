import type { ViewMode } from "../engine/store";

const ORDER: ViewMode[] = ["first", "drone", "overhead"];
const LABEL: Record<ViewMode, string> = { first: "FIRST PERSON", drone: "DRONE", overhead: "OVERHEAD" };

/* Two preview tiles for the inactive modes; clicking switches to that mode.
   (Live thumbnail rendering is a follow-up; tiles currently show the label.) */
export function PreviewThumbnails({ view, onSet }: { view: ViewMode; onSet: (v: ViewMode) => void }) {
  const others = ORDER.filter((m) => m !== view);
  return (
    <div className="previews">
      {others.map((m) => (
        <button key={m} className="prev" data-mode={m} onClick={() => onSet(m)}>
          <div className={`prev-thumb thumb-${m}`} />
          <span>{LABEL[m]}</span>
          <span className="switch-tag">SWITCH</span>
        </button>
      ))}
    </div>
  );
}
