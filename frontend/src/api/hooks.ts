import { useQuery } from '@tanstack/react-query';
import { api, DashboardStats, PaginatedResponse, Vulnerability, Breach, ThreatIntel, VulnFilters, BreachFilters } from './client';

export function useStats() {
  return useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useVulnerabilities(filters: VulnFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== false)
  );
  return useQuery<PaginatedResponse<Vulnerability>>({
    queryKey: ['vulnerabilities', params],
    queryFn: () => api.get('/vulnerabilities', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useVulnerability(cveId: string) {
  return useQuery<Vulnerability>({
    queryKey: ['vulnerability', cveId],
    queryFn: () => api.get(`/vulnerabilities/${cveId}`).then((r) => r.data),
    enabled: !!cveId,
  });
}

export function useBreaches(filters: BreachFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );
  return useQuery<PaginatedResponse<Breach>>({
    queryKey: ['breaches', params],
    queryFn: () => api.get('/breaches', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useThreatIntel(filters: Record<string, string> = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );
  return useQuery<PaginatedResponse<ThreatIntel>>({
    queryKey: ['threat-intel', params],
    queryFn: () => api.get('/threat-intel', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useSyncStatus() {
  return useQuery<Array<{ source: string; status: string; records_synced: number; ran_at: string }>>({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/sync/status').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });
}

export function useBreachRelatedVulns(breachId: number | null) {
  return useQuery<Vulnerability[]>({
    queryKey: ['breach-related-vulns', breachId],
    queryFn: () => api.get(`/breaches/${breachId}/related-vulns`).then((r) => r.data),
    enabled: breachId !== null,
  });
}

export function useImportJobs() {
  return useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => api.get('/imports').then((r) => r.data),
    refetchInterval: 5000,
  });
}
