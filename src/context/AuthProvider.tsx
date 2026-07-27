import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { apiClient, ApiError } from '../lib/apiClient'
import type { User } from '../types/user'

// A missing/wrong-role session isn't an error here, just "not logged in" -
// GET /api/user 401s when there's no session and 403s for a non-staff role
// (see PROJECT_NOTES.md), both of which mean "treat as logged out" for the
// SPA rather than something to surface to the user.
async function fetchCurrentUser(): Promise<User | null> {
    try {
        return await apiClient.get<User>('/api/user')
    } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return null
        }
        throw error
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let active = true

        fetchCurrentUser()
            .then((current) => {
                if (active) {
                    setUser(current)
                }
            })
            .finally(() => {
                if (active) {
                    setIsLoading(false)
                }
            })

        return () => {
            active = false
        }
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        await apiClient.primeCsrfCookie()
        await apiClient.post('/api/login', { email, password })
        setUser(await fetchCurrentUser())
    }, [])

    const logout = useCallback(async () => {
        await apiClient.post('/api/logout')
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
