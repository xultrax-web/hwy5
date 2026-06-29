/* Procedural photoreal asphalt texture — ported verbatim from buildAsphalt(),
   returned as a 256×512 canvas to be wrapped in a THREE.CanvasTexture. */

export function buildAsphaltCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#34373b";
  x.fillRect(0, 0, 256, 512);
  // soft blotches (lighter/darker patches of wear)
  for (let i = 0; i < 150; i++) {
    x.globalAlpha = 0.04 + Math.random() * 0.05;
    x.fillStyle = Math.random() < 0.5 ? "#212327" : "#474b50";
    x.beginPath();
    x.arc(Math.random() * 256, Math.random() * 512, 16 + Math.random() * 64, 0, 7);
    x.fill();
  }
  x.globalAlpha = 1;
  // aggregate grain
  for (let i = 0; i < 26000; i++) {
    const g = Math.random();
    const v = g < 0.5 ? 28 + Math.random() * 28 : g < 0.85 ? 58 + Math.random() * 38 : 104 + Math.random() * 72;
    const j = (Math.random() * 8 - 4) | 0;
    x.fillStyle = `rgb(${v | 0},${(v + j) | 0},${(v + 3) | 0})`;
    x.fillRect(Math.random() * 256, Math.random() * 512, Math.random() < 0.85 ? 1 : 2, Math.random() < 0.85 ? 1 : 2);
  }
  // faint tar streaks
  for (let i = 0; i < 9; i++) {
    x.globalAlpha = 0.07;
    x.strokeStyle = "#1b1c1f";
    x.lineWidth = 1 + Math.random() * 2;
    const xx = Math.random() * 256;
    x.beginPath();
    x.moveTo(xx, 0);
    for (let yy = 0; yy <= 512; yy += 36) x.lineTo(xx + (Math.random() * 9 - 4.5), yy);
    x.stroke();
  }
  x.globalAlpha = 1;
  return c;
}
