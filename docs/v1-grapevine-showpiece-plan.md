# v1 Plan & Roadmap — The Grapevine Photoreal Showpiece

**Status:** Approved direction (resolved via a grill-me session on 2026-06-30). Planning artifact — no code written yet.
**Owner:** Wesley
**Scope of this doc:** the concrete build plan + roadmap for v1, the parallel validation track, and the v2+ horizon.

> Companion context lives in the project memory and the repo handoffs (`CODEX_README.md`,
> `CLAUDE_COLD_START_HANDOFF.md`, `handoff_to_codex.md`, `project_briefing.md`). Read those for
> architecture and history; this doc is forward-looking.

---

## 1. Thesis & success definition

**v1 is one deliberate thing:** a remote, big-screen, **photorealistic replay of a real northbound
Castaic → Grapevine climb** whose only job is to make a viewer *feel* the road.

- **v1 is the WOW, not the utility.** Judge it by goosebumps, not usefulness. Its purpose is to prove
  the vision and earn the right to build the genuinely-useful onboard version.
- **"Genuinely useful on a real trip" is the v2+ arc** — it requires the onboard/in-car experience,
  which v1 explicitly defers.
- **Definition of done (v1):** see §8. In one line: *someone watches the photoreal Tejon climb on a
  big screen and viscerally feels the grade and the curves — and your family recognizes the real drive.*

---

## 2. Locked decisions (quick reference)

| Decision | Resolution |
|---|---|
| What ships first | The Grapevine photoreal showpiece (concentration bet) |
| Audience for v1 | Remote / big-screen (spectator). Onboard = v2+ |
| Artifact | **Replay** of a **real logged** drive, **northbound Castaic→Grapevine**, **single vehicle** |
| Renderer | **Path A** — Google Photorealistic 3D Tiles streamed *inside* the existing Three.js engine (3DTilesRendererJS). Chosen over Google `Map3DElement` for cohesion/control |
| Renderer commitment | **Spike first.** Walk-away gate = **FIDELITY** (perf + integration are tunable) |
| Real-world vs real-physics | Real **world** now (tiles, no validation needed). Road shape + camera-feel **synthetic** until comma2k19-validated, then swap measured grade/lateral-g in. **No "real physics" claims until validated** |
| In-car / onboard | Deferred to v2+ (synthetic-first when it lands) |
| Convoy / multi-tag | Deferred to v2+ |
| Live tracking | Deferred — v1 is replay (real data + reliable demo) |
| Vehicle physics engine | **Not used** — unnecessary for a path-followed camera |

---

## 3. Guiding invariants (do not violate without explicit re-decision)

1. **The `cc-engine` Three.js engine is sacred.** New visuals go in `simulator/src/engine/scene3d.ts`,
   then rebuild and copy into `app/cc-engine/`. Never reimplement views as 2D canvas overlays.
2. **First-person stays clean:** cinematic, minimal HUD, **no traffic**, no clutter. Realism comes from
   the world + motion, not overlays.
3. **Keep `?embed=first|drone|overhead` and the Glympse adapter working.**
4. **No secrets in client code, logs, commits, or screenshots.** (Note: a hardcoded Glympse client key
   currently sits at `app/index.html:646` — out of scope here, handle separately.)
5. **Calibration data is a data/calibration layer, not random UI code.** It enters the engine through a
   single seam (§5.1), gated by validation.
6. **No Vercel** for local dev (user is firm). Static preview; `/api/*` degrades gracefully.

---

## 4. Target architecture (how the new pieces attach)

v1 introduces four new concerns. Each attaches to the existing engine at a clean seam; none requires an
engine rewrite.

