import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

function uniqueSubject(label: string): string {
    return `E2E Campaign ${label} ${Date.now()}`
}

// Every campaign this suite creates stays Draft and is owned by the
// spec's own dedicated staff user - no explicit deletion needed here, the
// staffUser fixture's teardown cascade-deletes it (see fixtures.ts).
// Assumes the caller is already on (or has just reloaded) /campaigns.
async function findDraftRow(page: import('@playwright/test').Page, subject: string) {
    await page.getByLabel('Status').selectOption('draft')
    return page.getByRole('row', { name: subject })
}

test.describe('Campaigns - content modes', () => {
    test('Plain text: create, save, reload, edited content survives', async ({
        page,
        staffUser,
    }) => {
        await loginAsStaff(page, staffUser)
        await page.goto('/campaigns')

        const subject = uniqueSubject('Plain')
        const content = `Plain text body ${Date.now()}`

        await page.getByRole('button', { name: 'Add campaign' }).click()
        const dialog = page.getByRole('dialog', { name: 'Add campaign' })
        await dialog.getByLabel('Subject').fill(subject)
        await dialog.getByRole('tab', { name: 'Plain text' }).click()
        await dialog.getByLabel('Content').fill(content)
        await dialog.getByRole('button', { name: 'Save' }).click()
        await expect(dialog).toHaveCount(0)

        await page.reload()
        const row = await findDraftRow(page, subject)
        await row.getByRole('button', { name: 'Edit' }).click()

        const editDialog = page.getByRole('dialog', { name: 'Edit campaign' })
        await expect(editDialog.getByRole('tab', { name: 'Plain text' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        await expect(editDialog.getByLabel('Content')).toHaveValue(content)
    })

    test('HTML editor: prefills from the default template, edits survive reload', async ({
        page,
        staffUser,
    }) => {
        await loginAsStaff(page, staffUser)
        await page.goto('/campaigns')

        const subject = uniqueSubject('HTML')
        const marker = `e2e-html-marker-${Date.now()}`

        await page.getByRole('button', { name: 'Add campaign' }).click()
        const dialog = page.getByRole('dialog', { name: 'Add campaign' })

        // A brand-new campaign opens straight into HTML editor mode already.
        await expect(dialog.getByRole('tab', { name: 'HTML editor' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        const htmlField = dialog.locator('#campaign-html')
        await expect(htmlField).toHaveValue(/<!DOCTYPE html>/, { timeout: 10_000 })

        await dialog.getByLabel('Subject').fill(subject)
        await dialog.getByLabel('Content').fill('Plain-text fallback content')
        await htmlField.fill(`<html><body>${marker}</body></html>`)
        await dialog.getByRole('button', { name: 'Save' }).click()
        await expect(dialog).toHaveCount(0)

        await page.reload()
        const row = await findDraftRow(page, subject)
        await row.getByRole('button', { name: 'Edit' }).click()

        const editDialog = page.getByRole('dialog', { name: 'Edit campaign' })
        await expect(editDialog.getByRole('tab', { name: 'HTML editor' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        await expect(editDialog.locator('#campaign-html')).toHaveValue(
            `<html><body>${marker}</body></html>`,
        )
    })

    test('Visual builder: click-to-append blocks, save, reload keeps the design', async ({
        page,
        staffUser,
    }) => {
        await loginAsStaff(page, staffUser)
        await page.goto('/campaigns')

        const subject = uniqueSubject('Visual')

        await page.getByRole('button', { name: 'Add campaign' }).click()
        const dialog = page.getByRole('dialog', { name: 'Add campaign' })
        await dialog.getByLabel('Subject').fill(subject)
        await dialog.getByLabel('Content').fill('Plain-text fallback content')
        await dialog.getByRole('tab', { name: 'Visual builder' }).click()

        // GrapesJS blocks are native HTML5 draggable="true" elements - real
        // drag doesn't work under Playwright with this setup (Day 18's
        // notes), so this uses the same click-to-append affordance
        // (blockManager.appendOnClick) a keyboard/assistive-tech user would.
        // One block only: appending a block selects it, which swaps
        // GrapesJS's own right-hand panel from Blocks to Style Manager -
        // a second block click would be fighting that panel switch rather
        // than testing anything this suite needs to cover.
        await dialog.locator('.gjs-block', { hasText: 'Text Section' }).click()

        await dialog.getByRole('button', { name: 'Export design' }).click()
        await expect(dialog.getByText('Exported HTML')).toBeVisible()
        await expect(dialog.locator('pre').first()).not.toBeEmpty()

        await dialog.getByRole('button', { name: 'Save' }).click()
        await expect(dialog).toHaveCount(0)

        await page.reload()
        const row = await findDraftRow(page, subject)
        await row.getByRole('button', { name: 'Edit' }).click()

        // design_json only round-trips (and only ever gets set) once a real
        // design exists - Visual builder being the reopened tab is itself
        // proof the design was saved and survived the reload.
        const editDialog = page.getByRole('dialog', { name: 'Edit campaign' })
        await expect(editDialog.getByRole('tab', { name: 'Visual builder' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
    })
})
