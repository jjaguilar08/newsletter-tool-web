import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './Spinner'

// The mirror image of ProtectedRoute: keeps an already-authenticated user
// off /login (redirecting to the app) instead of keeping a guest out.
export function GuestRoute() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center gap-3 bg-beacon-cream text-sm text-beacon-muted">
                <Spinner />
                <span>Loading…</span>
            </div>
        )
    }

    if (user) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}
