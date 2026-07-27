import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthProvider'
import App from '../App'
import type { User } from '../types/user'

export const mockUser: User = {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'staff',
    email_verified_at: '2026-01-01T00:00:00.000000Z',
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
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
