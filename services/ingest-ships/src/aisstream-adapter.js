import WebSocket from "ws";
import { ShipSourceAdapter, normalizeShipPosition } from "@skysealens/domain/src/index.js";

export class AISStreamAdapter extends ShipSourceAdapter {
  constructor() {
    super();
    this.socket = null;
    this.reconnectTimer = null;
    this.isStopped = false;
    this.stats = { received: 0, invalid: 0, errors: 0 };
    this.lastMessageAt = null;
  }

  async start(onMessage) {
    this.isStopped = false;
    this.#connect(onMessage);
  }

  stop() {
    this.isStopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) this.socket.close();
  }

  #connect(onMessage) {
    const apiKey = process.env.AISSTREAM_API_KEY;
    if (!apiKey) throw new Error("AISSTREAM_API_KEY is required");

    this.socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

    this.socket.on("open", () => {
      this.socket.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]]
        })
      );
    });

    this.socket.on("message", (buf) => {
      this.stats.received += 1;
      this.lastMessageAt = new Date();
      let parsed = null;
      try {
        parsed = JSON.parse(String(buf));
      } catch (_e) {
        this.stats.invalid += 1;
        return;
      }

      const report = parsed?.Message?.PositionReport;
      const staticData = parsed?.Message?.StaticDataReport;
      const normalized = normalizeShipPosition(
        {
          mmsi: parsed?.MetaData?.MMSI ?? report?.UserID ?? staticData?.UserID,
          lat: report?.Latitude,
          lon: report?.Longitude,
          cog: report?.Cog,
          sog: report?.Sog,
          heading: report?.TrueHeading,
          navStatus: report?.NavigationalStatus,
          name: staticData?.ReportA?.Name,
          timestamp: parsed?.MetaData?.time_utc
        },
        "aisstream"
      );
      if (!normalized) {
        this.stats.invalid += 1;
        return;
      }
      onMessage(normalized);
    });

    this.socket.on("close", () => {
      if (!this.isStopped) {
        this.reconnectTimer = setTimeout(() => this.#connect(onMessage), 3000);
      }
    });

    this.socket.on("error", (err) => {
      this.stats.errors += 1;
      console.error("AISStream socket error:", err.message);
    });
  }
}
