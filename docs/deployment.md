# SkySeaLens Deployment Playbook

## Goals
- Keep server memory usage predictable on a `4GB RAM / 2 vCPU` host.
- Avoid PM2 and use custom script + `systemd` services.
- Support safe, fast rollback with minimal downtime.

## Runtime Model
- Public entrypoint: Nginx only (`80/443`).
- Internal services bound to localhost/private network only.
- Frontend is static files served by Nginx (no Node frontend process).
- Long-running processes:
  - `skysealens-api.service`
  - `skysealens-ingest.service`

## Release Directory Layout

Use `/srv/skysealens` on server:

- `/srv/skysealens/releases/<version>/web/`
- `/srv/skysealens/releases/<version>/api/`
- `/srv/skysealens/releases/<version>/ingest/`
- `/srv/skysealens/shared/.env`
- `/srv/skysealens/shared/logs/`
- `/srv/skysealens/current` (symlink)
- `/srv/skysealens/previous` (symlink)
- `/srv/skysealens/deploy-manifest.json` (latest deployment metadata)

## Build and Artifact Contract

Build outside the server (local or CI), then deploy artifacts:

- `skysealens-web-<version>.tar.gz` -> contains static frontend build
- `skysealens-api-<version>.tar.gz` -> contains API production build
- `skysealens-ingest-<version>.tar.gz` -> contains ingest production build

Recommended metadata in each artifact:
- version
- git SHA
- build timestamp

## Node and npm Standards

These are mandatory for this project:

- Use `npm ci` on CI/CD and reproducible build environments.
- Keep `package-lock.json` committed and in sync.
- Do not use `npm install` in CI/CD pipelines.
- For production runtime installs from source, use `npm ci --omit=dev`.
- Set memory guardrail for Node services:
  - `NODE_OPTIONS=--max-old-space-size=512`

## Deploy Flow

`deploy.sh <version>` should:
1. Validate version/tag exists.
2. Create `/srv/skysealens/releases/<version>/`.
3. Extract artifacts into `web/`, `api/`, and `ingest/`.
4. Symlink `.env` and log paths from `/srv/skysealens/shared/`.
5. Move `current` to `previous`.
6. Atomically point `current` to new release.
7. Restart:
   - `skysealens-api.service`
   - `skysealens-ingest.service`
8. Run health checks:
   - `GET /api/v1/health`
   - `GET /api/v1/health/sources`
9. Write deployment metadata to `deploy-manifest.json`.

Example install/build snippets:

- CI build:
  - `npm ci`
  - `npm run build`
- Production install (if install needed on host):
  - `npm ci --omit=dev`

## Rollback Flow

Automatic rollback trigger:
- Any health check fails within timeout window.

Rollback steps:
1. Repoint `current` symlink to `previous`.
2. Restart API + ingest services.
3. Re-run health checks.
4. Mark failed deployment and preserve logs.

Manual rollback:
- `rollback.sh <target_version>` using same symlink swap pattern.

## systemd Expectations

- Use `Restart=always` with sensible backoff.
- Set memory guardrails (`NODE_OPTIONS=--max-old-space-size=512`) per service.
- Keep each project in separate units to isolate failures.

## Nginx Expectations

- Serve static frontend from `/srv/skysealens/current/web`.
- Proxy `/api/` to localhost API service.
- Add caching headers for static assets.
- Keep request body/timeouts conservative.

## Operational Checks

Before each deploy:
- Disk free space >= 20%.
- Database reachable.
- No stuck migrations.

After each deploy:
- API p95 latency sanity check.
- Ingest last message timestamp freshness.
- Memory usage within expected cap.
