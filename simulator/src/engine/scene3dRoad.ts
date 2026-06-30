/* ============================================================
   Spline driving engine (Three.js) — the PROPER road renderer for replay mode.

   Unlike scene3d.ts (which re-integrates curvature from a moving origin EVERY
   frame — numerically unstable, the source of the road/sun jitter), this builds
   the road ONCE as a static world-space Catmull-Rom spline from the verified
   I-5 centerline, then drives the camera ALONG it by arc length (state.replayDistM).
   This is how driving games have done it for decades: stable geometry in world
   space, camera follows a scalar distance, orientation from the spline tangent.
   Jitter is impossible by construction — there is nothing rebuilt per frame.

   Coordinate convention matches the engine: forward = −Z, +X = right, +Y = up.
   A compass heading θ (deg from North, clockwise) maps to dir = (sinθ, 0, −cosθ).
   Lateral: 0 = double-yellow center, + = right. Camera rides +LANE_LAT (left lane).
   ============================================================ */

import * as THREE from "three";
// Only the SCALE-FREE marking fractions are reused from constants; the absolute
// cross-section sizes (ROAD_W, LANE_LAT, SEG_LEN) were stylized/oversized, so this
// engine defines its own TRUE-METRIC dimensions below.
import { WORLD_PER_MILE, EDGE_FRAC, YELLOW_FRAC, YELLOW_THICK, EDGE_THICK } from "./constants";
import { getRouteContext } from "./routeContext";
import { state } from "./store";
import { buildAsphaltCanvas } from "./asphalt";
import geom from "./data/grapevine-nb.geometry.json";
import { getSunPosition } from "./solar";
import type { Scene3D } from "./scene3d";

const MI_M = 1609.344;
const WU_PER_M = WORLD_PER_MILE / MI_M; // world units per real metre (≈ 8.08)
const M = WU_PER_M; // alias: real metres → world units

// ---- TRUE-METRIC road, so a real 70 mph both IS and FEELS like 70 mph ----
// (Along-track was already ~metric; only the cross-section + heights were oversized,
// which is why true-metric speed looked like ~1 mph before. Now everything is real.)
const ROAD_W = 8 * M; // half-width ≈ 8 m → 16 m roadway (two lanes per direction)
const LANE_LAT = 0.272 * ROAD_W; // left-lane centre (same fraction the engine used)
const EYE_HEIGHT = 2.0 * M; // driver eye ≈ 2 m
const LOOK_AHEAD_M = 150; // camera aims ~150 m down the road
const LOOK_DIST = LOOK_AHEAD_M * M; // ...in world units (horizontal)
const DASH_PERIOD = 12 * M; // US lane dash cadence: 3 m line + 9 m gap
const DASH_LEN = 3 * M;
const APRON_W = 250 * M; // ground apron ≈ 250 m each side
const FAR = 6000 * M; // ~6 km view distance
const FOG_NEAR = 250 * M;
const FOG_FAR = 3200 * M;
const GROUND_DROP = 1800; // backdrop plane sits well below the road (deep horizon fill)
const DRONE_HEIGHT = 120 * M; // drone ≈ 120 m up
const DRONE_BACK = 160 * M; // ...and ≈ 160 m behind

// Sun as a FIXED celestial body — true position from SunCalc (solar.ts) for the depicted
// date/time + location. Over a drive it barely moves; apparent motion is only the camera
// turning, and the camera follows a heavily-smoothed heading, so it stays nearly put.
const SUN_DIST = 30000; // sky scale (independent of the road)
const REPLAY_DATE = new Date("2026-06-30T19:10:00-07:00"); // late-afternoon golden hour (PDT)
const GRAPEVINE_LAT = 34.92;
const GRAPEVINE_LNG = -118.95;

