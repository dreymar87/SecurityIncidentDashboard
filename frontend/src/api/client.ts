import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  data: T[];
}

export interface Vulnerability {
  id: number;
  cve_id: string;
  source: string;
  title: string | null;
  description: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  affected_products: Array<{ vendor?: string; product?: string; cpe?: string }>;
  patch_available: boolean;
  patch_url: string | null;
  cisa_kev: boolean;
  exploit_available: boolean;
  countries: string[];
  published_at: string | null;
  last_modified: string | null;
}

export interface Breach {
  id: number;
  source: string;
  organization: string | null;
  domain: string | null;
  country: string | null;
  breach_date: string | null;
  records_affected: number | null;
  breach_types: string[];
  is_verified: boolean;
  is_sensitive: boolean;
}

export interface ThreatIntel {
  id: number;
  source: string;
  ip_address: string;
  country: string | null;
  org: string | null;
  open_ports: number[];
  tags: string[];
  risk_score: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface DashboardStats {
  overview: {
    totalVulnerabilities: number;
    activeExploits: number;
    totalBreaches: number;
    totalBreachRecords: number;
    threatIps: number;
  };
  severityDistribution: Array<{ severity: string; count: string }>;
  topBreachCountries: Array<{ country: string; count: string }>;
  topVulnCountries: Array<{ country: string; count: string }>;
  topThreatCountries: Array<{ country: string; count: string }>;
  recentActivity: Array<{
    type: string;
    identifier: string;
    detail: string;
    event_time: string;
  }>;
  lastSync: Array<{ source: string; last_ran: string }>;
}

export interface SearchResults {
  vulnerabilities: Array<{ id: number; cve_id: string; title: string | null; severity: string | null; cvss_score: number | null }>;
  breaches: Array<{ id: number; organization: string | null; domain: string | null; country: string | null; records_affected: number | null }>;
  threatIntel: Array<{ id: number; ip_address: string; country: string | null; org: string | null; risk_score: number }>;
}

export interface TrendData {
  vulnerabilities: Array<{ date: string; count: string }>;
  breaches: Array<{ date: string; count: string }>;
  threatIntel: Array<{ date: string; count: string }>;
}

export interface VulnFilters {
  severity?: string;
  country?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  kev?: boolean;
  exploit?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface BreachFilters {
  country?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface SettingsStatus {
  sources: Array<{
    name: string;
    lastSync: string;
    status: string;
    recordsSynced: number;
    errorMessage: string | null;
  }>;
  keys: Record<string, boolean>;
}

export interface AttackTechnique {
  id: number;
  technique_id: string;
  name: string;
  description: string | null;
  tactic: string;
  platform: string[];
  data_sources: string[];
  url: string | null;
}

export interface Alert {
  id: number;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  severity: string | null;
  read: boolean;
  created_at: string;
}

export interface ImportJob {
  id: number;
  filename: string;
  format: string;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  records_total: number | null;
  records_imported: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: 'admin' | 'viewer';
  active: boolean;
  created_at: string;
}

export interface UserPreferences {
  alertThreshold: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ALL';
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
