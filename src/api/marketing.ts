import { apiClient } from '../lib/apiClient'
import type { SampleNewsletterResponse } from '../types/marketing'

// Public, unauthenticated endpoint - no session/CSRF priming needed beyond
// what apiClient already does for every POST. Rate-limited server-side to
// 3/hour per IP (RateLimiter::for('sample-newsletter')); a 4th request
// within the window comes back as a 429 ApiError with no `errors` field,
// just `message: 'Too Many Attempts.'` - callers should branch on
// `error.status === 429` for a friendlier message than the raw text.
export function sendSampleNewsletter(email: string): Promise<SampleNewsletterResponse> {
    return apiClient.post<SampleNewsletterResponse>('/api/marketing/sample-newsletter', { email })
}
