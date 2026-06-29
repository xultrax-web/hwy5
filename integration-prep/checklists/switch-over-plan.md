# Switch-Over Plan to C:\Dev\hwy5

This is the future migration plan. Do not execute until Claude's returned work is inspected.

## Phase 1 - Freeze Current State

- Confirm current local app works.
- Confirm current Vercel deployment works.
- Record current commit hash and deploy URL.
- Copy current deploy root into a dated backup folder.
- Confirm `.env.local` and secrets are not included in any backup zip.

## Phase 2 - Create Canonical App Folder

Target:

```text
C:\Dev\hwy5\app
```

Move or copy:

- current `work\vercel-site\index.html`
- current `work\vercel-site\api\`
- current `work\vercel-site\cc-engine\`
- current `work\vercel-site\i5-logo.png`
- current `work\vercel-site\vercel.json`
- current `work\vercel-site\README.md`

Do not move:

- `.env.local`
- `.vercel`
- `.git`
- large videos
- raw frame folders

## Phase 3 - Promote Curated Data

Target:

```text
C:\Dev\hwy5\data
```

Create:

- `data\route\i5-irvine-alameda.json`
- `data\official-caltrans\sources.md`
- `data\signs\sign-assets.md`
- `data\live-feeds\sources.json`

Promote only cleaned data. Keep Gemini raw research in `research\gemini`.

## Phase 4 - GitHub Re-root

Options:

- Keep the existing GitHub repo and make `C:\Dev\hwy5\app` the new working tree.
- Or create a new root repo at `C:\Dev\hwy5` with app, data, docs, and handoffs.

Recommended:

- Use `C:\Dev\hwy5` as the repo root only if raw videos/frame folders are safely ignored first.
- Otherwise use `C:\Dev\hwy5\app` as the Vercel/GitHub root and keep research local.

## Phase 5 - Vercel

- Link the new canonical folder to the existing Vercel project if keeping the same production URL.
- Pull env vars into the new local folder.
- Verify local `vercel dev`.
- Deploy production only after local browser verification passes.
