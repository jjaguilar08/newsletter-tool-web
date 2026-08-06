/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        globals: false,
        // e2e/ holds Playwright specs (run via `npm run test:e2e`), not
        // Vitest ones - without this, Vitest's default *.spec.ts glob picks
        // them up too and fails trying to load Playwright's test.describe
        // outside a Playwright runner. Keeps the two suites genuinely
        // separate, per CLAUDE.md/README.md. The rest of this list is
        // Vitest's own documented default - it's fully replaced (not
        // merged) once `exclude` is set explicitly, so it's repeated here
        // rather than dropped.
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            'e2e/**',
        ],
    },
})
