/* ============================================================
   EXPERIMENTAL — public Snap Map "stories along the route" proxy.

   Snap Map has no official API for this, and (unlike Glympse) its
   endpoints send no CORS headers, so the browser can't call them
   directly — hence this server proxy. It reads ONLY public Story
   content (the same posts map.snapchat.com shows publicly), never a
   person's private location. The endpoint is undocumented/unofficial,
   so treat it as best-effort: it may need tuning after deploy, and the
   client degrades gracefully when it returns nothing.
   ============================================================ */

const BASE = "https://ms.sc-jpl.com/web/";

function numberFromQuery(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

async function snapPost(path, body) {
  const response = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      // a browser-ish UA tends to be required by the web map backend
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText;
    throw new Error(`${path} ${response.status} ${message}`);
  }
  return data;
}

// Pull the current "HEAT" tile set (carries the rolling epoch the playlist needs).
async function getHeatTileSet() {
  const data = await snapPost("getLatestTileSet", {});
  const infos = data?.tileSetInfos || data?.response?.tileSetInfos || [];
  const heat =
    infos.find(t => (t.id?.type || t.tileSetId?.type) === "HEAT") || infos[0] || {};
  const id = heat.id || heat.tileSetId || {};
  return { flavor: id.flavor || "default", epoch: id.epoch, type: "HEAT" };
}

function normalizeSnap(el) {
  const info = el?.snapInfo || el || {};
  const sm = info.streamingMediaInfo || {};
  const prefix = sm.prefixUrl || "";
  const media = sm.mediaUrl ? prefix + sm.mediaUrl : null;
  const overlay = sm.overlayUrl ? prefix + sm.overlayUrl : null;
  const ts = el?.timestamp || info.timestamp || el?.timestampInMs || null;
  return {
    id: el?.id?.value || el?.id || info.snapId || null,
    timestampMs: ts ? Number(ts) : null,
    mediaType: info.snapMediaType ?? null, // 0 image, 1 video (per Snap's enum)
    mediaUrl: media,
    overlayUrl: overlay,
    durationMs: el?.duration ? Number(el.duration) : null
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { json(res, 204, {}); return; }
  if (req.method !== "GET") { json(res, 405, { error: "Method not allowed" }); return; }

  const lat = numberFromQuery(req.query.lat, 34.639104);
  const lon = numberFromQuery(req.query.lng, -118.746817);
  const zoomLevel = Math.round(numberFromQuery(req.query.zoom, 12));
  const radiusMeters = Math.min(40000, Math.max(1000, numberFromQuery(req.query.radius, 12000)));
  const max = Math.min(40, Math.max(1, numberFromQuery(req.query.max, 12)));

  try {
    const tileSetId = await getHeatTileSet();
    if (!tileSetId.epoch) throw new Error("could not resolve Snap Map epoch");

    const playlist = await snapPost("getPlaylist", {
      requestGeoPoint: { lat, lon },
      zoomLevel,
      tileSetId,
      radiusMeters
    });

    const manifest = playlist?.manifest || playlist?.response?.manifest || {};
    const elements = manifest.elements || manifest.element || (Array.isArray(manifest) ? manifest : []);
    const snaps = (Array.isArray(elements) ? elements : [])
      .map(normalizeSnap)
      .filter(s => s.mediaUrl || s.id)
      .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
      .slice(0, max);

    json(res, 200, {
      ok: true,
      at: new Date().toISOString(),
      origin: { lat, lng: lon },
      radiusMeters,
      count: snaps.length,
      snaps,
      // public web map deep-link the client can open directly (no proxy needed)
      mapUrl: `https://map.snapchat.com/@${lat.toFixed(5)},${lon.toFixed(5)},${zoomLevel}z`
    });
  } catch (error) {
    json(res, 200, {
      ok: false,
      experimental: true,
      error: String(error.message || error),
      snaps: [],
      mapUrl: `https://map.snapchat.com/@${lat.toFixed(5)},${lon.toFixed(5)},${zoomLevel}z`
    });
  }
}
