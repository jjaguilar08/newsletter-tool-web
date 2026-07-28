import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { mockUser } from '../test/utils'
import { fetchCurrentUser } from './session'
import { ApiError } from './apiClient'

const API_URL = import.meta.env.VITE_API_URL

describe('fetchCurrentUser', () => {
    it('resolves the user on a 200', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => HttpResponse.json(mockUser)))

        await expect(fetchCurrentUser()).resolves.toEqual(mockUser)
    })

    it('resolves null for a 401 (no session)', async () => {
        server.use(http.get(`${API_URL}/api/user`, () => new HttpResponse(null, { status: 401 })))

        await expect(fetchCurrentUser()).resolves.toBeNull()
    })

    it('resolves null for a 403 (wrong role)', async () => {
        server.use(
            http.get(`${API_URL}/api/user`, () =>
                HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
            ),
        )

        await expect(fetchCurrentUser()).resolves.toBeNull()
    })

    it('rejects for any other status instead of treating it as logged out', async () => {
        server.use(
            http.get(`${API_URL}/api/user`, () =>
                HttpResponse.json({ message: 'Server error' }, { status: 500 }),
            ),
        )

        await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError)
        await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 500 })
    })
})
