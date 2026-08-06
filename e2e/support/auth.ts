import { expect, type Page } from '@playwright/test'

// Drives the real login form (not a cookie/storageState shortcut) - the
// staffUser fixture's own API session is separate from whatever the browser
// does, so every authenticated spec logs in for real, exactly like a staff
// member would. This also means Login itself gets exercised by every spec
// that calls this, not just auth.spec.ts.
export async function loginAsStaff(page: Page, user: { email: string; password: string }) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
}
