export class ShipSourceAdapter {
  async start(_onMessage) {
    throw new Error("ShipSourceAdapter.start() not implemented");
  }

  stop() {
    throw new Error("ShipSourceAdapter.stop() not implemented");
  }
}

export class AirSourceAdapter {
  async fetchStates() {
    throw new Error("AirSourceAdapter.fetchStates() not implemented");
  }
}

export function normalizeShipPosition(raw, source = "unknown") {
  const mmsi = Number(raw?.mmsi ?? raw?.MMSI ?? 0);
  const lat = Number(raw?.lat ?? raw?.latitude ?? 0);
  const lon = Number(raw?.lon ?? raw?.longitude ?? 0);
  if (!mmsi || Number.isNaN(lat) || Number.isNaN(lon)) return null;

  return {
    mmsi,
    imo: raw?.imo ? String(raw.imo) : null,
    name: raw?.name || raw?.shipname || null,
    lat,
    lon,
    sog: raw?.sog != null ? Number(raw.sog) : null,
    cog: raw?.cog != null ? Number(raw.cog) : null,
    heading: raw?.heading != null ? Number(raw.heading) : null,
    nav_status: raw?.navStatus ?? raw?.nav_status ?? null,
    timestamp: raw?.timestamp ? new Date(raw.timestamp) : new Date(),
    source
  };
}

export function bboxToPolygonWkt({ minLon, minLat, maxLon, maxLat }) {
  return `POLYGON((${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}))`;
}
