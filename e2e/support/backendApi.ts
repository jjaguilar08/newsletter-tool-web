import { request as pwRequest, type APIRequestContext, type APIResponse } from '@playwright/test'

// Same host php artisan serve listens on by default - see README.md's E2E
// section. Overridable via E2E_BACKEND_URL for anyone running the backend
// somewhere else.
export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:8000'

// A CSRF-aware client for driving the real Laravel API directly, used to
// set up/tear down fixtures server-side rather than through the UI (see
// fixtures.ts for why). Mirrors src/lib/apiClient.ts's cookie/CSRF handling
// exactly (prime /sanctum/csrf-cookie, echo the XSRF-TOKEN cookie back as
// the X-XSRF-TOKEN header on mutating requests) against Playwright's own
// APIRequestContext, which keeps its own cookie jar entirely separate from
// whatever the test's `page` (a real browser) is doing - the two never
// share a session, and don't need to: this client logs itself in
// independently to create fixtures, while the browser logs in through the
// real login form to exercise the UI.
export class BackendApi {
    private readonly context: APIRequestContext

    private constructor(context: APIRequestContext) {
        this.context = context
    }

    static async create(): Promise<BackendApi> {
        const context = await pwRequest.newContext({
            baseURL: BACKEND_URL,
            extraHTTPHeaders: {
                Accept: 'application/json',
                // Sanctum's EnsureFrontendRequestsAreStateful only attaches
                // session/cookie middleware (via statefulApi()) to requests
                // whose Referer matches a SANCTUM_STATEFUL_DOMAINS entry -
                // this raw APIRequestContext isn't a browser page and sends
                // no Referer of its own, so without this every request was
                // hitting "Session store not set on request" (no session
                // ever got bound at all, not a login/CSRF failure).
                Referer: 'http://localhost:5173/',
            },
        })
        return new BackendApi(context)
    }

    async dispose(): Promise<void> {
        await this.context.dispose()
    }

    // Laravel re-issues a fresh XSRF-TOKEN cookie on every stateful
    // response, so reading it fresh from the context's own cookie jar
    // before each mutating call (rather than caching a single value from
    // the initial prime) can't ever go stale - see PROJECT_NOTES.md Day 8.
    private async xsrfHeader(): Promise<Record<string, string>> {
        const state = await this.context.storageState()
        const cookie = state.cookies.find((c) => c.name === 'XSRF-TOKEN')
        return cookie ? { 'X-XSRF-TOKEN': decodeURIComponent(cookie.value) } : {}
    }

    async primeCsrf(): Promise<void> {
        const response = await this.context.get('/sanctum/csrf-cookie')
        if (!response.ok()) {
            throw new Error(`Failed to prime CSRF cookie: ${response.status()}`)
        }
    }

    async get<T>(path: string): Promise<T> {
        return this.parse<T>(await this.context.get(path))
    }

    async post<T>(path: string, data?: unknown): Promise<T> {
        return this.parse<T>(
            await this.context.post(path, { data, headers: await this.xsrfHeader() }),
        )
    }

    async delete(path: string): Promise<void> {
        await this.parse<void>(
            await this.context.delete(path, { headers: await this.xsrfHeader() }),
        )
    }

    async login(email: string, password: string): Promise<void> {
        await this.primeCsrf()
        await this.post('/api/login', { email, password })
    }

    // Only exists outside production - see the backend repo's
    // RestrictToNonProduction middleware and E2EUserController.
    async createStaffUser(
        email: string,
        password: string,
        name?: string,
    ): Promise<{ id: number; email: string; name: string }> {
        await this.primeCsrf()
        return this.post('/api/testing/users', { email, password, name })
    }

    async deleteStaffUser(id: number): Promise<void> {
        await this.delete(`/api/testing/users/${id}`)
    }

    private async parse<T>(response: APIResponse): Promise<T> {
        if (!response.ok()) {
            throw new Error(`${response.url()} -> ${response.status()}: ${await response.text()}`)
        }
        if (response.status() === 204) {
            return undefined as T
        }
        return (await response.json()) as T
    }
}