interface GeomSample {
  distance_m: number;
  lat: number;
  lng: number;
  heading_deg: number;
  elevation_m: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function cssRgb(s: string): THREE.Color {
  const c = new THREE.Color();
  c.setStyle(s);
  return c;
}

export function createRoadScene(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x0a0f16, 1);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 2, FAR);
  scene.fog = new THREE.Fog(0xcfd6cf, FOG_NEAR, FOG_FAR);

  /* ============================================================
     Build the world-space centerline spline ONCE.
     ============================================================ */
  const samples = geom.samples as GeomSample[];
  const totalDistM = samples[samples.length - 1].distance_m || 1;
  const lat0 = samples[0].lat;
  const lng0 = samples[0].lng;
  const elev0 = samples[0].elevation_m;
  const cosLat0 = Math.cos((lat0 * Math.PI) / 180);

  const pts = samples.map((s) => {
    const eastM = (s.lng - lng0) * 111320 * cosLat0;
    const northM = (s.lat - lat0) * 110540;
    const upM = s.elevation_m - elev0;
    // north → −Z, east → +X, up → +Y
    return new THREE.Vector3(eastM * WU_PER_M, upM * WU_PER_M, -northM * WU_PER_M);
  });

  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  // Fine arc-length LUT so getPointAt()/getTangentAt() are smooth in distance
  // (the default 200 divisions would kink every ~2600 units).
  curve.arcLengthDivisions = 6000;
  const totalLenWU = curve.getLength();

  const _t = new THREE.Vector3();
  function rightAt(u: number, out: THREE.Vector3): THREE.Vector3 {
    curve.getTangentAt(u, _t);
    // right = perpendicular to tangent in the horizontal plane (driver's right)
    return out.set(-_t.z, 0, _t.x).normalize();
  }

  /* ---- static geometry builders (all run once) ---- */
  interface Station {
    pos: THREE.Vector3;
    right: THREE.Vector3;
    s: number; // arc length (world units)
  }
  const STATION_WU = 110;
  const N = Math.max(2, Math.ceil(totalLenWU / STATION_WU));
  const stations: Station[] = [];
  for (let j = 0; j <= N; j++) {
    const u = j / N;
    const pos = curve.getPointAt(u, new THREE.Vector3());
    const right = rightAt(u, new THREE.Vector3());
    stations.push({ pos, right, s: u * totalLenWU });
  }

  // Heavily-smoothed travel heading per station (compass radians). The raw per-sample
  // bearings carry a cumulative ~1085° of wiggle (mostly noise) even though the NET turn
  // over the whole drive is only ~8°. The camera VIEW follows this low-frequency heading,
  // so it tracks the GENERAL direction of travel — and the world-fixed sun therefore barely
  // moves, matching real life. The road MESH keeps its true shape (built from positions).
  const headRaw: number[] = stations.map((_, i) => {
    const a = stations[Math.max(0, i - 1)].pos;
    const b = stations[Math.min(N, i + 1)].pos;
    return Math.atan2(b.x - a.x, -(b.z - a.z)); // compass radians: atan2(east, north)
  });
  const HEAD_WIN = 70; // ±70 stations ≈ ±0.95 km low-pass
  const smoothHead: number[] = headRaw.map((_, i) => {
    let sx = 0,
      sy = 0;
    for (let k = i - HEAD_WIN; k <= i + HEAD_WIN; k++) {
      const j = k < 0 ? 0 : k > N ? N : k;
      sx += Math.cos(headRaw[j]);
      sy += Math.sin(headRaw[j]);
    }
    return Math.atan2(sy, sx);
  });
  function headingAtDist(distM: number): number {
    const f = clamp(distM / totalDistM, 0, 1) * N;
    const i0 = Math.min(N, Math.floor(f));
    const i1 = Math.min(N, i0 + 1);
    const t = f - i0;
    const d = ((smoothHead[i1] - smoothHead[i0] + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return smoothHead[i0] + d * t;
  }

  function stripIndex(segCount: number): THREE.BufferAttribute {
    const idx: number[] = [];
    for (let n = 0; n < segCount; n++) {
      const a = n * 2,
        b = n * 2 + 1,
        c = (n + 1) * 2,
        d = (n + 1) * 2 + 1;
      idx.push(a, b, c, b, d, c);
    }
    const arr = N * 2 > 65000 ? new Uint32Array(idx) : new Uint16Array(idx);
    return new THREE.BufferAttribute(arr, 1);
  }

  // A ribbon following the centerline at a lateral offset, given half-width.
  function buildRibbonGeo(latFrac: number, halfW: number, yRaise: number, withUv: boolean): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((N + 1) * 2 * 3);
    const uv = withUv ? new Float32Array((N + 1) * 2 * 2) : null;
    for (let n = 0; n <= N; n++) {
      const st = stations[n];
      const cx = st.pos.x + st.right.x * (latFrac * ROAD_W);
      const cy = st.pos.y + yRaise;
      const cz = st.pos.z + st.right.z * (latFrac * ROAD_W);
      const i = n * 2;
      pos[i * 3] = cx - st.right.x * halfW;
      pos[i * 3 + 1] = cy;
      pos[i * 3 + 2] = cz - st.right.z * halfW;
      pos[(i + 1) * 3] = cx + st.right.x * halfW;
      pos[(i + 1) * 3 + 1] = cy;
      pos[(i + 1) * 3 + 2] = cz + st.right.z * halfW;
      if (uv) {
        const v = st.s / (ROAD_W * 0.62);
        uv[i * 2] = 0;
        uv[i * 2 + 1] = v;
        uv[(i + 1) * 2] = 2.4;
        uv[(i + 1) * 2 + 1] = v;
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(stripIndex(N));
    g.computeVertexNormals();
    return g;
  }

  /* ---- lights ---- */
  const hemi = new THREE.HemisphereLight(0xdfeaf2, 0x55503f, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.5);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0x404652, 0.5);
  scene.add(ambient);

  // REAL world-space sun direction (fixed) from SunCalc for the depicted date/time.
  const sp = getSunPosition(REPLAY_DATE, GRAPEVINE_LAT, GRAPEVINE_LNG);
  const sunAz = (sp.azimuthDeg * Math.PI) / 180;
  const sunEl = (Math.max(2, sp.altitudeDeg) * Math.PI) / 180; // keep just above the horizon
  const sunDir = new THREE.Vector3(
    Math.sin(sunAz) * Math.cos(sunEl),
    Math.sin(sunEl),
    -Math.cos(sunAz) * Math.cos(sunEl)
  );
  sun.position.copy(sunDir).multiplyScalar(10000);

  /* ---- sky dome (gradient), follows the camera ---- */
  const skyUniforms = {
    top: { value: new THREE.Color(0x9fb4c4) },
    bottom: { value: new THREE.Color(0xd9cdb6) },
  };
  const skyGeo = new THREE.SphereGeometry(FAR * 0.95, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: `
      uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
      void main(){
        float h = clamp((normalize(vP).y * 0.5 + 0.35), 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeSunTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sunSprite.scale.set(9000, 9000, 1);
  scene.add(sunSprite);

  /* ---- far backdrop plane (sits well below the road; horizon fill) ---- */
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9a9482, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = -2;
  scene.add(ground);

  /* ---- ground apron hugging the road ---- */
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x9a9482, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const apron = new THREE.Mesh(buildRibbonGeo(0, APRON_W, -6, false), apronMat);
  apron.renderOrder = -1;
  scene.add(apron);

  /* ---- road surface ---- */
  const asphaltTex = new THREE.CanvasTexture(buildAsphaltCanvas());
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.anisotropy = maxAniso;
  const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.96, metalness: 0.02, color: 0x4f5358, side: THREE.DoubleSide });
  const road = new THREE.Mesh(buildRibbonGeo(0, ROAD_W, 0, true), roadMat);
  scene.add(road);

  /* ---- continuous markings (double-yellow + white edges) ----
     polygonOffset pulls the thin metric paint toward the camera in depth so it never
     z-fights the asphalt; the raise is then just a hair (0.04 m). */
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf2c234, fog: true, transparent: true, opacity: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xf0ebd6, fog: true, transparent: true, opacity: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const PAINT_RAISE = 0.04 * M;
  const markings: THREE.Mesh[] = [
    new THREE.Mesh(buildRibbonGeo(-YELLOW_FRAC, Math.max(0.4, YELLOW_THICK * ROAD_W * 0.5), PAINT_RAISE, false), yellowMat),
    new THREE.Mesh(buildRibbonGeo(YELLOW_FRAC, Math.max(0.4, YELLOW_THICK * ROAD_W * 0.5), PAINT_RAISE, false), yellowMat),
    new THREE.Mesh(buildRibbonGeo(-EDGE_FRAC, Math.max(0.4, EDGE_THICK * ROAD_W * 0.5), PAINT_RAISE, false), edgeMat),
    new THREE.Mesh(buildRibbonGeo(EDGE_FRAC, Math.max(0.4, EDGE_THICK * ROAD_W * 0.5), PAINT_RAISE, false), edgeMat),
  ];
  markings.forEach((m) => {
    m.renderOrder = 2;
    scene.add(m);
  });

  /* ---- dashed lane dividers (static, placed along arc length) ---- */
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xece7d2, transparent: true, opacity: 0.85, fog: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const dashes = new THREE.Mesh(buildDashesGeo(), dashMat);
  dashes.renderOrder = 2;
  scene.add(dashes);

  function buildDashesGeo(): THREE.BufferGeometry {
    const period = DASH_PERIOD;
    const dashLen = DASH_LEN;
    const hw = Math.max(0.4, ROAD_W * 0.012);
    const raise = 0.04 * M;
    const verts: number[] = [];
    const idx: number[] = [];
    let q = 0;
    const _r = new THREE.Vector3();
    const _p0 = new THREE.Vector3();
    const _p1 = new THREE.Vector3();
    for (const latFrac of [-0.5, 0.5]) {
      for (let s = 0; s + dashLen < totalLenWU; s += period) {
        const u0 = s / totalLenWU;
        const u1 = (s + dashLen) / totalLenWU;
        curve.getPointAt(u0, _p0);
        rightAt(u0, _r);
        const a0x = _p0.x + _r.x * (latFrac * ROAD_W);
        const a0z = _p0.z + _r.z * (latFrac * ROAD_W);
        const arx = _r.x,
          arz = _r.z,
          ay = _p0.y + raise;
        curve.getPointAt(u1, _p1);
        rightAt(u1, _r);
        const b0x = _p1.x + _r.x * (latFrac * ROAD_W);
        const b0z = _p1.z + _r.z * (latFrac * ROAD_W);
        const brx = _r.x,
          brz = _r.z,
          by = _p1.y + raise;
        const base = q * 4;
        verts.push(
          a0x - arx * hw, ay, a0z - arz * hw,
          a0x + arx * hw, ay, a0z + arz * hw,
          b0x + brx * hw, by, b0z + brz * hw,
          b0x - brx * hw, by, b0z - brz * hw
        );
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        q++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setIndex(idx); // three picks Uint16/Uint32 based on the max index
    return g;
  }

  /* ============================================================
     per-frame: position the camera ALONG the spline. No geometry rebuild.
     ============================================================ */
  const _pos = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let camInit = false;

  function sampleU(distM: number): number {
    return clamp(distM / totalDistM, 0, 1);
  }

  function placeFirstPerson() {
    const u = sampleU(state.replayDistM);
    curve.getPointAt(u, _pos);
    // smoothed heading → forward + right (so the VIEW and lane offset are calm)
    const h = headingAtDist(state.replayDistM);
    const fwdX = Math.sin(h),
      fwdZ = -Math.cos(h);
    const rgtX = Math.cos(h),
      rgtZ = Math.sin(h);
    const tx = _pos.x + rgtX * LANE_LAT;
    const ty = _pos.y + EYE_HEIGHT;
    const tz = _pos.z + rgtZ * LANE_LAT;
    if (!camInit) {
      camPos.set(tx, ty, tz);
      camInit = true;
    }
    camPos.x = lerp(camPos.x, tx, 0.5);
    camPos.y = lerp(camPos.y, ty, 0.5);
    camPos.z = lerp(camPos.z, tz, 0.5);
    camera.position.copy(camPos);

    // look along the SMOOTHED heading horizontally (calm view, calm sun); track the
    // REAL road grade vertically from the spline elevation just ahead.
    curve.getPointAt(sampleU(state.replayDistM + LOOK_AHEAD_M), _look);
    camera.up.set(0, 1, 0);
    camera.lookAt(camPos.x + fwdX * LOOK_DIST, _look.y + EYE_HEIGHT * 0.55, camPos.z + fwdZ * LOOK_DIST);
    camera.fov = 58;
    camera.updateProjectionMatrix();
  }

  function placeDrone() {
    const u = sampleU(state.replayDistM);
    curve.getPointAt(u, _pos);
    const h = headingAtDist(state.replayDistM);
    const fwdX = Math.sin(h),
      fwdZ = -Math.cos(h);
    const rgtX = Math.cos(h),
      rgtZ = Math.sin(h);
    const tx = _pos.x - fwdX * DRONE_BACK + rgtX * LANE_LAT * 0.6;
    const ty = _pos.y + DRONE_HEIGHT;
    const tz = _pos.z - fwdZ * DRONE_BACK + rgtZ * LANE_LAT * 0.6;
    if (!camInit) {
      camPos.set(tx, ty, tz);
      camInit = true;
    }
    camPos.x = lerp(camPos.x, tx, 0.08);
    camPos.y = lerp(camPos.y, ty, 0.06);
    camPos.z = lerp(camPos.z, tz, 0.1);
    camera.position.copy(camPos);
    curve.getPointAt(sampleU(state.replayDistM + 600 / WU_PER_M), _look);
    camera.up.set(0, 1, 0);
    camera.lookAt(_look.x, _look.y + 200, _look.z);
    camera.fov = 52;
    camera.updateProjectionMatrix();
  }

  /* ---- per-frame lighting/mood (colors only; geometry is static) ---- */
  function applyMood() {
    const L = getRouteContext().light;
    skyUniforms.top.value.set(cssRgb(L.skyTop));
    skyUniforms.bottom.value.set(cssRgb(L.skyHor));
    scene.fog!.color.set(cssRgb(L.skyHor));
    renderer.setClearColor(cssRgb(L.skyHor), 1);
    sunSprite.material.color.set(cssRgb(L.sun));
    sunSprite.material.opacity = 0.85;
    hemi.color.set(cssRgb(L.skyTop));
    hemi.groundColor.set(cssRgb(L.ground));
    hemi.intensity = 1.05;
    sun.color.set(cssRgb(L.sun));
    sun.intensity = 1.5;
    ambient.intensity = 0.5;
    groundMat.color.set(cssRgb(L.ground));
    apronMat.color.set(cssRgb(L.ground));

    // sky + horizon fill follow the camera; sun stays at a fixed WORLD direction.
    sky.position.copy(camera.position);
    ground.position.set(camera.position.x, _pos.y - GROUND_DROP, camera.position.z);
    sunSprite.position.set(
      camera.position.x + sunDir.x * SUN_DIST,
      camera.position.y + sunDir.y * SUN_DIST,
      camera.position.z + sunDir.z * SUN_DIST
    );
  }

  /* ============================================================
     public API
     ============================================================ */
  function resize(w: number, h: number, dpr: number) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(view: "first" | "drone", w: number, h: number, dpr: number) {
    if (view === "drone") placeDrone();
    else placeFirstPerson();
    applyMood();
    resize(w, h, dpr);
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    road.geometry.dispose();
    apron.geometry.dispose();
    dashes.geometry.dispose();
    markings.forEach((m) => m.geometry.dispose());
    asphaltTex.dispose();
  }

  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as any).__road = {
      get cam() { return camera; },
      get sun() { return sunSprite; },
      get totalDistM() { return totalDistM; },
      get totalLenWU() { return totalLenWU; },
      sampleU,
    };
  }

  return { resize, render, dispose, domElement: renderer.domElement };
}

function makeSunTexture(tint = 0xfff0d0): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const col = new THREE.Color(tint);
  const r = Math.round(col.r * 255),
    gg = Math.round(col.g * 255),
    bb = Math.round(col.b * 255);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${gg},${bb},1)`);
  grad.addColorStop(0.2, `rgba(${r},${gg},${bb},0.5)`);
  grad.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
