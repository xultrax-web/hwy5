# CALCUP26 I-5 Live Drive Simulator — Codex Handoff

This is the canonical handoff for continuing the **CALCUP26 I-5 Live Drive Simulator**. Read it fully
before changing anything. (`HANDOFF_NEXT.md` and `app/HANDOFF_TO_CLAUDE_CODE.md` are prior handoffs and
remain accurate; this file supersedes them and adds the latest state.)

---

## ⚠️ Security (read first)
- **No API keys are in this zip.** `app/.env.local` and the root `google api.txt` were **intentionally
  excluded.** `app/.env.example` is included as a template.
- **Never print, echo, or commit API keys.** If you need Google-backed local testing, ask the user to
  create `app/.env.local` from `app/.env.example`.

## What it is
A browser app that tracks a live public **Glympse** tag (`!calcup26`), projects the GPS onto an
**Irvine → Alameda** I-5 / I-580 route, and shows it in three views — **first-person AR windshield**,
**drone chase**, and **overhead map** — inside a dashboard. The first-person and drone visuals are a
real **Three.js / WebGL2** engine; the overhead is a real **Leaflet/OpenStreetMap**.

## Project layout
- `app/` — **THE DEPLOYABLE APP** (served as static files).
  - `app/index.html` — dashboard shell + all its own JS (Glympse polling, route projection, traffic
    model, the Journey Progress rail, Live Source panel, status strip, `/api/*` fetches). **This is the
    file you edit for dashboard/chrome changes** (no build step — it's plain HTML/JS/CSS).
  - `app/cc-engine/` — the **BUILT** 3D engine (React + Three.js bundle from `simulator/`). `index.html`
    embeds it via `<iframe src="cc-engine/?embed=first|drone|overhead">`. **Do not delete or bypass it —
    the photorealistic engine is the most-valued part of the app.** It's a build artifact; the source is
    `simulator/`.
  - `app/api/` — Vercel-style serverless functions (`browser-config.js`, `live-conditions.js`,
    `places.js`, `snap-stories.js`). **Server-side only** (hold the key / avoid CORS). They do NOT run on
    the static preview — those panels degrade gracefully to empty.
  - `app/.env.example` — env template. The real `app/.env.local` is excluded (see Security).
  - `app/vercel.json`, `app/i5-logo.png`, `app/docs/`, `app/README.md`, `app/HANDOFF_TO_CLAUDE_CODE.md`.
- `simulator/` — **THE SOURCE for `app/cc-engine/`** (Vite + React + TypeScript + Three.js). Edit here,
  rebuild, copy the build into `app/cc-engine/` (pipeline below). `node_modules/` and `dist/` are excluded
  from the zip — run `npm install` to restore deps.
  - Key files: `src/engine/scene3d.ts` (3D engine + AR waypoint tags), `store.ts`, `runtime.ts`,
    `glympse.ts` (**DO NOT BREAK** the live adapter), `places.ts`, `routeContext.ts`,
    `mapOverhead.ts` (Leaflet), `src/components/EmbedStage.tsx`, `src/main.tsx` (reads `?embed=`),
    `vite.config.ts` (**`base: "./"` is required** so assets resolve under `/cc-engine/`).
- `codebase/` — an OLD single-file prototype. **Ignore it.**
- `docs/`, `README.md`, `HANDOFF_NEXT.md` — background/handoffs.
- `AR navigation design specifications.zip` — original design reference material.
- `.claude/launch.json` — preview config: a static python server on `app/` at port 8088.

## Architecture / data flow
- **CLIENT** = `index.html` + the `cc-engine` iframes (run in the browser). They may call cross-origin
  services **only if those allow browser CORS**. **Glympse does** (live tracking needs no backend);
  **Google and Snap do NOT.**
- **SERVER** = `app/api/*.js` (need a backend). They call Google/Snap server-side and return clean JSON.
- Live drive: `index.html` polls Glympse → projects the point onto the route → that position drives the
  engine iframes + the Journey rail + metrics. As it moves it calls `/api/live-conditions`, `/api/places`,
  `/api/snap-stories` for enrichment (no-ops on the static server).

## Rebuild + deploy the engine (EXACT manual pipeline — no script exists)
`simulator/package.json` has only `dev` / `build` / `preview`; **no copy script, no postbuild hook.**

**1. Build (from `simulator/`):**
```bash
cd simulator && npm install && npm run build      # tsc --noEmit && vite build -> simulator/dist
```
**2. Deploy into the app (from the project ROOT):**
```bash
rm -f app/cc-engine/assets/* \
  && cp simulator/dist/index.html app/cc-engine/index.html \
  && cp simulator/dist/assets/* app/cc-engine/assets/ \
  && cp simulator/dist/i5-logo.png app/cc-engine/i5-logo.png \
  && ls -1 app/cc-engine app/cc-engine/assets
```
**Invariants:** clear `app/cc-engine/assets/*` first (Vite emits content-hashed names that change every
build); copy `index.html` AND `assets/` together (the HTML references the new hashed names via relative
`./assets/...`). Out-of-sync = blank/old engine in the iframe.

> HMR caveat when developing the engine with `npm run dev`: `scene3d.ts` builds the scene **once on
> mount**, so engine changes need a full browser reload, not HMR.

## Run / preview locally — NO VERCEL (the user is firm on this)
- **Static:** serve `app/` (`python -m http.server 8088 --directory app`, or the `i5-static` launch
  config). Glympse + the 3D engine + the Journey rail all work. `/api/*` does not run statically, so
  Places / weather / AQI / Google-traffic / Snap panels stay gracefully empty (deep-links still work).
- To make `/api/*` work locally without Vercel you'd need a tiny plain-Node server that serves `app/` and
  executes `app/api/*.js` reading `.env.local`. The user has repeatedly chosen static-only — **don't add
  this unless they ask.**

## Decisions / gotchas you must NOT undo
1. The `cc-engine` 3D engine is **sacred**. New visual features go **inside** the engine
   (`simulator/src/engine/scene3d.ts`) and get rebuilt — **never** reimplemented as 2D canvas overlays in
   `index.html`.
2. `?embed=first|drone|overhead` renders the engine **scene only** (no React chrome) via
   `main.tsx` → `EmbedStage`. Keep that working or the iframes break.
3. `index.html`'s own `drawFirst/drawDrone/drawOverheadMap` are intentionally neutralized (clear + early
   `return`); the engine iframes draw the visuals.
