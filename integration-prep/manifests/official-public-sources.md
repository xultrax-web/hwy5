# Official and Free Public Source Manifest

This manifest tracks sources that should feed the consolidated simulator. Prefer official Caltrans/FHWA data for route, signs, exits, and live roadway state.

## Official Caltrans / California Sources

### Caltrans QuickMap

- URL: https://quickmap.dot.ca.gov/
- Use: Public roadway map for traffic speed, closures, CHP incidents, cameras, CMS signs, weather/chain controls.
- Simulator target: overhead mode traffic layer, dashboard alerts, source panel.
- Notes: Use as public reference first. If using programmatic feeds, prefer documented Caltrans/CWWP endpoints.

### Caltrans CWWP

- URL: https://dot.ca.gov/programs/traffic-operations/traveler-information/cwwp
- Use: Commercial Wholesale Web Portal for traveler-information feeds.
- Simulator target: CCTV snapshots, CMS message signs, RWIS, lane closures, road conditions.
- Notes: This is likely the best long-term complement to Google APIs because it is California-specific.

### Caltrans Road Conditions

- URL: https://roads.dot.ca.gov/
- Use: Current highway condition lookup by route.
- Simulator target: Grapevine closure status, chain controls, incident-aware route warnings.

### Caltrans Postmile Query Tool

- URL: https://postmile.dot.ca.gov/
- Use: Convert California postmiles to map positions and vice versa.
- Simulator target: canonical route-mile alignment for landmarks, exits, cameras, WIM/RWIS stations.

### Caltrans GIS Data

- URL: https://gisdata-caltrans.opendata.arcgis.com/
- Use: Official highway lines, postmiles, traffic assets, CCTV layers, state highway network.
- Simulator target: route geometry, camera pins, official roadway inventory.

### Caltrans I-5 Exit List

- URL: https://dot.ca.gov/-/media/dot-media/programs/safety-programs/documents/exit/f0017888-5.pdf
- Use: Official I-5 exits, postmiles, names, rest areas, weigh stations.
- Simulator target: replace hand-built exit and milestone data.

### Caltrans PeMS

- URL: https://pems.dot.ca.gov/
- Use: Traffic detector stations, speed, occupancy, volume, delay.
- Simulator target: realistic congestion model and historical baseline by segment.
- Notes: Gemini already identified this. We still need station IDs mapped to our route.

## Federal / Sign Sources

### FHWA Standard Highway Signs

- URL: https://mutcd.fhwa.dot.gov/ser-shs_millennium.htm
- Use: Official standard sign artwork, symbols, and EPS/PDF assets.
- Simulator target: HUD freeway guide signs, exit plaques, warning signs.

### FHWA 2024 Standard Highway Signs Release Status

- URL: https://mutcd.fhwa.dot.gov/kno-shs_2024-release-status/index.htm
- Use: Current status of updated sign files.
- Simulator target: source-of-truth reference for sign style.

### MUTCD

- URL: https://mutcd.fhwa.dot.gov/
- Use: Official sign/control device standards.
- Simulator target: style rules for guide signs, exit plaques, arrows, lane signs, CMS behavior.

## Free Sign Typography / Vector Assets

### Roadgeek Fonts

- URL: https://github.com/sammdot/roadgeek-fonts
- Use: Highway Gothic/FHWA-style font family.
- Simulator target: authentic HUD sign typography.
- Notes: Confirm license before bundling in production.

### Overpass Font

- URL: https://fonts.google.com/specimen/Overpass
- Use: Open-source road-sign-inspired fallback font.
- Simulator target: safe web font fallback if Roadgeek is not bundled.

### Wikimedia MUTCD SVG Assets

- URL: https://commons.wikimedia.org/wiki/Category:MUTCD_guide_signs
- Use: Public-domain sign components and examples.
- Simulator target: free SVG reference assets for guide signs and plaques.

## Open Map / Geometry Sources

### OpenStreetMap

- URL: https://www.openstreetmap.org/
- Use: Road geometry, POIs, towns, interchanges, service areas.
- Simulator target: non-Google fallback POI and corridor data.

### Overpass API

- URL: https://overpass-turbo.eu/
- Use: Query OSM data around I-5 corridor.
- Simulator target: POIs, rest areas, gas/food/service exits, nearby landmarks.

## Useful Open-Source Libraries / Repos

### MapLibre GL JS

- URL: https://github.com/maplibre/maplibre-gl-js
- Use: Open-source WebGL map renderer.
- Simulator target: custom overhead mode if Google is not desired.

### deck.gl TripsLayer

- URL: https://deck.gl/docs/api-reference/geo-layers/trips-layer
- Use: Animated trips and route trails.
- Simulator target: Glympse route replay and overhead motion.

### CARLA

- URL: https://github.com/carla-simulator/carla
- Use: Autonomous-driving simulation reference.
- Simulator target: concepts for camera rigs, weather, sensors, vehicles.
- Notes: Too heavy to embed directly.

### SUMO

- URL: https://github.com/eclipse-sumo/sumo
- Use: Open traffic simulation.
- Simulator target: traffic fallback model when live data is unavailable.

### Streets GL

- URL: https://github.com/StrandedKitty/streets-gl
- Use: Browser-based 3D OSM renderer.
- Simulator target: drone/overhead 3D reference.
