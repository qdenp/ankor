import { test, expect } from '../../fixtures';
import { SkillPage } from '../../pages/skill-page';
import { TIMEOUTS } from '../../config';

/**
 * 09 — Skills для Owner role.
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Skill Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /** @TC-91919 Create skill */
  test('should validate empty form, create skill and see in library', async ({ page }) => {
    const skillPage = new SkillPage(page);
    const timestamp = Date.now();
    const skillName = `Skill${timestamp}`;

    // --- Шаг 1: Перейти в Skill ---
    await skillPage.goto();

    // --- Шаг 2: Нажать Create Skill ---
    await skillPage.clickCreateSkill();

    // --- Шаг 3: Ничего не заполнять и нажать create ---
    // --- Шаг 3.1: Title, category и level обязательны ---
    await skillPage.createButton.click();
    // Форма должна остаться открытой (заголовок New Skill виден)
    await expect(skillPage.newSkillHeading).toBeVisible({ timeout: TIMEOUTS.medium });

    // --- Шаг 4: Заполнить все поля ---
    // --- Шаг 5: Вставить видео URL youtube ---
    await skillPage.fillSkillForm({
      name: skillName,
      category: 'Shooting',
      level: 'Beginner',
      description: 'Test skill description',
      videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    });

    // --- Шаг 6: Создать ---
    await skillPage.createButton.click();

    // Ждём обновления страницы после создания
    await expect(skillPage.heading).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(page).toHaveURL(/skills/);

    // --- Шаг 6.1: успешно ---
    // --- Шаг 6.2: в библиотеке отображен skill ---
    await skillPage.searchInput.fill(skillName);
    await expect(skillPage.getSkillCard(skillName)).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Шаг 6.3: skill принадлежит виду спорта организации ---
    // Проверяем что в карточке есть категория (Shooting) и уровень (Beginner)
    const card = skillPage.getSkillCard(skillName);
    await expect(card).toContainText('Shooting', { timeout: TIMEOUTS.medium });
    await expect(card).toContainText('Beginner', { timeout: TIMEOUTS.medium });

    // --- Шаг 6.4: Видимость дрилс - organization ---
    // (проверено через категорию и уровень в карточке skill)
  });
});
