/* ============================================================
   3D corridor (Three.js / WebGL2) — shared by First Person and Drone.
   The road is REAL geometry generated from the route spline each frame
   (curvature + grade via curvatureAtMile / hillAtMile), so the camera
   follows the road exactly — no faked lateral offset.

   Lateral convention matches the engine: 0 = double-yellow center line,
   + = right, − = left. The camera/vehicle ride the LEFT lane at +LANE_LAT,
   keeping the yellow line just to their LEFT. No vertical camera bob;
   elevation + heading are eased for comfort.
   ============================================================ */

import * as THREE from "three";
import {
  SEG_LEN,
  ROAD_W,
  WORLD_PER_MILE,
  EDGE_FRAC,
  YELLOW_FRAC,
  YELLOW_THICK,
  EDGE_THICK,
  LANE_LAT,
} from "./constants";
import { curvatureAtMile, getRouteContext, hillAtMile } from "./routeContext";
import { state } from "./store";
import { buildAsphaltCanvas } from "./asphalt";
import { route } from "./routeData";
import { bearing, milesBetween } from "./geo";

const DRAW_DIST = 170; // segments rendered ahead
const EYE_HEIGHT = 360; // driver eye height above road (world units)
const DRONE_HEIGHT = 4200;
const DRONE_BACK = 5200; // how far the drone trails behind
const VEH_AHEAD = 1800; // tracked vehicle distance ahead of nothing — see below

export interface Scene3D {
  resize(w: number, h: number, dpr: number): void;
  render(view: "first" | "drone", w: number, h: number, dpr: number): void;
  dispose(): void;
  domElement: HTMLCanvasElement;
}

interface CenterSample {
  x: number;
  y: number;
}

