import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockUser, renderApp } from '../test/utils'
import type { Campaign } from '../types/campaign'
import type { Paginated } from '../types/pagination'

const API_URL = import.meta.env.VITE_API_URL

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
    return {
        id: 1,
        subject: 'July Newsletter',
        content: 'Hello subscribers!',
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        created_by: 1,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        ...overrides,
    }
}

function makePage(
    campaigns: Campaign[],
    metaOverrides: Partial<Paginated<Campaign>['meta']> = {},
): Paginated<Campaign> {
    return {
        data: campaigns,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: campaigns.length,
            ...metaOverrides,
        },
    }
}

function mockLoggedIn() {
    server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
}

describe('CampaignListPage', () => {
    it('renders the campaign list with a status badge', async () => {
        mockLoggedIn()
        const campaign = makeCampaign({ status: 'sent', sent_at: '2026-02-01T00:00:00+00:00' })
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([campaign]))),
        )

        renderApp('/campaigns')

        expect(await screen.findByText('July Newsletter')).toBeInTheDocument()
        const row = screen.getByText('July Newsletter').closest('tr')
        expect(row).not.toBeNull()
        expect(within(row as HTMLElement).getByText('Sent')).toBeInTheDocument()
    })

    it('shows an empty state when there are no campaigns', async () => {
        mockLoggedIn()
        server.use(http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([]))))

        renderApp('/campaigns')

        expect(
            await screen.findByText('No campaigns yet. Add one to get started.'),
        ).toBeInTheDocument()
    })

    it('shows an error state when the list request fails', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        renderApp('/campaigns')

        expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('sends the status filter as a ?status= param', async () => {
        mockLoggedIn()
        const requestedStatuses: (string | null)[] = []
        server.use(
            http.get(`${API_URL}/api/campaigns`, ({ request }) => {
                requestedStatuses.push(new URL(request.url).searchParams.get('status'))
                return HttpResponse.json(makePage([makeCampaign()]))
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.selectOptions(screen.getByLabelText('Status'), 'sent')

        await waitFor(() => {
            expect(requestedStatuses).toContain('sent')
        })
    })

    it('creates a campaign as a draft and shows it in the list', async () => {
        mockLoggedIn()
        let created = false
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    created
                        ? makePage([makeCampaign({ id: 2, subject: 'New Campaign' })])
                        : makePage([]),
                ),
            ),
            http.post(`${API_URL}/api/campaigns`, async ({ request }) => {
                created = true
                const body = (await request.json()) as { subject: string; content: string }
                expect(body).not.toHaveProperty('status')
                return HttpResponse.json(
                    { data: makeCampaign({ id: 2, subject: body.subject, content: body.content }) },
                    { status: 201 },
                )
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('No campaigns yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add campaign' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add campaign' })
        await user.type(within(dialog).getByLabelText('Subject'), 'New Campaign')
        await user.type(within(dialog).getByLabelText('Content'), 'Some content.')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('New Campaign')).toBeInTheDocument()
    })

    it('surfaces a validation error inline when creating with a blank subject', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    {
                        message: 'The subject field is required.',
                        errors: { subject: ['The subject field is required.'] },
                    },
                    { status: 422 },
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('No campaigns yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add campaign' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add campaign' })
        await user.type(within(dialog).getByLabelText('Content'), 'Some content.')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'The subject field is required.',
        )
        expect(screen.getByRole('dialog', { name: 'Add campaign' })).toBeInTheDocument()
    })

    it('edits a draft campaign', async () => {
        mockLoggedIn()
        const original = makeCampaign()
        let currentSubject = original.subject
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([{ ...original, subject: currentSubject }])),
            ),
            http.put(`${API_URL}/api/campaigns/1`, async ({ request }) => {
                const body = (await request.json()) as { subject: string }
                currentSubject = body.subject
                return HttpResponse.json({ data: { ...original, subject: currentSubject } })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Edit' }))

        const dialog = await screen.findByRole('dialog', { name: 'Edit campaign' })
        const subjectInput = within(dialog).getByLabelText('Subject')
        await user.clear(subjectInput)
        await user.type(subjectInput, 'Updated Subject')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('Updated Subject')).toBeInTheDocument()
    })

    it('does not show an edit button for a sent campaign, and shows read-only content instead', async () => {
        mockLoggedIn()
        const campaign = makeCampaign({
            status: 'sent',
            sent_at: '2026-02-01T00:00:00+00:00',
            content: 'Final sent content.',
        })
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([campaign]))),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'View' }))

        const dialog = await screen.findByRole('dialog', { name: 'View campaign' })
        expect(within(dialog).getByText('Final sent content.')).toBeInTheDocument()
        expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('requires confirmation before deleting a campaign', async () => {
        mockLoggedIn()
        let deleteCalls = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(deleteCalls > 0 ? makePage([]) : makePage([makeCampaign()])),
            ),
            http.delete(`${API_URL}/api/campaigns/1`, () => {
                deleteCalls += 1
                return new HttpResponse(null, { status: 204 })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        const dialog = await screen.findByRole('dialog', { name: 'Delete campaign' })
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(deleteCalls).toBe(0)
        expect(screen.getByText('July Newsletter')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Delete' }))
        const confirmDialog = await screen.findByRole('dialog', { name: 'Delete campaign' })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

        await waitFor(() => {
            expect(deleteCalls).toBe(1)
        })
        expect(
            await screen.findByText('No campaigns yet. Add one to get started.'),
        ).toBeInTheDocument()
    })

    it('navigates between pages using the pagination controls', async () => {
        mockLoggedIn()
        const requestedPages: (string | null)[] = []
        server.use(
            http.get(`${API_URL}/api/campaigns`, ({ request }) => {
                const page = new URL(request.url).searchParams.get('page') ?? '1'
                requestedPages.push(page)
                const campaign =
                    page === '2'
                        ? makeCampaign({ id: 2, subject: 'Page 2 Campaign' })
                        : makeCampaign({ id: 1, subject: 'Page 1 Campaign' })
                return HttpResponse.json(
                    makePage([campaign], {
                        current_page: Number(page),
                        last_page: 2,
                        total: 2,
                    }),
                )
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('Page 1 Campaign')
        expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Next' }))

        await screen.findByText('Page 2 Campaign')
        expect(screen.getByText('Page 2 of 2 (2 total)')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Previous' }))
        await screen.findByText('Page 1 Campaign')

        expect(requestedPages).toEqual(['1', '2', '1'])
    })
})
