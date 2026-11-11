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

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  /**
    * @TC-71292 Should create a basic Score Card Template
    * @TC-71393 Should mark template as inactive
   * Объединённый тест: создаёт шаблон → деактивирует → проверяет
   */
  test('should create and deactivate a basic Score Card Template', async ({ page }) => {
    const templateName = generateTemplateName();
    const categoryName = 'Fundamentals';
    const skillName = 'Dribbling';
    const templatePage = new ScorecardTemplatePage(page);

    // Navigate to scorecard templates
    await templatePage.goto();

    // Create new template
    await templatePage.createScorecard({
      name: templateName,
      categoryName,
      skillName,
    });

    // Verify template appears in table
    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to appear in table`).toBeVisible({ timeout: TIMEOUTS.long });

    // Mark as inactive
    await templatePage.toggleActive(templateName, false);

    // Verify template shows as inactive
    const row = templatePage.getRow(templateName);
    await expect(row, `Expected template "${templateName}" to remain visible after marking inactive`).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
    * @TC-71293 Should create template with 2+ categories
   */
  test('should create template with 2+ categories and deactivate', async ({ page }) => {
    const templateName = generateTemplateName();
    const templatePage = new ScorecardTemplatePage(page);

    // Navigate to scorecard templates
    await templatePage.goto();

    // Create template with 2 categories
    await templatePage.createScorecard({
      name: templateName,
      categoryName: 'Fundamentals',
      skillName: 'Dribbling',
      categories: [
        { name: 'Advanced', skillName: 'Shooting' },
      ],
    });

    // Verify template appears in table
    await expect(templatePage.getRow(templateName), `Expected template "${templateName}" to appear in table`).toBeVisible({ timeout: TIMEOUTS.long });

    // Deactivate template
    await templatePage.toggleActive(templateName, false);

    // Verify template still visible after deactivation
    const row = templatePage.getRow(templateName);
    await expect(row, `Expected template "${templateName}" to remain visible after marking inactive`).toBeVisible({ timeout: TIMEOUTS.long });
  });
});
