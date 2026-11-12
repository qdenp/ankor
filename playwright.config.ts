import { defineConfig, devices } from '@playwright/test';

// Роль — из --project=<роль> (npm run test:<роль>, CI). У каждой роли свои HTML-отчёт и артефакты:
// test:all запускает 5 процессов, и с общей папкой они затирали друг другу отчёт и скриншоты/трейсы.
// Воркеры перечитывают конфиг без --project в argv — роль им передаётся через окружение главного процесса.
const projectArg = process.argv.find((a) => a.startsWith('--project='));
const role = projectArg ? projectArg.split('=')[1] : (process.env.ANKOR_PW_ROLE ?? 'all');
process.env.ANKOR_PW_ROLE = role;

/**
 * Playwright configuration for Ankor Athletics App
 */
export default defineConfig({
  testDir: './tests/specs',
  outputDir: `test-results/${role}`,

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

  // Локально line + list вместе намеренно: line при старте теста пишет [N/M] (прогресс),
  // list по завершении — ok/x/- N (результат). В файл лог пишет перенаправление
  // `> reports\test-output.log` из команды запуска: outputFile у line не поддерживается.
  reporter: process.env.CI
    ? [['html', { outputFolder: `reports/html/${role}` }]]
    : [
        ['line'],
        ['list'],
        // Короткая сводка в реальном времени по всем ролям: reports/progress.txt
        ['./tests/reporters/progress-reporter.ts'],
        ['allure-playwright'],
        ['html', { outputFolder: `reports/html/${role}` }],
      ],

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
    {
      // Подготовка данных для нового стенда (не тест): только через npm run test:setup, в test:all и CI не входит
      name: 'setup',
      testDir: './tests/setup',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
