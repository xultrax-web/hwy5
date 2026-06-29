# CALCUP26 I-5 Simulator Integration Prep

Created: 2026-06-29

This folder is a non-invasive prep area for consolidating the simulator, Claude Code output, and Gemini research into `C:\Dev\hwy5`.

Nothing in this folder changes the current live app. Treat it as the planning and data-contract layer for the upcoming switch-over.

## Current Targets

- Preserve the existing dashboard layout and landmark timing.
- Replace weak simulator surfaces with stronger first-person AR, drone chase, and overhead modes from Claude Code where appropriate.
- Bring Gemini's video/CV/highway telemetry research in as a data layer, not loose UI code.
- Move the canonical project into `C:\Dev\hwy5` only after Claude's returned work is inspected.
- Keep local-only secrets, videos, extracted frames, and scratch files out of GitHub.

## Folder Contents

- `schemas/` - JSON data contracts for route, landmarks, signs, live feeds, and AR overlays.
- `manifests/` - Official/free source inventory for Caltrans, FHWA/MUTCD, signs, fonts, and map data.
- `checklists/` - Merge and switch-over steps for Claude/Gemini/app consolidation.
- `snapshots/` - Current known-good app state and preservation notes.

## Start Here Later

1. `snapshots/current-app-state.md`
2. `checklists/claude-gemini-merge-checklist.md`
3. `checklists/git-asset-policy.md`
4. `checklists/switch-over-plan.md`
5. `manifests/data-backlog.md`
6. `manifests/official-public-sources.md`

## Proposed Future Project Layout

```text
C:\Dev\hwy5
  app\
    api\
    cc-engine\
    public\
    src\ or index.html
  data\
    official-caltrans\
    route\
    signs\
    live-feeds\
  research\
    gemini\
    videos\
    frame-samples\
  handoffs\
  integration-prep\
  scratch\
```

## Git Boundary

Expected GitHub content:

- `app/`
- `data/` curated JSON/CSV/source manifests
- `docs/`
- `handoffs/`
- lightweight samples and fixtures

Expected local-only content:

- Google API keys and `.env.local`
- full MP4 videos
- raw extracted frame folders
- temporary downloads
- experimental scratch scripts unless promoted
