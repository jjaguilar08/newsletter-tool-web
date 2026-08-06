import { expect, test } from './support/fixtures'

test.describe('Login', () => {
    test('valid credentials log in and land on the dashboard', async ({ page, staffUser }) => {
        await page.goto('/login')

        await page.getByLabel('Email').fill(staffUser.email)
        await page.getByLabel('Password').fill(staffUser.password)
        await page.getByRole('button', { name: 'Log in' }).click()

        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByText(`Signed in as`)).toBeVisible()
    })

    test('invalid credentials show an error and stay on /login', async ({ page, staffUser }) => {
        await page.goto('/login')

        await page.getByLabel('Email').fill(staffUser.email)
        await page.getByLabel('Password').fill('the-wrong-password')
        await page.getByRole('button', { name: 'Log in' }).click()

        await expect(page.getByRole('alert')).toBeVisible()
        await expect(page).toHaveURL(/\/login$/)
    })

    test('an unauthenticated visitor hitting /dashboard is redirected to /login', async ({
        page,
    }) => {
        await page.goto('/dashboard')

        await expect(page).toHaveURL(/\/login$/)
    })
})
