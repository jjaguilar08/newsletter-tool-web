import type { Request } from '@playwright/test'
import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time - no timezone
// suffix.
function toDatetimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

test.describe('Schedule', () => {
    test('a future datetime succeeds', async ({ page, staffUser }) => {
        const campaign = await staffUser.createCampaign({
            subject: `E2E Schedule Future ${Date.now()}`,
            content: 'Schedule (future) body',
        })

        await loginAsStaff(page, staffUser)
        await page.goto('/campaigns')
        await page.getByLabel('Status').selectOption('draft')
        await page
            .getByRole('row', { name: campaign.subject })
            .getByRole('button', { name: 'Schedule' })
            .click()

        const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const dialog = page.getByRole('dialog', { name: 'Schedule campaign' })
        await dialog.getByLabel('Send at').fill(toDatetimeLocalValue(future))
        await dialog.getByRole('button', { name: 'Continue' }).click()

        const confirmDialog = page.getByRole('dialog', { name: 'Schedule campaign' })
        await confirmDialog.getByRole('button', { name: 'Schedule' }).click()
        await expect(confirmDialog).toHaveCount(0)

        await page.getByLabel('Status').selectOption('scheduled')
        await expect(
            page.getByRole('row', { name: campaign.subject }).getByText('Scheduled'),
        ).toBeVisible()
    })

    test('a past datetime is rejected client-side with zero network calls', async ({
        page,
        staffUser,
    }) => {
        const campaign = await staffUser.createCampaign({
            subject: `E2E Schedule Past ${Date.now()}`,
            content: 'Schedule (past) body',
        })

        await loginAsStaff(page, staffUser)
        await page.goto('/campaigns')
        await page.getByLabel('Status').selectOption('draft')
        await page
            .getByRole('row', { name: campaign.subject })
            .getByRole('button', { name: 'Schedule' })
            .click()

        const scheduleRequests: Request[] = []
        page.on('request', (request) => {
            if (request.url().includes('/schedule')) scheduleRequests.push(request)
        })

        const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const dialog = page.getByRole('dialog', { name: 'Schedule campaign' })
        await dialog.getByLabel('Send at').fill(toDatetimeLocalValue(past))
        await dialog.getByRole('button', { name: 'Continue' }).click()

        await expect(dialog.getByRole('alert')).toHaveText('Scheduled time must be in the future.')
        // Still on the form stage, not the confirm dialog - Continue is
        // still the visible action.
        await expect(dialog.getByRole('button', { name: 'Continue' })).toBeVisible()
        expect(scheduleRequests).toHaveLength(0)
    })
})
