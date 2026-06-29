const NEARBY_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

// Category -> Places API (New) included primary types.
const CATEGORIES = {
  gas: { label: "Gas", glyph: "fuel", types: ["gas_station"] },
  charge: { label: "EV Charging", glyph: "charge", types: ["electric_vehicle_charging_station"] },
  food: { label: "Food", glyph: "food", types: ["restaurant"] },
  rest: { label: "Rest Area", glyph: "rest", types: ["rest_stop"] },
  lodging: { label: "Lodging", glyph: "bed", types: ["lodging"] }
};

const FIELD_MASK = [
  "places.displayName",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.shortFormattedAddress"
].join(",");

function numberFromQuery(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

async function googleJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }
  return data;
}

function milesBetween(a, b) {
  const r = 3958.7613;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLng = (b.longitude - a.longitude) * Math.PI / 180;
  const la1 = a.latitude * Math.PI / 180;
  const la2 = b.latitude * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

async function searchCategory(key, categoryKey, origin, radiusMeters, maxResults) {
  const category = CATEGORIES[categoryKey];
  const data = await googleJson(NEARBY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK
    },
    body: JSON.stringify({
      includedTypes: category.types,
      maxResultCount: maxResults,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: origin.latitude, longitude: origin.longitude },
          radius: radiusMeters
        }
      }
    })
  });

  const places = Array.isArray(data.places) ? data.places : [];
  return places.map(place => {
    const loc = place.location || {};
    return {
      category: categoryKey,
      label: category.label,
      glyph: category.glyph,
      name: place.displayName?.text || category.label,
      lat: loc.latitude ?? null,
      lng: loc.longitude ?? null,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      address: place.shortFormattedAddress || null,
      primaryType: place.primaryType || null,
      distanceMiles: (loc.latitude != null && loc.longitude != null)
        ? Math.round(milesBetween(origin, loc) * 10) / 10
        : null
    };
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    json(res, 500, { error: "GOOGLE_MAPS_SERVER_KEY is not configured" });
    return;
  }

  const origin = {
    latitude: numberFromQuery(req.query.lat, 34.639104),
    longitude: numberFromQuery(req.query.lng, -118.746817)
  };
  // radius capped at the Places API max of 50km.
  const radiusMeters = Math.min(50000, Math.max(1000, numberFromQuery(req.query.radius, 30000)));
  const maxPerCategory = Math.min(10, Math.max(1, numberFromQuery(req.query.max, 4)));

  const requested = typeof req.query.categories === "string" && req.query.categories.length
    ? req.query.categories.split(",").map(s => s.trim()).filter(c => CATEGORIES[c])
    : Object.keys(CATEGORIES);

  const sources = { google: true, errors: [] };
  const settled = await Promise.allSettled(
    requested.map(cat => searchCategory(key, cat, origin, radiusMeters, maxPerCategory))
  );

  const places = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      places.push(...result.value);
    } else {
      sources.errors.push({ category: requested[i], message: result.reason.message });
    }
  });

  places.sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9));

  json(res, 200, {
    ok: true,
    at: new Date().toISOString(),
    origin,
    radiusMeters,
    categories: requested,
    places,
    sources
  });
}
