# Data Backlog

This is the practical order for turning public and research data into simulator features.

## Tier 1 - Highest Value

### Official I-5 Exits and Postmiles

- Source: Caltrans I-5 exit list PDF and postmile tools.
- Output: `data\route\i5-exits.json`
- UI use: authentic upcoming-exit and landmark timing.
- Risk: PDF extraction may need cleanup.

### Route Landmarks

- Source: current app landmarks plus Caltrans/OSM verification.
- Output: `data\route\i5-irvine-alameda-landmarks.json`
- UI use: dashboard landmark timeline, AR pins, overhead labels.
- Risk: route involves I-5 plus Bay Area connector highways, so not every final-mile landmark is on I-5.

### Sign Style System

- Source: FHWA/MUTCD, Wikimedia SVGs, Roadgeek or Overpass font.
- Output: `data\signs\sign-style.json` and `app\public\signs\`
- UI use: HUD sign rendering and future roadside signs.
- Risk: font licensing needs confirmation.

## Tier 2 - Live Conditions

### Google Live Conditions

- Source: existing `/api/live-conditions`.
- Output: app API already exists.
- UI use: traffic ETA, weather, AQI.
- Risk: quota/cost and browser-key restrictions.

### Caltrans QuickMap/CWWP Feeds

- Source: Caltrans traveler info feeds.
- Output: `data\live-feeds\caltrans-sources.json` and later API route.
- UI use: CCTV, CMS signs, closures, chain controls.
- Risk: endpoint availability/format needs live verification.

### PeMS Segment Speeds

- Source: Caltrans PeMS.
- Output: detector station map by route segment.
- UI use: fallback/official traffic model by segment.
- Risk: may require account/API setup.

## Tier 3 - AR Intelligence

### Gemini Video Telemetry

- Source: `hwy5_telemetry_master.csv`.
- Output: sampled route-character JSON.
- UI use: lane curvature, visibility, fog/grade/truck alerts.
- Risk: must align video frames to real route miles/postmiles.

### POIs Around Route

- Source: Google Places or OSM Overpass.
- Output: `data\route\pois.json`.
- UI use: AR FP callouts and overhead context.
- Risk: avoid clutter; show only contextually useful POIs.

### CCTV Visual Summaries

- Source: Caltrans CCTV snapshots.
- Output: near-route camera list and optional cached thumbnails.
- UI use: live road-state panel and AR camera markers.
- Risk: avoid scraping too aggressively.
