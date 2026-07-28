import { readXsrfToken, XSRF_HEADER_NAME } from './csrf'

const API_URL = import.meta.env.VITE_API_URL as string

export class ApiError extends Error {
    status: number
    errors?: Record<string, string[]>

    constructor(status: number, message: string, errors?: Record<string, string[]>) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.errors = errors
    }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// Every request is same-origin-credentialed (cookies), never token-based -
// this is what lets the browser send the Sanctum session cookie regardless
// of which of our own origins (Vite dev server, deployed SPA) issues it.
async function request<T>(path: string, method: Method, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }

    // FormData bodies (file uploads) must NOT get a Content-Type set here -
    // the browser generates the multipart/form-data boundary itself only
    // when it serializes the body, and a manually-set header without the
    // boundary param breaks the backend's multipart parsing entirely.
    const isFormData = body instanceof FormData
    if (body !== undefined && !isFormData) {
        headers['Content-Type'] = 'application/json'
    }

    // Only mutating requests carry the CSRF header - Sanctum/Laravel's
    // VerifyCsrfToken middleware doesn't check it on reads.
    if (method !== 'GET') {
        const token = readXsrfToken()
        if (token) {
            headers[XSRF_HEADER_NAME] = token
        }
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        credentials: 'include',
        headers,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })

    if (response.status === 204) {
        return undefined as T
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new ApiError(
            response.status,
            (data && typeof data === 'object' && 'message' in data && String(data.message)) ||
                response.statusText,
            data?.errors,
        )
    }

    return data as T
}

// Primes the XSRF-TOKEN cookie before the first CSRF-protected request of a
// session (i.e. login) - see PROJECT_NOTES.md Day 8 for why this only needs
// to run once rather than before every mutating call.
async function primeCsrfCookie(): Promise<void> {
    await fetch(`${API_URL}/sanctum/csrf-cookie`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    })
}

export const apiClient = {
    get: <T>(path: string) => request<T>(path, 'GET'),
    post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
    // Dedicated FormData entry point rather than overloading post()'s
    // `body?: unknown` - a File passed as a plain JSON body would silently
    // JSON.stringify to "{}"; keeping this a distinct method makes the
    // multipart intent explicit at every call site instead of relying on
    // callers to remember to wrap it in FormData themselves.
    postForm: <T>(path: string, formData: FormData) => request<T>(path, 'POST', formData),
    put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
    delete: <T = void>(path: string) => request<T>(path, 'DELETE'),
    primeCsrfCookie,
}
