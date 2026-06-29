# Handoff: CALCUP26 I-5 Live Journey Simulator

## Overview
A real-time, single-screen "command center" that tracks a live Glympse-tagged drive from
Irvine, CA to Alameda, CA along I-5 / I-580. It presents the trip through three switchable,
full-bleed visual modes plus a persistent status strip, an AR data rail, and two collapsible
drawers (Controls, Route Intel). The first screen IS the simulator (not a landing page).

The three modes:
- **First Person** — a premium *automotive* AR windshield: a pseudo-3D projected freeway corridor
  with photoreal asphalt, perspective lane markings, dynamic time-of-day lighting, segment-aware
  terrain, roadside signage, and a glass HUD. **No traffic is ever shown in this view.**
- **Drone** — a holographic *mission-control / Google-AR (Ingress-style)* chase camera over the
  same 3D corridor: neon-teal road, a glowing tracked vehicle in the fast lane, traffic-colored
  road edges, drone telemetry, and corner brackets.
- **Overhead** — a familiar **Google-Maps-style roadmap** (light land, blue water, green parks,
  blue route line, red teardrop pins, Google traffic colors) wrapped in **TV traffic-cam broadcast
  chrome** (a red LIVE banner + station bug). Aimed at being instantly familiar/comfortable.

## About the Design Files
The file in this bundle (`california-i5-live-drive-simulator.html`) is a **design reference + working
prototype created in a single self-contained HTML file**. It is a real, runnable artifact — but for
production you should **recreate it in the target codebase's existing environment** (React, Vue, Svelte,
native, etc.) using that codebase's established patterns, state management, and component conventions.
If no front-end environment exists yet, this app is intentionally framework-free and can ship close to
as-is, or be ported to whatever framework the team standardizes on.

The rendering core is **imperative `<canvas>` 2D** driven by a single `requestAnimationFrame` loop —
that part is engine code, not UI markup, and should be preserved largely intact regardless of framework.
The surrounding chrome (status strip, rail, drawers, toggles) is plain DOM and maps cleanly onto components.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, motion, and the full rendering engine are present
and tuned. Recreate the chrome pixel-accurately; preserve the canvas renderers as-is (port the loop, keep
the math). The look is deliberate — do not substitute a generic map/3D library without matching the art direction.

## Run It
Serve the folder statically and open the HTML (it fetches the Glympse API + Google embed):
```
python -m http.server 4188      # then open http://127.0.0.1:4188/california-i5-live-drive-simulator.html
```

---

## ⚠️ Live Data Layer — DO NOT BREAK (preserved from prior handoff)
All of the following already works and must be carried over faithfully:
- **Glympse live sync** of the public tag `!calcup26`:
  - viewer login → `GET https://api.glympse.com/v2/account/login?username=viewer&password=password&api_key=<API_KEY>`
    (`api_key` currently `0SLq661pXHmqdWgI8Yb1`)
  - public group lookup → `GET /v2/groups/calcup26` (Bearer token) → first member's `invite`
  - invite trail poll → `GET /v2/invites/<invite>` (Bearer token) → `response.location`
  - **delta-decoded trail** in `decodeTrail(rows)` (each row is a delta from the previous; columns are
    `[time, lat*1e6, lng*1e6, altitude, speedRaw, headingRaw]`; `headingRaw/10` = degrees,
    speed via `decodeSpeed()` which divides by 4.47 when raw > 220 i.e. cm/s → mph-ish).
  - Re-polls every 30s; falls back to "fallback drift" if live is stale > 45s.
- **Manual GPS fallback** (`applyPosition(lat,lng,speed,heading,source)`).
- **Simulated drive fallback** (advances `state.simProgress` when `mode === "sim"`).
- **Route projection** onto the Irvine→Alameda polyline: `projectToRoute()`, `closestPointOnSegment()`,
  `interpolateRoute(progress)`, great-circle `milesBetween()` / `bearing()`.
- **Local traffic model** driven by live speed + zone bases: `updateTrafficModel()`, `segmentTrafficScore(mile)`.
  Traffic appears in Drone + Overhead + the rail only — **never** in First Person.
- **Optional official Google `TrafficLayer`** behind a user-supplied Maps JavaScript API key
  (`enableGoogleTrafficLayer()`); this is distinct from the local model — keep that distinction in copy.
- **Researched route data**: the `route[]` array (23 nodes with `name/lat/lng/kind/note/article`) and
  `trafficZones[]`. Mileposts are computed at load. Preserve all notes/landmarks; they drive the
  Route Intel drawer, the timeline, and the overhead callouts.

---

## Layout (command center)
- **Top status strip** (52px): I-5 shield + "CALCUP26 / I-5 LIVE · IRVINE → ALAMEDA" wordmark;
  live/sim/manual status chip (colored dot + text); GPS chip (lat,lng); sync-age chip;
  right-aligned buttons: Controls, Route Intel, Pause/Resume, Sync Tag.
- **Stage** (fills rest): a single full-bleed `<canvas id="mainCanvas">` rendering the active mode.
  Overlaid (absolute, `z-index` ordered): vignette, operator corner brackets (drone only),
  AR header (top-left), layer toggles (overhead only, top-right), mode switch (bottom-left),
  AR data rail (bottom-center), two live preview thumbnails (bottom-right), hidden Google panes.
- **Controls panel** — slides in from left (`translateX`), holds Live Source toggle, Manual GPS,
  Sim Speed slider, Google Traffic key, and the adapter log.
- **Route Intel drawer** — slides in from right; current segment card + landmark timeline.
- **Preview thumbnails** show the two *inactive* modes (rendered into `#prevA` / `#prevB` at low detail,
  throttled to ~11fps); clicking one switches to it.

