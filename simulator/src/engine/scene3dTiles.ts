/* ============================================================
   Photoreal first-person renderer — Google Photorealistic 3D Tiles streamed
   into a THREE scene, with a geo-positioned camera that rides the REAL road at
   eye height (driven by state.position / camHeadingEase from the replay clock).
   Camera ground height comes from raycasting the tiles, so it always sits on the
   real terrain regardless of elevation datum.

   Implements the same Scene3D interface as scene3d.ts, so the runtime dispatches
   to it transparently when ?tiles=1 — the synthetic engine stays untouched.
   Phase 2 of the Grapevine showpiece. See docs/v1-grapevine-showpiece-plan.md.
   ============================================================ */
import * as THREE from "three";
import { TilesRenderer, WGS84_ELLIPSOID } from "3d-tiles-renderer";
import {
  GoogleCloudAuthPlugin,
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
  UnloadTilesPlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { state } from "./store";
import type { Scene3D } from "./scene3d";

const DEG2RAD = Math.PI / 180;
const EYE_HEIGHT = 2.8; // driver eye height above the road (m)
const LOOK_DIST = 120; // how far ahead the camera looks (m)
const PROBE_H = 8000; // raycast origin height above the ellipsoid (m)

export function createTilesScene(canvas: HTMLCanvasElement): Scene3D {
  const key = import.meta.env.VITE_GOOGLE_MAP_TILES_KEY as string | undefined;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setClearColor(0x9fb8d6, 1); // flat daytime sky (THREE.Sky comes in the polish pass)

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fb8d6, 3000, 55000);

  const camera = new THREE.PerspectiveCamera(60, 1, 1, 1e8);

  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x55503f, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.2);
  sun.position.set(0.4, 1, 0.3).multiplyScalar(1e6);
  scene.add(sun);

  const tiles = new TilesRenderer();
  if (key) {
    tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: key, autoRefreshToken: true }));
  } else {
    console.warn("[tiles] VITE_GOOGLE_MAP_TILES_KEY missing — photoreal tiles will not load.");
  }
  tiles.registerPlugin(new GLTFExtensionsPlugin({
    // Google tiles are Draco-compressed glTF; without this they silently fail to decode.
    dracoLoader: new DRACOLoader().setDecoderPath("https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"),
  }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());
  tiles.registerPlugin(new UnloadTilesPlugin());
  tiles.group.rotation.x = -Math.PI / 2; // ECEF Z-up -> three Y-up
  scene.add(tiles.group);
  tiles.group.updateMatrixWorld();
  const groupMat = tiles.group.matrixWorld.clone(); // constant (rotation only)
  const groupMatInv = groupMat.clone().invert();
  tiles.setCamera(camera);

  // reusable temporaries (no per-frame allocation)
  const enu = new THREE.Matrix4();
  const E = new THREE.Vector3();
  const N = new THREE.Vector3();
  const U = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const base = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const down = new THREE.Vector3();
  const hitEcef = new THREE.Vector3();
  const cart = { lat: 0, lon: 0, height: 0 };
  const rc = new THREE.Raycaster();
  (rc as unknown as { firstHitOnly: boolean }).firstHitOnly = true;

  let groundElev = 0;
  let groundInit = false;

  function placeCamera(view: "first" | "drone"): void {
    const latR = state.position.lat * DEG2RAD;
    const lonR = state.position.lng * DEG2RAD;

    // local East-North-Up frame at the vehicle
    WGS84_ELLIPSOID.getEastNorthUpFrame(latR, lonR, 0, enu);
    E.setFromMatrixColumn(enu, 0);
    N.setFromMatrixColumn(enu, 1);
    U.setFromMatrixColumn(enu, 2);

    if (!groundInit) {
      groundElev = state.elevationM || 0;
      groundInit = true;
    }

    // raycast straight down onto the tiles to find the true ground height
    WGS84_ELLIPSOID.getCartographicToPosition(latR, lonR, PROBE_H, probe);
    probe.applyMatrix4(groupMat);
    down.copy(U).transformDirection(groupMat).multiplyScalar(-1);
    rc.set(probe, down);
    rc.far = PROBE_H + 4000;
    const hits = rc.intersectObject(tiles.group, true);
    if (hits.length) {
      hitEcef.copy(hits[0].point).applyMatrix4(groupMatInv);
      WGS84_ELLIPSOID.getPositionToCartographic(hitEcef, cart);
      groundElev += (cart.height - groundElev) * 0.35; // ease toward true terrain
    }

    const hdg = state.camHeadingEase * DEG2RAD;
    fwd.copy(E).multiplyScalar(Math.sin(hdg)).add(tmp.copy(N).multiplyScalar(Math.cos(hdg))).normalize();

    WGS84_ELLIPSOID.getCartographicToPosition(latR, lonR, groundElev, base);
    const eye = view === "drone" ? 70 : EYE_HEIGHT;
    const lookD = view === "drone" ? 260 : LOOK_DIST;
    camPos.copy(base).addScaledVector(U, eye);
    if (view === "drone") camPos.addScaledVector(fwd, -200); // trail behind
    look.copy(base).addScaledVector(fwd, lookD);

    camPos.applyMatrix4(groupMat);
    look.applyMatrix4(groupMat);
    camera.position.copy(camPos);
    camera.up.copy(U).transformDirection(groupMat);
    camera.lookAt(look);
    camera.fov = view === "drone" ? 55 : 60;
    camera.updateProjectionMatrix();
  }

  function resize(w: number, h: number, dpr: number): void {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(view: "first" | "drone", w: number, h: number, dpr: number): void {
    resize(w, h, dpr);
    placeCamera(view);
    camera.updateMatrixWorld();
    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.setCamera(camera);
    tiles.update();
    renderer.render(scene, camera);
  }

  function dispose(): void {
    tiles.dispose();
    renderer.dispose();
  }

  return { resize, render, dispose, domElement: renderer.domElement };
}
