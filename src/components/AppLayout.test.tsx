import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockDashboardStats, mockUser, renderApp } from '../test/utils'

const API_URL = import.meta.env.VITE_API_URL

function mockLoggedIn() {
    server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
}

function mockStats() {
    server.use(
        http.get(`${API_URL}/api/dashboard/stats`, () => HttpResponse.json(mockDashboardStats)),
    )
}

function mockEmptyLists() {
    server.use(
        http.get(`${API_URL}/api/subscribers`, () =>
            HttpResponse.json({
                data: [],
                meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
            }),
        ),
        http.get(`${API_URL}/api/campaigns`, () =>
            HttpResponse.json({
                data: [],
                meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
            }),
        ),
    )
}

describe('AppLayout', () => {
    it('renders the signed-in-as line, nav links to every protected page, and a logout button', async () => {
        mockLoggedIn()
        mockStats()

        renderApp('/dashboard')

        expect(await screen.findByText('Signed in as Ada Lovelace')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
            'href',
            '/dashboard',
        )
        expect(screen.getByRole('link', { name: 'Subscribers' })).toHaveAttribute(
            'href',
            '/subscribers',
        )
        expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
            'href',
            '/campaigns',
        )
        expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    })

    it('marks only the current page as the active nav link, on every route', async () => {
        mockLoggedIn()
        mockStats()
        mockEmptyLists()

        renderApp('/dashboard')
        await screen.findByRole('heading', { name: 'Dashboard' })
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
            'aria-current',
            'page',
        )
        expect(screen.getByRole('link', { name: 'Subscribers' })).not.toHaveAttribute(
            'aria-current',
        )
        expect(screen.getByRole('link', { name: 'Campaigns' })).not.toHaveAttribute('aria-current')

        const user = userEvent.setup()
        await user.click(screen.getByRole('link', { name: 'Subscribers' }))

        await screen.findByRole('heading', { name: 'Subscribers' })
        expect(screen.getByRole('link', { name: 'Subscribers' })).toHaveAttribute(
            'aria-current',
            'page',
        )
        expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
        expect(screen.getByRole('link', { name: 'Campaigns' })).not.toHaveAttribute('aria-current')

        await user.click(screen.getByRole('link', { name: 'Campaigns' }))

        await screen.findByRole('heading', { name: 'Campaigns' })
        expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
            'aria-current',
            'page',
        )
        expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
        expect(screen.getByRole('link', { name: 'Subscribers' })).not.toHaveAttribute(
            'aria-current',
        )
    })

    it('logs out and redirects to /login when Log out is clicked', async () => {
        mockLoggedIn()
        mockStats()
        server.use(
            http.post(`${API_URL}/api/logout`, () => new HttpResponse(null, { status: 204 })),
        )

        const user = userEvent.setup()
        renderApp('/dashboard')

        await screen.findByText('Signed in as Ada Lovelace')
        await user.click(screen.getByRole('button', { name: 'Log out' }))

        expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })
})
