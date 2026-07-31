import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderApp } from '../test/utils'

const API_URL = import.meta.env.VITE_API_URL

function mockLoggedOut() {
    server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))
}

describe('LandingPage', () => {
    it('renders the feature highlights and real-app screenshots grounded in the actual product', async () => {
        mockLoggedOut()
        renderApp('/')

        await screen.findByRole('heading', { name: /newsletters that ship themselves/i })

        expect(screen.getByText('Subscriber management, done right')).toBeInTheDocument()
        expect(screen.getByText('Write it your way')).toBeInTheDocument()
        expect(screen.getByText('Schedule it and move on')).toBeInTheDocument()
        expect(screen.getByText("See what's working")).toBeInTheDocument()

        expect(
            screen.getByAltText('Beacon dashboard showing subscriber and campaign stats'),
        ).toBeInTheDocument()
        expect(
            screen.getByAltText('Beacon campaign list with status badges and actions'),
        ).toBeInTheDocument()
        expect(
            screen.getByAltText('Beacon campaign editor in HTML editor mode with a live preview'),
        ).toBeInTheDocument()
    })

    describe('sample newsletter form', () => {
        it('shows the backend success message after submitting', async () => {
            mockLoggedOut()
            server.use(
                http.post(`${API_URL}/api/marketing/sample-newsletter`, async ({ request }) => {
                    const body = (await request.json()) as { email: string }
                    expect(body.email).toBe('visitor@example.com')
                    return HttpResponse.json({
                        message: 'If that address is valid, a sample newsletter is on its way.',
                    })
                }),
            )

            const user = userEvent.setup()
            renderApp('/')

            await screen.findByRole('heading', { name: /newsletters that ship themselves/i })
            await user.type(screen.getByLabelText('Email address'), 'visitor@example.com')
            await user.click(screen.getByRole('button', { name: 'Send me a sample' }))

            expect(
                await screen.findByText(
                    'If that address is valid, a sample newsletter is on its way.',
                ),
            ).toBeInTheDocument()
        })

        it('surfaces a field validation error for an invalid email', async () => {
            mockLoggedOut()
            server.use(
                http.post(`${API_URL}/api/marketing/sample-newsletter`, () =>
                    HttpResponse.json(
                        {
                            message: 'The email field must be a valid email address.',
                            errors: {
                                email: ['The email field must be a valid email address.'],
                            },
                        },
                        { status: 422 },
                    ),
                ),
            )

            const user = userEvent.setup()
            renderApp('/')

            await screen.findByRole('heading', { name: /newsletters that ship themselves/i })
            await user.type(screen.getByLabelText('Email address'), 'not-an-email')
            await user.click(screen.getByRole('button', { name: 'Send me a sample' }))

            expect(await screen.findByRole('alert')).toHaveTextContent(
                'The email field must be a valid email address.',
            )
        })

        it('shows a friendly message instead of the raw text when rate limited', async () => {
            mockLoggedOut()
            server.use(
                http.post(`${API_URL}/api/marketing/sample-newsletter`, () =>
                    HttpResponse.json({ message: 'Too Many Attempts.' }, { status: 429 }),
                ),
            )

            const user = userEvent.setup()
            renderApp('/')

            await screen.findByRole('heading', { name: /newsletters that ship themselves/i })
            await user.type(screen.getByLabelText('Email address'), 'visitor@example.com')
            await user.click(screen.getByRole('button', { name: 'Send me a sample' }))

            const alert = await screen.findByRole('alert')
            expect(alert).toHaveTextContent(
                "You've requested a few samples already - try again in about an hour.",
            )
            expect(alert).not.toHaveTextContent('Too Many Attempts.')
        })
    })
})
