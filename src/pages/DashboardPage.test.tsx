import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockDashboardStats, mockUser, renderApp } from '../test/utils'
import type { DashboardStats } from '../types/dashboardStats'

const API_URL = import.meta.env.VITE_API_URL

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
    return {
        ...mockDashboardStats,
        ...overrides,
    }
}

function mockLoggedIn() {
    server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
}

describe('DashboardPage', () => {
    it('renders all stat sections from the API response', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/dashboard/stats`, () =>
                HttpResponse.json(
                    makeStats({
                        subscribers: { subscribed: 12, unsubscribed: 3, bounced: 1 },
                        campaigns: { draft: 2, scheduled: 1, sending: 0, sent: 4 },
                        campaign_sends: { sent: 40, failed: 2 },
                    }),
                ),
            ),
        )

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Subscribers' })).toBeInTheDocument()
        const subscribers = screen.getByRole('heading', { name: 'Subscribers' }).closest('section')
        expect(within(subscribers as HTMLElement).getByText('12')).toBeInTheDocument()
        expect(within(subscribers as HTMLElement).getByText('3')).toBeInTheDocument()
        expect(within(subscribers as HTMLElement).getByText('1')).toBeInTheDocument()

        const campaigns = screen.getByRole('heading', { name: 'Campaigns' }).closest('section')
        expect(within(campaigns as HTMLElement).getByText('2')).toBeInTheDocument()
        expect(within(campaigns as HTMLElement).getByText('4')).toBeInTheDocument()

        const sends = screen.getByRole('heading', { name: 'Campaign sends' }).closest('section')
        expect(within(sends as HTMLElement).getByText('40')).toBeInTheDocument()
        expect(within(sends as HTMLElement).getByText('2')).toBeInTheDocument()
    })

    it('shows a loading state while stats are being fetched', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/dashboard/stats`, async () => {
                await new Promise((resolve) => setTimeout(resolve, 50))
                return HttpResponse.json(mockDashboardStats)
            }),
        )

        renderApp('/dashboard')

        expect(await screen.findByText('Loading dashboard…')).toBeInTheDocument()
        await screen.findByRole('heading', { name: 'Subscribers' })
    })

    it('shows an error state with a Retry button when the stats request fails', async () => {
        mockLoggedIn()
        let calls = 0
        server.use(
            http.get(`${API_URL}/api/dashboard/stats`, () => {
                calls += 1
                if (calls === 1) {
                    return HttpResponse.json({ message: 'Server error' }, { status: 500 })
                }
                return HttpResponse.json(mockDashboardStats)
            }),
        )

        const user = userEvent.setup()
        renderApp('/dashboard')

        expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
        await user.click(screen.getByRole('button', { name: 'Retry' }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Subscribers' })).toBeInTheDocument()
        })
        expect(calls).toBe(2)
    })

    it('shows the generic fallback message on a real network failure, not just a 4xx/5xx', async () => {
        mockLoggedIn()
        server.use(http.get(`${API_URL}/api/dashboard/stats`, () => HttpResponse.error()))

        renderApp('/dashboard')

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Something went wrong loading the dashboard.',
        )
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('renders the recent campaigns list with correct status badges', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/dashboard/stats`, () =>
                HttpResponse.json(
                    makeStats({
                        recent_campaigns: [
                            {
                                subject: 'July Newsletter',
                                status: 'sent',
                                sent_at: '2026-02-01T00:00:00+00:00',
                            },
                            { subject: 'August Draft', status: 'draft', sent_at: null },
                        ],
                    }),
                ),
            ),
        )

        renderApp('/dashboard')

        expect(await screen.findByText('July Newsletter')).toBeInTheDocument()
        const sentRow = screen.getByText('July Newsletter').closest('tr')
        expect(within(sentRow as HTMLElement).getByText('Sent')).toBeInTheDocument()

        const draftRow = screen.getByText('August Draft').closest('tr')
        expect(within(draftRow as HTMLElement).getByText('Draft')).toBeInTheDocument()
        expect(within(draftRow as HTMLElement).getByText('—')).toBeInTheDocument()
    })

    it('shows an empty state when there are no recent campaigns', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/dashboard/stats`, () => HttpResponse.json(mockDashboardStats)),
        )

        renderApp('/dashboard')

        expect(await screen.findByText('No campaigns yet.')).toBeInTheDocument()
    })
})
