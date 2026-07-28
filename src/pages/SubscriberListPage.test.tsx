import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockUser, renderApp } from '../test/utils'
import type { Subscriber } from '../types/subscriber'
import type { Paginated } from '../types/pagination'

const API_URL = import.meta.env.VITE_API_URL

function makeSubscriber(overrides: Partial<Subscriber> = {}): Subscriber {
    return {
        id: 1,
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        status: 'subscribed',
        subscribed_at: '2026-01-01T00:00:00+00:00',
        unsubscribed_at: null,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        ...overrides,
    }
}

function makePage(
    subscribers: Subscriber[],
    metaOverrides: Partial<Paginated<Subscriber>['meta']> = {},
): Paginated<Subscriber> {
    return {
        data: subscribers,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: subscribers.length,
            ...metaOverrides,
        },
    }
}

function mockLoggedIn() {
    server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
}

describe('SubscriberListPage', () => {
    it('renders the subscriber list from the API', async () => {
        mockLoggedIn()
        const subscriber = makeSubscriber()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([subscriber]))),
        )

        renderApp('/subscribers')

        expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
        const row = screen.getByText('ada@example.com').closest('tr')
        expect(row).not.toBeNull()
        expect(within(row as HTMLElement).getByText('subscribed')).toBeInTheDocument()
    })

    it('shows an empty state when there are no subscribers', async () => {
        mockLoggedIn()
        server.use(http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([]))))

        renderApp('/subscribers')

        expect(
            await screen.findByText('No subscribers yet. Add one to get started.'),
        ).toBeInTheDocument()
    })

    it('shows an error state when the list request fails', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        renderApp('/subscribers')

        expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('shows the generic fallback message on a real network failure, not just a 4xx/5xx', async () => {
        mockLoggedIn()
        server.use(http.get(`${API_URL}/api/subscribers`, () => HttpResponse.error()))

        renderApp('/subscribers')

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Something went wrong loading subscribers.',
        )
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('caps the search input at 255 characters and omits Retry for a 422 load error', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json(
                    {
                        message: 'The search field must not be greater than 255 characters.',
                        errors: {
                            search: ['The search field must not be greater than 255 characters.'],
                        },
                    },
                    { status: 422 },
                ),
            ),
        )

        renderApp('/subscribers')

        expect(await screen.findByLabelText('Search')).toHaveAttribute('maxLength', '255')

        const user = userEvent.setup()
        await user.type(screen.getByLabelText('Search'), 'x')

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'The search field must not be greater than 255 characters.',
        )
        expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    })

    it('sends the search input as a debounced ?search= param', async () => {
        mockLoggedIn()
        const requestedSearches: (string | null)[] = []
        server.use(
            http.get(`${API_URL}/api/subscribers`, ({ request }) => {
                requestedSearches.push(new URL(request.url).searchParams.get('search'))
                return HttpResponse.json(makePage([makeSubscriber()]))
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('ada@example.com')
        await user.type(screen.getByLabelText('Search'), 'ada')

        await waitFor(
            () => {
                expect(requestedSearches).toContain('ada')
            },
            { timeout: 2000 },
        )
    })

    it('sends the status filter as a ?status= param', async () => {
        mockLoggedIn()
        const requestedStatuses: (string | null)[] = []
        server.use(
            http.get(`${API_URL}/api/subscribers`, ({ request }) => {
                requestedStatuses.push(new URL(request.url).searchParams.get('status'))
                return HttpResponse.json(makePage([makeSubscriber()]))
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('ada@example.com')
        await user.selectOptions(screen.getByLabelText('Status'), 'unsubscribed')

        await waitFor(() => {
            expect(requestedStatuses).toContain('unsubscribed')
        })
    })

    it('creates a subscriber and shows it in the list', async () => {
        mockLoggedIn()
        let created = false
        server.use(
            http.get(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json(
                    created
                        ? makePage([makeSubscriber({ id: 2, email: 'new@example.com' })])
                        : makePage([]),
                ),
            ),
            http.post(`${API_URL}/api/subscribers`, async ({ request }) => {
                created = true
                const body = (await request.json()) as { email: string }
                return HttpResponse.json(
                    { data: makeSubscriber({ id: 2, email: body.email }) },
                    { status: 201 },
                )
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add subscriber' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add subscriber' })
        await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('new@example.com')).toBeInTheDocument()
    })

    it('surfaces a validation error inline when creating with a duplicate email', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json(
                    {
                        message: 'The email has already been taken.',
                        errors: { email: ['The email has already been taken.'] },
                    },
                    { status: 422 },
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add subscriber' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add subscriber' })
        await user.type(within(dialog).getByLabelText('Email'), 'taken@example.com')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'The email has already been taken.',
        )
        expect(screen.getByRole('dialog', { name: 'Add subscriber' })).toBeInTheDocument()
    })

    it('edits an existing subscriber', async () => {
        mockLoggedIn()
        const original = makeSubscriber()
        let currentName = original.name
        server.use(
            http.get(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json(makePage([{ ...original, name: currentName }])),
            ),
            http.put(`${API_URL}/api/subscribers/1`, async ({ request }) => {
                const body = (await request.json()) as { name: string | null }
                currentName = body.name
                return HttpResponse.json({ data: { ...original, name: currentName } })
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('ada@example.com')
        await user.click(screen.getByRole('button', { name: 'Edit' }))

        const dialog = await screen.findByRole('dialog', { name: 'Edit subscriber' })
        const nameInput = within(dialog).getByLabelText('Name')
        await user.clear(nameInput)
        await user.type(nameInput, 'Ada Byron')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('Ada Byron')).toBeInTheDocument()
    })

    it('requires confirmation before deleting a subscriber', async () => {
        mockLoggedIn()
        let deleteCalls = 0
        server.use(
            http.get(`${API_URL}/api/subscribers`, () =>
                HttpResponse.json(deleteCalls > 0 ? makePage([]) : makePage([makeSubscriber()])),
            ),
            http.delete(`${API_URL}/api/subscribers/1`, () => {
                deleteCalls += 1
                return new HttpResponse(null, { status: 204 })
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('ada@example.com')
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        const dialog = await screen.findByRole('dialog', { name: 'Delete subscriber' })
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(deleteCalls).toBe(0)
        expect(screen.getByText('ada@example.com')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Delete' }))
        const confirmDialog = await screen.findByRole('dialog', { name: 'Delete subscriber' })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

        await waitFor(() => {
            expect(deleteCalls).toBe(1)
        })
        expect(
            await screen.findByText('No subscribers yet. Add one to get started.'),
        ).toBeInTheDocument()
    })

    it('navigates between pages using the pagination controls', async () => {
        mockLoggedIn()
        const requestedPages: (string | null)[] = []
        server.use(
            http.get(`${API_URL}/api/subscribers`, ({ request }) => {
                const page = new URL(request.url).searchParams.get('page') ?? '1'
                requestedPages.push(page)
                const subscriber =
                    page === '2'
                        ? makeSubscriber({ id: 2, email: 'page2@example.com' })
                        : makeSubscriber({ id: 1, email: 'page1@example.com' })
                return HttpResponse.json(
                    makePage([subscriber], {
                        current_page: Number(page),
                        last_page: 2,
                        total: 2,
                    }),
                )
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('page1@example.com')
        expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Next' }))

        await screen.findByText('page2@example.com')
        expect(screen.getByText('Page 2 of 2 (2 total)')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Previous' }))
        await screen.findByText('page1@example.com')

        expect(requestedPages).toEqual(['1', '2', '1'])
    })

    it('returns to the previous page after deleting the last row on it', async () => {
        mockLoggedIn()
        let page2Subscribers = [makeSubscriber({ id: 2, email: 'page2@example.com' })]
        server.use(
            http.get(`${API_URL}/api/subscribers`, ({ request }) => {
                const page = new URL(request.url).searchParams.get('page') ?? '1'
                const lastPage = page2Subscribers.length > 0 ? 2 : 1
                const total = 1 + page2Subscribers.length

                if (page === '2') {
                    return HttpResponse.json(
                        makePage(page2Subscribers, { current_page: 2, last_page: lastPage, total }),
                    )
                }

                return HttpResponse.json(
                    makePage([makeSubscriber({ id: 1, email: 'page1@example.com' })], {
                        current_page: 1,
                        last_page: lastPage,
                        total,
                    }),
                )
            }),
            http.delete(`${API_URL}/api/subscribers/2`, () => {
                page2Subscribers = []
                return new HttpResponse(null, { status: 204 })
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('page1@example.com')
        await user.click(screen.getByRole('button', { name: 'Next' }))
        await screen.findByText('page2@example.com')

        await user.click(screen.getByRole('button', { name: 'Delete' }))
        const dialog = await screen.findByRole('dialog', { name: 'Delete subscriber' })
        await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

        expect(await screen.findByText('page1@example.com')).toBeInTheDocument()
        expect(screen.getByText('Page 1 of 1 (1 total)')).toBeInTheDocument()
    })
})

describe('SubscriberListPage - CSV import', () => {
    it('imports subscribers, shows the result counts, and refreshes the list', async () => {
        mockLoggedIn()
        let listCalls = 0
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => {
                listCalls += 1
                return HttpResponse.json(
                    listCalls > 1
                        ? makePage([makeSubscriber({ id: 2, email: 'new@example.com' })])
                        : makePage([]),
                )
            }),
            http.post(`${API_URL}/api/subscribers/import`, ({ request }) => {
                // Confirms apiClient.postForm() actually sent a multipart
                // body (not a JSON.stringify'd File, the exact risk flagged
                // for this task) without reading the body itself - jsdom's
                // File/Blob aren't recognized by undici's real multipart
                // parser/serializer (a cross-realm gap between jsdom and
                // Node's fetch), so inspecting body content here is unreliable
                // in this test environment regardless of what the app sends.
                expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data/)
                return HttpResponse.json({ created: 1, updated: 0, skipped: 0, skipped_rows: [] })
            }),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Import CSV' }))

        const dialog = await screen.findByRole('dialog', { name: 'Import subscribers' })
        const file = new File(['email,name\nnew@example.com,New\n'], 'subscribers.csv', {
            type: 'text/csv',
        })
        await user.upload(within(dialog).getByLabelText('CSV file'), file)
        await user.click(within(dialog).getByRole('button', { name: 'Import' }))

        expect(
            await within(dialog).findByText('Created 1, updated 0, skipped 0.'),
        ).toBeInTheDocument()
        expect(await screen.findByText('new@example.com')).toBeInTheDocument()
    })

    it('shows skipped row reasons for a CSV with invalid rows', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/subscribers/import`, () =>
                HttpResponse.json({
                    created: 1,
                    updated: 0,
                    skipped: 1,
                    skipped_rows: [{ row: 3, reason: 'Invalid email format.' }],
                }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Import CSV' }))

        const dialog = await screen.findByRole('dialog', { name: 'Import subscribers' })
        const file = new File(['email\nok@example.com\nnot-an-email\n'], 'subscribers.csv', {
            type: 'text/csv',
        })
        await user.upload(within(dialog).getByLabelText('CSV file'), file)
        await user.click(within(dialog).getByRole('button', { name: 'Import' }))

        expect(
            await within(dialog).findByText('Created 1, updated 0, skipped 1.'),
        ).toBeInTheDocument()
        expect(within(dialog).getByText('3')).toBeInTheDocument()
        expect(within(dialog).getByText('Invalid email format.')).toBeInTheDocument()
    })

    it('surfaces a validation error when the file is rejected as non-CSV', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/subscribers/import`, () =>
                HttpResponse.json(
                    {
                        message: 'The file field must be a file of type: csv, txt.',
                        errors: { file: ['The file field must be a file of type: csv, txt.'] },
                    },
                    { status: 422 },
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Import CSV' }))

        const dialog = await screen.findByRole('dialog', { name: 'Import subscribers' })
        // Named .csv (matching the input's accept filter, so userEvent's
        // simulated OS file picker actually lets it through) but with
        // non-CSV content/MIME type - the backend's real mimes:csv,txt
        // sniffing catches what the extension alone can't, and this is the
        // case the frontend needs to surface, not a same-realm reject.
        const file = new File(['not a csv'], 'subscribers.csv', { type: 'application/pdf' })
        await user.upload(within(dialog).getByLabelText('CSV file'), file)
        await user.click(within(dialog).getByRole('button', { name: 'Import' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'The file field must be a file of type: csv, txt.',
        )
        expect(screen.getByRole('dialog', { name: 'Import subscribers' })).toBeInTheDocument()
    })

    it('surfaces a generic error when the import request fails', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/subscribers`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/subscribers/import`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/subscribers')

        await screen.findByText('No subscribers yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Import CSV' }))

        const dialog = await screen.findByRole('dialog', { name: 'Import subscribers' })
        const file = new File(['email\nok@example.com\n'], 'subscribers.csv', {
            type: 'text/csv',
        })
        await user.upload(within(dialog).getByLabelText('CSV file'), file)
        await user.click(within(dialog).getByRole('button', { name: 'Import' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Server error')
        expect(screen.getByRole('dialog', { name: 'Import subscribers' })).toBeInTheDocument()
    })
})
