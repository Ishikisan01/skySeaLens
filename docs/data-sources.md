# Data Source Register

This register is mandatory before enabling any provider in production.

## Ships

### AISStream (Primary)
- Purpose: Global near-real-time AIS vessel traffic.
- Base URL: `wss://stream.aisstream.io/v0/stream`
- Allowed use: Non-commercial learning/project usage.
- Prohibited uses: Exposing API key in client/browser; violating provider limits/terms.
- Required attribution: "Vessel data source: AISStream" (footer + data page).
- Rate limits: Enforced server-side; one backend websocket connection per service instance.
- Retention policy: Keep normalized vessel latest state; avoid storing raw payload long-term.
- Fallback policy: Switch to AISHub through feature flag when source health degrades.
- Last reviewed: 2026-04-09

### AISHub (Fallback)
- Purpose: Secondary vessel data source for coverage gaps/failover.
- Base URL: `https://data.aishub.net/ws.php`
- Allowed use: Per AISHub member/data-sharing terms.
- Prohibited uses: Scraped/synthetic data misuse; violating query interval restrictions.
- Required attribution: "Vessel data source: AISHub" (when active).
- Rate limits: Backend poll interval >= 60s and bounded queries.
- Retention policy: Same as primary source.
- Fallback policy: Enabled only when primary source is unhealthy.
- Last reviewed: 2026-04-09

### NOAA / MarineCadastre (Historical Backfill)
- Purpose: Historical analysis and experimentation (US coverage).
- Base URL: Data download portals/bulk files.
- Allowed use: Public/open data usage (confirm current terms at download time).
- Prohibited uses: Misrepresenting source or stale data as real-time.
- Required attribution: "Historical AIS data: NOAA/MarineCadastre".
- Rate limits: N/A (bulk ingestion workflow).
- Retention policy: Curated subsets only; avoid storing unnecessary raw archives.
- Fallback policy: Not for live map.
- Last reviewed: 2026-04-09

## Air (Phase 2)

### OpenSky Network (Primary Air)
- Purpose: ADS-B flight tracking and state vectors.
- Base URL: `https://opensky-network.org/api`
- Allowed use: Non-commercial/research usage under current license.
- Prohibited uses: Commercial redistribution without proper license.
- Required attribution: "Air traffic data: OpenSky Network".
- Rate limits: Enforce backend throttling and caching.
- Retention policy: Keep latest state + optional short track retention.
- Fallback policy: Optional ADS-B Exchange adapter behind feature flag.
- Last reviewed: 2026-04-09

### ADS-B Exchange (Optional Air Fallback)
- Purpose: Optional alternative air feed.
- Base URL: Provider-specific API endpoint.
- Allowed use: Personal/non-commercial tier only unless licensed otherwise.
- Prohibited uses: Unlicensed commercial usage or redistribution.
- Required attribution: Provider-specific attribution text.
- Rate limits: Server-side throttle required.
- Retention policy: Keep normalized states only.
- Fallback policy: Disabled by default.
- Last reviewed: 2026-04-09

## Runtime Guardrails
- All provider calls are backend-only.
- API keys remain server-side in environment variables.
- Provider toggle is feature-flag driven.
- Health endpoint reports source status and recent message timestamps.