export function createScene3D(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x0a0f16, 1);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 1, DRAW_DIST * SEG_LEN * 1.15);
  scene.fog = new THREE.Fog(0xcfd6cf, SEG_LEN * 26, DRAW_DIST * SEG_LEN * 0.92);

  /* ---- lights ---- */
  const hemi = new THREE.HemisphereLight(0xdfeaf2, 0x55503f, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.5);
  sun.position.set(-0.3, 0.5, 1).multiplyScalar(10000);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0x404652, 0.5);
  scene.add(ambient);

  /* ---- sky dome (gradient) + sun glow sprite ---- */
  const skyUniforms = {
    top: { value: new THREE.Color(0x9fb4c4) },
    bottom: { value: new THREE.Color(0xd9cdb6) },
    operator: { value: 0 },
  };
  const skyGeo = new THREE.SphereGeometry(DRAW_DIST * SEG_LEN * 1.1, 24, 16);
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

  const sunTex = makeSunTexture();
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
  );
  sunSprite.scale.set(9000, 9000, 1);
  scene.add(sunSprite);

  /* ---- far backdrop plane (sits well BELOW the road; horizon fill only) ---- */
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9a9482, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = -2;
  scene.add(ground);

  /* ---- ground APRON that follows the road's true elevation + curvature.
     A single flat plane can't track the undulating road, so it floats over and
     "eats" the road on grades/turns; this wide strip is built from the same
     centerline (cy[n]) and sits just below the asphalt, so it never occludes. */
  const APRON_W = 16000;
  const apronGeo = new THREE.BufferGeometry();
  const apronPos = new Float32Array((DRAW_DIST + 1) * 2 * 3);
  apronGeo.setAttribute("position", new THREE.BufferAttribute(apronPos, 3));
  apronGeo.setIndex(buildStripIndex(DRAW_DIST));
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x9a9482, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.frustumCulled = false;
  apron.renderOrder = -1;
  scene.add(apron);

  /* ---- road mesh (rebuilt each frame) ---- */
  const roadGeo = new THREE.BufferGeometry();
  const vertsPerBand = 2;
  const roadPos = new Float32Array((DRAW_DIST + 1) * vertsPerBand * 3);
  const roadUv = new Float32Array((DRAW_DIST + 1) * vertsPerBand * 2);
  roadGeo.setAttribute("position", new THREE.BufferAttribute(roadPos, 3));
  roadGeo.setAttribute("uv", new THREE.BufferAttribute(roadUv, 2));
  roadGeo.setIndex(buildStripIndex(DRAW_DIST));
  const asphaltTex = new THREE.CanvasTexture(buildAsphaltCanvas());
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.anisotropy = maxAniso;
  const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.96, metalness: 0.02, color: 0x6a6d72, side: THREE.DoubleSide });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.frustumCulled = false;
  scene.add(road);

  /* ---- continuous marking ribbons (yellow pair + white edges) ---- */
  const yellowL = makeRibbon(0xf2c234);
  const yellowR = makeRibbon(0xf2c234);
  const edgeL = makeRibbon(0xf0ebd6);
  const edgeR = makeRibbon(0xf0ebd6);
  [yellowL, yellowR, edgeL, edgeR].forEach((m) => scene.add(m.mesh));

  /* ---- scrolling dashed lane dividers ---- */
  const dashGeo = new THREE.BufferGeometry();
  const DASH_MAX = 240;
  const dashPos = new Float32Array(DASH_MAX * 4 * 3);
  const dashIdx: number[] = [];
  for (let i = 0; i < DASH_MAX; i++) {
    const b = i * 4;
    dashIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  dashGeo.setAttribute("position", new THREE.BufferAttribute(dashPos, 3));
  dashGeo.setIndex(dashIdx);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xece7d2, transparent: true, opacity: 0.85, fog: true, side: THREE.DoubleSide });
  const dashes = new THREE.Mesh(dashGeo, dashMat);
  dashes.frustumCulled = false;
  scene.add(dashes);

  /* ---- drone tracked-vehicle puck ---- */
  const veh = makeVehicle();
  scene.add(veh.group);

  /* ============================================================
     AR waypoint tags — true WebGL billboards anchored by the POI's
     bearing + distance relative to the vehicle. Far targets sit near
     the vanishing point; nearer ones drop and grow and count down.
     Data = upcoming route landmarks + live Places stops.
     ============================================================ */
  const AR_SLOTS = 6;
  const AR_RING = SEG_LEN * 70; // billboard distance from camera (world units)
  interface ArSlot {
    sprite: THREE.Sprite;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    tex: THREE.CanvasTexture;
    mat: THREE.SpriteMaterial;
    lastText: string;
  }
  const arTags: ArSlot[] = [];
  for (let i = 0; i < AR_SLOTS; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = maxAniso;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 20;
    sprite.visible = false;
    scene.add(sprite);
    arTags.push({ sprite, canvas, ctx, tex, mat, lastText: "" });
  }

  function computeArTargets(): { name: string; dist: number; rel: number; cat: string }[] {
    const veh2 = state.position;
    const heading = state.heading;
    const list: { name: string; dist: number; rel: number; cat: string }[] = [];
    for (const p of route) {
      const d = p.mile - state.routeMile;
      if (d <= 0.5 || d > 70) continue;
      list.push({ name: p.name.split(" / ")[0], dist: d, rel: angleDiff(bearing(veh2, p), heading), cat: "landmark" });
    }
    for (const p of state.places) {
      const d = milesBetween(veh2, p);
      if (d > 45) continue;
      const rel = angleDiff(bearing(veh2, p), heading);
      if (Math.abs(rel) > 80) continue;
      list.push({ name: p.name, dist: d, rel, cat: p.category });
    }
    list.sort((a, b) => a.dist - b.dist);
    return list.slice(0, AR_SLOTS);
  }

  function updateArTags(show: boolean) {
    if (!show) {
      for (const s of arTags) s.sprite.visible = false;
      return;
    }
    const targets = computeArTargets();
    for (let i = 0; i < AR_SLOTS; i++) {
      const slot = arTags[i];
      const t = targets[i];
      if (!t) {
        slot.sprite.visible = false;
        continue;
      }
      slot.sprite.visible = true;
      const az = (clamp(t.rel, -34, 34) * Math.PI) / 180;
      const el = ((3 + i * 2.3) * Math.PI) / 180; // stack: nearer low, farther higher
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      dir.applyQuaternion(camera.quaternion);
      slot.sprite.position.copy(camera.position).addScaledVector(dir, AR_RING);
      const prox = clamp(t.dist / 45, 0, 1);
      const sc = AR_RING * 0.115 * lerp(1.18, 0.74, prox);
      slot.sprite.scale.set(sc * 2.667, sc, 1);
      slot.mat.opacity = lerp(1, 0.6, prox);
      const distTxt = t.dist < 10 ? t.dist.toFixed(1) + " MI" : Math.round(t.dist) + " MI";
      const text = `${t.cat}|${t.name}|${distTxt}`;
      if (slot.lastText !== text) {
        drawTagCanvas(slot.ctx, t.cat, t.name, distTxt);
        slot.tex.needsUpdate = true;
        slot.lastText = text;
      }
    }
  }

  /* ============================================================
     per-frame geometry build
     ============================================================ */
  function buildCenterline() {
    const baseN = Math.floor(state.worldPos / SEG_LEN);
    const offset = state.worldPos - baseN * SEG_LEN;
    const cx: number[] = [];
    const cy: number[] = [];
    const cz: number[] = [];
    let x = 0,
      dx = 0;
    for (let n = 0; n <= DRAW_DIST; n++) {
      const mile = state.routeMile + ((baseN + n) * SEG_LEN) / WORLD_PER_MILE;
      dx += curvatureAtMile(mile);
      x += dx;
      cx[n] = x;
      cy[n] = hillAtMile(mile);
      cz[n] = n * SEG_LEN - offset;
    }
    return { cx, cy, cz, baseN, offset };
  }

  let cl = buildCenterline();

  function sampleCenter(z: number): CenterSample {
    const bf = (z + cl.offset) / SEG_LEN;
    const bi = Math.max(0, Math.min(DRAW_DIST - 1, Math.floor(bf)));
    const t = bf - bi;
    return {
      x: lerp(cl.cx[bi], cl.cx[bi + 1], t),
      y: lerp(cl.cy[bi], cl.cy[bi + 1], t),
    };
  }

  function updateRoad() {
    const { cx, cy, cz, baseN } = cl;
    for (let n = 0; n <= DRAW_DIST; n++) {
      const i = n * 2;
      const absZ = (baseN + n) * SEG_LEN;
      const v = absZ / (ROAD_W * 0.62); // texture scroll keyed to absolute world Z
      // left edge / right edge  (forward is −Z so world +X = screen right)
      roadPos[i * 3] = cx[n] - ROAD_W;
      roadPos[i * 3 + 1] = cy[n];
      roadPos[i * 3 + 2] = -cz[n];
      roadUv[i * 2] = 0;
      roadUv[i * 2 + 1] = v;
      roadPos[(i + 1) * 3] = cx[n] + ROAD_W;
      roadPos[(i + 1) * 3 + 1] = cy[n];
      roadPos[(i + 1) * 3 + 2] = -cz[n];
      roadUv[(i + 1) * 2] = 2.4;
      roadUv[(i + 1) * 2 + 1] = v;
    }
    roadGeo.attributes.position.needsUpdate = true;
    roadGeo.attributes.uv.needsUpdate = true;
    roadGeo.computeVertexNormals();
  }

  function updateApron() {
    const { cx, cy, cz } = cl;
    for (let n = 0; n <= DRAW_DIST; n++) {
      const i = n * 2;
      apronPos[i * 3] = cx[n] - APRON_W;
      apronPos[i * 3 + 1] = cy[n] - 5;
      apronPos[i * 3 + 2] = -cz[n];
      apronPos[(i + 1) * 3] = cx[n] + APRON_W;
      apronPos[(i + 1) * 3 + 1] = cy[n] - 5;
      apronPos[(i + 1) * 3 + 2] = -cz[n];
    }
    apronGeo.attributes.position.needsUpdate = true;
    apronGeo.computeVertexNormals();
  }

  function updateRibbon(m: Ribbon, latFrac: number, thickFrac: number) {
    const lat = latFrac * ROAD_W;
    const hw = Math.max(3, thickFrac * ROAD_W * 0.5);
    const { cx, cy, cz } = cl;
    const pos = m.pos;
    for (let n = 0; n <= DRAW_DIST; n++) {
      const i = n * 2;
      pos[i * 3] = cx[n] + lat - hw;
      pos[i * 3 + 1] = cy[n] + 3;
      pos[i * 3 + 2] = -cz[n];
      pos[(i + 1) * 3] = cx[n] + lat + hw;
      pos[(i + 1) * 3 + 1] = cy[n] + 3;
      pos[(i + 1) * 3 + 2] = -cz[n];
    }
    m.geo.attributes.position.needsUpdate = true;
  }

  function updateDashes() {
    // dashed dividers between the two lanes on each carriageway (±0.5·ROAD_W).
    const period = SEG_LEN * 2; // dash + gap
    const dashLen = SEG_LEN * 0.9;
    const hw = ROAD_W * 0.012;
    let q = 0;
    const lats = [-0.5 * ROAD_W, 0.5 * ROAD_W];
    const startZ = -cl.offset;
    for (const lat of lats) {
      // align dash phase to absolute world position so they scroll
      let z = startZ - mod(state.worldPos, period);
      while (z < DRAW_DIST * SEG_LEN && q < DASH_MAX) {
        const z0 = z;
        const z1 = z + dashLen;
        if (z1 > 8) {
          const a = sampleCenter(Math.max(8, z0));
          const b = sampleCenter(z1);
          const za = Math.max(8, z0);
          writeQuad(dashPos, q, a.x + lat - hw, a.y + 3, -za, a.x + lat + hw, a.y + 3, -za, b.x + lat + hw, b.y + 3, -z1, b.x + lat - hw, b.y + 3, -z1);
          q++;
        }
        z += period;
      }
    }
    for (let k = q; k < DASH_MAX; k++) writeQuad(dashPos, k, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    dashGeo.attributes.position.needsUpdate = true;
    dashGeo.setDrawRange(0, q * 6);
  }

  /* ---- camera placement ---- */
  let camPos = new THREE.Vector3();
  let camInit = false;

  function placeFirstPerson() {
    const here = sampleCenter(0);
    const ahead = sampleCenter(1400);
    const tx = here.x + LANE_LAT;
    const ty = here.y + EYE_HEIGHT;
    const tz = 0;
    if (!camInit) {
      camPos.set(tx, ty, tz);
      camInit = true;
    }
    // gentle position easing (comfort) — no vertical bob added
    camPos.x += (tx - camPos.x) * 0.18;
    camPos.y += (ty - camPos.y) * 0.12;
    camPos.z = tz;
    camera.position.copy(camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(ahead.x + LANE_LAT, ahead.y + EYE_HEIGHT * 0.55, -1400);
    camera.fov = 58;
    camera.updateProjectionMatrix();
  }

  function placeDrone() {
    const here = sampleCenter(0);
    const look = sampleCenter(2200);
    const tx = here.x + LANE_LAT * 0.6;
    const ty = here.y + DRONE_HEIGHT;
    const tz = DRONE_BACK; // camera trails behind (+Z) and looks toward −Z
    if (!camInit) {
      camPos.set(tx, ty, tz);
      camInit = true;
    }
    camPos.x += (tx - camPos.x) * 0.08;
    camPos.y += (ty - camPos.y) * 0.06;
    camPos.z += (tz - camPos.z) * 0.1;
    camera.position.copy(camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(look.x + LANE_LAT, look.y + 200, -2200);
    camera.fov = 52;
    camera.updateProjectionMatrix();
  }

  /* ---- per-frame lighting / mood ---- */
  function applyMood(view: "first" | "drone") {
    const ctx = getRouteContext();
    const L = ctx.light;
    const operator = view === "drone";
    if (operator) {
      skyUniforms.top.value.set(0x040810);
      skyUniforms.bottom.value.set(0x0a2230);
      scene.fog!.color.set(0x06121c);
      renderer.setClearColor(0x05080c, 1);
      sunSprite.visible = false;
      hemi.color.set(0x39e0c8);
      hemi.groundColor.set(0x07202c);
      hemi.intensity = 0.5;
      sun.color.set(0x59e6cf);
      sun.intensity = 0.6;
      ambient.color.set(0x0c2230);
      ambient.intensity = 0.7;
      groundMat.color.set(0x071018);
      apronMat.color.set(0x08131d);
      roadMat.color.set(0x223038);
      // operator marking colours
      yellowL.mat.color.set(0x34e3c4);
      yellowR.mat.color.set(0x34e3c4);
      edgeL.mat.color.set(0x78d2e6);
      edgeR.mat.color.set(0x78d2e6);
      dashMat.color.set(0x34e3c4);
    } else {
      skyUniforms.top.value.set(cssRgb(L.skyTop));
      skyUniforms.bottom.value.set(cssRgb(L.skyHor));
      scene.fog!.color.set(cssRgb(L.skyHor));
      renderer.setClearColor(cssRgb(L.skyHor), 1);
      sunSprite.visible = true;
      sunSprite.material.color.set(cssRgb(L.sun));
      sunSprite.material.opacity = 0.85;
      hemi.color.set(cssRgb(L.skyTop));
      hemi.groundColor.set(cssRgb(L.ground));
      hemi.intensity = 1.05;
      sun.color.set(cssRgb(L.sun));
      sun.intensity = 1.5;
      ambient.color.set(0x404652);
      ambient.intensity = 0.5;
      groundMat.color.set(cssRgb(L.ground));
      apronMat.color.set(cssRgb(L.ground));
      roadMat.color.set(0x4f5358);
      yellowL.mat.color.set(0xf2c234);
      yellowR.mat.color.set(0xf2c234);
      edgeL.mat.color.set(0xf0ebd6);
      edgeR.mat.color.set(0xf0ebd6);
      dashMat.color.set(0xece7d2);
    }
    // place sun near horizon along the heading
    const sunAngle = (0.5 - clamp((state.heading - 330) / 180, -0.4, 0.4)) * Math.PI * 0.5;
    sunSprite.position.set(camera.position.x - Math.sin(sunAngle) * 30000, camera.position.y + 4000, camera.position.z - 30000);
    veh.group.visible = operator;
  }

  function updateVehicle() {
    const s = sampleCenter(VEH_AHEAD);
    veh.group.position.set(s.x + LANE_LAT, s.y + 40, -VEH_AHEAD);
    const ahead = sampleCenter(VEH_AHEAD + 400);
    veh.group.rotation.y = Math.atan2(s.x - ahead.x, 400);
    const t = performance.now() / 320;
    veh.puck.material.opacity = 0.5 + 0.4 * Math.sin(t);
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
    cl = buildCenterline();
    updateRoad();
    updateApron();
    updateRibbon(yellowL, -YELLOW_FRAC, YELLOW_THICK);
    updateRibbon(yellowR, YELLOW_FRAC, YELLOW_THICK);
    updateRibbon(edgeL, -EDGE_FRAC, EDGE_THICK);
    updateRibbon(edgeR, EDGE_FRAC, EDGE_THICK);
    updateDashes();
    // backdrop plane sits far below the road so it can never occlude it
    ground.position.set(camera.position.x, sampleCenter(0).y - 1800, camera.position.z - 30000);
    if (view === "first") placeFirstPerson();
    else {
      placeDrone();
      updateVehicle();
    }
    applyMood(view);
    updateArTags(view === "drone");
    resize(w, h, dpr);
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    roadGeo.dispose();
    asphaltTex.dispose();
  }

  return { resize, render, dispose, domElement: renderer.domElement };
}

/* ============================================================
   small helpers
   ============================================================ */
interface Ribbon {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  mat: THREE.MeshBasicMaterial;
  pos: Float32Array;
}
function makeRibbon(color: number): Ribbon {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((DRAW_DIST + 1) * 2 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(buildStripIndex(DRAW_DIST));
  const mat = new THREE.MeshBasicMaterial({ color, fog: true, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return { mesh, geo, mat, pos };
}

function makeVehicle() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(420, 150, 820),
    new THREE.MeshStandardMaterial({ color: 0xe9f6f4, roughness: 0.4, metalness: 0.3, emissive: 0x0a3a36, emissiveIntensity: 0.4 })
  );
  body.position.y = 90;
  group.add(body);
  const puckMat = new THREE.SpriteMaterial({
    map: makeSunTexture(0x34e3c4),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const puck = new THREE.Sprite(puckMat);
  puck.scale.set(2200, 2200, 1);
  group.add(puck);
  return { group, puck, body };
}

function buildStripIndex(bands: number): THREE.BufferAttribute {
  const idx: number[] = [];
  for (let n = 0; n < bands; n++) {
    const a = n * 2,
      b = n * 2 + 1,
      c = (n + 1) * 2,
      d = (n + 1) * 2 + 1;
    // wound so face normals point +Y (up) with the corridor along −Z
    idx.push(a, b, c, b, d, c);
  }
  return new THREE.BufferAttribute(new Uint16Array(idx), 1);
}

function writeQuad(
  arr: Float32Array,
  q: number,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number
) {
  const o = q * 12;
  arr[o] = x0; arr[o + 1] = y0; arr[o + 2] = z0;
  arr[o + 3] = x1; arr[o + 4] = y1; arr[o + 5] = z1;
  arr[o + 6] = x2; arr[o + 7] = y2; arr[o + 8] = z2;
  arr[o + 9] = x3; arr[o + 10] = y3; arr[o + 11] = z3;
}

function makeSunTexture(tint = 0xfff0d0): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const col = new THREE.Color(tint);
  const r = Math.round(col.r * 255), gg = Math.round(col.g * 255), bb = Math.round(col.b * 255);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${gg},${bb},1)`);
  grad.addColorStop(0.2, `rgba(${r},${gg},${bb},0.5)`);
  grad.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---- AR tag label rendering (canvas → sprite texture) ---- */
const AR_CAT: Record<string, { c: string; col: string }> = {
  gas: { c: "GAS", col: "#f2b134" },
  charge: { c: "EV", col: "#34c77b" },
  food: { c: "FOOD", col: "#e8794a" },
  rest: { c: "REST", col: "#5fd0e6" },
  lodging: { c: "STAY", col: "#b78bd6" },
  landmark: { c: "PT", col: "#e7eee9" },
};
function angleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}
function roundRectC(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawTagCanvas(ctx: CanvasRenderingContext2D, cat: string, name: string, distTxt: string) {
  const W = 320;
  const H = 120;
  const style = AR_CAT[cat] || AR_CAT.landmark;
  ctx.clearRect(0, 0, W, H);
  // glass body
  roundRectC(ctx, 6, 22, W - 12, H - 44, 16);
  ctx.fillStyle = "rgba(9,14,16,0.84)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(120,210,230,0.45)";
  ctx.stroke();
  // category chip
  roundRectC(ctx, 20, 40, 80, 40, 9);
  ctx.fillStyle = style.col;
  ctx.fill();
  ctx.fillStyle = "#0a0f10";
  ctx.font = '700 25px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.c, 60, 61);
  // name + distance
  ctx.textAlign = "left";
  ctx.fillStyle = "#eaf2ef";
  ctx.font = '700 31px "Arial Narrow", Arial, sans-serif';
  ctx.fillText(name.toUpperCase(), 112, 52, W - 124);
  ctx.fillStyle = style.col;
  ctx.font = '700 22px "Arial Narrow", Arial, sans-serif';
  ctx.fillText(distTxt, 112, 82);
  // downward pointer notch
  ctx.beginPath();
  ctx.moveTo(W / 2 - 11, H - 22);
  ctx.lineTo(W / 2 + 11, H - 22);
  ctx.lineTo(W / 2, H - 5);
  ctx.closePath();
  ctx.fillStyle = "rgba(9,14,16,0.84)";
  ctx.fill();
}
function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}
function cssRgb(s: string): THREE.Color {
  const c = new THREE.Color();
  c.setStyle(s);
  return c;
}
