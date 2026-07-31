import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { mockDashboardStats, mockUser, renderApp } from './test/utils'

const API_URL = import.meta.env.VITE_API_URL

function mockStats() {
    server.use(
        http.get(`${API_URL}/api/dashboard/stats`, () => HttpResponse.json(mockDashboardStats)),
    )
}

describe('routing guards', () => {
    it('redirects a logged-out user away from a protected route to /login', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })

    it('treats a real server error on the initial session check as logged out, not an unhandled rejection', async () => {
        server.use(
            http.get(`${API_URL}/api/user`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })

    it('treats a real network failure on the initial session check as logged out, not an unhandled rejection', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.error()))

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })

    it('renders the protected route for a logged-in user', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
        mockStats()

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })

    it('redirects an already-authenticated user away from /login', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
        mockStats()

        renderApp('/login')

        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })

    it('shows the public landing page (not a redirect to /login) for a logged-out visitor at /', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))

        renderApp('/')

        expect(
            await screen.findByRole('heading', { name: /newsletters that ship themselves/i }),
        ).toBeInTheDocument()
        const header = screen.getByRole('banner')
        expect(within(header).getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    })

    it('does not force-redirect an already-authenticated visitor away from /, showing a Go to Dashboard CTA instead of Log in', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))

        renderApp('/')

        expect(
            await screen.findByRole('heading', { name: /newsletters that ship themselves/i }),
        ).toBeInTheDocument()
        const header = screen.getByRole('banner')
        expect(within(header).getByRole('link', { name: 'Go to Dashboard' })).toBeInTheDocument()
        expect(within(header).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    })

    it('redirects an unknown route to the public landing page, not /dashboard', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))

        renderApp('/this-route-does-not-exist')

        expect(
            await screen.findByRole('heading', { name: /newsletters that ship themselves/i }),
        ).toBeInTheDocument()
    })
})
