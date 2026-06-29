# Claude Design Handoff: CALCUP26 I-5 Live Journey Simulator

## Project Goal

Reimagine the current single-file simulator into a high-end augmented-reality journey experience for a live Glympse-tagged drive from Irvine, CA to Alameda, CA. The current app works technically, but the three visual modes need a serious design and rendering upgrade.

The user specifically said:

> "we need to specifically reinvision the UI, first person, drone chase mode (which is a joke) and overhead mode. It needs to be mind blowing - like real augmented reality simulator grade for the first person mode."

Treat this as a design/experience overhaul, not a minor polish pass.

## Files

- Main app: `C:\Users\piper\Documents\Codex\2026-06-28\we\outputs\california-i5-live-drive-simulator.html`
- App logo/sign asset: `C:\Users\piper\Documents\Codex\2026-06-28\we\outputs\i5-logo.png`
- Local URL currently served at: `http://127.0.0.1:4188/california-i5-live-drive-simulator.html`

This is intentionally a self-contained static HTML app. Keep it runnable without a build step unless you and the user explicitly decide to migrate it.

## What Already Works

Do not break these parts:

- Live Glympse public tag sync for `!calcup26`.
- Viewer auth flow against `https://api.glympse.com/v2/`.
- Public group lookup, active invite extraction, invite trail polling.
- Delta decoding of Glympse location trail in `decodeTrail(rows)`.
- Projection of GPS onto the Irvine-to-Alameda route.
- Manual GPS fallback.
- Simulated drive fallback.
- Landmark timeline with Wikipedia-derived I-5 route context.
- Traffic model shown on maps only.
- Optional Google Maps JavaScript `TrafficLayer` loader via user-supplied API key.

Key implementation areas:

- Route and researched milestone data starts around `const route = [...]`.
- Traffic zone data starts around `const trafficZones = [...]`.
- Live sync: `async function livePoll()`.
- GPS trail decoding: `function decodeTrail(rows)`.
- Current renderers:
  - `function drawFirst(now)`
  - `function drawDrone()`
  - `function drawOverheadMap()`

## Current Weaknesses

First-person mode:

- Looks like a flat canvas demo, not a simulator.
- Road is a simple trapezoid with basic hills.
- No sense of vehicle cockpit, depth, weather, light, grade, lane scale, road texture, speed, or AR projection.
- I-5 sign is now a real image asset, but it floats like a billboard.
- HUD is functional but not immersive.

Drone chase mode:

- Current view is essentially a 2D mini-map with an arrow.
- It does not feel like a drone, chase camera, 3D following camera, or cinematic vehicle tracker.
- No altitude, parallax, terrain, road scale, camera lag, or vehicle body.

Overhead mode:

- Google iframe sometimes appears blank in headless/browser contexts.
- Fallback map is useful but visually crude.
- Traffic colors exist, but there is no premium cartographic styling, layer control, or sense of real route intelligence.

Overall UI:

- Too dashboard-heavy and boxy.
- Layout is useful for debugging but not emotionally impressive.
- The sidebars compete with the simulator.
- The app needs a clearer command center: live status, current segment, next milestone, traffic/map-only layers, view mode controls.

## Non-Negotiable UX Requirements

- Traffic must not appear in first-person mode. Traffic can appear in drone/overhead/map modes and sidebar metrics.
- First-person should be the star of the app.
- Do not turn this into a landing page. The first screen should remain the actual simulator.
- Keep the live trip grounded in `calcup26` and the route from Irvine to Alameda.
- Preserve the I-5 logo asset.
- Keep the route intelligence and landmark notes, but redesign how they are displayed.
- The user is a novice; avoid controls that require explanation unless the UI makes them obvious.

## Design Direction

Aim for an augmented-reality driving simulator:

- Full-bleed cinematic windshield.
- AR glass HUD, not floating generic cards.
- Perspective-correct lane markings, shoulder, signage, grade, and terrain.
- Route-aware roadside signs and upcoming milestone overlays.
- Speed, heading, current route mile, next landmark, and live sync as transparent AR elements.
- A horizon/terrain system that changes by segment:
  - Orange County / LA: urban freeway, overpasses, denser lanes.
  - Santa Clarita / Castaic: canyon approach.
  - Grapevine / Tejon: mountain grade, warning signage, elevation cues.
  - Central Valley: open agricultural corridor, aqueduct/power-line context.
  - I-580 / East Bay: hill and urban approach.

## Suggested Architecture

Keep the single HTML file, but refactor render responsibilities:

- `renderFirstPersonAR(ctx, state, routeContext)`
- `renderDroneChase(ctx, state, routeContext)`
- `renderOverheadMap(ctx, state, routeContext)`
- `getRouteContext(state.routeMile)` returns:
  - current segment
  - next landmark
  - terrain profile
  - signage set
  - route note
  - traffic score for map modes only

Do not bury new rendering logic inside one huge function if you can avoid it. The file is already large.

## First-Person Mode Redesign

Target feel: "AR windshield from a chase/support vehicle following the live Glympse trip."

Ideas to implement:

- Road with multiple lanes, shoulder, reflectors, lane parallax, and texture noise.
- Vehicle/cockpit lower edge: subtle dashboard silhouette, windshield tint, maybe faint glass reflections.
- AR lane guidance ribbon aligned to the road center.
- Next-exit/landmark signage rendered as realistic freeway signs mounted on gantries or roadside posts.
- Dynamic route context:
  - "Tejon Pass / Five Mile Grade"
  - "Route 99 split ahead"
  - "West Side Freeway"
  - "SR 152 / San Luis Reservoir corridor"
  - "I-580 connector to Alameda"
- Segment terrain themes:
  - Urban overpasses and sound walls in LA.
  - Mountain silhouettes and grade arrows near Grapevine.
  - Central Valley flat fields, aqueduct line, power pylons.
  - East Bay hills near I-580.
- Motion cues:
  - lane dash speed tied to `state.speedMph`
  - camera shake only very subtly
  - horizon easing when route heading changes
  - roadside object parallax
- HUD:
  - route mile
  - live source
  - speed
  - next landmark distance
  - current section
  - approximate I-5 marker
  - no traffic in this view

Avoid:

- Cartoon cars in the lane.
- Big opaque panels covering the road.
- Generic sci-fi neon unrelated to highway driving.

## Drone Chase Mode Redesign

Current drone mode is the weakest part. Replace the 2D map feel.

Target feel: "cinematic third-person drone following the live vehicle along I-5/I-580."

Ideas:

- Draw a stylized 3D road corridor from a high rear camera angle.
- Vehicle marker should be an actual car shape or glowing live-tracker puck on the road.
- Camera should lag and ease behind the vehicle rather than lock perfectly.
- Road should curve through projected route points ahead.
- Add terrain bands and landmarks as ground annotations, not flat text dumped over a grid.
- Show traffic colors on route surface edges or a map overlay, since traffic is allowed here.
- Use "drone telemetry" HUD:
  - altitude
  - camera bearing
  - route section
  - distance to next landmark
  - live sample age

Avoid:

- A flat grid minimap with a tiny arrow.
- Labels overlapping each other near Grapevine.

## Overhead Mode Redesign

Target feel: "premium live operations map."

Ideas:

- Make the fallback canvas map good enough that it does not feel like a fallback.
- Use a dark, high-contrast route operations style.
- Show:
  - completed route
  - remaining route
  - traffic bands
  - major article-derived callouts
  - current live position
  - I-5 to I-580 transition
- Add layer toggles:
  - traffic
  - milestones
  - route intel
  - Google map pane
- If Google TrafficLayer is enabled, make it occupy the full overhead pane or a clearly selected tab; do not leave it awkwardly split unless intentional.

## UI Redesign

Replace the current three stacked canvases with a more deliberate simulator layout.

Recommended approach:

- Primary view takes most of the screen.
- View mode switcher: First Person / Drone / Overhead, with one large mode active.
- Small secondary preview thumbnails can show the other modes if desired.
- Right-side "Route Intel" should be collapsible or compact.
- Left controls should be narrower and less visually heavy.
- Put live sync status and current Glympse tag in a persistent top status strip.

Suggested top-level layout:

- Header/status strip:
  - I-5 logo
  - CALCUP26
  - live/sim/manual status
  - current GPS
  - last sync
- Main stage:
  - active selected mode, full height
- Bottom or side AR data rail:
  - speed, route mile, next landmark, current section
- Collapsible route drawer:
  - landmark timeline and article context

## Route Intelligence To Preserve

The app currently includes these researched route relationships from the Wikipedia article and related I-5 context:

- Santa Ana Freeway in Orange County.
- Golden State Freeway through LA/Burbank/San Fernando Valley.
- Grapevine / Tejon Pass.
- Five Mile Grade into the San Joaquin Valley.
- Route 99 split near Wheeler Ridge.
- West Side Freeway through the Central Valley.
- California Aqueduct / power corridor near Coalinga.
- SR 152 / San Luis Reservoir corridor near Santa Nella.
- I-580 split toward Tracy/Livermore/East Bay for Alameda.

These should become visual route intelligence, not just text paragraphs.

## Verification Checklist

After redesign:

- Open `http://127.0.0.1:4188/california-i5-live-drive-simulator.html`.
- Confirm the live Glympse sync still works.
- Confirm manual GPS still changes route position.
- Confirm simulated drive still advances.
- Confirm first-person mode has no traffic display.
- Confirm map/drone/overhead can show traffic.
- Confirm I-5 logo appears in header and first-person sign.
- Confirm route intel still tracks the current segment.
- Confirm mobile or narrow viewport does not overlap text.
- Run the inline script syntax check:

```powershell
$html = Get-Content outputs\california-i5-live-drive-simulator.html -Raw
$script = [regex]::Match($html, '<script>([\s\S]*)</script>').Groups[1].Value
Set-Content work\sim-script.js $script -Encoding utf8
node -e "const fs=require('fs'); new Function(fs.readFileSync('work/sim-script.js','utf8')); console.log('script syntax ok')"
```

## Practical Warning

Do not spend effort scraping Google Maps traffic. The app already has:

- optional official Google `TrafficLayer` path requiring an API key
- local traffic model driven by live Glympse speed and route zones

Keep that distinction clear in UI copy.