## Mode rendering engine (canvas)
Shared pseudo-3D corridor (Jake-Gordon-style projection):
- Constants: `SEG_LEN=200`, `ROAD_W=2100` (half-width), `LANES=4`, `WORLD_PER_MILE=13000`, `SPEED_K=24`.
- `buildBands(drawDist)` accumulates curvature (`curvatureAtMile`) and grade (`hillAtMile`) per segment.
- `projWorld(worldZ, lateral, bands, cam, w, h)` → screen `{x,y,scale,w}`; camera object is
  `{depth, height, ground, x, horizon}`. `cam.ground` is an eased elevation (`state.camElev`) so the
  near road never pops vertically (key motion-sickness fix — keep it).
- `renderCorridor(...)` draws: dynamic sky + sun bloom (automotive) OR dark sky (operator); parallax
  terrain silhouettes by segment; **road bands far→near**; continuous solid markings; guidance ribbon
  (operator only); signage; vehicle (drone); cockpit (first person); horizon haze; telemetry (drone).
- **Markings**: dashes are per-band (`drawLaneLines`, the speed cue); solid white edges + a **solid
  double-yellow centre line with an asphalt gap between the two lines** are drawn as ONE continuous
  tapered ribbon (`drawRibbonLine`) to avoid per-band seam shimmer. Yellow lines sit at lateral ±0.032
  of `ROAD_W`, thickness `ROAD_W*0.013`. Do not reintroduce per-band solid lines (they stutter).
- **Photoreal asphalt** (first person only): a 256×512 procedural aggregate-grain texture built once at
  load (`buildAsphalt()`); each road band clips its trapezoid, fills a distance-graded base
  (`#3c3e42`→`#26282c`), then `drawImage`s a grain strip whose source-Y is keyed to absolute world Z so
  grain "sticks" to the road and scrolls naturally. Plus gravel shoulders + two faint worn tyre paths.
- **Dynamic lighting**: `LIGHT_KEYS[]` keyframes by trip progress (LA morning haze → clear mountains →
  valley golden hour → East-Bay dusk), interpolated in `lightAt(progress)`.
- `renderFirst` cam: `{depth:0.78, height:1080, ground:camElev, x:camCurve*0.4, horizon:0.47}`.
- `renderDrone` cam: `{depth:1.05, height:4200, ground:camElev, x:camCurve*1.6, horizon:0.30}`;
  vehicle drawn at `followZ=3400`, `laneLat = 0.2*ROAD_W` (right carriageway, left/fast lane).
- `renderOverhead`: Google-Maps roadmap + TV chrome (see Overview); geo→screen via `sg(p)` with a top
  inset reserved for the broadcast banner.

## Interactions & Behavior
- Mode switch + preview clicks call `setView('first'|'drone'|'overhead')`, which sets `app.dataset.view`
  (CSS recolors accents) and toggles Google panes (overhead only).
- Layer toggles (`traffic`, `milestones`, `intel`, `google`) flip `state.layers.*` (overhead only).
- Pause/Resume freezes `state.playing` (stops sim advance + world scroll).
- Sync Tag → `livePoll()`. Live Source toggle switches `state.mode` live/sim.
- Camera easings per frame: `camCurve` (dt*1.6), `camElev` (dt*1.3), `camHeadingEase` (dt*1.6).
  **No vertical camera bob** — it caused motion sickness; do not re-add.
- World scroll: `state.worldPos += speedMph * SPEED_K * dt` when playing.

## State Management
`state` object holds: `view, mode, playing, progress, simProgress, speedScale, source, position{lat,lng},
routeMile, speedMph, heading, traffic{Score,Level,DelayMin,Summary}, google* , lastLiveTime,
lastMapFrameUpdate, log[], worldPos, camCurve, camElev, camHeadingEase, layers{...}`.
`glympse` holds `{tag, token, invite, apiKey, lastPoll}`.

## Design Tokens
Defined as CSS vars in `:root` (operator/mission-control base):
- bg `#05080c`, bg2 `#080d14`, panel `rgba(10,16,24,.82)`, panel-solid `#0a121b`
- line `rgba(120,180,210,.16)`, line-strong `rgba(120,190,220,.34)`
- ink `#eaf4f6`, muted `#8b9bab`, dim `#5d6b78`
- teal `#34e3c4` (+ dim `rgba(52,227,196,.16)`), blue `#54a9ff` (+ dim)
- amber (automotive accent) `#f6b65c`, warn `#ff7a59`, good `#5fd08a`
- Google overhead palette (canvas literals): land `#e9e8e3`, water `#a9d3f5`, park `#cfe6c4`,
  route blue `#1a73e8`/`#4f8cf7`, traveled grey `#9aa0a6`, pin red `#ea4335`, label `#3c4043`
- Traffic colors: clear `#34e3a0`, moderate `#ffd84a`, heavy `#ff9d2e`, jammed `#ff5247`
- Asphalt: base `#34373b`, grain greys 28–176, base grade `#3c3e42`→`#26282c`
- Centre yellow `#f2c234` (rgba `242,194,52,.95`), edge white `rgba(240,235,214,.92)`
- Fonts: `--sans` system stack (Helvetica/Segoe/-apple-system); `--mono` for telemetry/chips/labels
- Radii: chips/cards 4–8px; buttons 5px. Shadows: panel `0 0 50px rgba(0,0,0,.6)`, previews `0 8px 24px rgba(0,0,0,.5)`

## Assets
- `i5-logo.png` — the California Interstate-5 shield (header + roadside signage sprite + favicon).
  Use the codebase's own asset for this if one exists.

## Files
- `california-i5-live-drive-simulator.html` — the entire app (markup + CSS + engine, single file).
- `i5-logo.png` — shield asset referenced by the app.
