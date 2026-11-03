import { test, expect } from '../../fixtures';
import { OrganizationPage } from '../../pages/organization-page';
import { TIMEOUTS } from '../../config';

/**
 * 04 — Organization (пункт меню Organizations).
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Organization Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  // View organization profile
  test('should view organization profile', async ({ page }) => {
    const orgPage = new OrganizationPage(page);

    await orgPage.goto();

    // Проверяем, что видим профиль организации
    await expect(page, 'Should be on organization profile page, not sign-in').not.toHaveURL(/sign-in/);
  });

  // 91915: Edit own organization
  test('@TC-91915 should edit organization name and revert', async ({ page }) => {
    const orgPage = new OrganizationPage(page);

    await orgPage.goto();

    // Click Edit to enter edit mode and get original name from input
    await orgPage.clickEdit();
    const originalName = await orgPage.nameInput.inputValue();

    // Edit organization
    const newName = `Test Org ${Date.now()}`;
    await orgPage.fillOrgForm({ name: newName });
    await orgPage.save(); // waits for profile to reload

    // Verify name changed - after save, should be back in view mode
    // Click Edit again to verify
    await orgPage.clickEdit();
    await expect(orgPage.nameInput, 'Name input should show new name after save').toHaveValue(newName);

    // Revert cleanup
    await orgPage.fillOrgForm({ name: originalName });
    await orgPage.save(); // waits for profile to reload

    // Verify reverted
    await orgPage.clickEdit();
    await expect(orgPage.nameInput, 'Name input should show original name after revert').toHaveValue(originalName);
    await orgPage.cancel(); // Exit edit mode
  });
});