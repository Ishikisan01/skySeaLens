export interface SourceHealth {
  source: string;
  lastMessageAt: Date | string | null;
  ingestRatePerMin: number;
  errorRate: number;
  status: string;
}

export interface NormalizedVessel {
  mmsi: number;
  imo: string | null;
  name: string | null;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  nav_status: string | null;
  timestamp: Date;
  source: string;
}

export interface RawVesselInput {
  [key: string]: unknown;
  mmsi?: number | string;
  MMSI?: number | string;
  imo?: string | number;
  name?: string;
  shipname?: string;
  lat?: number | string;
  latitude?: number | string;
  lon?: number | string;
  longitude?: number | string;
  sog?: number | string | null;
  cog?: number | string | null;
  heading?: number | string | null;
  navStatus?: string | null;
  nav_status?: string | null;
  timestamp?: Date | string | number;
}

export interface BboxInput {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export class ShipSourceAdapter {
  async start(_onMessage: (vessel: NormalizedVessel) => void | Promise<void>): Promise<void> {
    throw new Error("ShipSourceAdapter.start() not implemented");
  }

  stop(): void {
    throw new Error("ShipSourceAdapter.stop() not implemented");
  }
}

export class AirSourceAdapter {
  async fetchStates(): Promise<unknown> {
    throw new Error("AirSourceAdapter.fetchStates() not implemented");
  }
}

export function normalizeShipPosition(raw: RawVesselInput, source = "unknown"): NormalizedVessel | null {
  const mmsi = Number(raw?.mmsi ?? raw?.MMSI ?? 0);
  const lat = Number(raw?.lat ?? raw?.latitude ?? 0);
  const lon = Number(raw?.lon ?? raw?.longitude ?? 0);
  if (!mmsi || Number.isNaN(lat) || Number.isNaN(lon)) return null;

  return {
    mmsi,
    imo: raw?.imo ? String(raw.imo) : null,
    name: (raw?.name as string | undefined) || (raw?.shipname as string | undefined) || null,
    lat,
    lon,
    sog: raw?.sog != null ? Number(raw.sog) : null,
    cog: raw?.cog != null ? Number(raw.cog) : null,
    heading: raw?.heading != null ? Number(raw.heading) : null,
    nav_status: (raw?.navStatus as string | null | undefined) ?? (raw?.nav_status as string | null | undefined) ?? null,
    timestamp: raw?.timestamp ? new Date(raw.timestamp) : new Date(),
    source
  };
}

export function bboxToPolygonWkt({ minLon, minLat, maxLon, maxLat }: BboxInput): string {
  return `POLYGON((${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}))`;
}
