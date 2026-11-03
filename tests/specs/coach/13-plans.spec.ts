import { test } from '../../fixtures';
import { createPlanTabTests, ROLE_TAB_EXPECTATIONS } from '../../factories/plan-tabs.factory';

/**
 * 13 — Practice Plans for Coach role.
 * Coach tests run sequentially within the role.
 */
createPlanTabTests(test, 'coach', ROLE_TAB_EXPECTATIONS.coach);
