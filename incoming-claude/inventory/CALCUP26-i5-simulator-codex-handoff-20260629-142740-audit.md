# CALCUP26 Claude Package Audit

Date: 2026-06-29

Source zip:
`C:\Users\piper\Downloads\CALCUP26-i5-simulator-codex-handoff-20260629-142740.zip`

Extracted source:
`C:\Dev\hwy5\incoming-claude\extracted\CALCUP26-i5-simulator-codex-handoff-20260629-142740\CALCUP26-i5-simulator`

Clean cutover target:
`C:\Dev\hwy5`

## Read / Inventoried

- Canonical handoff: `CODEX_README.md`
- Project handoffs/docs: `README.md`, `HANDOFF_NEXT.md`, `docs/CLAUDE_DESIGN_HANDOFF.md`, `app/README.md`, `app/HANDOFF_TO_CLAUDE_CODE.md`, `app/docs/CLAUDE_DESIGN_HANDOFF.md`
- Static dashboard: `app/index.html`
- Vercel/static API files: `app/api/browser-config.js`, `app/api/live-conditions.js`, `app/api/places.js`, `app/api/snap-stories.js`, `app/vercel.json`, `app/.env.example`, `app/.gitignore`
- Engine source app: `simulator/index.html`, `package.json`, `package-lock.json` dependency header, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- React shell/hooks/components under `simulator/src/`
- Engine modules under `simulator/src/engine/`, including `scene3d.ts`, `mapOverhead.ts`, `runtime.ts`, `glympse.ts`, `places.ts`, route/traffic/math helpers, and CSS/token files
- Built engine shell/assets under `app/cc-engine/`
- Legacy prototype under `codebase/` was inventoried as old reference, not implementation source
- Nested `AR navigation design specifications.zip` was unpacked into `incoming-claude/inventory/design_handoff_i5_journey_simulator/`; its README was read and its prototype/logo inventoried
- Binary/minified files were inventoried and hashed rather than hand-read as source:
  - `app/cc-engine/assets/index-DHBQK4Kw.js`
  - `app/i5-logo.png`, `app/cc-engine/i5-logo.png`, `codebase/i5-logo.png`, `simulator/public/i5-logo.png`

## Architecture Confirmed

- `app/` is the deployable static dashboard shell.
- `simulator/` is the Vite/React/TypeScript/Three.js source for the embedded engine.
- `app/cc-engine/` is a built artifact generated from `simulator/`.
- Dashboard visual modes are hosted as iframes:
  - `cc-engine/?embed=first`
  - `cc-engine/?embed=drone`
  - `cc-engine/?embed=overhead`
- New scene visual work belongs in `simulator/src/engine/scene3d.ts`, then the engine must be rebuilt and copied to `app/cc-engine/`.
- `app/index.html` owns the dashboard shell, live Glympse adapter, route projection, metrics, Journey rail, and `/api/*` data wiring.

## Cutover Performed

The previous partial `C:\Dev\hwy5` cutover was moved aside, then clean `app/`, `simulator/`, `docs/`, and root handoff docs were copied from the extracted Claude package.

Backups created:

- `C:\Dev\hwy5\backups\app-pre-clean-claude-20260629-145229`
- `C:\Dev\hwy5\backups\simulator-pre-clean-claude-20260629-145229`
- `C:\Dev\hwy5\backups\docs-pre-clean-claude-20260629-145229`

Hash checks confirmed the active files match Claude's extracted source:

- `C:\Dev\hwy5\app\index.html`
- `C:\Dev\hwy5\simulator\src\engine\scene3d.ts`

## Validation

- `app/index.html` inline script syntax check passed with `new Function`.
- `npm install` completed in `C:\Dev\hwy5\simulator`.
- `npm run build` passed in `C:\Dev\hwy5\simulator`.
- Build output matched the shipped engine artifact names:
  - `dist/index.html`
  - `dist/assets/index-Bqo55-53.css`
  - `dist/assets/index-DHBQK4Kw.js`
- Static preview started at `http://127.0.0.1:8088/`.
- Browser smoke test confirmed:
  - dashboard loads,
  - active first-person engine iframe is visible,
  - drone and overhead engine iframes are present and hidden until selected,
  - controls, journey, route intel, and live source panels are present.

## Notes / Known Gaps

- `C:\Dev\hwy5` is not a git repo yet.
- Static preview cannot serve `/api/*`, so Google-backed Places/live-condition calls require Vercel or a local API server.
- `npm audit` reports 1 moderate and 1 high dependency issue; no forced dependency upgrade was applied during intake.
- Production key-paste cleanup was applied after cutover:
  - the visible `Maps key override` panel was removed from `app/index.html`,
  - the TrafficLayer loader now reads only `mapsBrowserKey` from `/api/browser-config`,
  - normal production/Vercel users should not paste a browser key.
- AR ownership adjustment was applied in `simulator/src/engine/scene3d.ts`:
  - rich AR tags now display in drone mode instead of first-person mode,
  - the engine was rebuilt and copied into `app/cc-engine/`.
- Remaining product direction:
  - first-person should stay cinematic/minimal,
  - drone should continue becoming the rich AR waypoint/interactivity layer,
  - overhead should become Google Maps-first with traffic when a browser key is available.
