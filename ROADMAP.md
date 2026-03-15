# SecureSight Roadmap

This document tracks planned features and improvements. Items are grouped by phase and ordered by suggested implementation sequence within each phase.

**Current status**: Phase 1 complete (stability hardening + visual polish).

---

## Phase 2 — Feature Expansion

### New Data Sources

All sources in this phase are free with no paid API keys required.

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P2-3 | **OSV (osv.dev)** | Open Source Vulnerability DB — upserts into the existing `vulnerabilities` table with `source='osv'`. No API key. Covers npm, PyPI, Go, Maven gaps that NVD misses. Daily cron. |
| ⬜ | P2-5 | **Exploit-DB** | Daily CSV download from exploit-db.com. Enrichment only — sets `exploit_available=true` on existing CVE rows. No new table needed. |
| ⬜ | P2-4 | **GitHub Advisory DB** | GraphQL API, optional `GITHUB_TOKEN` (free). Maps GHSA IDs into the `vulnerabilities` table. `MODERATE` severity maps to `MEDIUM`. 6-hour cron. |
| ⬜ | P2-2 | **MITRE ATT&CK** | Weekly sync from `attack-stix-data.mitre.org`. New `attack_techniques` table. New `/attack` page displaying TTPs grouped by tactic. |

### UI Features

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P2-1 | **Settings page** | Wire up the existing Settings icon in the sidebar (currently has no route). Shows sync status per source, manual trigger buttons, and which API keys are configured (boolean presence only — never values). |
| ⬜ | P2-6 | **Alert system** | New `alerts` table. Post-sync hook generates alerts for new CRITICAL or CISA KEV records. Bell icon in TopBar with unread count badge and dropdown panel. |
| ⬜ | P2-7 | **SSE for import status** | Replace 1500ms polling in `ImportWizard` with a `GET /api/imports/:jobId/stream` Server-Sent Events endpoint and native `EventSource` hook. |
| ⬜ | P2-8 | **Light mode toggle** | CSS-only `data-theme` attribute toggle in TopBar, persisted to `localStorage`. No component changes beyond `TopBar.tsx` and `index.css`. |

---

## Phase 3 — Production Readiness

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P3-1 | **Test framework** | `jest` + `supertest` for backend, `vitest` + `@testing-library/react` for frontend. Priority targets: filter param validation, import transaction rollback, HTTP retry logic, `SeverityBadge` render, WorldMap country lookup. |
| ⬜ | P3-2 | **GitHub Actions CI** | `ci.yml`: lint + test-backend + test-frontend + `docker compose build` on every PR. `release.yml`: build and push images to GHCR on `v*.*.*` tags. Pair with P3-1. |
| ⬜ | P3-3 | **Structured logging + metrics** | Replace `console.*` with `pino`. Prometheus `/metrics` endpoint via `prom-client` exposing `http_requests_total`, `sync_duration_seconds`, `sync_records_total`. Optional Grafana sidecar in `docker-compose.yml`. |
| ⬜ | P3-4 | **Optional authentication** | Passport.js local strategy with Postgres-backed sessions (`connect-pg-simple`). Protect mutations only (`POST /sync/trigger`, `POST /imports/upload`). All GET endpoints remain public. |

---

## Completed

| Phase | ID | Feature |
|-------|----|---------|
| 1 | P1-1 | Ensure `/tmp/sid-imports/` exists at startup |
| 1 | P1-2 | Validate required env vars at startup |
| 1 | P1-3 | Input validation on all filter params |
| 1 | P1-4 | Rate limiting (express-rate-limit) |
| 1 | P1-5 | HTTP retry utility with exponential backoff |
| 1 | P1-6 | Import parser wrapped in `db.transaction()` |
| 1 | P1-7 | Dynamic `refetchInterval` in `useImportJobs` |
| 1 | P1-8 | `ImportJob` TypeScript interface |
| 1 | P1-9 | `ErrorBoundary` component wrapping Dashboard widgets |
| 1 | P1-10 | WorldMap country name map expanded to ~230 entries |
| 1 | P1-11 | Removed unimplemented Shodan/Censys filter options |
| 1 | P1-12 | Icons added to `SeverityBadge` |
| 1 | P1-13 | Skeleton loaders replacing spinners |
| 1 | P1-14 | Enriched ActivityFeed (severity badges, record counts) |
| BF | BF-1 | ActivityFeed null crash fix |
| BF | BF-2 | Threat intel WorldMap (GreyNoise country data) |