```
                       ┌─────────────────────────────────────────────┐
                       │            EXISTING ENGINE (sacred)           │
   logged drive  ─────▶│  store.ts (state) ── runtime.ts (rAF loop)    │
   (GPS replay)        │        │                    │                 │
                       │        ▼                    ▼                 │
   ┌──────────────┐    │   routeContext.ts      scene3d.ts            │
   │ REPLAY CLOCK │────┼─▶ curvatureAtMile()  ── road mesh / ribbons   │
   │ (new)        │    │   hillAtMile()          AR tags / lighting    │
   └──────────────┘    │        ▲                    │                 │
                       │        │                    ▼                 │
   ┌──────────────────┐│  ┌───────────────┐   ┌──────────────┐        │
   │ route-geometry   ├┼─▶│ GEOMETRY      │   │ TILES LAYER  │◀── Google│
   │ data contract    ││  │ LOADER (new)  │   │ (new)        │   3D Tiles│
   │ (data/, gated)   ││  │ synth fallback│   │ 3DTilesRendr │        │
   └──────────────────┘│  └───────────────┘   └──────────────┘        │
                       │                            │                  │
                       │                       ┌──────────────┐        │
                       │                       │ CAMERA RIG   │ (new)  │
                       │                       │ springs:     │        │
                       │                       │ roll/pitch/  │        │
                       │                       │ FOV/lookahead│        │
                       │                       └──────────────┘        │
                       │                            │                  │
                       │                       ┌──────────────┐        │
                       │                       │ POST STACK   │ (new)  │
                       │                       │ pmndrs/postpr│        │
                       │                       └──────────────┘        │
                       └─────────────────────────────────────────────┘
```

**The four new modules (all in `simulator/src/engine/`, built + copied to `app/cc-engine/`):**

- **Replay clock** — advances a smooth playback position along the logged drive, decoupled from frame
  rate; feeds `applyPosition()`-style updates into `state`. (Generalizes the existing sim/live drift.)
- **Geometry loader** — reads the route-geometry data contract; returns real curvature/grade when
  present + validated, else falls back to today's synthetic `curvatureAtMile`/`hillAtMile`. The single
  ADAS seam.
- **Tiles layer** — 3DTilesRendererJS streaming Google Photorealistic 3D Tiles into the same
  `THREE.Scene`, geo-anchored so the camera follows the real road *in the tiles*.
- **Camera rig** — spring-driven roll/pitch/FOV/look-ahead on top of the path frame.
- **Post stack** — `pmndrs/postprocessing` EffectComposer for the cinematic grade.

**Key architectural insight:** because the photoreal tiles *contain the real I-5 surface*, v1 does **not
need to draw a synthetic road** over them — the camera flies low over the real road in the imagery.
The existing road ribbon / lane markings become an *optional* crisp-overlay/AR enhancement, not a
requirement. This shrinks the "road overlay coexistence" risk dramatically.

---

## 5. Data foundations

### 5.1 The route-geometry data contract (the ADAS seam)

The architectural keystone. A structured file the geometry loader reads; the calibration pipeline
writes. Proposed `data/route-geometry.grapevine-nb.json`:

```jsonc
{
  "segment": "grapevine-nb",
  "direction": "north",
  "from": "Castaic", "to": "Grapevine",
  "refSpeedMph": 65,
  "validated": false,          // flips true only after comma2k19 validation
  "source": "synthetic|spline|validated",
  "samples": [
    {
      "mile": 0.0,
      "lat": 34.5002, "lng": -118.6230,
      "elevation_m": 368.8,
      "heading_deg": 318.4,
      "radius_m": 1240,        // curve radius (null = straight)
      "curvature": 0.00081,    // 1/R, signed (+ right, - left)
      "grade_pct": 3.2,
      "lateral_g": 0.31,       // at refSpeed; ONLY surfaced as "real" if validated
      "signs": [{ "kind": "guide", "text": "Grapevine 5" }]
    }
    // ... one per ~100m
  ]
}
```

