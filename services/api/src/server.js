import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initDb, pool, updateSourceHealth, upsertAircraft, upsertVessel } from "./db.js";
import { getJson, setJson } from "./cache.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const ingestToken = process.env.INGEST_TOKEN || "dev-ingest-token";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN || 120)
  })
);

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "api", ts: new Date().toISOString() });
});

app.get("/api/v1/health/sources", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT source, last_message_at, ingest_rate_per_min, error_rate, status, updated_at FROM source_health ORDER BY source"
    );
    res.json({ sources: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/metrics", async (_req, res, next) => {
  try {
    const [{ count: vesselCount }] = (await pool.query("SELECT COUNT(*)::int AS count FROM vessel_latest")).rows;
    const sourceRows = (
      await pool.query("SELECT source, status, last_message_at, ingest_rate_per_min, error_rate FROM source_health ORDER BY source")
    ).rows;
    res.json({
      uptimeSec: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      vesselCount,
      sourceHealth: sourceRows
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/vessels/:mmsi", async (req, res, next) => {
  try {
    const mmsi = Number(req.params.mmsi);
    const { rows } = await pool.query("SELECT * FROM vessel_latest WHERE mmsi = $1 LIMIT 1", [mmsi]);
    if (!rows.length) return res.status(404).json({ error: "Vessel not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/vessels", async (req, res, next) => {
  try {
    const [minLon, minLat, maxLon, maxLat] = String(req.query.bbox || "")
      .split(",")
      .map(Number);
    if ([minLon, minLat, maxLon, maxLat].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ error: "bbox query param required: minLon,minLat,maxLon,maxLat" });
    }
    const zoom = Number(req.query.zoom || 3);
    const cacheKey = `vessels:${minLon}:${minLat}:${maxLon}:${maxLat}:${zoom}`;
    const cached = await getJson(cacheKey);
    if (cached) return res.json({ ...cached, cache: "hit" });

    const limit = zoom <= 3 ? 1200 : zoom <= 5 ? 2500 : 5000;
    const { rows } = await pool.query(
      `
      SELECT mmsi, imo, name, lat, lon, sog, cog, heading, nav_status, "timestamp", source
      FROM vessel_latest
      WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      ORDER BY "timestamp" DESC
      LIMIT $5
    `,
      [minLon, minLat, maxLon, maxLat, limit]
    );
    const payload = { vessels: rows, count: rows.length, cache: "miss" };
    await setJson(cacheKey, payload, 8);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/aircraft", async (req, res, next) => {
  try {
    const [minLon, minLat, maxLon, maxLat] = String(req.query.bbox || "")
      .split(",")
      .map(Number);
    if ([minLon, minLat, maxLon, maxLat].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ error: "bbox query param required: minLon,minLat,maxLon,maxLat" });
    }
    const { rows } = await pool.query(
      `
      SELECT icao24, callsign, country, lat, lon, altitude, velocity, track, on_ground, "timestamp", source
      FROM aircraft_latest
      WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      ORDER BY "timestamp" DESC
      LIMIT 5000
    `,
      [minLon, minLat, maxLon, maxLat]
    );
    res.json({ aircraft: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

app.post("/internal/v1/vessels/upsert", async (req, res, next) => {
  try {
    if (req.headers.authorization !== `Bearer ${ingestToken}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const vessels = Array.isArray(req.body?.vessels) ? req.body.vessels : [];
    for (const vessel of vessels) {
      await upsertVessel(vessel);
    }
    if (req.body?.sourceHealth) {
      await updateSourceHealth(req.body.sourceHealth);
    }
    res.json({ accepted: vessels.length });
  } catch (err) {
    next(err);
  }
});

app.post("/internal/v1/aircraft/upsert", async (req, res, next) => {
  try {
    if (req.headers.authorization !== `Bearer ${ingestToken}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const aircraft = Array.isArray(req.body?.aircraft) ? req.body.aircraft : [];
    for (const row of aircraft) {
      await upsertAircraft(row);
    }
    if (req.body?.sourceHealth) {
      await updateSourceHealth(req.body.sourceHealth);
    }
    res.json({ accepted: aircraft.length });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

await initDb();
app.listen(port, "127.0.0.1", () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
