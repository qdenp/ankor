import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Ankor Athletics App
 */
export default defineConfig({
  testDir: './tests/specs',

  /* Timeout for each test */
  timeout: 60 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on flaky tests (network errors, timing issues) */
  retries: 2,

  // ⚠️ НЕ МЕНЯЙ ЭТОТ ФАЙЛ — workers задаются через CLI (npm run test:*), а не здесь.
  // Каждая роль запускается отдельно: "playwright test --project=owner --workers 1"
  // Это гарантирует строго 1 воркер на роль (тесты внутри serial идут последовательно).
  // Параллельность между ролями обеспечивается concurrently в test:all.
  // Глобальное ограничение workers = количеству ролей — неправильно: роли добавляются,
  // а запуск может быть только части ролей. Ограничение задаётся на уровне CLI.
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: process.env.CI
    ? [['html', { outputFolder: 'reports/html' }]]
    : [['line', { outputFile: 'test-output.log' }], ['list'], ['html', { outputFolder: 'reports/html' }]],

  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.ANKOR_BASE_URL || 'https://d333afta2q6llv.cloudfront.net',

    /* Collect trace when retrying */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Action timeout */
    actionTimeout: 15 * 1000,

    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Configure browsers */
  projects: [
    {
      name: 'owner',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        'tests/specs/coach/**',
        'tests/specs/parent/**',
        'tests/specs/athlete/**',
        'tests/specs/sysadmin/**',
      ],
    },
    {
      name: 'sysadmin',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        'tests/specs/owner/**',
        'tests/specs/coach/**',
        'tests/specs/parent/**',
        'tests/specs/athlete/**',
      ],
    },
    {
      name: 'coach',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        'tests/specs/owner/**',
        'tests/specs/parent/**',
        'tests/specs/athlete/**',
        'tests/specs/sysadmin/**',
      ],
    },
    {
      name: 'parent',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        'tests/specs/owner/**',
        'tests/specs/coach/**',
        'tests/specs/athlete/**',
        'tests/specs/sysadmin/**',
      ],
    },
    {
      name: 'athlete',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        'tests/specs/owner/**',
        'tests/specs/coach/**',
        'tests/specs/parent/**',
        'tests/specs/sysadmin/**',
      ],
    },
  ],
});