Loader rules:
- `validated:false` or file absent → engine uses synthetic `curvatureAtMile`/`hillAtMile`. (v1 default.)
- `validated:true` → engine interpolates real curvature/grade; camera rig may use measured `lateral_g`.
- **Physics numbers (`lateral_g`, `grade_pct`) are never displayed as truth unless `validated:true`.**

### 5.2 The replay log format

v1 replays a real drive. Source options, in preference order:
1. **Record a clean NB Glympse drive** of Castaic→Grapevine once via the existing adapter (capture the
   decoded trail: `time, lat, lng, speed, heading`). Authentic + ours.
2. **Reuse existing lab telemetry** (`hwy5_telemetry_master.csv` NB GPS / `dashboard/route_polyline.json`)
   if a fresh capture isn't feasible.

Proposed `data/replay.grapevine-nb.json`: `{ "fixes": [{ "t": 0, "lat": ..., "lng": ..., "speedMph": ...,
"heading": ... }, ...] }`. The replay clock interpolates between fixes (centripetal Catmull-Rom),
dead-reckons at measured speed, no live dependency.

### 5.3 Key / config handling (no secrets in client)

- Google **Map Tiles API** key is used **client-side** (3DTilesRendererJS streams tiles browser→Google).
  It cannot be fully hidden. Mitigate with an **HTTP-referrer-restricted** key scoped to the deploy
  domain + the per-SKU billing caps.
- Deliver it via the **existing `/api/browser-config` pattern** (or a build-time env for `simulator/`);
  never hardcode. Display Google's **mandatory attribution** string the plugin surfaces.
- Tiles **must not be cached/stored beyond the session** (Google ToS) — this is *why* offline in-car is
  a v2 problem, not a v1 one.

---

## 6. Roadmap

Effort sizes are relative (S/M/L), not calendar estimates. Phases are sequential unless marked parallel.
Each phase has an **exit criterion** — do not advance until it's met.

### Phase 0 — Spike & fidelity gate  ·  size: S  ·  GATE
**Goal:** answer one question cheaply — *do the real Castaic→Grapevine/Tejon tiles look stunning?*
- Stand up a throwaway 3DTilesRendererJS scene (its `googleMapsAerial` example is the starting point).
- Free-fly the camera over Castaic → Gorman → Tejon Pass → Grapevine. Just *look*.
- Check coverage/detail in the mountain corridor (rural coverage can be thinner than cities).
- **Exit / GATE:** fidelity is **good enough to carry a wow** → continue to Phase 1.
  If muddy/low-detail → **STOP Path A**, fall back to a synthetic-world Grapevine for v1 (re-scope §9).
- *Do this before any rig/overlay/perf work. Kill-or-continue in ~an hour.*

### Phase 1 — Replay backbone (engine-agnostic)  ·  size: M
**Goal:** a smooth playback position moving along the real NB drive, driving the *existing* engine — no
tiles yet. Proves motion/smoothness in isolation.
- Capture/produce `data/replay.grapevine-nb.json` (§5.2).
- Build the **replay clock**: centripetal Catmull-Rom through fixes, arc-length advance at measured
  speed, critically-damped correction (no pops). (Generalize existing sim/live drift in `runtime.ts`.)
- Stub the **route-geometry loader** (§5.1) with synthetic fallback wired into `routeContext.ts`.
- **Enabler:** add a cross-platform `npm run deploy:engine` (build `simulator/` → copy into
  `app/cc-engine/`), so every later iteration is one command, not the error-prone manual rm/cp.
- **Exit:** the existing synthetic first-person view plays the real NB climb smoothly end-to-end.

### Phase 2 — Photoreal world in the engine  ·  size: L
**Goal:** the camera flies the replay path over the **real** Grapevine tiles, inside `scene3d.ts`.
- Integrate `3d-tiles-renderer` into the existing `THREE.Scene`; wire **DRACOLoader + KTX2Loader** (or
  tiles silently fail).
- Geo-register: convert replay lat/lng (+ tile-raycast ground height) → camera position in the tiles'
  frame; camera at eye height following the spline.
