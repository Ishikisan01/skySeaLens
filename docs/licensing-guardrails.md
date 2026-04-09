# SkySeaLens Data Licensing Guardrails

## Scope
This document defines mandatory rules for using vessel and air-traffic data sources in a non-commercial public learning project.

## Non-Commercial Baseline
- Project usage must remain non-commercial unless source terms are re-reviewed.
- If monetization model changes, re-validate every provider license before continuing data usage.
- Keep a visible disclaimer that data may be delayed, incomplete, or unavailable.

## Source Register Requirement

Maintain a source register in repo (recommended: `docs/data-sources.md`) with:
- provider name
- API/base URL
- allowed use summary
- explicit prohibited uses
- attribution text required by provider
- retention limits (if any)
- rate limits
- contact/escalation path
- last reviewed date

No provider should be enabled in production unless this register entry is complete.

## Provider Enablement Checklist

Before enabling a source in runtime:
1. Terms reviewed by maintainer.
2. Attribution text added to UI footer/about.
3. Rate limits enforced in backend.
4. API keys stored server-side only.
5. Feature flag available for emergency disable.

## Runtime Compliance Rules
- Never expose provider API keys in frontend code.
- Route all provider calls through backend.
- Log only necessary operational data.
- Respect provider request frequency and burst limits.
- Add source tag (`source`) in records to support audits and takedown handling.

## Attribution Rules
- Always show source attribution in:
  - site footer
  - about/data page
- Attribution must match provider-required wording where specified.

## Incident and Change Handling
- If provider terms change:
  - immediately disable source via feature flag if unclear/non-compliant
  - update register entry
  - re-enable only after compliance confirmation
- If provider sends takedown/compliance notice:
  - disable source immediately
  - retain minimal logs for audit
  - document incident resolution

## Data Retention Guardrails
- Keep only data needed for product features.
- Start with short retention for raw stream payloads.
- Store curated/normalized records over raw payloads where possible.
- Document retention windows per source in register.

## Commercialization Gate

Before any commercial usage:
1. Re-review all active source licenses.
2. Obtain commercial licenses where required.
3. Update terms/privacy pages.
4. Re-run deployment with updated attribution and legal docs.
