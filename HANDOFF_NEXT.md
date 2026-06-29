# CALCUP26 I-5 Simulator — Handoff (continue here)

You're picking up an in-progress local project: the **CALCUP26 I-5 Live Drive Simulator**. Read this fully before touching anything — there's important context and a few decisions that are easy to accidentally undo.

## What it is
A browser app that tracks a live public **Glympse** tag (`!calcup26`), projects the GPS onto an **Irvine → Alameda** I-5 / I-580 route, and shows it in three views — first-person AR windshield, drone chase, and overhead map — inside a dashboard.

## Project layout (root: this working dir)
- `app/` — **THE DEPLOYABLE APP.**
  - `app/index.html` — the dashboard shell + all its own JS (Glympse polling, route projection, traffic model, the Journey Progress rail, the Live Source panel, and `fetch`es to `/api/*`). This is what's served.
  - `app/cc-engine/` — the **BUILT** 3D engine (React + Three.js bundle). `index.html` embeds it via `<iframe src="cc-engine/?embed=first|drone|overhead">`. Renders the photorealistic road + the in-scene **AR waypoint tags**. **Do not delete or bypass this — the photorealistic engine is the most-valued part of the app.**
  - `app/api/` — Vercel-style serverless functions: `browser-config.js`, `live-conditions.js`, `places.js`, `snap-stories.js`. They run **server-side only** (hold the key / avoid CORS).
  - `app/.env.local` — Google Maps key (gitignored). Both `GOOGLE_MAPS_SERVER_KEY` and `GOOGLE_MAPS_BROWSER_KEY` are set to the user's key. **Never print the key in chat or logs.**
  - `app/vercel.json`, `app/i5-logo.png`, `app/docs/`, `app/README.md`, `app/HANDOFF_TO_CLAUDE_CODE.md` (original handoff).
- `simulator/` — **THE SOURCE for `cc-engine/`** (Vite + React + TypeScript + Three.js). Edit here, rebuild, then copy the build into `app/cc-engine/` (see pipeline below).
  - Key files: `src/engine/scene3d.ts` (the 3D engine + AR waypoint tags), `src/engine/store.ts`, `src/engine/runtime.ts`, `src/engine/glympse.ts` (**DO NOT BREAK** the live adapter), `src/engine/places.ts`, `src/engine/routeContext.ts`, `src/engine/mapOverhead.ts` (Leaflet overhead), `src/components/EmbedStage.tsx`, `src/main.tsx` (reads `?embed=`), `vite.config.ts` (has `base: "./"` — **required** so assets resolve under `/cc-engine/`).
- `codebase/` — an OLD single-file prototype. **Ignore it.**
- `.claude/launch.json` — preview config: a static python server on `app/` at port 8088.
- There's a stray `google api.txt` at root holding the key — don't expose its contents.

## Architecture / data flow
- **CLIENT** code = `index.html` + the `cc-engine` iframes (run in the browser). They can call cross-origin services **only if those allow browser CORS**. Glympse does (so live tracking works with no backend). **Google and Snap do NOT.**
- **SERVER** code = `app/api/*.js` (need a backend to execute). They call Google/Snap server-side and return clean JSON.
- Live drive: `index.html` polls Glympse directly → projects the point onto the route → that position drives the engine iframes + the Journey rail + metrics. As it moves it calls `/api/live-conditions`, `/api/places`, `/api/snap-stories` for enrichment.

## Rebuild + deploy the engine (EXACT pipeline — no script exists, it's manual)

`simulator/package.json` only has `dev` / `build` / `preview`; there is **no copy script and no postbuild hook**. Run these two steps exactly. Step 2 runs from the **project ROOT**.

**1. Build (from `simulator/`):**
```bash
cd "<project-root>/simulator" && npm run build      # tsc --noEmit && vite build -> simulator/dist
```

**2. Deploy into the app (from the project ROOT):**
```bash
cd "<project-root>" \
  && rm -f app/cc-engine/assets/* \
  && cp simulator/dist/index.html app/cc-engine/index.html \
  && cp simulator/dist/assets/* app/cc-engine/assets/ \
  && cp simulator/dist/i5-logo.png app/cc-engine/i5-logo.png \
  && ls -1 app/cc-engine app/cc-engine/assets
```