- LOD tuning (`errorTarget`/`errorThreshold`), aggressive tile unload + LRU memory cap for a moving
  camera, fade plugin to hide pop-in. Display attribution.
- Decide road treatment: rely on the tiles' real road for v1; lane-overlay optional.
- **Exit:** a recognizable, smooth photoreal NB climb at driving speed within the perf budget (§7.1).

### Phase 3 — Camera feel  ·  size: M
**Goal:** the motion feels like driving, driven by synthetic forces (validated swap-in later).
- Camera rig: base orientation from the path frame (Frenet/up-locked) + **spring-driven roll & pitch**
  (closed-form springs, Holden/Juckett), **speed→FOV** (small, damped), **speed-scaled look-ahead**
  target (turn into corners early — biggest single realism cue), subtle suspension bob.
- Forces sourced from the geometry loader (synthetic now; ready to accept validated `lateral_g`/grade).
- **Exit:** the climb reads as "real driving" — leans into curves, pitches on the grade, anticipates.

### Phase 4 — Cinematic polish (the wow pass)  ·  size: M–L
**Goal:** turn "correct" into "uncanny-real."
- `pmndrs/postprocessing`: AgX tonemapping, subtle Bloom, DepthOfField, LUT3D color grade, SMAA.
- **Motion blur:** copy in `gkjohnson/threejs-sandbox/motionBlurPass`, or fake (radial + FOV pulse).
- Sky/atmosphere: `THREE.Sky` (Preetham) + `FogExp2` matched to horizon; consider time-of-day to match
  the logged drive. (Premium haze via `@takram/three-atmosphere` only if wanted — you'd own it.)
- Optional crispness: spline-aligned lane markings; `troika-three-text` signage at real mileposts.
- **Exit:** side-by-side, it reads as cinematic, not "a 3D demo."

### Phase 5 — Showpiece assembly & ship  ·  size: M
**Goal:** the deliverable.
- Frame it as the big-screen replay artifact (intro, the climb, a hero beat at the summit — optionally
  authored with Theatre.js layered over the procedural drive).
- Final perf/quality scaling (DPR, LOD, effect toggles); attribution; graceful load.
- Verify (§7.4) and ship the v1 demo.
- **Exit:** §8 met.

### Parallel Track V — Calibration validation (feeds v2)  ·  size: L  ·  PARALLEL
Runs alongside Phases 1–5; **does not block v1's wow**. Output: a `validated:true` route-geometry file
that later swaps real forces into Phase 3.
- Fix the known lab bugs: **southbound heading** convention, **ECEF→ENU pitch/grade**, **un-clamp**
  radius (50 m floor) and lateral-g (1.0 g cap), **export signed G from Python** (not browser heading
  deltas).
- Build the **comma2k19 validation script** (`C:\Dev\comma2k19`): CV curvature vs vehicle-dynamics
  ground truth (yaw-rate/speed, steering/wheelbase); calibrate pixel-to-meter; move toward camera
  intrinsics over manual perspective warp.
- Produce validated `data/route-geometry.grapevine-nb.json`; flip `validated:true`.
- **Exit:** validated geometry reproduces ground-truth curvature within tolerance; ready to swap in.

### v2+ horizon (explicitly out of v1 scope)
- **Onboard companion** (the "genuinely useful" goal): flight-tracker on the lightweight engine, live,
  in-car, milestones/anticipation. Synthetic-first (tiles can't stream reliably through Grapevine dead
  zones / ToS no-cache).
- **Convoy / multi-tag:** any tag + multiple tags; single-position state → multi-entity (the big lift).
- **Guts-wide coverage:** extend beyond the Grapevine to the full I-580↔Santa Clarita corridor.
- **Drone view upgrade:** photoreal "context & discovery" layer (Places logistics + lore over tiles).
- **Swap validated forces** into the showpiece camera + light up real-physics readouts.

---

## 7. Cross-cutting concerns

### 7.1 Performance budget
- Photoreal tiles + post stack is heavy. Target a stable frame rate at driving speed on a defined
  reference machine (pick one; e.g. a mid-range laptop). Treat **one active engine context** as a
  prerequisite — swap `?embed=` on a single iframe rather than running three live (handoff idea, now
  required).
- Quality scaling knobs: DPR cap, tile `errorTarget`/depth, effect toggles, draw distance/fog.

### 7.2 Cost & ToS
- Map Tiles API billing ~per root-tile/session — cheap per drive; watch it if many viewers. Referrer-
  restrict the key. Mandatory on-screen attribution. No tile caching beyond session.

### 7.3 Build / deploy
- Edit `simulator/` → `npm run build` → copy `dist/` into `app/cc-engine/` (clear `assets/*` first;
  copy `index.html` + `assets/` together — hashed names). The Phase-1 `deploy:engine` script automates
  this. Keep `vite.config.ts` `base: "./"`.

### 7.4 Verification
- Screenshots of the three nested WebGL iframes tend to hang — verify the **standalone**
  `/cc-engine/?embed=first` and read DOM/state via `eval`. For the photoreal scene, capture the
  standalone embed directly.

### 7.5 Risk register
| Risk | Likelihood | Mitigation |
|---|---|---|
| Grapevine tile fidelity poor | Med | Phase 0 gate (kill early); synthetic-world fallback |
| Perf under tile streaming | Med | One engine context, LOD/memory caps, quality scaling |
| Geo-registration drift (camera vs real road) | Med | Tile raycast ground height; tune offset; lane overlay if needed |
| GPS replay jitter | Low | Centripetal spline + spring smoothing; pre-decimate fixes |
| Browser key exposure | Med | Referrer-restricted key; billing caps; per-SKU monitoring |
| Solo bandwidth / scope creep | High | Strict v1 scope; everything useful is explicitly v2+ |
| Validation drags | Med | Parallel track; v1 never blocks on it (synthetic forces ship) |

---

## 8. Definition of done — v1
- A repeatable, big-screen **photoreal replay** of the real NB **Castaic→Grapevine** climb.
- Smooth at driving speed within the perf budget; no jarring pop-in or camera pops.
- Camera **leans into curves and pitches on the grade** (synthetic forces ok for v1).
- Cinematic grade (AgX + bloom + DoF + motion cue) — reads as real, not "a demo."
- Attribution present; key referrer-restricted; runs from the static preview.
- **The gut test:** you show your family and they recognize the drive and react. Goosebumps.

---

## 9. Immediate next actions
1. **Phase 0 spike** — stand up the 3DTilesRendererJS Google example, fly Castaic→Grapevine, judge
   fidelity. Go/No-Go.
2. In parallel, **capture/produce the NB replay log** (§5.2) so Phase 1 can start the moment the gate
   passes.
3. If the gate fails: re-scope v1 to a **synthetic-world** Grapevine showpiece (Phases 1, 3, 4, 5 still
   apply; Phase 2 swaps tiles for an enhanced synthetic environment).

### Open knobs (decide as we hit them)
- Reference machine + exact frame-rate target for the perf budget (§7.1).
- Replay source: fresh Glympse capture vs existing lab telemetry (§5.2).
- Whether v1 draws a lane/road overlay over the tiles or relies purely on the tiles' real road (§4).
- Time-of-day: match the logged drive, or pick the most flattering golden-hour look.

---

## 10. Backlog — deferred observations (tracked, NOT v1)
Captured during Phase 1 review. Do not let these pull focus off the Grapevine showpiece.
- **Drone-view AR is crowded/busy/high-friction.** Stacked landmark tags overlap each other and the guide sign. Fix = the drone "context & discovery" redesign (decluttered: long-haul logistics + lore, fewer/cleaner tags). The drone view is v2+, so defer with it. (Observed 2026-06-30.)
- **Overhead route jags off I-5 at Coalinga.** The "Coalinga" route node uses the *town's* coords (~36.14, -120.36), ~15 mi west of the I-5 mainline, so the route line detours to the town and back (Harris Ranch is the real on-I-5 node there). Long-standing across versions. Fix = move the node onto the mainline (~36.13, -120.10) in BOTH `simulator/src/engine/routeData.ts` and `app/index.html`; don't remove it (indices are referenced by position). Central-Valley data, outside Grapevine scope — batch into a route-data cleanup. (Flagged as a spin-off task 2026-06-30.)

---

## 11. Lane-geometry model track — the AI lane cartographer (v2 / lab; researched 2026-06-30)
Produces the **lane-accurate offset** (deferred in §9) + **validated curvature** for the gated geometry. NOT needed for v1 (the centerline is already OSM-verified correct); this is the accuracy/utility upgrade. All picks are free + license-checked. User prefers training on **Kaggle**.

**Stack:**
- **Detector:** CLRerNet (Apache-2.0, maintained) via the **UnLanedet** toolbox (Apache-2.0, no mmcv pain; also exposes DiffusionLane for A/B if the domain gap hurts). 2D image-space.
- **2D→metric geometry:** deterministic homography from **comma2k19 intrinsics** `K=[[910,0,582],[0,910,437],[0,0,1]]` + openpilot road←device←view transforms (upgrades the lab's `lane_curvature.py` trapezoid warp). Avg the two ego-lane boundaries → centerline → place in world via per-frame GPS/heading → **fuse across the route**. LATR (MIT) = optional 3D validator for the steep Grapevine grade.
- **VLM auto-labeler/judge:** Qwen3-VL-8B-Instruct (clean Apache-2.0, native box+point grounding, runs in LM Studio/Ollama, LoRA on 16–24 GB). InternVL3.5-8B cross-check. **SKIP Molmo 2** (non-commercial training data).
- **Coding agent to build it:** local Ornith-1.0-35B.

**Data:** shippable fine-tune set = **self-labeled I-5 frames** (10,031 NB + 2,852 SB, already mapped 1:1 to GPS). Auto-label = Qwen3-VL boxes/points + lab's adaptive-HSV/sliding-window/polyfit → fuse agreement → RANSAC + temporal smoothing → human-refine only disagreements (CVAT/Roboflow free). Label BOTH dashcam AND Street View viewpoints; cover curved Grapevine segments. CULane/LLAMAS/BDD = R&D init/warm-up only (non-commercial / login-gated).

**Train (Kaggle):** 30 GPU-hrs/wk, T4×2, 9-hr sessions. Start from CULane-pretrained CLRerNet; freeze DLA34 backbone + LoRA/unfreeze lane head; AdamW, low lr, ~10–15 epochs. Stage: LLAMAS warm-up → I-5 pseudo-labels → BDD weather pass. Checkpoint to HF between sessions.

**Validate (MANDATORY gate before trusting offsets):** comma2k19 (MIT, at `C:/Dev/comma2k19`) — physical curvature `R = v/yaw_rate` from CAN steering + IMU vs predicted R → calibrate pixel→meter (mx,my); + OSM I-5 curvature (Overpass) cross-check.

**License guardrail (commercial):** every strong lane dataset + best 3D models are NON-COMMERCIAL. Fine for the v1 showpiece; a commercial asset must trace ONLY to self-labeled I-5 frames + MIT comma2k19 + ODbL OSM.

**Top risks:** comma2k19 `K` ≠ your dashcam/Street View → per-source calibration + the dynamics gate is mandatory; flat-ground IPM breaks on the Grapevine grade → limit range ~50–60 m, per-frame pitch, multi-frame fusion, optional LATR/HeightLane; CULane weak on sharp curves → curved-segment labels mandatory; pseudo-label noise → budget human spot-checking of the disagreement set.
```
