import { expect } from '@playwright/test';
import { test as baseTest } from '../fixtures';
import { PlanPage } from '../pages/plan-page';

export type PlanTab = 'myPlansTab' | 'invitedTab' | 'prebuiltTab' | 'orgPlansTab';

export type TabExpectations = Record<PlanTab, boolean>;

export type PlanTestRole = 'coach' | 'athlete' | 'parent' | 'owner';

/**
 * Factory for creating plan tab visibility tests per role.
 * Eliminates duplication across coach/athlete/parent/owner plan specs.
 */
export function createPlanTabTests(
  test: typeof baseTest,
  role: PlanTestRole,
  expectations: TabExpectations
): void {
  test.describe(`${role.charAt(0).toUpperCase() + role.slice(1)} Plan Tests`, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ loginAs }) => {
      await loginAs(role);
    });

    test('should see expected tabs', async ({ page }) => {
      const planPage = new PlanPage(page);
      await planPage.goto();

      for (const [tab, visible] of Object.entries(expectations)) {
        if (visible) {
          await expect(planPage[tab as PlanTab]).toBeVisible();
        } else {
          await expect(planPage[tab as PlanTab]).not.toBeVisible();
        }
      }
    });
  });
}

/**
 * Predefined tab expectations per role.
 * Single source of truth for what tabs each role should see.
 */
export const ROLE_TAB_EXPECTATIONS: Record<PlanTestRole, TabExpectations> = {
  owner: {
    myPlansTab: true,
    invitedTab: true,
    prebuiltTab: true,
    orgPlansTab: true,
  },
  coach: {
    myPlansTab: true,
    invitedTab: true,
    prebuiltTab: true,
    orgPlansTab: false,
  },
  athlete: {
    myPlansTab: true,
    invitedTab: true,
    prebuiltTab: false,
    orgPlansTab: false,
  },
  parent: {
    myPlansTab: true,
    invitedTab: true,
    prebuiltTab: false,
    orgPlansTab: false,
  },
};