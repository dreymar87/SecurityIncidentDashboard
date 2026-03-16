# SecureSight Roadmap

This document tracks planned features and improvements. Items are grouped by phase and ordered by suggested implementation sequence within each phase.

**Current status**: Phase 4 complete (UI/UX polish).

---

## Phase 5 — Multi-User Support

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P5-1 | **Multiple user accounts** | Extend Passport.js local strategy (P3-4) to support multiple users in a `users` table. Registration via CLI script or admin-invite flow — no public self-signup. |
| ⬜ | P5-2 | **User management page** | New `/admin/users` page to add/remove users and reset passwords. Backend: `GET/POST/DELETE /users` routes. |
| ⬜ | P5-3 | **Per-user alert preferences** | Each user configures which alert severities trigger their in-app bell. Stored in a `user_preferences` JSON column. |
| ⬜ | P5-4 | **Audit log** | Track who triggered manual syncs and imports. New `audit_log` table. Recent-actions panel on Settings page with user + timestamp. |

---

## Phase 6 — Feature Depth

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P6-1 | **Remediation tracking** | Add `status` (open / in-progress / resolved / accepted-risk) and `assigned_to` fields to vulnerabilities. Filter by status. Lightweight triage workflow without a full ticketing system. |
| ⬜ | P6-2 | **CVE notes / comments** | `vulnerability_notes` table (vuln_id, user, note, timestamp). Threaded team notes on each CVE detail page. |
| ⬜ | P6-3 | **Watchlists** | Star/watch specific CVEs or save a filter preset as a watchlist. Bell alerts optionally scoped to watched items. |
| ⬜ | P6-4 | **PDF / print report** | "Export Report" button on Dashboard generates a print-friendly summary of key metrics, top CVEs, and recent breaches. CSS `@media print` approach. |
| ⬜ | P6-5 | **Risk scoring** | Custom risk score per CVE = weighted blend of CVSS base score + exploit availability + breach correlation. Configurable weights in Settings. "Risk Score" sortable column added to `VulnTable`. |

---

## Completed

| Phase | ID | Feature |
|-------|----|---------|
| 4 | P4-1 | Responsive layout — sidebar collapses to icon rail on <1024px, mobile hamburger menu, table horizontal scroll |
| 4 | P4-2 | Trend / time-series charts — Recharts LineChart with 7d/30d/90d range selector on Dashboard |
| 4 | P4-3 | Saved filter presets — localStorage-based preset save/load with Presets dropdown in FilterBar |
| 4 | P4-4 | Global full-text search — TopBar search across vulnerabilities, breaches, and threat intel with grouped dropdown |
| 4 | P4-5 | Detail pages — replaced VulnDetail/BreachDetail modals with routed pages (`/vulnerabilities/:cveId`, `/breaches/:id`) |
| 4 | P4-6 | Empty states & onboarding — EmptyState component, "Run your first sync" CTA card on Dashboard |
| 4 | P4-7 | Accessibility pass — ARIA labels, focus-visible rings, skip link, scope on table headers, semantic landmarks |
| 3 | P3-1 | Test framework — jest + supertest for backend, vitest + @testing-library/react for frontend |
| 3 | P3-2 | GitHub Actions CI — ci.yml: lint + test + build on PRs, release.yml: GHCR images on tags |
| 3 | P3-3 | Structured logging + metrics — pino logger, Prometheus /metrics endpoint via prom-client |
| 3 | P3-4 | Optional authentication — Passport.js local strategy with Postgres-backed sessions |
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
