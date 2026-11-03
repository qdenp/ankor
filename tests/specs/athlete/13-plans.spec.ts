import { test } from '../../fixtures';
import { createPlanTabTests, ROLE_TAB_EXPECTATIONS } from '../../factories/plan-tabs.factory';

/**
 * 13 — Practice Plans for Athlete role.
 * Athlete tests run sequentially within the role.
 */
createPlanTabTests(test, 'athlete', ROLE_TAB_EXPECTATIONS.athlete);
