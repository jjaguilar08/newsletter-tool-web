import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// The mirror image of ProtectedRoute: keeps an already-authenticated user
// off /login (redirecting to the app) instead of keeping a guest out.
export function GuestRoute() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return <p>Loading…</p>
    }

    if (user) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}
