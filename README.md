# CALCUP26 I-5 Simulator Handoff Package

This folder contains the current working codebase and design handoff for the CALCUP26 live I-5 journey simulator.

## Contents

- `codebase/california-i5-live-drive-simulator.html` - single-file simulator app
- `codebase/i5-logo.png` - I-5 shield logo/sign asset
- `docs/CLAUDE_DESIGN_HANDOFF.md` - design handoff for the next redesign pass

## Run Locally

From the `codebase` folder:

```powershell
python -m http.server 4188
```

Then open:

```text
http://127.0.0.1:4188/california-i5-live-drive-simulator.html
```

## Current Behavior

- Tracks public Glympse tag `!calcup26`.
- Provides first-person, drone, and overhead views.
- Includes route intelligence from Irvine to Alameda via I-5 and I-580.
- Shows traffic only on map/drone/overhead modes and sidebar metrics, not in first-person mode.

## Important

Preserve the live Glympse sync, manual GPS fallback, simulated drive fallback, route projection, and route-intelligence data while redesigning the visual experience.
