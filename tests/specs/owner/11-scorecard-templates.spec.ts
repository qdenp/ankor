import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { ScorecardTemplatePage } from '../../pages/scorecard-template-page';
import { TIMEOUTS } from '../../config';
import { recallEntity, rememberEntity } from '../../helpers/test-data-store';

/**
 * Генератор уникального имени для шаблона.
 */
function generateTemplateName(): string {
  return `Test Template ${Date.now()}`;
}

test.describe('Owner Score Card Template Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // Шаблон, созданный первым тестом; второй тест деактивирует именно его (новый не создаёт)
  // Шаблон для деактивации (71393) — из 71292, через хранилище (REVIEW-PLAN 3.12)

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /** TC-71292 Create Template */
  test('should create a basic Score Card Template', async ({ page }) => {
    await allure.allureId('71292');
    const templateName = generateTemplateName();
    const templatePage = new ScorecardTemplatePage(page);

    await templatePage.goto();
    await templatePage.createScorecard({
      name: templateName,
      categoryName: 'Fundamentals',
      skillName: 'Dribbling',
    });

    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to appear in table`).toBeVisible({ timeout: TIMEOUTS.long });
    rememberEntity('owner', 'scorecard-template', { name: templateName });
  });

  /** TC-71393 Make inactive (на шаблоне из TC-71292) */
  test('should mark the template as inactive', async ({ page }) => {
    await allure.allureId('71393');
    const templateName = recallEntity<{ name: string }>('owner', 'scorecard-template', 'should create a basic Score Card Template').name;
    const templatePage = new ScorecardTemplatePage(page);

    await templatePage.goto();
    await templatePage.toggleActive(templateName, false);

    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to remain visible after marking inactive`).toBeVisible({ timeout: TIMEOUTS.long });
    // Колонка Status: раньше проверялась только видимость строки — тест проходил, даже если деактивация не сохранилась
    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to have status Inactive`).toContainText('Inactive');
  });

  /** TC-71293 Create Template with 2+ category */
  test('should create template with 2+ categories and deactivate', async ({ page }) => {
    await allure.allureId('71293');
    const templateName = generateTemplateName();
    const templatePage = new ScorecardTemplatePage(page);

    await templatePage.goto();
    await templatePage.createScorecard({
      name: templateName,
      categoryName: 'Fundamentals',
      skillName: 'Dribbling',
      categories: [
        { name: 'Advanced', skillName: 'Shooting' },
      ],
    });

    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to appear in table`).toBeVisible({ timeout: TIMEOUTS.long });

    await templatePage.toggleActive(templateName, false);

    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to remain visible after marking inactive`).toBeVisible({ timeout: TIMEOUTS.long });
    // Колонка Status: раньше проверялась только видимость строки — тест проходил, даже если деактивация не сохранилась
    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to have status Inactive`).toContainText('Inactive');
  });
});
