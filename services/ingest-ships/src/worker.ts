import "dotenv/config";
import { AISStreamAdapter } from "./aisstream-adapter.js";
import type { NormalizedVessel, SourceHealth } from "@skysealens/domain/src/index.js";

const apiBaseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const ingestToken = process.env.INGEST_TOKEN || "dev-ingest-token";
const flushIntervalMs = Number(process.env.FLUSH_INTERVAL_MS || 5000);
const dedupeWindowMs = Number(process.env.DEDUPE_WINDOW_MS || 10_000);

const adapter = new AISStreamAdapter();
const latestByMmsi = new Map<number, NormalizedVessel>();
const dedupeTimestamps = new Map<string, number>();
let processedInWindow = 0;
let errorCount = 0;

function dedupeKey(v: NormalizedVessel): string {
  return `${v.mmsi}:${v.lat.toFixed(5)}:${v.lon.toFixed(5)}:${Math.round(v.sog || 0)}:${Math.round(v.cog || 0)}`;
}

function onMessage(vessel: NormalizedVessel): void {
  const key = dedupeKey(vessel);
  const now = Date.now();
  const seenAt = dedupeTimestamps.get(key) || 0;
  if (now - seenAt < dedupeWindowMs) return;
  dedupeTimestamps.set(key, now);
  latestByMmsi.set(vessel.mmsi, vessel);
  processedInWindow += 1;
}

async function flushToApi(): Promise<void> {
  const vessels = [...latestByMmsi.values()];
  latestByMmsi.clear();
  if (!vessels.length) return;

  const sourceHealth: SourceHealth = {
    source: "aisstream",
    lastMessageAt: adapter.lastMessageAt || null,
    ingestRatePerMin: processedInWindow * (60_000 / flushIntervalMs),
    errorRate: errorCount * (60_000 / flushIntervalMs),
    status: "healthy"
  };

  try {
    const resp = await fetch(`${apiBaseUrl}/internal/v1/vessels/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ingestToken}`
      },
      body: JSON.stringify({ vessels, sourceHealth })
    });
    if (!resp.ok) throw new Error(`upsert failed (${resp.status})`);
  } catch (err) {
    errorCount += 1;
    console.error("flush failed:", (err as Error).message);
  } finally {
    processedInWindow = 0;
    // Prevent unbounded memory usage in dedupe map.
    if (dedupeTimestamps.size > 200_000) dedupeTimestamps.clear();
  }
}

await adapter.start(onMessage);
setInterval(flushToApi, flushIntervalMs);

process.on("SIGINT", () => {
  adapter.stop();
  process.exit(0);
});

console.log("Ship ingestion worker started");
