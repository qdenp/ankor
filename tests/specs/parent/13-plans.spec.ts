import { test } from '../../fixtures';
import { createPlanTabTests, ROLE_TAB_EXPECTATIONS } from '../../factories/plan-tabs.factory';

/**
 * 13 — Practice Plans for Parent role.
 * Parent tests run sequentially within the role.
 */
createPlanTabTests(test, 'parent', ROLE_TAB_EXPECTATIONS.parent);
