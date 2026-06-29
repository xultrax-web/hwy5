# Git and Asset Policy

Use this before turning `C:\Dev\hwy5` into the canonical GitHub repo.

## Must Never Commit

- `google api.txt`
- `.env`
- `.env.local`
- `.env.*`
- `.vercel`
- full MP4/HEVC videos
- raw extracted frame folders
- browser/cache/download scratch files
- API keys pasted into markdown, screenshots, or comments

## Large Local-Only Research

Keep these local unless a tiny sample is intentionally curated:

- `grapevine_real.mp4`
- `valley_real.mp4`
- `comma_raw.hevc`
- `comma_real.mp4`
- `output\`
- `output_part2\`
- `scratch\`

## Good Git Candidates

- app source
- API routes without secrets
- curated route JSON
- curated sign metadata
- lightweight sample frames only if needed for tests/docs
- schemas
- source manifests
- handoff docs
- README and setup notes

## Recommended Root .gitignore

```gitignore
# secrets
.env
.env.*
google api.txt
*.key
*.pem

# Vercel/local
.vercel/
node_modules/
dist/
build/
.next/

# raw media
*.mp4
*.mov
*.hevc
*.mkv
*.avi

# extracted frames / heavy research
output/
output_part2/
frames/
frame_dump/
scratch/

# OS/editor
Thumbs.db
.DS_Store
*.log
```

## If We Need Video Evidence In Git

Use one of these instead of committing raw videos:

- one or two compressed JPEG sample frames
- a short low-resolution GIF under 5 MB
- a markdown link to a local-only source path
- a generated JSON summary of the video analysis

## Promotion Rule

Nothing from Gemini or Claude becomes production code because it exists. It becomes production code only after:

- source and license are known
- local syntax/runtime check passes
- it fits the dashboard layout
- it does not duplicate existing live-source panels
- it does not require committing secrets or huge assets
