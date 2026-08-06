import { loginAsStaff } from './support/auth'
import { expect, test } from './support/fixtures'

test.describe('Public landing page', () => {
    test('a logged-out visitor sees the landing page, not a redirect to /login', async ({
        page,
    }) => {
        await page.goto('/')

        await expect(page).toHaveURL('/')
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'Newsletters that ship themselves',
        )
    })

    test('shows "Log in" in the header when logged out', async ({ page }) => {
        await page.goto('/')

        await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
    })

    test('an already-authenticated visitor sees "Go to Dashboard" and is not redirected away from /', async ({
        page,
        staffUser,
    }) => {
        await loginAsStaff(page, staffUser)

        await page.goto('/')

        await expect(page).toHaveURL('/')
        await expect(
            page.getByRole('banner').getByRole('link', { name: 'Go to Dashboard' }),
        ).toBeVisible()
        await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toHaveCount(0)
    })

    test('submitting a valid email shows the real backend success message', async ({ page }) => {
        await page.goto('/')

        // Resend rejects @example.com outright ("use our testing email
        // address instead of domains like example.com") - delivered@
        // resend.dev is Resend's own documented test address: a real
        // send that simulates success without landing in anyone's inbox.
        await page.getByLabel('Email address').fill('delivered@resend.dev')
        await page.getByRole('button', { name: 'Send me a sample' }).click()

        await expect(page.getByText(/sample newsletter is on its way/i)).toBeVisible()
    })

    test('submitting an invalid email shows a field validation error', async ({ page }) => {
        await page.goto('/')

        await page.getByLabel('Email address').fill('not-an-email')
        await page.getByRole('button', { name: 'Send me a sample' }).click()

        await expect(page.getByRole('alert')).toBeVisible()
    })
})