4. The hero stage is locked to **16:9** by a JS `fitHero()` sizer. Widescreen pinned to 100vh at >1180px.
5. Rails are collapsible; the **LEFT rail is collapsed by default**. Collapse is widescreen-only.
6. The right **Journey Progress** rail is built once (`buildJourneyRail`) and only live bits update per
   frame (`updateJourneyRail`). Don't switch it back to per-frame `innerHTML`.
7. Traffic: the **TRAFFIC button is the only map traffic toggle**; overhead defaults to the engine map and
   shows the Google TrafficLayer surface only when on; **first-person never shows traffic.** One map
   surface at a time.
8. The first-person HUD freeway sign is **simple green/white — no Hwy-5 shield, no arrow.**
9. **Snap Map** reads PUBLIC Story content only, needs a backend, and **cannot track friends** (no API;
   ToS/privacy). Don't attempt private/friend-location scraping.
10. **Glympse** is the live driver source; works browser-direct. **Never print API keys.**

## Recent work (latest first)
- **Status strip — added an `ETA` stat** between Speed and Progress, showing **time remaining + arrival
  clock** (e.g. `1h 16m · 4:47 PM`; `Arrived` at the destination). Source: prefers Google's traffic-aware
  `live.traffic.durationMinutes` when the backend is live, else estimates from a smoothed live (Glympse)
  speed with a 62 mph cruise fallback. (`app/index.html`: `tripEta`/`fmtRemaining`/`clockAt`, wired in
  `updateMetrics`.)
- **Status strip — single-line fix.** Adding ETA had wrapped the header to two rows. Made `.strip-stats`
  `flex-wrap: nowrap`; each `.stat` is fixed/no-wrap; the **Section** stat (`.stat-section`) is the one
  flexible item and truncates with an ellipsis only as a last resort. Then reclaimed ~50px of slack
  (column gap 18→12, stat padding 11→8, stat gap 10→7) so normal section names — incl. the longest,
  "Tejon Pass / Five Mile Grade" — show in full down to ~1366px without truncation. Verified by DOM
  measurement (screenshots of the triple WebGL iframes hang — use `eval` to read DOM/state instead).

## Verification notes
- Use a browser preview, but **screenshots of the nested WebGL iframes tend to hang** and console capture
  is unreliable. Verify layout/logic via `eval` reading DOM/state + metrics; screenshot the standalone
  engine (`/cc-engine/?embed=first`) or DOM-only states when you need a picture.

## Open / possible next steps (confirm with the user before big moves)
- Optional: a plain-Node local server so `/api/*` (Places, weather/AQI, Snap) light up without Vercel.
- Tune `api/snap-stories.js` parsing against a real Snap response (needs a backend).
- Perf: replace the three concurrent engine iframes with one iframe that swaps `?embed=` on view change
  (one WebGL context).
- Extend AR waypoint tags to the drone view (currently first-person only).
- Formalize the build→copy into `npm run deploy:engine` (cross-platform Node copy script).

**Start by reading `app/index.html` and `simulator/src/engine/scene3d.ts`. Do not refactor or remove the
engine without the user's explicit approval.**
