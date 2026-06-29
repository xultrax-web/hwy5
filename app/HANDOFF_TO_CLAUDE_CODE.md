# CALCUP26 I-5 Simulator Handoff

## Current State

This is a local-file/codebase handoff for the CALCUP26 California I-5 live drive simulator.

Claude Code should assume it does **not** have access to the user's Vercel account. Work locally on the files in this package. The user or Codex can handle deployment later.

- Existing production site for reference only: https://calcup26-i5-simulator.vercel.app
- Existing GitHub repo for reference only: https://github.com/xultrax-web/calcup26-i5-simulator
- Main app: `index.html`
- Google APIs:
  - `api/live-conditions.js`
  - `api/browser-config.js`
- Embedded Claude visual engine: `cc-engine/`
- App logo: `i5-logo.png`

The app tracks public Glympse tag `!calcup26`, simulates Irvine to Alameda, and shows three visual modes:

- first person windshield AR
- drone/chase view
- overhead route/map view

The dashboard layout should remain recognizable. The user likes:

- the current dashboard shell
- the landmark/time route intelligence
- the general metrics layout
- the Glympse/live-source concept

Avoid replacing the whole dashboard with a new layout unless explicitly asked.

## Important Recent Decisions

- The traffic layer starts off by default.
- The `TRAFFIC` button is the only map traffic toggle.
- There is no separate `GOOGLE PANE` button anymore.
- When Google traffic is active, the overhead pane switches to one Google map surface.
- When Google traffic is off, the overhead pane returns to the simulator/Claude overhead view.
- Glympse UI is inside the existing `Live Source` panel as a collapsible `Glympse !calcup26 source`.
- The first-person HUD freeway sign should be simple green/white, without a Hwy 5 shield and without an arrow.

## Google API Integration

Two Vercel API functions exist:

### `/api/live-conditions`

Uses the server key from:

```txt
GOOGLE_MAPS_SERVER_KEY
```

Returns live:

- traffic-aware ETA from Routes API
- Weather API current conditions
- Air Quality API current conditions

### `/api/browser-config`

Uses:

```txt
GOOGLE_MAPS_BROWSER_KEY
```

Returns browser-safe config for Google Maps JavaScript TrafficLayer and the Glympse URL.

Do not hardcode API keys in `index.html`.

## Required Environment Variables

Create `.env.local` for local Vercel dev:

```txt
GOOGLE_MAPS_SERVER_KEY=your_google_key_here
GOOGLE_MAPS_BROWSER_KEY=your_google_key_here
```

The user's real `.env.local` was intentionally excluded from this handoff zip.

Claude Code should not expect the real key to be present in this zip. If Google-backed local API testing is needed, ask the user to create `.env.local` locally with the variables above.

## Local Run Commands

From the project root:

```powershell
vercel dev --listen 3000
```

The static local page may also be served at:

```txt
http://127.0.0.1:4188/california-i5-live-drive-simulator.html
```

When the static page runs on port `4188`, it calls local Vercel APIs at:

```txt
http://localhost:3000/api/live-conditions
http://localhost:3000/api/browser-config
```

If the UI appears stale, use a cache-busted URL such as:

```txt
http://127.0.0.1:4188/california-i5-live-drive-simulator.html?v=handoff-check
```

## Verification Commands

Local API live conditions:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/live-conditions?lat=34.639104&lng=-118.746817&destLat=37.7652&destLng=-122.2416" -UseBasicParsing
```

Local browser config:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/browser-config" -UseBasicParsing
```

Do not print API keys in chat or logs.

## UX Issues To Watch

The user reported the dashboard was becoming confusing when maps/windows overlapped. The current intended rule is:

- default overhead = simulator/Claude overhead
- traffic on = Google TrafficLayer only
- traffic off = simulator/Claude overhead only

If editing this area, preserve the one-map-surface-at-a-time rule.

## Suggested Next Work

1. Improve the Google TrafficLayer visual affordance so the Traffic button clearly says when the Google map is loading, active, or unavailable.
2. Add Places API for next useful stop: gas, food, EV charging, rest area.
3. Add AQI/weather mini overlays to the overhead view without adding more map panes.
4. Consider moving the app from one large `index.html` into a small Vite/React or plain-module structure only if the user approves. The current single-file app is easy to deploy but getting large.
