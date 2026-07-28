import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { apiClient, ApiError } from './apiClient'

const API_URL = import.meta.env.VITE_API_URL

afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('apiClient CSRF handling', () => {
    it('sends the decoded XSRF-TOKEN cookie as X-XSRF-TOKEN on a mutating request', async () => {
        document.cookie = 'XSRF-TOKEN=abc%3Ddef'
        let receivedHeader: string | null = null
        server.use(
            http.post(`${API_URL}/api/widgets`, ({ request }) => {
                receivedHeader = request.headers.get('X-XSRF-TOKEN')
                return HttpResponse.json({ ok: true })
            }),
        )

        await apiClient.post('/api/widgets', { name: 'thing' })

        expect(receivedHeader).toBe('abc=def')
    })

    it('does not send an X-XSRF-TOKEN header on a GET request', async () => {
        document.cookie = 'XSRF-TOKEN=some-token'
        let receivedHeader: string | null | undefined = undefined
        server.use(
            http.get(`${API_URL}/api/widgets`, ({ request }) => {
                receivedHeader = request.headers.get('X-XSRF-TOKEN')
                return HttpResponse.json({ ok: true })
            }),
        )

        await apiClient.get('/api/widgets')

        expect(receivedHeader).toBeNull()
    })

    it('sends no X-XSRF-TOKEN header on a mutating request when there is no cookie yet', async () => {
        let receivedHeader: string | null = 'not-set'
        server.use(
            http.post(`${API_URL}/api/widgets`, ({ request }) => {
                receivedHeader = request.headers.get('X-XSRF-TOKEN')
                return HttpResponse.json({ ok: true })
            }),
        )

        await apiClient.post('/api/widgets')

        expect(receivedHeader).toBeNull()
    })
})

describe('apiClient request bodies', () => {
    it('JSON-encodes a plain object body with a Content-Type: application/json header', async () => {
        let contentType: string | null = null
        let body: unknown = null
        server.use(
            http.post(`${API_URL}/api/widgets`, async ({ request }) => {
                contentType = request.headers.get('Content-Type')
                body = await request.json()
                return HttpResponse.json({ ok: true })
            }),
        )

        await apiClient.post('/api/widgets', { name: 'thing' })

        expect(contentType).toMatch(/^application\/json/)
        expect(body).toEqual({ name: 'thing' })
    })

    it('postForm sends a FormData body without a manually-set Content-Type header', async () => {
        let contentType: string | null = null
        server.use(
            http.post(`${API_URL}/api/widgets/import`, ({ request }) => {
                contentType = request.headers.get('Content-Type')
                return HttpResponse.json({ ok: true })
            }),
        )

        const formData = new FormData()
        formData.set('file', new File(['a,b'], 'data.csv', { type: 'text/csv' }))

        await apiClient.postForm('/api/widgets/import', formData)

        // The browser/undici sets its own multipart boundary - a manually-set
        // header here (without the boundary param) would break parsing, which
        // is exactly what this asserts didn't happen.
        expect(contentType).toMatch(/^multipart\/form-data/)
    })

    it('returns undefined for a 204 response instead of trying to parse a body', async () => {
        server.use(
            http.delete(`${API_URL}/api/widgets/1`, () => new HttpResponse(null, { status: 204 })),
        )

        await expect(apiClient.delete('/api/widgets/1')).resolves.toBeUndefined()
    })
})

describe('ApiError parsing', () => {
    it('captures per-field errors from a 422 response', async () => {
        server.use(
            http.post(`${API_URL}/api/widgets`, () =>
                HttpResponse.json(
                    {
                        message: 'The name field is required.',
                        errors: { name: ['The name field is required.'] },
                    },
                    { status: 422 },
                ),
            ),
        )

        await expect(apiClient.post('/api/widgets', {})).rejects.toMatchObject({
            status: 422,
            message: 'The name field is required.',
            errors: { name: ['The name field is required.'] },
        })
    })

    it('falls back to statusText and leaves errors undefined when the body has no message', async () => {
        server.use(
            http.get(`${API_URL}/api/widgets`, () =>
                HttpResponse.json({}, { status: 500, statusText: 'Internal Server Error' }),
            ),
        )

        const error = await apiClient.get('/api/widgets').catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(500)
        expect((error as ApiError).message).toBe('Internal Server Error')
        expect((error as ApiError).errors).toBeUndefined()
    })

    it('handles a non-JSON error body without throwing while parsing it', async () => {
        server.use(
            http.get(
                `${API_URL}/api/widgets`,
                () =>
                    new HttpResponse('not json', {
                        status: 500,
                        statusText: 'Internal Server Error',
                        headers: { 'Content-Type': 'text/plain' },
                    }),
            ),
        )

        await expect(apiClient.get('/api/widgets')).rejects.toMatchObject({
            status: 500,
            message: 'Internal Server Error',
        })
    })
})
