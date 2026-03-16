# SecureSight Roadmap

This document tracks planned features and improvements. Items are grouped by phase and ordered by suggested implementation sequence within each phase.

**Current status**: Phase 2 complete (feature expansion).

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
| 2 | P2-1 | Settings page with sync status, manual triggers, API key indicators |
| 2 | P2-2 | MITRE ATT&CK weekly sync, `attack_techniques` table, `/attack` page with TTP grouping |
| 2 | P2-3 | OSV (osv.dev) daily sync — npm, PyPI, Go, Maven ecosystems |
| 2 | P2-4 | GitHub Advisory DB sync via GraphQL, optional `GITHUB_TOKEN`, 6-hour cron |
| 2 | P2-5 | Exploit-DB daily CSV enrichment — sets `exploit_available=true` on matching CVEs |
| 2 | P2-6 | Alert system with `alerts` table, post-sync hooks, bell icon with unread count |
| 2 | P2-7 | SSE for import status replacing polling with `EventSource` |
| 2 | P2-8 | Light mode toggle via CSS variables and `data-theme` attribute |
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
