import { defineConfig, devices } from '@playwright/test'

// Real, checked-in Playwright E2E config - see README.md's "End-to-end
// tests" section for the two-live-servers prerequisite this suite needs
// (this config only starts the frontend; the Laravel backend on :8000 must
// already be running, with a queue worker or QUEUE_CONNECTION=sync for the
// Send Now spec).
export default defineConfig({
    testDir: './e2e',
    // Every spec logs in as its own freshly-created staff user (see
    // e2e/support/fixtures.ts), but Dashboard stats and "recent campaigns"
    // are computed globally across the whole DB (DashboardController::stats
    // has no per-user scoping) - two specs creating/sending campaigns at the
    // same time would make each other's dashboard assertions flaky. Running
    // fully serially trades suite speed for eliminating that entire class of
    // cross-test interference at the source, which matters more here than
    // wall-clock time for a smoke-level suite.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    // No automatic retries - a spec that only passes on retry is exactly
    // the "flaky and gets ignored over time" failure mode this suite is
    // meant to avoid masking, not paper over.
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    timeout: 30_000,
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
})
