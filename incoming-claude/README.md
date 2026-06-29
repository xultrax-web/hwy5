# Incoming Claude Code Staging

Use this folder for the next Claude Code zip. Do not extract directly into the app.

## Folder Roles

- `staged-zips/` - drop Claude zip files here.
- `extracted/` - one extracted folder per zip.
- `inventory/` - generated inspection notes and dependency lists.

## Integration Rules

- Dashboard shell stays.
- Claude is a rendering/control donor first.
- Wire one adapter at a time: first-person, drone, overhead.
- Preserve Live Source as the only Glympse UI.
- Preserve traffic as overhead-only.
- Keep secrets and large media out of Git.

## Current App Contract

The current app publishes `window.CALCUP26_JOURNEY_STATE` and sends `CALCUP26_JOURNEY_STATE` messages into each Claude iframe. New Claude modules should consume that state rather than polling or owning route state themselves.
