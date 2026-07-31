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
    // CampaignFormModal now opens every new campaign straight into HTML
    // editor mode, which fetches this on mount - so any test that opens
    // "Add campaign" hits it, not just tests about the HTML editor
    // specifically. Tests that care about the actual template content
    // override this via server.use() as usual.
    http.get(`${API_URL}/api/campaigns/default-template`, () =>
        HttpResponse.json({ html: '<p>Default template</p>' }),
    ),
]
