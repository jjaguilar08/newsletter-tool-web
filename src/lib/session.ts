import { apiClient, ApiError } from './apiClient'
import type { User } from '../types/user'

// A missing/wrong-role session isn't an error here, just "not logged in" -
// GET /api/user 401s when there's no session and 403s for a non-staff role
// (see PROJECT_NOTES.md), both of which mean "treat as logged out" for the
// SPA rather than something to surface to the user. Any other status (e.g.
// a 500) is a real failure and is left to reject rather than swallowed.
//
// Lives in lib/, not context/AuthProvider.tsx, so it can be unit-tested
// directly - a plain function export living alongside AuthProvider's
// component export would trip eslint-plugin-react-refresh's
// only-export-components rule the same way Day 8's context/hook split did.
export async function fetchCurrentUser(): Promise<User | null> {
    try {
        return await apiClient.get<User>('/api/user')
    } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return null
        }
        throw error
    }
}
