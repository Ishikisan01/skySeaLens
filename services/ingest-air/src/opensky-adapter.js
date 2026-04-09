import { AirSourceAdapter } from "@skysealens/domain/src/index.js";

export class OpenSkyAdapter extends AirSourceAdapter {
  constructor({ baseUrl, username, password }) {
    super();
    this.baseUrl = baseUrl || "https://opensky-network.org/api";
    this.username = username;
    this.password = password;
  }

  async fetchStates({ lamin, lomin, lamax, lomax } = {}) {
    const qs = new URLSearchParams();
    if (lamin != null) qs.set("lamin", String(lamin));
    if (lomin != null) qs.set("lomin", String(lomin));
    if (lamax != null) qs.set("lamax", String(lamax));
    if (lomax != null) qs.set("lomax", String(lomax));

    const url = `${this.baseUrl}/states/all${qs.size ? `?${qs}` : ""}`;
    const headers = {};
    if (this.username && this.password) {
      headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      throw new Error(`OpenSky request failed (${resp.status})`);
    }
    return resp.json();
  }
}

export function normalizeOpenSkyStateVector(stateVector = []) {
  // OpenSky vector reference:
  // [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_altitude, on_ground, velocity, true_track, ...]
  return {
    icao24: stateVector[0] || null,
    callsign: stateVector[1]?.trim() || null,
    country: stateVector[2] || null,
    timestamp: stateVector[4] ? new Date(stateVector[4] * 1000) : new Date(),
    lon: typeof stateVector[5] === "number" ? stateVector[5] : null,
    lat: typeof stateVector[6] === "number" ? stateVector[6] : null,
    altitude: typeof stateVector[7] === "number" ? stateVector[7] : null,
    onGround: Boolean(stateVector[8]),
    velocity: typeof stateVector[9] === "number" ? stateVector[9] : null,
    track: typeof stateVector[10] === "number" ? stateVector[10] : null,
    source: "opensky"
  };
}
