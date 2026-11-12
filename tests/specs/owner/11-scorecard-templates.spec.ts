import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { ScorecardTemplatePage } from '../../pages/scorecard-template-page';
import { TIMEOUTS } from '../../config';

/**
 * Генератор уникального имени для шаблона.
 */
function generateTemplateName(): string {
  return `Test Template ${Date.now()}`;
}

test.describe('Owner Score Card Template Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // Шаблон, созданный первым тестом; второй тест деактивирует именно его (новый не создаёт)
  let createdTemplateName: string | undefined;

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
    createdTemplateName = templateName;
  });

  /** TC-71393 Make inactive (на шаблоне из TC-71292) */
  test('should mark the template as inactive', async ({ page }) => {
    await allure.allureId('71393');
    expect(createdTemplateName, 'Requires the template created by the previous test (serial mode)').toBeDefined();
    const templateName = createdTemplateName!;
    const templatePage = new ScorecardTemplatePage(page);

    await templatePage.goto();
    await templatePage.toggleActive(templateName, false);

    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to remain visible after marking inactive`).toBeVisible({ timeout: TIMEOUTS.long });
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
  });
});
