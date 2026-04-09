# SkySeaLens

Ships-first global traffic tracker with static map UI, Node API, and AIS ingestion worker.

## Structure
- `web`: static frontend (MapLibre map + live vessel refresh)
- `services/api`: bbox vessel API, health, rate limiting, optional Redis cache
- `services/ingest-ships`: AISStream websocket ingestion + dedupe + source health
- `services/ingest-air`: OpenSky scaffold for phase 2
- `packages/domain`: shared adapter interfaces and normalizers
- `infra`: docker-compose, Nginx config, systemd units
- `docs`: deployment, licensing, monitoring, and data source register

## Quick Start (local)
1. Copy env file: `cp .env.example .env`
2. Install dependencies: `npm ci`
3. Start DB/API/ingest/web using your preferred method:
   - Docker: `docker compose -f infra/docker-compose.yml up -d`
   - Or run services directly with npm workspace scripts.

## API Endpoints
- `GET /api/v1/health`
- `GET /api/v1/health/sources`
- `GET /api/v1/metrics`
- `GET /api/v1/vessels?bbox=minLon,minLat,maxLon,maxLat&zoom=3`
- `GET /api/v1/vessels/:mmsi`
- `GET /api/v1/aircraft?bbox=minLon,minLat,maxLon,maxLat`

## Deployment Rules
- Use `npm ci` in CI/CD.
- Use `npm ci --omit=dev` for production installs from source.
- Keep `NODE_OPTIONS=--max-old-space-size=512`.
- Use `scripts/deploy.sh <version>` and `scripts/rollback.sh`.