**Invariants (diverging from these is how you break it):**
- **`rm -f app/cc-engine/assets/*` first.** Vite emits content-hashed filenames (e.g. `index-DHBQK4Kw.js`) that change every build; clear them so stale bundles don't accumulate.
- **Copy `index.html` AND `assets/` together.** The built `dist/index.html` references the new hashed asset names (relative `./assets/...` via `base: "./"`). Out-of-sync = blank/old engine in the iframe.
- **Don't** do a bare `cp -r dist/* app/cc-engine/` — it works but skips the `rm`, so old hashed assets pile up.

## Run / preview locally — NO VERCEL (the user is firm on this)
- **Static:** serve `app/` (e.g. `python -m http.server 8088 --directory app`, or the `i5-static` launch config). Glympse + the 3D engine + the Journey rail all work. `/api/*` does **not** run on a static server, so Places / weather / AQI / Google-traffic / Snap panels stay in a graceful empty state (and the relevant deep-links still work).
- To make `/api/*` work locally **without Vercel** you'd need a tiny plain-Node server that serves `app/` and executes `app/api/*.js` reading `.env.local`. The user has repeatedly chosen static-only — **don't add this unless they ask.**

## Decisions/gotchas you must NOT undo
1. The `cc-engine` 3D engine is sacred. New visual features go **inside** the engine (`simulator/src/engine/scene3d.ts`) and get rebuilt — not as 2D canvas overlays.
2. `?embed=first|drone|overhead` renders the engine **scene only** (no React chrome) via `main.tsx` → `EmbedStage`. Keep that working or the iframes break.
3. `index.html`'s own `drawFirst/drawDrone/drawOverheadMap` are intentionally neutralized (clear canvas + early `return`); the engine iframes draw the visuals. Dead code after the returns can be cleaned up but isn't harmful.
4. The hero stage is locked to **16:9** by a JS `fitHero()` sizer (pure CSS `aspect-ratio` broke when the stage went wide-and-short). Widescreen layout is pinned to 100vh at >1180px.
5. Rails are collapsible; the **LEFT rail is collapsed by default** into a "❯ CONTROLS" breadcrumb. Collapse is widescreen-only; regions use explicit `grid-column` so a hidden rail can't reflow the stage.
6. The right **Journey Progress** rail is built once (`buildJourneyRail`) and only its live bits update per frame (`updateJourneyRail`) so click-to-expand survives. Don't switch it back to per-frame `innerHTML`.
7. Traffic: the **TRAFFIC button is the only map traffic toggle**; overhead defaults to the engine map and shows the Google TrafficLayer surface only when on; **first-person never shows traffic.**
8. **Snap Map** (`api/snap-stories.js`) reads **PUBLIC Story content only** and needs a backend (no CORS). It does NOT broadcast the user's location and **CANNOT track friends** — Snapchat exposes no friend-location API; do not attempt to scrape private/friend locations (ToS + privacy). The "Open Snap Map here" deep-link is client-side and works statically. The proxy's response parsing is **best-effort/untested against live data** and may need tuning once a backend runs it.
9. **Glympse** is the live driver source and works browser-direct. Both `index.html` and the engine poll it independently.
10. **Never print API keys.**

## Verification notes
- Use a browser preview, but **screenshots of the nested WebGL iframes tend to hang** and the preview console capture is unreliable. Verify layout/logic via `eval` reading DOM/state + metrics, and screenshot the standalone engine (`/cc-engine/?embed=first`) or DOM-only states when you need a picture.

## Open / possible next steps (confirm with the user before big moves)
- Optionally add a plain-Node local server so `/api/*` (Places, weather/AQI, Snap) light up locally without Vercel.
- Tune `api/snap-stories.js` parsing against a real Snap response (needs a backend).
- Optional perf: replace the three concurrent engine iframes with one iframe that swaps `?embed=` on view change (one WebGL context).
- Optional: extend AR waypoint tags to the drone view (currently first-person only).
- Optional: formalize the build→copy pipeline into `npm run deploy:engine` (a cross-platform Node copy script) to remove ambiguity.
- Deployment is handled by the user / Codex later.

**Start by reading `app/index.html` and `simulator/src/engine/scene3d.ts`, then ask the user what to work on. Do not refactor or remove the engine without explicit approval.**
