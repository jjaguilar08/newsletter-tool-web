import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { apiClient } from '../lib/apiClient'
import { fetchCurrentUser } from '../lib/session'
import type { User } from '../types/user'

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
            .catch(() => {
                // A real failure here (500, network error) isn't 401/403, so
                // fetchCurrentUser() rejects rather than resolving null - but
                // this initial check has nowhere to surface a distinct error
                // state, and ProtectedRoute already treats user === null as
                // "not logged in". Falling back to logged-out here (instead
                // of leaving the rejection dangling) keeps that the one
                // consistent behavior for "couldn't confirm you're logged
                // in", same as 401/403.
                if (active) {
                    setUser(null)
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
