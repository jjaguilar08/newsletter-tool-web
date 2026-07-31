// Matches MarketingController::sampleNewsletter()'s response shape exactly -
// always this same generic message regardless of whether the address was
// real or delivery actually succeeded (the backend deliberately swallows
// mail failures) - a public, unauthenticated endpoint can't reveal whether
// a given address exists or is deliverable.
export interface SampleNewsletterResponse {
    message: string
}
