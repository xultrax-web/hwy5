/* Corridor constants — preserved from the handoff, plus the lane geometry the
   3D build needs. Lateral convention: 0 = double-yellow center line, + = right,
   − = left. The driver occupies the LEFT lane of the carriageway, so the camera
   sits at a POSITIVE lateral offset and the yellow line stays to its LEFT. */

export const SEG_LEN = 200; // world units / segment
export const ROAD_W = 2100; // half road width
export const LANES = 4;
export const WORLD_PER_MILE = 13000; // world units per route mile
export const SPEED_K = 24; // world units per (mph * second)

// Markings (fractions of ROAD_W), preserved from the prototype's ribbon math.
export const EDGE_FRAC = 0.96; // solid white edge lines at ±0.96·ROAD_W
export const YELLOW_FRAC = 0.032; // double-yellow center pair at ±0.032·ROAD_W
export const YELLOW_THICK = 0.013; // yellow line thickness (× ROAD_W)
export const EDGE_THICK = 0.016; // white edge thickness (× ROAD_W)

// Lane geometry. Usable carriageway spans roughly center(0) → +EDGE_FRAC·ROAD_W
// on the right side; two lanes per direction. The driver rides the LEFT lane,
// hugging the center line: its lane-center sits a bit right of the yellow.
export const RIGHT_CARRIAGEWAY = EDGE_FRAC; // outer edge of our direction (× ROAD_W)
export const LANE_WIDTH_FRAC = RIGHT_CARRIAGEWAY / 2; // two lanes right of center
// Lane center of the LEFT (fast) lane = half a lane right of the yellow.
export const LANE_LAT = (YELLOW_FRAC + (YELLOW_FRAC + LANE_WIDTH_FRAC)) / 2 * ROAD_W; // ≈ +0.27·ROAD_W
