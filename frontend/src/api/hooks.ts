import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DashboardStats, TrendData, SearchResults, ImportJob, PaginatedResponse, Vulnerability, Breach, ThreatIntel, VulnFilters, BreachFilters, SettingsStatus, AttackTechnique, Alert, User, UserPreferences, AuditLogEntry } from './client';

export function useStats() {
  return useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useGlobalSearch(q: string) {
  return useQuery<SearchResults>({
    queryKey: ['global-search', q],
    queryFn: () => api.get('/search', { params: { q } }).then((r) => r.data),
    enabled: q.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useTrends(range: '7d' | '30d' | '90d' = '30d') {
  return useQuery<TrendData>({
    queryKey: ['trends', range],
    queryFn: () => api.get('/stats/trends', { params: { range } }).then((r) => r.data),
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

export function useBreach(breachId: number | null) {
  return useQuery<Breach>({
    queryKey: ['breach', breachId],
    queryFn: () => api.get(`/breaches/${breachId}`).then((r) => r.data),
    enabled: breachId !== null && !isNaN(breachId),
  });
}

export function useBreachRelatedVulns(breachId: number | null) {
  return useQuery<Vulnerability[]>({
    queryKey: ['breach-related-vulns', breachId],
    queryFn: () => api.get(`/breaches/${breachId}/related-vulns`).then((r) => r.data),
    enabled: breachId !== null,
  });
}

export function useSettings() {
  return useQuery<SettingsStatus>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings/status').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });
}

export function useAttackTechniques(filters: Record<string, string> = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );
  return useQuery<Record<string, AttackTechnique[]>>({
    queryKey: ['attack-techniques', params],
    queryFn: () => api.get('/attack', { params }).then((r) => r.data),
  });
}

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadAlertCount() {
  return useQuery<{ count: number }>({
    queryKey: ['alerts-unread'],
    queryFn: () => api.get('/alerts/unread-count').then((r) => r.data),
    refetchInterval: 60 * 1000,
  });
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['current-user'],
    queryFn: () => api.get('/auth/me').then((r) => r.data).catch(() => null),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string; role: string; email?: string }) =>
      api.post('/users', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.delete(`/users/${userId}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      api.put(`/users/${userId}/reset-password`, { password }).then((r) => r.data),
  });
}

export function useUserPreferences() {
  return useQuery<UserPreferences>({
    queryKey: ['user-preferences'],
    queryFn: () => api.get('/users/me/preferences').then((r) => r.data),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Partial<UserPreferences>) =>
      api.put('/users/me/preferences', prefs).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread'] });
    },
  });
}

export function useAuditLog(page = 1) {
  return useQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: ['audit-log', page],
    queryFn: () => api.get('/audit-log', { params: { page, limit: 20 } }).then((r) => r.data),
  });
}

export function useImportJobs() {
  return useQuery<ImportJob[]>({
    queryKey: ['import-jobs'],
    queryFn: () => api.get('/imports').then((r) => r.data),
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (!jobs || jobs.length === 0) return false;
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
      return hasActive ? 3000 : false;
    },
  });
}
