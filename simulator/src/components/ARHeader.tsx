import type { ChromeModel } from "../engine/chromeModel";

/* AR header (top-left): mode label, road sign wordmark, current segment. */
export function ARHeader({ m }: { m: ChromeModel }) {
  return (
    <div className="ar-head">
      <div className="ar-mode">{m.arMode}</div>
      <div className="ar-sign">{m.roadSign}</div>
      <div className="ar-sub">{m.arSub}</div>
    </div>
  );
}
