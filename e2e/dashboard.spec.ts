import type { Page } from '@playwright/test'
import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

interface DashboardStats {
    subscribers: { subscribed: number; unsubscribed: number; bounced: number }
    campaigns: { draft: number; scheduled: number; sending: number; sent: number }
}

// Dashboard stats are computed globally (DashboardController::stats has no
// per-user scoping) against a dev DB that's never assumed empty - so this
// asserts the delta this test itself caused, not an absolute count. The
// suite runs fully serially (see playwright.config.ts) specifically so this
// delta can't be polluted by another spec's fixtures landing mid-test.
function statValue(page: Page, sectionHeading: string, label: string) {
    const section = page.locator('section', {
        has: page.getByRole('heading', { level: 2, name: sectionHeading, exact: true }),
    })
    const dt = section.locator('dt', { hasText: new RegExp(`^${label}$`) })
    return dt.locator('xpath=following-sibling::dd[1]')
}

test('Dashboard stats reflect real seeded state', async ({ page, staffUser }) => {
    const before = await staffUser.api.get<DashboardStats>('/api/dashboard/stats')

    await staffUser.createSubscriber({
        email: `e2e-dash-sub-1-${Date.now()}@example.com`,
        status: 'subscribed',
    })
    await staffUser.createSubscriber({
        email: `e2e-dash-sub-2-${Date.now()}@example.com`,
        status: 'subscribed',
    })
    await staffUser.createSubscriber({
        email: `e2e-dash-unsub-${Date.now()}@example.com`,
        status: 'unsubscribed',
    })
    const campaignA = await staffUser.createCampaign({
        subject: `E2E Dashboard Campaign A ${Date.now()}`,
        content: 'Dashboard delta check',
    })
    const campaignB = await staffUser.createCampaign({
        subject: `E2E Dashboard Campaign B ${Date.now()}`,
        content: 'Dashboard delta check',
    })

    await loginAsStaff(page, staffUser)
    await page.goto('/dashboard')

    await expect(statValue(page, 'Subscribers', 'Subscribed')).toHaveText(
        String(before.subscribers.subscribed + 2),
    )
    await expect(statValue(page, 'Subscribers', 'Unsubscribed')).toHaveText(
        String(before.subscribers.unsubscribed + 1),
    )
    await expect(statValue(page, 'Campaigns', 'Draft')).toHaveText(
        String(before.campaigns.draft + 2),
    )

    await expect(page.getByRole('row', { name: campaignA.subject })).toBeVisible()
    await expect(page.getByRole('row', { name: campaignB.subject })).toBeVisible()
})
