import { forwardRef, useImperativeHandle, type ForwardedRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockUser, renderApp } from '../test/utils'
import type { Campaign } from '../types/campaign'
import type { CampaignSend } from '../types/campaignSend'
import type { Paginated } from '../types/pagination'

interface MockDesignEditorProps {
    initialContent: string
    initialDesign: Record<string, unknown> | null
}

interface MockDesignEditorHandle {
    exportDesign: () => { html: string; json: object } | null
}

// Controlled from within individual tests (reset in beforeEach below) to
// drive CampaignFormModal's Save behavior without a real grapesjs instance.
let mockExportResult: { html: string; json: object } | null = null
let lastEditorProps: MockDesignEditorProps | null = null

// grapesjs does real DOM measurement/layout work jsdom can't support (it
// pegs a test worker's CPU indefinitely) - this page's tests care about the
// campaign CRUD flow, not the design editor's internals, which get their own
// coverage in CampaignContentEditor.test.tsx against a mocked grapesjs.
vi.mock('../components/CampaignContentEditor', () => ({
    CampaignContentEditor: forwardRef(function CampaignContentEditor(
        props: MockDesignEditorProps,
        ref: ForwardedRef<MockDesignEditorHandle>,
    ) {
        lastEditorProps = props
        useImperativeHandle(ref, () => ({
            exportDesign: () => mockExportResult,
        }))
        return <div data-testid="campaign-content-editor-stub" />
    }),
}))

beforeEach(() => {
    mockExportResult = null
    lastEditorProps = null
})

const API_URL = import.meta.env.VITE_API_URL

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
    return {
        id: 1,
        subject: 'July Newsletter',
        content: 'Hello subscribers!',
        body_html: null,
        design_json: null,
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        created_by: 1,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        ...overrides,
    }
}

function makePage<T>(items: T[], metaOverrides: Partial<Paginated<T>['meta']> = {}): Paginated<T> {
    return {
        data: items,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: items.length,
            ...metaOverrides,
        },
    }
}

function makeSend(overrides: Partial<CampaignSend> = {}): CampaignSend {
    return {
        id: 1,
        subscriber_email: 'reader@example.com',
        status: 'sent',
        sent_at: '2026-02-01T00:00:00+00:00',
        error_message: null,
        ...overrides,
    }
}

function mockLoggedIn() {
    server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))
}

