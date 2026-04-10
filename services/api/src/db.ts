import { Pool } from "pg";

export interface VesselUpsertPayload {
  mmsi: number;
  imo: string | null;
  name: string | null;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  nav_status: string | null;
  timestamp: Date | string;
  source: string;
}

export interface AircraftUpsertPayload {
  icao24: string;
  callsign: string | null;
  country: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  velocity: number | null;
  track: number | null;
  onGround: boolean;
  timestamp: Date | string;
  source: string;
}

export interface SourceHealthPayload {
  source: string;
  lastMessageAt: Date | string | null;
  ingestRatePerMin: number;
  errorRate: number;
  status: string;
}

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/skysealens";

export const pool = new Pool({ connectionString });

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS postgis;

    CREATE TABLE IF NOT EXISTS vessel_latest (
      mmsi BIGINT PRIMARY KEY,
      imo TEXT NULL,
      name TEXT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lon DOUBLE PRECISION NOT NULL,
      sog DOUBLE PRECISION NULL,
      cog DOUBLE PRECISION NULL,
      heading DOUBLE PRECISION NULL,
      nav_status TEXT NULL,
      "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL DEFAULT 'unknown',
      geom GEOMETRY(POINT, 4326) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vessel_latest_geom ON vessel_latest USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_vessel_latest_timestamp ON vessel_latest ("timestamp");

    CREATE TABLE IF NOT EXISTS source_health (
      source TEXT PRIMARY KEY,
      last_message_at TIMESTAMPTZ NULL,
      ingest_rate_per_min DOUBLE PRECISION NOT NULL DEFAULT 0,
      error_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unknown',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS aircraft_latest (
      icao24 TEXT PRIMARY KEY,
      callsign TEXT NULL,
      country TEXT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lon DOUBLE PRECISION NOT NULL,
      altitude DOUBLE PRECISION NULL,
      velocity DOUBLE PRECISION NULL,
      track DOUBLE PRECISION NULL,
      on_ground BOOLEAN NOT NULL DEFAULT FALSE,
      "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL DEFAULT 'opensky',
      geom GEOMETRY(POINT, 4326) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_aircraft_latest_geom ON aircraft_latest USING GIST (geom);
  `);
}

export async function upsertVessel(vessel: VesselUpsertPayload): Promise<void> {
  const query = `
    INSERT INTO vessel_latest
      (mmsi, imo, name, lat, lon, sog, cog, heading, nav_status, "timestamp", source, geom)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_SetSRID(ST_MakePoint($5, $4), 4326))
    ON CONFLICT (mmsi) DO UPDATE SET
      imo = EXCLUDED.imo,
      name = EXCLUDED.name,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      sog = EXCLUDED.sog,
      cog = EXCLUDED.cog,
      heading = EXCLUDED.heading,
      nav_status = EXCLUDED.nav_status,
      "timestamp" = EXCLUDED."timestamp",
      source = EXCLUDED.source,
      geom = EXCLUDED.geom
  `;
  await pool.query(query, [
    vessel.mmsi,
    vessel.imo,
    vessel.name,
    vessel.lat,
    vessel.lon,
    vessel.sog,
    vessel.cog,
    vessel.heading,
    vessel.nav_status,
    vessel.timestamp,
    vessel.source
  ]);
}

export async function updateSourceHealth(payload: SourceHealthPayload): Promise<void> {
  await pool.query(
    `
    INSERT INTO source_health (source, last_message_at, ingest_rate_per_min, error_rate, status, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (source) DO UPDATE SET
      last_message_at = EXCLUDED.last_message_at,
      ingest_rate_per_min = EXCLUDED.ingest_rate_per_min,
      error_rate = EXCLUDED.error_rate,
      status = EXCLUDED.status,
      updated_at = NOW()
  `,
    [payload.source, payload.lastMessageAt, payload.ingestRatePerMin, payload.errorRate, payload.status]
  );
}

export async function upsertAircraft(aircraft: AircraftUpsertPayload): Promise<void> {
  await pool.query(
    `
    INSERT INTO aircraft_latest
      (icao24, callsign, country, lat, lon, altitude, velocity, track, on_ground, "timestamp", source, geom)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_SetSRID(ST_MakePoint($5, $4), 4326))
    ON CONFLICT (icao24) DO UPDATE SET
      callsign = EXCLUDED.callsign,
      country = EXCLUDED.country,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      altitude = EXCLUDED.altitude,
      velocity = EXCLUDED.velocity,
      track = EXCLUDED.track,
      on_ground = EXCLUDED.on_ground,
      "timestamp" = EXCLUDED."timestamp",
      source = EXCLUDED.source,
      geom = EXCLUDED.geom
  `,
    [
      aircraft.icao24,
      aircraft.callsign,
      aircraft.country,
      aircraft.lat,
      aircraft.lon,
      aircraft.altitude,
      aircraft.velocity,
      aircraft.track,
      aircraft.onGround,
      aircraft.timestamp,
      aircraft.source
    ]
  );
}
