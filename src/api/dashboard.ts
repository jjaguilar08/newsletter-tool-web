import { apiClient } from '../lib/apiClient'
import type { DashboardStats } from '../types/dashboardStats'

// Not wrapped in { data: ... } - DashboardController::stats() returns the
// stats object directly.
export function getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/api/dashboard/stats')
}
