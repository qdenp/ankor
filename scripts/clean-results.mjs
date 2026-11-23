// Очистка allure-results перед прогоном (хуки pretest:* в package.json).
// allure-playwright только дописывает результаты: без очистки в ручную выгрузку в TestOps попадают
// прошлые прогоны и «skipped» от --list. test-results/<роль> Playwright очищает сам (outputDir).
// В test:all роли идут с --ignore-scripts, поэтому папка очищается один раз — до старта всех ролей.
// CI запускает Playwright напрямую и чистит папку в workflow (playwrightMain.yml).
import fs from 'node:fs';

fs.rmSync('allure-results', { recursive: true, force: true });
