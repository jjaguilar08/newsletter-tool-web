import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthProvider'
import App from '../App'
import type { User } from '../types/user'
import type { DashboardStats } from '../types/dashboardStats'

export const mockUser: User = {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'staff',
    email_verified_at: '2026-01-01T00:00:00.000000Z',
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
}

export const mockDashboardStats: DashboardStats = {
    subscribers: { subscribed: 0, unsubscribed: 0, bounced: 0 },
    campaigns: { draft: 0, scheduled: 0, sending: 0, sent: 0 },
    recent_campaigns: [],
    campaign_sends: { sent: 0, failed: 0 },
}

export function renderApp(initialRoute: string) {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </MemoryRouter>,
    )
}
