import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { OrganizationPage } from '../../pages/organization-page';
import { ORGANIZATIONS, TIMEOUTS } from '../../config';

/**
 * 04 — Organization (пункт меню Organizations).
 * SysAdmin tests run sequentially within the role.
 */
test.describe('SysAdmin Organization Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('sysadmin');
  });

  // 71922: SysAdmin sees all organizations
  test('sysadmin sees all organizations', async ({ page }) => {
    await allure.allureId('71922');
    const orgPage = new OrganizationPage(page);

    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();

    // Verify we're on organizations page (not sign-in)
    await expect(page, 'Should be on organizations page, not sign-in').not.toHaveURL(/sign-in/);
    
    // Verify page loaded - check for heading
    await orgPage.expectPageLoaded();
  });

  // 71957: Edit organization as SysAdmin
  // Своя организация (aiorg01sysedit), не организация owner: роли идут параллельно, и с общей организацией
  // owner/04-organization и этот тест переименовывали её одновременно и сбивали друг друга.
  test('sysadmin can edit organization name and revert', async ({ page }) => {
    await allure.allureId('71957');
    const orgPage = new OrganizationPage(page);
    const targetEmail = ORGANIZATIONS.sysadminEdit.adminEmail;
    // Возврат — к константе, а не к прочитанному имени (см. owner/04-organization)
    const originalName = ORGANIZATIONS.sysadminEdit.name;

    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();

    // Сначала поиск: без него строка ищется только на первой странице DataGrid,
    // а организаций больше, чем помещается на страницу (из-за этого тест был flaky)
    await orgPage.search(targetEmail);
    await orgPage.waitForDataGridLoaded();

    // Find the specific organization by email (robust identity)
    const targetOrgRow = orgPage.getOrgRowByEmail(targetEmail);
    await expect(targetOrgRow, `Organization row with email "${targetEmail}" should be visible`).toBeVisible({ timeout: TIMEOUTS.long });

    // Click Edit on the target organization row
    const rowName = await orgPage.getOrgNameFromRow(targetOrgRow);
    await orgPage.clickEditOnRow(targetOrgRow);
    await expect(orgPage.nameInput, 'Name input should be editable').toBeEditable();
    // Форма открылась на той организации, что в найденной строке (а не на соседней)
    await expect(orgPage.nameInput).toHaveValue(rowName);

    // Edit organization
    const newName = `Test Org ${Date.now()}`;
    await orgPage.fillOrgForm({ name: newName });
    await orgPage.save();

    // After save, go back to list and verify name changed
    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();

    await orgPage.search(newName);
    await orgPage.waitForDataGridLoaded();

    const newOrgRow = orgPage.getOrgRow(newName);
    await expect(newOrgRow, 'Edited org row should be visible').toBeVisible({ timeout: TIMEOUTS.long });

    // Click Edit to verify name changed
    await orgPage.clickEditOnRow(newOrgRow);
    await expect(orgPage.nameInput, 'Name input should be editable').toBeEditable();
    await expect(orgPage.nameInput, 'Name input should show new name').toHaveValue(newName);

    // Revert cleanup: go back to list, search by new name, edit, revert to original
    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();

    await orgPage.search(newName);
    await orgPage.waitForDataGridLoaded();

    const orgRowToEdit = orgPage.getOrgRow(newName);
    await expect(orgRowToEdit, 'Org row to edit should be visible').toBeVisible({ timeout: TIMEOUTS.long });

    // Click Edit to revert
    await orgPage.clickEditOnRow(orgRowToEdit);
    await expect(orgPage.nameInput, 'Name input should be editable').toBeEditable();

    await orgPage.fillOrgForm({ name: originalName });
    await orgPage.save();

    // Verify reverted - go back to list and click edit again
    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();

    await orgPage.search(originalName);
    await orgPage.waitForDataGridLoaded();

    const revertedOrgRow = orgPage.getOrgRow(originalName);
    await expect(revertedOrgRow, 'Reverted org row should be visible').toBeVisible({ timeout: TIMEOUTS.long });

    await orgPage.clickEditOnRow(revertedOrgRow);
    await expect(orgPage.nameInput, 'Name input should be editable').toBeEditable();
    await expect(orgPage.nameInput, 'Name input should show original name').toHaveValue(originalName);
  });
});