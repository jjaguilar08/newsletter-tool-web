import { test as base } from '@playwright/test'
import { BackendApi } from './backendApi'

interface CreatedSubscriber {
    id: number
    email: string
}

interface CreatedCampaign {
    id: number
    subject: string
    status: string
}

export interface StaffUser {
    id: number
    email: string
    password: string
    api: BackendApi
    // Fixtures created via the real, authenticated API - not the UI, so
    // specs testing e.g. subscriber CRUD or campaign editor modes aren't
    // depending on those same flows to seed their own starting state.
    // Subscribers aren't owned by a user (no created_by column), so they're
    // tracked here for explicit teardown; campaigns cascade-delete with the
    // user itself (see the backend's E2EUserController::destroy), which is
    // also the only way to clean up a Sent campaign a spec can't delete
    // through the normal API (CampaignPolicy::delete is Draft/Scheduled
    // only).
    createSubscriber: (data: {
        email: string
        name?: string
        status?: 'subscribed' | 'unsubscribed' | 'bounced'
    }) => Promise<CreatedSubscriber>
    createCampaign: (data: { subject: string; content: string }) => Promise<CreatedCampaign>
}

// One dedicated staff user per test (per CLAUDE.md/this suite's own design -
// see README.md), created/torn down via real HTTP calls against the
// non-production-only /api/testing/users endpoint - never tinker, never a
// shared account, and nothing left behind regardless of whether the test
// itself passes or fails (Playwright always runs fixture teardown).
export const test = base.extend<{ staffUser: StaffUser }>({
    // Playwright inspects this parameter's own destructuring pattern at
    // runtime to know which fixtures a fixture depends on; `{}` here means
    // "none," and isn't optional the way it looks.
    // eslint-disable-next-line no-empty-pattern
    staffUser: async ({}, use, testInfo) => {
        const api = await BackendApi.create()
        const unique = `${testInfo.testId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '')
        const email = `e2e-${unique}@example.com`
        const password = 'e2e-test-password-1'

        const user = await api.createStaffUser(
            email,
            password,
            `E2E ${testInfo.title}`.slice(0, 255),
        )
        await api.login(email, password)

        const createdSubscriberIds: number[] = []

        await use({
            id: user.id,
            email,
            password,
            api,
            createSubscriber: async (data) => {
                const response = await api.post<{ data: CreatedSubscriber }>(
                    '/api/subscribers',
                    data,
                )
                createdSubscriberIds.push(response.data.id)
                return response.data
            },
            createCampaign: async (data) => {
                const response = await api.post<{ data: CreatedCampaign }>('/api/campaigns', data)
                return response.data
            },
        })

        for (const id of createdSubscriberIds) {
            await api.delete(`/api/subscribers/${id}`).catch(() => {})
        }
        await api.deleteStaffUser(user.id)
        await api.dispose()
    },
})

export { expect } from '@playwright/test'
