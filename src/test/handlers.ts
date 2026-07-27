import { http, HttpResponse } from 'msw'

const API_URL = import.meta.env.VITE_API_URL

// jsdom's fetch doesn't populate document.cookie from a mocked response's
// Set-Cookie header the way a real browser would, so this handler sets the
// cookie directly - it runs in the same jsdom global scope as the test.
// That's the one thing every test in this suite needs by default; anything
// login/user/logout-specific is layered on per test via server.use().
export const handlers = [
    http.get(`${API_URL}/sanctum/csrf-cookie`, () => {
        document.cookie = 'XSRF-TOKEN=test-xsrf-token'
        return new HttpResponse(null, { status: 204 })
    }),
]