// datetime-local inputs take "YYYY-MM-DDTHH:mm" in local time - built from
// getters rather than toISOString() so it isn't accidentally UTC-shifted.
function toDatetimeLocalValue(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

    it('shows the generic fallback message on a real network failure, not just a 4xx/5xx', async () => {
        mockLoggedIn()
        server.use(http.get(`${API_URL}/api/campaigns`, () => HttpResponse.error()))

        renderApp('/campaigns')

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Something went wrong loading campaigns.',
        )
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
                // Untouched design editor (mockExportResult stays null,
                // its default) - body_html/design_json must be omitted
                // entirely, not sent as null, so a plain create can't
                // stamp an empty design onto the campaign.
                expect(body).not.toHaveProperty('body_html')
                expect(body).not.toHaveProperty('design_json')
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
        // New campaigns default into HTML editor mode - switch to Plain
        // text explicitly since this test covers the plain-only save path.
        await user.click(within(dialog).getByRole('tab', { name: 'Plain text' }))
        await user.type(within(dialog).getByLabelText('Subject'), 'New Campaign')
        await user.type(within(dialog).getByLabelText('Content'), 'Some content.')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('New Campaign')).toBeInTheDocument()
    })

    it('sends body_html/design_json alongside subject/content once a design has been built', async () => {
        mockLoggedIn()
        mockExportResult = { html: '<table><tr><td>Hi</td></tr></table>', json: { pages: [] } }
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([]))),
            http.post(`${API_URL}/api/campaigns`, async ({ request }) => {
                const body = (await request.json()) as {
                    subject: string
                    content: string
                    body_html: string
                    design_json: object
                }
                expect(body.body_html).toBe('<table><tr><td>Hi</td></tr></table>')
                expect(body.design_json).toEqual({ pages: [] })
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
        await user.click(within(dialog).getByRole('tab', { name: 'Visual builder' }))
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    it("passes a campaign's saved design into the content editor when editing", async () => {
        mockLoggedIn()
        const savedDesign = { pages: [], styles: [], assets: [], symbols: [] }
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    makePage([
                        makeCampaign({
                            body_html: '<table><tr><td>Existing</td></tr></table>',
                            design_json: savedDesign,
                        }),
                    ]),
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Edit' }))

        await screen.findByRole('dialog', { name: 'Edit campaign' })
        expect(lastEditorProps?.initialDesign).toEqual(savedDesign)
        expect(lastEditorProps?.initialContent).toBe('Hello subscribers!')
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

describe('CampaignListPage - HTML editor', () => {
    it('opens a new campaign directly into HTML editor mode, prefilled from the default template', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([]))),
            http.get(`${API_URL}/api/campaigns/default-template`, () =>
                HttpResponse.json({ html: '<p>Default template</p>' }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('No campaigns yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add campaign' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add campaign' })
        expect(within(dialog).getByRole('tab', { name: 'HTML editor' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        expect(within(dialog).getByRole('tab', { name: 'Plain text' })).toHaveAttribute(
            'aria-selected',
            'false',
        )
        expect(within(dialog).getByRole('tab', { name: 'Visual builder' })).toHaveAttribute(
            'aria-selected',
            'false',
        )

        const htmlField = await within(dialog).findByLabelText<HTMLTextAreaElement>('HTML')
        await waitFor(() => {
            expect(htmlField.value).toBe('<p>Default template</p>')
        })
    })

    it('prefills from the default template on first use, and round-trips edited HTML with design_json cleared', async () => {
        mockLoggedIn()
        let saved: Campaign | null = null
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage(saved ? [saved] : [])),
            ),
            http.get(`${API_URL}/api/campaigns/default-template`, () =>
                HttpResponse.json({ html: '<p>Default template</p>' }),
            ),
            http.post(`${API_URL}/api/campaigns`, async ({ request }) => {
                const body = (await request.json()) as {
                    subject: string
                    content: string
                    body_html: string
                    design_json: unknown
                }
                expect(body.body_html).toBe('<p>Edited by hand</p>')
                expect(body.design_json).toBeNull()
                saved = makeCampaign({
                    id: 2,
                    subject: body.subject,
                    content: body.content,
                    body_html: body.body_html,
                    design_json: null,
                })
                return HttpResponse.json({ data: saved }, { status: 201 })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('No campaigns yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add campaign' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add campaign' })
        await user.type(within(dialog).getByLabelText('Subject'), 'New Campaign')
        await user.type(within(dialog).getByLabelText('Content'), 'Some content.')
        await user.click(within(dialog).getByRole('tab', { name: 'HTML editor' }))

        const htmlField = await within(dialog).findByLabelText<HTMLTextAreaElement>('HTML')
        await waitFor(() => {
            expect(htmlField.value).toBe('<p>Default template</p>')
        })

        await user.clear(htmlField)
        await user.type(htmlField, '<p>Edited by hand</p>')
        await user.click(within(dialog).getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(await screen.findByText('New Campaign')).toBeInTheDocument()

        // Reopen for editing - loads back into HTML editor mode (not Plain
        // text or Visual builder) with the edited content intact.
        await user.click(screen.getByRole('button', { name: 'Edit' }))
        const editDialog = await screen.findByRole('dialog', { name: 'Edit campaign' })
        expect(within(editDialog).getByRole('tab', { name: 'HTML editor' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        expect(within(editDialog).getByRole('tab', { name: 'Plain text' })).toHaveAttribute(
            'aria-selected',
            'false',
        )
        expect(within(editDialog).getByRole('tab', { name: 'Visual builder' })).toHaveAttribute(
            'aria-selected',
            'false',
        )
        expect(within(editDialog).getByLabelText<HTMLTextAreaElement>('HTML').value).toBe(
            '<p>Edited by hand</p>',
        )

        // ...and the preview iframe renders the loaded HTML correctly.
        const previewIframe =
            within(editDialog).getByTitle<HTMLIFrameElement>('HTML editor preview')
        await waitFor(() => {
            expect(previewIframe.srcdoc).toBe('<p>Edited by hand</p>')
        })
        expect(previewIframe.getAttribute('sandbox')).toBe('')
    })

    it('debounces the live preview as the admin types', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([]))),
            http.get(`${API_URL}/api/campaigns/default-template`, () =>
                HttpResponse.json({ html: '' }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('No campaigns yet. Add one to get started.')
        await user.click(screen.getByRole('button', { name: 'Add campaign' }))

        const dialog = await screen.findByRole('dialog', { name: 'Add campaign' })
        await user.click(within(dialog).getByRole('tab', { name: 'HTML editor' }))

        const htmlField = await within(dialog).findByLabelText<HTMLTextAreaElement>('HTML')
        await user.type(htmlField, '<p>Hi <strong>there</strong></p>')

        const iframe = within(dialog).getByTitle<HTMLIFrameElement>('HTML editor preview')
        expect(iframe.getAttribute('sandbox')).toBe('')

        await waitFor(
            () => {
                expect(iframe.srcdoc).toBe('<p>Hi <strong>there</strong></p>')
            },
            { timeout: 2000 },
        )
    })

    it('opens an existing HTML-editor campaign in HTML editor mode without refetching the default template', async () => {
        mockLoggedIn()
        let templateRequests = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    makePage([
                        makeCampaign({ body_html: '<p>Existing HTML</p>', design_json: null }),
                    ]),
                ),
            ),
            http.get(`${API_URL}/api/campaigns/default-template`, () => {
                templateRequests += 1
                return HttpResponse.json({ html: '<p>Default template</p>' })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Edit' }))

        const dialog = await screen.findByRole('dialog', { name: 'Edit campaign' })
        expect(within(dialog).getByRole('tab', { name: 'HTML editor' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        expect(within(dialog).getByLabelText<HTMLTextAreaElement>('HTML').value).toBe(
            '<p>Existing HTML</p>',
        )
        expect(templateRequests).toBe(0)
    })

    it('replaces the HTML with the default template only after confirming Reset', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    makePage([
                        makeCampaign({ body_html: '<p>Existing HTML</p>', design_json: null }),
                    ]),
                ),
            ),
            http.get(`${API_URL}/api/campaigns/default-template`, () =>
                HttpResponse.json({ html: '<p>Default template</p>' }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Edit' }))

        const dialog = await screen.findByRole('dialog', { name: 'Edit campaign' })
        await user.click(within(dialog).getByRole('button', { name: 'Reset to default template' }))

        const confirmDialog = await screen.findByRole('dialog', {
            name: 'Reset to default template',
        })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Cancel' }))
        expect(within(dialog).getByLabelText<HTMLTextAreaElement>('HTML').value).toBe(
            '<p>Existing HTML</p>',
        )

        await user.click(within(dialog).getByRole('button', { name: 'Reset to default template' }))
        const confirmDialogAgain = await screen.findByRole('dialog', {
            name: 'Reset to default template',
        })
        await user.click(within(confirmDialogAgain).getByRole('button', { name: 'Reset' }))

        await waitFor(() => {
            expect(within(dialog).getByLabelText<HTMLTextAreaElement>('HTML').value).toBe(
                '<p>Default template</p>',
            )
        })
    })
})

describe('CampaignListPage - preview', () => {
    it('renders the returned html in a sandboxed iframe with no script execution allowed', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([makeCampaign()])),
            ),
            http.get(`${API_URL}/api/campaigns/1/preview`, () =>
                HttpResponse.json({
                    subject: 'July Newsletter',
                    html: '<p>Hello <strong>world</strong></p>',
                }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Preview' }))

        const dialog = await screen.findByRole('dialog', { name: 'Preview campaign' })
        const iframe = await within(dialog).findByTitle<HTMLIFrameElement>('Campaign preview')
        expect(iframe.srcdoc).toBe('<p>Hello <strong>world</strong></p>')
        expect(iframe.getAttribute('sandbox')).toBe('')
    })

    it('shows an error when the preview request fails', async () => {
        mockLoggedIn()
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([makeCampaign()])),
            ),
            http.get(`${API_URL}/api/campaigns/1/preview`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Preview' }))

        const dialog = await screen.findByRole('dialog', { name: 'Preview campaign' })
        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Server error')
    })
})

describe('CampaignListPage - send now', () => {
    it('requires confirmation, then sends and reflects the new status', async () => {
        mockLoggedIn()
        let sent = false
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([makeCampaign({ status: sent ? 'sending' : 'draft' })])),
            ),
            http.post(`${API_URL}/api/campaigns/1/send`, () => {
                sent = true
                return HttpResponse.json({
                    message: 'Campaign send started.',
                    data: makeCampaign({ status: 'sending' }),
                })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Send Now' }))

        const dialog = await screen.findByRole('dialog', { name: 'Send campaign' })
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(sent).toBe(false)

        await user.click(screen.getByRole('button', { name: 'Send Now' }))
        const confirmDialog = await screen.findByRole('dialog', { name: 'Send campaign' })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Send Now' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        const row = await screen.findByText('July Newsletter').then((el) => el.closest('tr'))
        expect(within(row as HTMLElement).getByText('Sending')).toBeInTheDocument()
    })

    it('surfaces the backend 409 message when the campaign already started sending', async () => {
        mockLoggedIn()
        let getCalls = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => {
                getCalls += 1
                return HttpResponse.json(
                    makePage([makeCampaign({ status: getCalls > 1 ? 'sending' : 'draft' })]),
                )
            }),
            http.post(`${API_URL}/api/campaigns/1/send`, () =>
                HttpResponse.json(
                    { message: 'Only a draft campaign can be sent.' },
                    { status: 409 },
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Send Now' }))

        const dialog = await screen.findByRole('dialog', { name: 'Send campaign' })
        await user.click(within(dialog).getByRole('button', { name: 'Send Now' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'Only a draft campaign can be sent.',
        )

        // The list is refreshed in the background so the stale "Draft"
        // status doesn't linger once we know it's wrong.
        await waitFor(() => {
            expect(getCalls).toBeGreaterThan(1)
        })
    })
})

describe('CampaignListPage - schedule', () => {
    it('rejects a past date client-side without hitting the network', async () => {
        mockLoggedIn()
        let scheduleCalls = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([makeCampaign()])),
            ),
            http.post(`${API_URL}/api/campaigns/1/schedule`, () => {
                scheduleCalls += 1
                return HttpResponse.json({ message: 'Campaign scheduled.', data: makeCampaign() })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Schedule' }))

        const dialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        fireEvent.change(within(dialog).getByLabelText('Send at'), {
            target: { value: '2020-01-01T00:00' },
        })
        await user.click(within(dialog).getByRole('button', { name: 'Continue' }))

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'Scheduled time must be in the future.',
        )
        expect(scheduleCalls).toBe(0)
    })

    it('cancelling the confirm stage returns to the form without submitting', async () => {
        mockLoggedIn()
        let scheduleCalls = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(makePage([makeCampaign()])),
            ),
            http.post(`${API_URL}/api/campaigns/1/schedule`, () => {
                scheduleCalls += 1
                return HttpResponse.json({ message: 'Campaign scheduled.', data: makeCampaign() })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Schedule' }))

        const dialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        const futureDate = toDatetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
        fireEvent.change(within(dialog).getByLabelText('Send at'), {
            target: { value: futureDate },
        })
        await user.click(within(dialog).getByRole('button', { name: 'Continue' }))

        const confirmDialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Cancel' }))

        // Back on the form stage (not closed entirely), with the chosen date
        // still there and nothing sent to the backend.
        const formDialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        expect(within(formDialog).getByLabelText('Send at')).toHaveValue(futureDate)
        expect(within(formDialog).getByRole('button', { name: 'Continue' })).toBeInTheDocument()
        expect(scheduleCalls).toBe(0)
    })

    it('confirms before submitting, then schedules and reflects the new status', async () => {
        mockLoggedIn()
        let scheduled = false
        let requestedScheduledAt: string | null = null
        server.use(
            http.get(`${API_URL}/api/campaigns`, () =>
                HttpResponse.json(
                    makePage([makeCampaign({ status: scheduled ? 'scheduled' : 'draft' })]),
                ),
            ),
            http.post(`${API_URL}/api/campaigns/1/schedule`, async ({ request }) => {
                const body = (await request.json()) as { scheduled_at: string }
                requestedScheduledAt = body.scheduled_at
                scheduled = true
                return HttpResponse.json({
                    message: 'Campaign scheduled.',
                    data: makeCampaign({ status: 'scheduled', scheduled_at: body.scheduled_at }),
                })
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'Schedule' }))

        const dialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        const futureDate = toDatetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
        fireEvent.change(within(dialog).getByLabelText('Send at'), {
            target: { value: futureDate },
        })
        await user.click(within(dialog).getByRole('button', { name: 'Continue' }))

        const confirmDialog = await screen.findByRole('dialog', { name: 'Schedule campaign' })
        await user.click(within(confirmDialog).getByRole('button', { name: 'Schedule' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
        expect(requestedScheduledAt).not.toBeNull()
        const row = await screen.findByText('July Newsletter').then((el) => el.closest('tr'))
        expect(within(row as HTMLElement).getByText('Scheduled')).toBeInTheDocument()
    })
})

describe('CampaignListPage - send log', () => {
    it('renders the send log and paginates it', async () => {
        mockLoggedIn()
        const sentCampaign = makeCampaign({ status: 'sent', sent_at: '2026-02-01T00:00:00+00:00' })
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([sentCampaign]))),
            http.get(`${API_URL}/api/campaigns/1/sends`, ({ request }) => {
                const page = new URL(request.url).searchParams.get('page') ?? '1'
                const send =
                    page === '2'
                        ? makeSend({ id: 2, subscriber_email: 'page2@example.com' })
                        : makeSend({ id: 1, subscriber_email: 'page1@example.com' })
                return HttpResponse.json(
                    makePage([send], { current_page: Number(page), last_page: 2, total: 2 }),
                )
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'View' }))

        const dialog = await screen.findByRole('dialog', { name: 'View campaign' })
        expect(await within(dialog).findByText('page1@example.com')).toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: 'Previous' })).toBeDisabled()

        await user.click(within(dialog).getByRole('button', { name: 'Next' }))

        expect(await within(dialog).findByText('page2@example.com')).toBeInTheDocument()
        expect(within(dialog).getByText('Page 2 of 2 (2 total)')).toBeInTheDocument()
    })

    it('shows the failure reason for a failed send', async () => {
        mockLoggedIn()
        const sentCampaign = makeCampaign({ status: 'sent', sent_at: '2026-02-01T00:00:00+00:00' })
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([sentCampaign]))),
            http.get(`${API_URL}/api/campaigns/1/sends`, () =>
                HttpResponse.json(
                    makePage([
                        makeSend({
                            status: 'failed',
                            sent_at: null,
                            error_message: 'Mailbox does not exist.',
                        }),
                    ]),
                ),
            ),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'View' }))

        const dialog = await screen.findByRole('dialog', { name: 'View campaign' })
        expect(await within(dialog).findByText('Mailbox does not exist.')).toBeInTheDocument()
    })

    it('shows an error when the send log request fails, and Retry recovers', async () => {
        mockLoggedIn()
        const sentCampaign = makeCampaign({ status: 'sent', sent_at: '2026-02-01T00:00:00+00:00' })
        let calls = 0
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([sentCampaign]))),
            http.get(`${API_URL}/api/campaigns/1/sends`, () => {
                calls += 1
                if (calls === 1) {
                    return HttpResponse.json({ message: 'Server error' }, { status: 500 })
                }
                return HttpResponse.json(makePage([makeSend()]))
            }),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'View' }))

        const dialog = await screen.findByRole('dialog', { name: 'View campaign' })
        expect(await within(dialog).findByRole('alert')).toHaveTextContent('Server error')

        await user.click(within(dialog).getByRole('button', { name: 'Retry' }))

        expect(await within(dialog).findByText('reader@example.com')).toBeInTheDocument()
        expect(calls).toBe(2)
    })

    it('shows an empty state when a campaign has no sends yet', async () => {
        mockLoggedIn()
        const sentCampaign = makeCampaign({ status: 'sent', sent_at: '2026-02-01T00:00:00+00:00' })
        server.use(
            http.get(`${API_URL}/api/campaigns`, () => HttpResponse.json(makePage([sentCampaign]))),
            http.get(`${API_URL}/api/campaigns/1/sends`, () => HttpResponse.json(makePage([]))),
        )

        const user = userEvent.setup()
        renderApp('/campaigns')

        await screen.findByText('July Newsletter')
        await user.click(screen.getByRole('button', { name: 'View' }))

        const dialog = await screen.findByRole('dialog', { name: 'View campaign' })
        expect(await within(dialog).findByText('No sends yet.')).toBeInTheDocument()
    })
})
