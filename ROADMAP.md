# SecureSight Roadmap

This document tracks planned features and improvements. Items are grouped by phase and ordered by suggested implementation sequence within each phase.

**Current status**: Phase 6 complete (Feature Depth).

---

## Phase 7 — Notifications & Integrations

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P7-1 | **Webhook / notification alerts** | Push alerts to Slack, Teams, PagerDuty, or SMTP email when new critical CVEs or breaches are detected. Configurable per-channel in Settings. |
| ⬜ | P7-2 | **Notification center** | Full alert history page replacing the bell-icon-only view. Filterable by severity, source, date. |
| ⬜ | P7-3 | **Failed login alerting** | Auto-create an alert after N failed login attempts from a username or IP. |

---

## Phase 8 — Security Hardening

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P8-1 | **MFA / TOTP** | Time-based one-time password enrollment via QR code. Required on next login after admin enables it per user. |
| ⬜ | P8-2 | **API key auth** | `api_keys` table, `X-API-Key` header-based auth for programmatic/CI access without session cookies. |
| ⬜ | P8-3 | **Session management UI** | List active sessions, show last activity, allow individual session revocation. |
| ⬜ | P8-4 | **Shodan / Censys integration** | IP enrichment for threat intel entries. Already referenced in README. |

---

## Phase 9 — Intelligence & Enrichment

| Status | ID | Feature | Description |
|--------|-----|---------|-------------|
| ⬜ | P9-1 | **AI CVE summaries** | Claude API integration on CVE detail page — plain-language summary and remediation advice. |
| ⬜ | P9-2 | **CVE-to-breach correlation** | Auto-link vulnerabilities to breaches sharing country or affected product data. |
| ⬜ | P9-3 | **CVE diff / changelog** | Store NVD update history; show what changed between sync runs on the detail page. |

---

## Completed

---

## Completed

| Phase | ID | Feature |
| 6 | P6-1 | Triage states — `triage_status` (new/watching/reviewed/dismissed) on vulnerabilities with filter, badge, and detail-page selector |
| 6 | P6-2 | CVE notes — `vulnerability_notes` table, threaded team notes on CVE detail page with add/delete |
| 6 | P6-3 | Watchlist — star/watch individual CVEs, "watched only" filter in VulnTable |
| 6 | P6-4 | PDF / print report — "Export Report" button on Dashboard, CSS `@media print` with PrintHeader component |
| 6 | P6-5 | Risk scoring — configurable weighted score (CVSS + exploit + KEV), stored in `app_settings`, sortable column, Settings UI |
|-------|----|---------|
| 5 | P5-1 | Multiple user accounts — CLI `create-user.js` script, `requireAdmin` middleware, admin + viewer roles |
| 5 | P5-2 | User management page — `/admin/users` with add/remove users, reset passwords, role badges |
| 5 | P5-3 | Per-user alert preferences — severity threshold (CRITICAL/HIGH/MEDIUM/LOW/ALL) in user preferences |
| 5 | P5-4 | Audit log — `audit_log` table, tracks sync triggers, imports, user management actions, panel on Settings |
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
