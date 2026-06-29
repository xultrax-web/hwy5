# Claude Zip Intake Procedure

Run this when Claude Code returns the new zip.

## 1. Stage

- Copy the zip into `C:\Dev\hwy5\incoming-claude\staged-zips`.
- Extract it into `C:\Dev\hwy5\incoming-claude\extracted\<zip-name>`.
- Do not overwrite `C:\Dev\hwy5\app`.

## 2. Inventory

Record in `C:\Dev\hwy5\incoming-claude\inventory\<zip-name>.md`:

- entry point files
- assets
- dependency clues
- whether it uses Three.js, MapLibre, deck.gl, Cesium, Rapier, plain canvas, or React
- controls provided
- which view is strongest: first-person, drone, overhead
- files that must not be promoted

## 3. Verify

- Run syntax checks.
- If it has `package.json`, run install/build only in the extracted staging folder.
- Open the staged app locally if possible.
- Capture blank-screen/runtime errors before integration.

## 4. Promote

- Promote one view adapter at a time.
- First-person first, then drone, then overhead.
- Keep dashboard state and controls authoritative.
- Keep Google traffic separate and overhead-only.

## 5. Reject Criteria

- blank render surface
- duplicate dashboard shell
- duplicate Glympse UI
- traffic in first-person
- overlapping map layers
- hard-coded secrets
- large media dependency
