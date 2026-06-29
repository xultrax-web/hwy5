const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const WEATHER_ENDPOINT = "https://weather.googleapis.com/v1/currentConditions:lookup";
const AIR_ENDPOINT = "https://airquality.googleapis.com/v1/currentConditions:lookup";

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

function parseDurationSeconds(duration) {
  if (!duration || typeof duration !== "string") return null;
  const match = duration.match(/^([\d.]+)s$/);
  return match ? Number(match[1]) : null;
}

function trafficSeverity(delayMin) {
  if (delayMin >= 25) return "heavy";
  if (delayMin >= 10) return "moderate";
  if (delayMin >= 4) return "light";
  return "clear";
}

async function getRouteTraffic(key, origin, destination) {
  const data = await googleJson(ROUTES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.travelAdvisory"
    },
    body: JSON.stringify({
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "IMPERIAL"
    })
  });

  const route = data.routes?.[0] || {};
  const durationSec = parseDurationSeconds(route.duration);
  const staticSec = parseDurationSeconds(route.staticDuration);
  const delayMin = Math.max(0, Math.round(((durationSec || 0) - (staticSec || 0)) / 60));

  return {
    distanceMiles: route.distanceMeters ? Math.round((route.distanceMeters / 1609.344) * 10) / 10 : null,
    durationMinutes: durationSec ? Math.round(durationSec / 60) : null,
    noTrafficMinutes: staticSec ? Math.round(staticSec / 60) : null,
    trafficDelayMinutes: delayMin,
    severity: trafficSeverity(delayMin)
  };
}

async function getWeather(key, point) {
  const url = new URL(WEATHER_ENDPOINT);
  url.searchParams.set("key", key);
  url.searchParams.set("location.latitude", String(point.latitude));
  url.searchParams.set("location.longitude", String(point.longitude));
  url.searchParams.set("unitsSystem", "IMPERIAL");
  const data = await googleJson(url);

  return {
    condition: data.weatherCondition?.description?.text || data.weatherCondition?.type || "Unknown",
    temperatureF: data.temperature?.degrees ?? null,
    feelsLikeF: data.feelsLikeTemperature?.degrees ?? null,
    windMph: data.wind?.speed?.value ?? null,
    humidityPct: data.relativeHumidity ?? null,
    uvIndex: data.uvIndex ?? null
  };
}

async function getAirQuality(key, point) {
  const url = new URL(AIR_ENDPOINT);
  url.searchParams.set("key", key);
  const data = await googleJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: point,
      universalAqi: true,
      extraComputations: ["HEALTH_RECOMMENDATIONS", "DOMINANT_POLLUTANT_CONCENTRATION"]
    })
  });

  const index = data.indexes?.find(item => item.code === "uaqi") || data.indexes?.[0] || {};
  return {
    aqi: index.aqi ?? null,
    category: index.category || "Unknown",
    dominantPollutant: index.dominantPollutant || data.pollutants?.[0]?.code || null,
    color: index.color || null
  };
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
  const destination = {
    latitude: numberFromQuery(req.query.destLat, 37.7652),
    longitude: numberFromQuery(req.query.destLng, -122.2416)
  };

  const sources = { google: true, errors: [] };
  const [trafficResult, weatherResult, airResult] = await Promise.allSettled([
    getRouteTraffic(key, origin, destination),
    getWeather(key, origin),
    getAirQuality(key, origin)
  ]);

  const body = {
    ok: true,
    at: new Date().toISOString(),
    origin,
    destination,
    traffic: null,
    weather: null,
    airQuality: null,
    sources
  };

  if (trafficResult.status === "fulfilled") body.traffic = trafficResult.value;
  else sources.errors.push({ service: "routes", message: trafficResult.reason.message });

  if (weatherResult.status === "fulfilled") body.weather = weatherResult.value;
  else sources.errors.push({ service: "weather", message: weatherResult.reason.message });

  if (airResult.status === "fulfilled") body.airQuality = airResult.value;
  else sources.errors.push({ service: "airQuality", message: airResult.reason.message });

  json(res, 200, body);
}
