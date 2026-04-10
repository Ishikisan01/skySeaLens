import "dotenv/config";
import { OpenSkyAdapter, normalizeOpenSkyStateVector } from "./opensky-adapter.js";

const adapter = new OpenSkyAdapter({
  baseUrl: process.env.OPENSKY_BASE_URL,
  username: process.env.OPENSKY_USERNAME,
  password: process.env.OPENSKY_PASSWORD
});

async function runOnce(): Promise<void> {
  const data = await adapter.fetchStates();
  const states = Array.isArray(data?.states) ? data.states : [];
  const normalized = states.map(normalizeOpenSkyStateVector).filter((a) => a.lat != null && a.lon != null);
  console.log(`Fetched ${normalized.length} aircraft states (phase-2 scaffold)`);
}

if (process.env.AIR_PHASE2_ENABLED === "true") {
  await runOnce();
} else {
  console.log("AIR_PHASE2_ENABLED is false; air ingestion scaffold is ready but disabled.");
}
