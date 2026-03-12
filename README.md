# SecureSight — Security Incident Dashboard

A public-facing security intelligence dashboard that aggregates CVE vulnerabilities, known exploits, and data breaches from multiple trusted global sources.

## Features

- **CVE/Vulnerability tracking** via NIST NVD with CVSS scores, severity ratings, and patch status
- **CISA KEV integration** — highlights actively exploited vulnerabilities
- **Data breach timeline** via Have I Been Pwned
- **Threat IP intelligence** via GreyNoise
- **World map heatmap** of vulnerabilities and breaches by country
- **Advanced filters**: severity, country, date range, source, exploit/patch status
- **CSV/JSON import** for migrating data from external tools (e.g. ChatGPT automations)
- **Export** filtered views to CSV
- **Auto-sync** via cron jobs (configurable intervals)
- **Dark-mode UI** with real-time metrics panel

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Charts | Recharts |
| World Map | react-simple-maps |
| Backend | Node.js + Express |
| Database | PostgreSQL + Knex.js |
| Scheduler | node-cron |
| Deployment | Docker + Docker Compose |

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd SecurityIncidentDashboard
cp .env.example .env
# Edit .env with your API keys and DB credentials
```

### 2. Start with Docker

```bash
docker compose up -d
```

Visit `http://localhost:3000`

### 3. Run first sync (no API keys needed for CISA)

```bash
curl -X POST http://localhost:4000/api/sync/trigger/cisa
curl -X POST http://localhost:4000/api/sync/trigger/nvd
```

### 4. Development mode (without Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 14+

```bash
# Backend
cd backend
npm install
# Create .env pointing to local postgres
npm run migrate
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## API Keys

| Service | Required | Free? | Get It |
|---------|----------|-------|--------|
| NVD | Optional (increases rate limit) | Yes | https://nvd.nist.gov/developers/request-an-api-key |
| CISA KEV | No | Yes | No key needed |
| Have I Been Pwned | Yes (for breach sync) | Yes | https://haveibeenpwned.com/API/Key |
| GreyNoise | Yes (for threat intel) | Free tier | https://www.greynoise.io/plans/community |
| Shodan | Yes | Paid | https://account.shodan.io |

## Importing ChatGPT Automation Data

1. Export your ChatGPT automation data as CSV or JSON
2. Go to `/import` in the dashboard
3. Select the data type (Vulnerabilities or Breaches)
4. Drag and drop your file — fields are mapped automatically
5. Imported records will be tagged with `source=imported`

### Supported CSV columns

**Vulnerabilities:** `cve_id`, `title`, `severity`, `cvss_score`, `description`, `countries`, `published_at`, `patch_available`

**Breaches:** `organization`, `domain`, `country`, `breach_date`, `records_affected`, `breach_types`, `description`, `is_verified`

## API Reference

```
GET  /api/stats
GET  /api/vulnerabilities?severity=CRITICAL&kev=true&page=1
GET  /api/vulnerabilities/:cveId
GET  /api/breaches?country=US&dateFrom=2023-01-01
GET  /api/threat-intel?source=greynoise
GET  /api/sync/status
POST /api/sync/trigger/:source    (cisa|nvd|hibp|greynoise)
POST /api/imports/upload
GET  /api/imports/:jobId/status
GET  /api/vulnerabilities?export=csv
GET  /api/breaches?export=csv
```

## Sync Schedule

| Source | Interval |
|--------|----------|
| CISA KEV | Every 12 hours |
| NVD CVEs | Every 6 hours |
| HIBP Breaches | Daily at 2am |
| GreyNoise | Every 4 hours |
