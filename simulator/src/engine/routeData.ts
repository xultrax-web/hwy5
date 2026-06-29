/* Researched route + traffic-zone data — preserved verbatim from the handoff.
   Mileposts are computed once at load (route[i].mile). */

import { milesBetween } from "./geo";

export type RouteKind = "start" | "city" | "landmark" | "finish";

export interface RouteNode {
  name: string;
  lat: number;
  lng: number;
  kind: RouteKind;
  note: string;
  article: string;
  mile: number;
}

export const route: RouteNode[] = (
  [
    { name: "Irvine", lat: 33.6846, lng: -117.8265, kind: "start", note: "The southern Orange County leg runs on the Santa Ana Freeway before I-5 bends northwest toward Los Angeles.", article: "Santa Ana Freeway" },
    { name: "Anaheim", lat: 33.8366, lng: -117.9143, kind: "city", note: "Dense Orange County interchanges: Disney-adjacent traffic, SR 57, SR 91, and the Santa Ana Freeway corridor.", article: "Orange County urban section" },
    { name: "Downtown Los Angeles", lat: 34.0522, lng: -118.2437, kind: "city", note: "I-5 passes the Eastside of Los Angeles and interchanges with the US 101 and I-10 systems before turning north.", article: "Los Angeles freeway web" },
    { name: "Burbank / San Fernando Valley", lat: 34.1808, lng: -118.3089, kind: "city", note: "The route follows the Golden State Freeway through Glendale, Burbank, and the San Fernando Valley.", article: "Golden State Freeway" },
    { name: "Santa Clarita", lat: 34.3917, lng: -118.5426, kind: "city", note: "The freeway leaves the Los Angeles Basin and starts the climb toward Castaic and the Tejon corridor.", article: "North Los Angeles County climb" },
    { name: "Castaic Lake", lat: 34.5002, lng: -118.623, kind: "landmark", note: "Castaic marks the transition from suburban freeway to mountain approach toward the Grapevine.", article: "Castaic approach" },
    { name: "Gorman", lat: 34.7968, lng: -118.852, kind: "landmark", note: "High desert mountain community near the top of the Grapevine approach; weather and grades start to matter here.", article: "Grapevine approach" },
    { name: "Grapevine / Tejon Pass", lat: 34.8826, lng: -118.9222, kind: "landmark", note: "I-5 crosses Tejon Pass, then drops through the steep Five Mile Grade into the San Joaquin Valley.", article: "Tejon Pass and Five Mile Grade" },
    { name: "Frazier Park", lat: 34.8228, lng: -118.9448, kind: "landmark", note: "Mountain-side access point near the pass; useful context for snow closures, wind, and grade-driven slow traffic.", article: "Mountain access" },
    { name: "Wheeler Ridge", lat: 35.0052, lng: -118.9563, kind: "landmark", note: "At the valley floor, Route 99 splits north toward Bakersfield while I-5 continues as the West Side Freeway.", article: "Route 99 split" },
    { name: "Buttonwillow", lat: 35.4005, lng: -119.4696, kind: "landmark", note: "West Side Freeway service stop area in the San Joaquin Valley, with long agricultural stretches between exits.", article: "West Side Freeway" },
    { name: "Lost Hills", lat: 35.6161, lng: -119.6943, kind: "landmark", note: "Another key West Side service cluster before the route continues past open farms, canals, and energy infrastructure.", article: "Central Valley services" },
    { name: "Kettleman City", lat: 36.0083, lng: -119.9607, kind: "city", note: "Major long-haul stop near SR 41 and the midpoint rhythm of the valley drive.", article: "Central Valley crossroads" },
    { name: "Coalinga", lat: 36.1397, lng: -120.3602, kind: "landmark", note: "The article notes I-5 runs near the California Aqueduct and a major power-line corridor in this west valley stretch.", article: "Aqueduct and power corridor" },
    { name: "Harris Ranch", lat: 36.254, lng: -120.2378, kind: "landmark", note: "Recognizable I-5 travel landmark and rest/food cluster on the west side of the San Joaquin Valley.", article: "West Side landmark" },
    { name: "Los Banos", lat: 37.0583, lng: -120.8499, kind: "city", note: "Northern valley approach where I-5 begins setting up the SR 152 crossing toward the coast and Bay Area.", article: "Northern San Joaquin Valley" },
    { name: "Santa Nella / SR 152", lat: 37.0977, lng: -121.016, kind: "city", note: "SR 152 connects west toward Gilroy and passes near San Luis Reservoir; this is a major I-5 decision point.", article: "SR 152 and San Luis Reservoir" },
    { name: "I-580 Split", lat: 37.4716, lng: -121.1775, kind: "landmark", note: "For Alameda, the practical route leaves I-5 at I-580 near Tracy rather than continuing north to Sacramento.", article: "I-580 Bay Area connector" },
    { name: "Tracy", lat: 37.7397, lng: -121.4252, kind: "city", note: "I-580 carries the trip over the Altamont corridor toward the East Bay; this is often a traffic-sensitive commuter zone.", article: "Altamont approach" },
    { name: "Livermore", lat: 37.6819, lng: -121.768, kind: "city", note: "East Bay valley segment after the I-580 connector; the drive changes from interstate trunk route to Bay Area approach.", article: "East Bay approach" },
    { name: "Dublin / Pleasanton", lat: 37.7022, lng: -121.9358, kind: "city", note: "Major I-580/I-680 interchange area before the route bends toward Oakland.", article: "East Bay interchange" },
    { name: "Oakland", lat: 37.8044, lng: -122.2712, kind: "city", note: "Final urban freeway network before crossing into Alameda.", article: "Oakland approach" },
    { name: "Alameda", lat: 37.7652, lng: -122.2416, kind: "finish", note: "Destination off the I-580/Oakland approach, not directly on I-5; the simulator follows the practical Bay Area connector.", article: "Destination connector" },
  ] as Omit<RouteNode, "mile">[]
).map((n) => ({ ...n, mile: 0 }));

for (let i = 0; i < route.length; i++) {
  route[i].mile = i === 0 ? 0 : route[i - 1].mile + milesBetween(route[i - 1], route[i]);
}

export const totalMiles = route[route.length - 1].mile;

export interface TrafficZone {
  name: string;
  start: number;
  end: number;
  base: number;
}

export const trafficZones: TrafficZone[] = [
  { name: "Orange County merge", start: 0, end: 34, base: 0.32 },
  { name: "Los Angeles basin", start: 34, end: 68, base: 0.52 },
  { name: "Santa Clarita grade", start: 68, end: 98, base: 0.34 },
  { name: "Grapevine / Tejon Pass", start: 98, end: 124, base: 0.42 },
  { name: "Central Valley open road", start: 124, end: 326, base: 0.14 },
  { name: "Tracy / Altamont Pass", start: 326, end: 382, base: 0.46 },
  { name: "East Bay approach", start: 382, end: 423, base: 0.55 },
];
