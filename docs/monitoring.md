# Monitoring and Operations

## Health Endpoints
- API health: `GET /api/v1/health`
- Source health: `GET /api/v1/health/sources`
- Runtime metrics: `GET /api/v1/metrics`

## What to monitor
- API latency and non-2xx rates.
- Vessel count returned for standard bbox probes.
- Ingestion freshness (`last_message_at` drift).
- Ingestion errors (`error_rate` and worker logs).
- Memory and uptime from `/api/v1/metrics`.

## Quick checks
- `curl -s http://127.0.0.1:3001/api/v1/health | jq`
- `curl -s http://127.0.0.1:3001/api/v1/health/sources | jq`
- `curl -s http://127.0.0.1:3001/api/v1/metrics | jq`

## Suggested alert thresholds
- Ingest stale: no message for > 120s.
- Error-rate spike: > 5 errors/min sustained for 5m.
- API memory > 450MB for 10m.
- API p95 latency > 800ms for 10m.
