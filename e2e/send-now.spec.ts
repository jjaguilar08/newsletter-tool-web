import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

// Requires the backend's queue to actually be processed - either
// QUEUE_CONNECTION=sync or a running `php artisan queue:work` alongside
// `php artisan serve`. Against php artisan serve alone the dispatched
// SendCampaignJob sits in the jobs table forever and this spec times out
// waiting for `sent` - see README.md's E2E section (PROJECT_NOTES.md Day 12
// hit this exact gotcha during manual QA).
test('Send Now: full round trip through queue processing to a Sent campaign with a send log entry', async ({
    page,
    staffUser,
}) => {
    // Resend rejects @example.com outright - delivered@resend.dev is
    // Resend's own documented test address (see landing.spec.ts), the only
    // way this campaign's real send can actually succeed rather than
    // landing in the send log as `failed`.
    const subscriber = await staffUser.createSubscriber({
        email: 'delivered@resend.dev',
        status: 'subscribed',
    })
    const campaign = await staffUser.createCampaign({
        subject: `E2E Send Now ${Date.now()}`,
        content: 'Send Now round trip body',
    })

    await loginAsStaff(page, staffUser)
    await page.goto('/campaigns')
    await page.getByLabel('Status').selectOption('draft')
    const row = page.getByRole('row', { name: campaign.subject })

    await row.getByRole('button', { name: 'Send Now' }).click()
    await page
        .getByRole('dialog', { name: 'Send campaign' })
        .getByRole('button', { name: 'Send Now' })
        .click()
    await expect(page.getByRole('dialog', { name: 'Send campaign' })).toHaveCount(0)

    // Polls the real API directly rather than the UI, which has no
    // auto-refresh of its own - decouples "did the queue finish" from any
    // particular UI refresh cadence.
    await expect
        .poll(
            async () => {
                const result = await staffUser.api.get<{ data: { status: string } }>(
                    `/api/campaigns/${campaign.id}`,
                )
                return result.data.status
            },
            {
                timeout: 30_000,
                message: 'campaign never reached Sent - is a queue worker running?',
            },
        )
        .toBe('sent')

    await page.reload()
    await page.getByLabel('Status').selectOption('sent')
    const sentRow = page.getByRole('row', { name: campaign.subject })
    await expect(sentRow.getByText('Sent')).toBeVisible()

    await sentRow.getByRole('button', { name: 'View' }).click()
    const viewDialog = page.getByRole('dialog', { name: 'View campaign' })
    await expect(viewDialog.getByRole('row', { name: new RegExp(subscriber.email) })).toContainText(
        'sent',
    )
})
