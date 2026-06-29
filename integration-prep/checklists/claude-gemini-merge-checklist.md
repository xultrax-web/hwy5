# Claude/Gemini Merge Checklist

Use this when Claude Code returns its zip. Do not overwrite the current working app until each step is checked.

## Preserve First

- Current dashboard layout stays recognizable.
- Landmark timing and "next landmark" model stay.
- Live Source panel remains the home for Glympse UI.
- Traffic appears only in overhead/map mode, not first-person.
- HUD sign stays simple green/white, no I-5 logo on the sign, no amateur arrow.
- Google API keys stay out of GitHub and out of handoff zips.

## Inspect Claude Zip

- Identify entry point files.
- Identify assets and whether they are generated, public, or unknown-license.
- Identify all scripts that draw first-person, drone, and overhead views.
- Run a local syntax check before merging.
- Check whether Claude duplicated dashboard panels or invented a second app shell.
- Check whether Claude depends on external paid APIs or local-only absolute paths.

## Integration Order

1. Create a new branch or local backup before edits.
2. Copy Claude assets into a staging folder, not directly into production.
3. Wire one mode at a time:
   - first-person AR
   - drone/chase
   - overhead
4. Keep existing dashboard metrics and source panel mounted around the new view engine.
5. Convert Claude controls into the existing View Controls area if possible.
6. Move repeated constants into route/sign/live-source data files.
7. Replace hard-coded landmark data with official route schema when ready.
8. Verify local app visually after each mode is wired.
9. Sync to `C:\Dev\hwy5\app` only after the staged app is functional.
10. Then update GitHub/Vercel from the new canonical root.

## Reject / Fix Immediately

- Blank screens.
- Overlapping maps or panels.
- Multiple competing overhead maps visible at once.
- Fake traffic in first-person view.
- Duplicated Glympse embeds.
- Sign assets with inaccurate shields/arrows or unreadable type.
- Large videos committed to Git.
- Secrets in code, screenshots, markdown, or zip files.

## Gemini Research Mapping

- `hwy5_telemetry_master.csv` becomes route/video telemetry input.
- `project_briefing.md` becomes the research summary.
- `hwy5_data_findings.md` feeds official data backlog.
- `hwy5_video_analysis.md` feeds AR overlay design.
- Full MP4s and extracted frames remain local-only unless tiny samples are curated.

## Verification

- Browser loads without blank primary views.
- First-person mode shows road scene and AR overlays.
- Drone mode follows the route vehicle.
- Overhead mode has exactly one visible map surface at a time.
- Traffic toggle visibly changes only the overhead/map pane.
- Glympse UI appears only in Live Source area.
- `/api/live-conditions` still returns valid Google-backed JSON when keys are present.
- `/api/browser-config` does not expose server-only keys.
