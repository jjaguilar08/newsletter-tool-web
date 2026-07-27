// Sanctum's SPA auth is cookie-based: Laravel sets an (encrypted) XSRF-TOKEN
// cookie, and expects it echoed back verbatim - just URL-decoded - as the
// X-XSRF-TOKEN header on any mutating request. Laravel decrypts it
// server-side to validate against the session; this module never needs to
// know the cookie's contents, only how to read and forward it.
const XSRF_COOKIE_NAME = 'XSRF-TOKEN'

export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN'

export function readXsrfToken(): string | null {
    const prefix = `${XSRF_COOKIE_NAME}=`

    const cookie = document.cookie.split('; ').find((row) => row.startsWith(prefix))

    if (!cookie) {
        return null
    }

    return decodeURIComponent(cookie.slice(prefix.length))
}
