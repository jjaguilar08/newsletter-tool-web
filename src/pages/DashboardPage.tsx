import { useAuth } from '../hooks/useAuth'

// Placeholder only - proves the ProtectedRoute guard works end to end.
// Real dashboard UI (stats, recent campaigns) is Day 13.
export function DashboardPage() {
    const { user, logout } = useAuth()

    return (
        <main>
            <h1>Dashboard</h1>
            <p>Signed in as {user?.name}</p>
            <button type="button" onClick={() => void logout()}>
                Log out
            </button>
        </main>
    )
}
