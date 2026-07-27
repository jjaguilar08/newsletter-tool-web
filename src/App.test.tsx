import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { mockUser, renderApp } from './test/utils'

const API_URL = import.meta.env.VITE_API_URL

describe('routing guards', () => {
    it('redirects a logged-out user away from a protected route to /login', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    })

    it('renders the protected route for a logged-in user', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))

        renderApp('/dashboard')

        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })

    it('redirects an already-authenticated user away from /login', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))

        renderApp('/login')

        expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })
})
