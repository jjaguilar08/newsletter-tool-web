import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockUser, renderApp } from '../test/utils'

const API_URL = import.meta.env.VITE_API_URL

describe('login', () => {
    it('logs in with valid credentials and redirects to the dashboard', async () => {
        let userRequestCount = 0

        server.use(
            // First call is AuthProvider's initial session check (logged out);
            // every call after a successful login reflects the new session.
            http.get(`${API_URL}/api/user`, () => {
                userRequestCount += 1
                return userRequestCount === 1
                    ? new HttpResponse(null, { status: 401 })
                    : HttpResponse.json(mockUser)
            }),
            http.post(`${API_URL}/api/login`, () => HttpResponse.json(mockUser)),
        )

        renderApp('/login')

        await screen.findByRole('heading', { name: 'Log in' })

        await userEvent.type(screen.getByLabelText('Email'), mockUser.email)
        await userEvent.type(screen.getByLabelText('Password'), 'password')
        await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
        })
        expect(screen.getByText(`Signed in as ${mockUser.name}`)).toBeInTheDocument()
    })

    it('shows an error and stays on the login page for wrong credentials', async () => {
        server.use(
            http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })),
            http.post(`${API_URL}/api/login`, () =>
                HttpResponse.json(
                    {
                        message: 'The provided credentials are incorrect.',
                        errors: { email: ['These credentials do not match our records.'] },
                    },
                    { status: 422 },
                ),
            ),
        )

        renderApp('/login')

        await screen.findByRole('heading', { name: 'Log in' })

        await userEvent.type(screen.getByLabelText('Email'), mockUser.email)
        await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
        await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'These credentials do not match our records.',
        )
        expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })
})
