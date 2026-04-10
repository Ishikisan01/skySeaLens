import { AirSourceAdapter } from "@skysealens/domain/src/index.js";

interface OpenSkyAdapterConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
}

interface OpenSkyStatesResponse {
  states?: unknown[][];
}

export interface NormalizedAircraft {
  icao24: string | null;
  callsign: string | null;
  country: string | null;
  timestamp: Date;
  lon: number | null;
  lat: number | null;
  altitude: number | null;
  onGround: boolean;
  velocity: number | null;
  track: number | null;
  source: string;
}

export class OpenSkyAdapter extends AirSourceAdapter {
  baseUrl: string;
  username?: string;
  password?: string;

  constructor({ baseUrl, username, password }: OpenSkyAdapterConfig) {
    super();
    this.baseUrl = baseUrl || "https://opensky-network.org/api";
    this.username = username;
    this.password = password;
  }

  async fetchStates({
    lamin,
    lomin,
    lamax,
    lomax
  }: { lamin?: number; lomin?: number; lamax?: number; lomax?: number } = {}): Promise<OpenSkyStatesResponse> {
    const qs = new URLSearchParams();
    if (lamin != null) qs.set("lamin", String(lamin));
    if (lomin != null) qs.set("lomin", String(lomin));
    if (lamax != null) qs.set("lamax", String(lamax));
    if (lomax != null) qs.set("lomax", String(lomax));

    const url = `${this.baseUrl}/states/all${qs.size ? `?${qs}` : ""}`;
    const headers: Record<string, string> = {};
    if (this.username && this.password) {
      headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      throw new Error(`OpenSky request failed (${resp.status})`);
    }
    return (await resp.json()) as OpenSkyStatesResponse;
  }
}

export function normalizeOpenSkyStateVector(stateVector: unknown[] = []): NormalizedAircraft {
  // OpenSky vector reference:
  // [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_altitude, on_ground, velocity, true_track, ...]
  return {
    icao24: (stateVector[0] as string | undefined) || null,
    callsign: (stateVector[1] as string | undefined)?.trim() || null,
    country: (stateVector[2] as string | undefined) || null,
    timestamp: stateVector[4] ? new Date(Number(stateVector[4]) * 1000) : new Date(),
    lon: typeof stateVector[5] === "number" ? stateVector[5] : null,
    lat: typeof stateVector[6] === "number" ? stateVector[6] : null,
    altitude: typeof stateVector[7] === "number" ? stateVector[7] : null,
    onGround: Boolean(stateVector[8]),
    velocity: typeof stateVector[9] === "number" ? stateVector[9] : null,
    track: typeof stateVector[10] === "number" ? stateVector[10] : null,
    source: "opensky"
  };
}
