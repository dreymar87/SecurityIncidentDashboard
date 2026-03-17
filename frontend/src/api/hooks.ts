import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, authApi, DashboardStats, TrendData, SearchResults, ImportJob, PaginatedResponse, Vulnerability, Breach, ThreatIntel, VulnFilters, BreachFilters, SettingsStatus, AttackTechnique, Alert, AlertFilters, PaginatedAlerts, User, UserPreferences, AuditLogEntry, RiskWeights, VulnerabilityNote, NotificationChannel } from './client';

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
    queryFn: () => authApi.get('/auth/me').then((r) => r.data).catch(() => null),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.post('/auth/login', { username, password }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.post('/auth/logout').then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
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

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.put('/users/me/password', { currentPassword, newPassword }).then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      api.put('/users/me/profile', { email }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
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

export function useRiskWeights() {
  return useQuery<RiskWeights>({
    queryKey: ['risk-weights'],
    queryFn: () => api.get('/settings/risk-weights').then((r) => r.data),
  });
}

export function useUpdateRiskWeights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weights: RiskWeights) =>
      api.put('/settings/risk-weights', weights).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['risk-weights'] }),
  });
}

export function useUpdateTriage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cveId, status }: { cveId: string; status: string }) =>
      api.patch(`/vulnerabilities/${cveId}/triage`, { status }).then((r) => r.data),
    onSuccess: (_data, { cveId }) => {
      queryClient.invalidateQueries({ queryKey: ['vulnerability', cveId] });
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
    },
  });
}

export function useVulnerabilityNotes(cveId: string) {
  return useQuery<VulnerabilityNote[]>({
    queryKey: ['vulnerability-notes', cveId],
    queryFn: () => api.get(`/vulnerabilities/${cveId}/notes`).then((r) => r.data),
    enabled: !!cveId,
    refetchInterval: 30 * 1000,
  });
}

export function useAddNote(cveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      api.post(`/vulnerabilities/${cveId}/notes`, { note }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vulnerability-notes', cveId] }),
  });
}

export function useDeleteNote(cveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) =>
      api.delete(`/vulnerabilities/${cveId}/notes/${noteId}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vulnerability-notes', cveId] }),
  });
}

export function useWatchlist() {
  return useQuery<string[]>({
    queryKey: ['watchlist'],
    queryFn: () => api.get('/watchlist').then((r) => r.data),
    staleTime: 60 * 1000,
  });
}

export function useToggleWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cveId, watched }: { cveId: string; watched: boolean }) =>
      watched
        ? api.delete(`/watchlist/${cveId}`).then((r) => r.data)
        : api.post(`/watchlist/${cveId}`).then((r) => r.data),
    onMutate: async ({ cveId, watched }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });
      const prev = queryClient.getQueryData<string[]>(['watchlist']);
      queryClient.setQueryData<string[]>(['watchlist'], (old = []) =>
        watched ? old.filter((id) => id !== cveId) : [...old, cveId]
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['watchlist'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
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

export function useAlertsFeed(filters: AlertFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );
  return useQuery<PaginatedAlerts>({
    queryKey: ['alerts-feed', params],
    queryFn: () => api.get('/alerts', { params: { ...params, page: params.page || 1, limit: params.limit || 50 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => api.patch(`/alerts/${alertId}/read`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-feed'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/alerts/read-all').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-feed'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useNotificationChannels() {
  return useQuery<NotificationChannel[]>({
    queryKey: ['notification-channels'],
    queryFn: () => api.get('/notification-channels').then((r) => r.data),
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>) =>
      api.post('/notification-channels', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-channels'] }),
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<NotificationChannel> & { id: number }) =>
      api.put(`/notification-channels/${id}`, data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-channels'] }),
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/notification-channels/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-channels'] }),
  });
}

export function useTestNotificationChannel() {
  return useMutation({
    mutationFn: (id: number) => api.post(`/notification-channels/${id}/test`).then((r) => r.data),
  });
}
