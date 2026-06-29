# Current App State Snapshot

Date: 2026-06-29

## Known Current Locations

- Static local app: `C:\Users\piper\Documents\Codex\2026-06-28\we\outputs\california-i5-live-drive-simulator.html`
- Vercel deploy root: `C:\Users\piper\Documents\Codex\2026-06-28\we\work\vercel-site`
- Local browser URL: `http://127.0.0.1:4188/california-i5-live-drive-simulator.html?v=layout-clean-1`
- Local API/dev URL: `http://localhost:3000`
- GitHub repo: `https://github.com/xultrax-web/calcup26-i5-simulator`
- Production URL: `https://calcup26-i5-simulator.vercel.app`
- Latest known deploy commit: `43a7a55`

## Current App Behavior To Preserve

- Three view modes: first-person, drone/chase, overhead.
- Dashboard shell with route/landmark timing stays.
- Glympse tag: `calcup26`.
- Glympse embed belongs in the Live Source panel.
- Google traffic is an overhead/map concern only.
- Traffic toggle should reveal Google map traffic layer only in overhead mode.
- First-person mode should not show traffic layer overlays.
- HUD road sign is simple green/white, no I-5 logo inside the sign, no exit arrow.

## Google API State

- Local key file exists at `C:\Dev\hwy5\google api.txt`.
- Current local `.env.local` lives in the Vercel deploy root and must remain private.
- Server endpoint `/api/live-conditions` uses Google Routes, Weather, and Air Quality.
- Browser endpoint `/api/browser-config` exposes only browser-safe config.

## Current Risks

- Dashboard can become confusing if multiple map panes are shown at once.
- Claude visual engine may introduce blank canvases unless initialization order is controlled.
- Raw Gemini video/frame research is too large for GitHub.
- Official route/sign data is not yet normalized into JSON.
