import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMPORT_CSV_PATH = path.join(__dirname, 'fixtures', 'subscribers-import.csv')

// The dev DB is never assumed empty (it carries real data from manual QA -
// see PROJECT_NOTES.md) - every row this suite looks for is located via the
// list's own search box by a unique, per-test email, rather than assuming
// it lands on page 1 of an unfiltered list.
function uniqueEmail(label: string): string {
    return `e2e-subscriber-${label}-${Date.now()}@example.com`
}

test.describe('Subscribers', () => {
    test('create, edit, and delete a subscriber', async ({ page, staffUser }) => {
        await loginAsStaff(page, staffUser)
        await page.goto('/subscribers')

        const email = uniqueEmail('crud')

        // Create
        await page.getByRole('button', { name: 'Add subscriber' }).click()
        const addDialog = page.getByRole('dialog', { name: 'Add subscriber' })
        await addDialog.getByLabel('Email').fill(email)
        await addDialog.getByLabel('Name').fill('E2E Original Name')
        await addDialog.getByRole('button', { name: 'Save' }).click()
        await expect(addDialog).toHaveCount(0)

        await page.getByLabel('Search').fill(email)
        const row = page.getByRole('row', { name: new RegExp(email) })
        await expect(row).toContainText('E2E Original Name')

        // Edit
        await row.getByRole('button', { name: 'Edit' }).click()
        const editDialog = page.getByRole('dialog', { name: 'Edit subscriber' })
        await editDialog.getByLabel('Name').fill('E2E Updated Name')
        await editDialog.getByRole('button', { name: 'Save' }).click()
        await expect(editDialog).toHaveCount(0)
        await expect(row).toContainText('E2E Updated Name')

        // Delete
        await row.getByRole('button', { name: 'Delete' }).click()
        await page
            .getByRole('dialog', { name: 'Delete subscriber' })
            .getByRole('button', { name: 'Delete' })
            .click()
        await expect(page.getByRole('dialog', { name: 'Delete subscriber' })).toHaveCount(0)
        await expect(page.getByText('No subscribers match your search.')).toBeVisible()
    })

    test('imports subscribers from a real CSV file upload', async ({ page, staffUser }) => {
        await loginAsStaff(page, staffUser)
        await page.goto('/subscribers')

        await page.getByRole('button', { name: 'Import CSV' }).click()
        const importDialog = page.getByRole('dialog', { name: 'Import subscribers' })
        await importDialog.locator('#subscriber-import-file').setInputFiles(IMPORT_CSV_PATH)
        await importDialog.getByRole('button', { name: 'Import' }).click()

        await expect(importDialog.getByText('Created 2, updated 0, skipped 1.')).toBeVisible()
        await expect(importDialog.getByText('Invalid email format.')).toBeVisible()
        await importDialog.getByRole('button', { name: 'Close' }).click()

        await page.getByLabel('Search').fill('e2e-import-one@example.com')
        await expect(page.getByRole('row', { name: /e2e-import-one@example\.com/ })).toBeVisible()

        // The two rows the CSV actually created aren't tracked by the
        // staffUser fixture (they were made through the UI/import
        // endpoint, not staffUser.createSubscriber) - clean them up
        // directly so this spec leaves no data behind on repeat runs.
        for (const email of ['e2e-import-one@example.com', 'e2e-import-two@example.com']) {
            const found = await staffUser.api.get<{ data: { id: number }[] }>(
                `/api/subscribers?search=${encodeURIComponent(email)}`,
            )
            for (const subscriber of found.data) {
                await staffUser.api.delete(`/api/subscribers/${subscriber.id}`)
            }
        }
    })
})
