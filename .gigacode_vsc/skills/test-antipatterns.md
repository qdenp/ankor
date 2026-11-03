# test-antipatterns.md — Anti-Pattern Checklist для Ankor

Адаптирован из e2e-spec-antipatterns. **Убраны 4 API-специфичных пункта** (нет API в проекте): #1, #15, #16, #17.
Осталось **10 актуальных анти-паттернов** эффективности.

Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review.

---

## 1. Call Placed Before All Participants Logged In (SEVERITY: HIGH)

**Что искать:** Тесты где User A логинится, инициирует действие, ПОТОМ User B логинится — действие висит в ожидании пока второй аутентифицируется.

**В проекте:** Релевантно если появятся multi-role тесты (owner создает, coach видит и т.д.)

**BAD:**
```ts
await test.step('Owner creates plan', async () => {
    ownerPage = await loginAs('owner');
    await ownerPage.createPlan({ name: 'Plan' });
});
await test.step('Coach views plan', async () => {
    coachPage = await loginAs('coach');  // Plan создался, но coach не был готов
    await coachPage.viewPlan();
});
```

**GOOD:**
```ts
await test.step('Login all participants', async () => {
    ownerPage = await loginAs('owner');
    coachPage = await loginAs('coach');
});
await test.step('Owner creates plan', async () => {
    await ownerPage.createPlan({ name: 'Plan' });
});
await test.step('Coach views plan', async () => {
    await coachPage.viewPlan();
});
```

**Аннотация:**
```ts
// HIGH: Action placed before all participants logged in — action sits waiting
// FIX: Move all loginAs calls before the action
await ownerPage.createPlan({ name: 'Plan' });
```

---

## 2. Hard-Coded `waitForTimeout()` / `sleep()` (SEVERITY: HIGH)

**Что искать:** Любое использование `page.waitForTimeout(ms)`, `page.waitForTimeout()` в любом месте. Почти всегда заменяется на element-based или response-based waits.

**В проекте:** Уже есть в `13-plans.spec.ts` lines 38, 102, 145, 186 — `waitForTimeout(2000)`, `waitForTimeout(5000)`.

**Частые замены:**
- `waitForTimeout(5000)` после click → `await expect(element).toBeVisible()`
- `waitForTimeout(10000)` после reload → `await page.waitForLoadState('domcontentloaded')` затем `await expect(element).toBeVisible()`
- `waitForTimeout(5000)` ждя API → `await page.waitForResponse(res => res.url().includes('/api/endpoint'))`
- `waitForTimeout(3000)` после закрытия диалога → `await page.locator('.dialog').waitFor({ state: 'hidden' })`

**Частный случай: Async Dropdown Options**
- `waitForTimeout(500)` после `click()` на combobox → `await expect(page.getByRole('option').first()).toBeVisible()`
- Пример:
```ts
// ❌ BAD — hard wait для dropdown
await combobox.click();
await page.waitForTimeout(500);

// ✅ GOOD — ждём реального UI состояния
await combobox.click();
await expect(page.getByRole('option').first()).toBeVisible({ timeout: TIMEOUTS.medium });
```

**Не флажить:** Реально необходимые waits для real-time фич (нет UI индикатора). Пометить как acceptable:
```ts
// ACCEPTABLE: No UI indicator for state — hard wait required
await page.waitForTimeout(5000);
```

**Аннотация:**
```ts
// HIGH: Hard-coded 2s wait — flaky and slow
// FIX: await expect(statusElement).toBeVisible() or await page.waitForResponse(...)
await page.waitForTimeout(2000);
```

---

## 3. Double-Wait Chains (SEVERITY: MEDIUM)

**Что искать:** Два последовательных `waitFor()` на одном элементе где второй подразумевает первый.

**BAD:**
```ts
await element.waitFor({ state: 'attached' });
await element.waitFor({ state: 'visible' });
```

**GOOD:**
```ts
await element.waitFor({ state: 'visible' });
```

**Где проверять:** Методы в PO (`clickButton`, `fillInput`, `selectOption` в `base-page.ts`), любые PO методы.

**Аннотация:**
```ts
// MEDIUM: Double-wait — visible implies attached, first wait is redundant
// FIX: Remove this line, keep only waitFor({ state: 'visible' })
await element.waitFor({ state: 'attached' });
```

---

## 4. Broken Promise.all / Promise.race (SEVERITY: CRITICAL)

**Что искать:** `Promise.all()` или `Promise.race()` без `await`, или с лишними паттернами внутри.

**BAD:**
```ts
let result: string;
Promise.all([
    result = await page.evaluate(() => navigator.clipboard.readText()),
    page.waitForTimeout(5000)
]);
await page.goto(result);  // Unreliable — Promise.all не контролирует flow
```

`await` внутри массива означает что `result` ассайнится ДО запуска `Promise.all`, делая его бессмысленным. `waitForTimeout` выполняется detached без эффекта на main flow.

**GOOD:**
```ts
const result = await page.evaluate(() => navigator.clipboard.readText());
await page.goto(result);
```

Также проверять `waitForTimeout` внутри `Promise.all` — hard timeout рядом с event listener убивает смысл listener'а.

**Аннотация:**
```ts
// CRITICAL: Promise.all not awaited — serves no purpose, remove the wrapper
// FIX: await the evaluate directly and remove the Promise.all
Promise.all([
```

---

## 5. Unnecessary Wrapper Method Usage (SEVERITY: LOW)

**Что искать:** Вызовы wrapper-методов из `base-page.ts` которые не добавляют ценности над прямыми Playwright locator methods.

**В проекте:** `base-page.ts` имеет: `clickButton`, `fillInput`, `getText`, `getValue`, `click`, `getCount`, `isVisible`, `waitForElement`, `waitForElementGone`.

**Флажить только если тест уже рефакторится. Не предлагать массовую миграцию рабочих wrapper вызовов.**

- `basePage.clickButton(locator)` → `await locator.click()`
- `basePage.fillInput(locator, value)` → `await locator.clear(); await locator.fill(value)`
- `basePage.getText(locator)` → `await locator.textContent()`
- `basePage.getValue(locator)` → `await locator.inputValue()`
- `basePage.isVisible(locator)` → `await expect(locator).toBeVisible()` (вместо boolean возврата)
- `basePage.getCount(locator)` → `await expect(locator).toHaveCount(N)`

**Аннотация:**
```ts
// LOW: clickButton wrapper — await locator.click() does the same thing
// FIX: Replace with direct locator.click()
await basePage.clickButton(someLocator);
```

---

## 6. Sequential Logins That Could Be Parallel (SEVERITY: MEDIUM)

**Что искать:** Множественные `loginAs()` вызовы выполняемые последовательно когда нет зависимости между ними.

**В проекте:** `loginAs` fixture создает свой контекст через UI — можно параллелить.

**BAD:**
```ts
ownerPage = await loginAs('owner');
coachPage = await loginAs('coach');
parentPage = await loginAs('parent');
```

**GOOD:**
```ts
[ownerPage, coachPage, parentPage] = await Promise.all([
    loginAs('owner'),
    loginAs('coach'),
    loginAs('parent'),
]);
```

**Caveat:** Только если `loginAs` создает независимые контексты (что оно делает). Если контекст shared — должны быть sequential.

**Аннотация:**
```ts
// MEDIUM: 3 sequential logins — each creates own context, could run in parallel
// FIX: Use Promise.all([loginAs(...), loginAs(...), ...])
ownerPage = await loginAs('owner');
```

---

## 7. Redundant Logins in Same Test (SEVERITY: MEDIUM)

**Что искать:** Те же credentials в нескольких `loginAs()` вызовах в одном тесте. Второй логин wasted — переиспользовать существующую страницу.

**Аннотация:**
```ts
// MEDIUM: Same user already logged in at line X — reuse existing page variable
// FIX: Use the ownerPage from the earlier login instead of logging in again
ownerPage = await loginAs('owner');
```

---

## 8. Redundant Setup Calls (SEVERITY: LOW)

**Что искать:** `beforeEach` хуки которые cancel/delete все данные независимо от того нужен ли тесту clean slate.

**В проекте:** `beforeEach` с `loginAs` — это нормально. Но если бы было `cancelAllPlans()` перед каждым тестом — флажить для тестов которые создают свои планы.

**Только флажить если:** Cancel call явно лишний для конкретных тестов. Не флажить если тесты genuinely нуждаются в clean state.

**Аннотация:**
```ts
// LOW: Cancels all plans before every test — not all tests need this
// FIX: Move to only the tests that require a clean plan slate
await cancelAllPlans(request, token);
```

---

## 9. Missing `waitForResponse()` for API-Triggered UI Updates (SEVERITY: MEDIUM)

**Что искать:** После клика триггерящего API call, тест использует `waitForTimeout` вместо ожидания реального ответа.

**В проекте:** Есть network calls при создании планов, пользователей, команд. Используют `waitForLoadState('networkidle')` + `waitForTimeout` — можно улучшить.

**GOOD:**
```ts
const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/plans') && res.status() === 200),
    button.click(),
]);
```

**Аннотация:**
```ts
// MEDIUM: Hard wait after API-triggering click — use waitForResponse instead
// FIX: await Promise.all([page.waitForResponse(res => res.url().includes('/api/...')), button.click()])
await button.click();
await page.waitForTimeout(5000);
```

---

## 10. Missing `await` on Fire-and-Forget Calls (SEVERITY: CRITICAL)

**Что искать:** Async Playwright API calls без `await`. Call fires но execution продолжается без ожидания. Silent failure — действие может или не может произойти перед следующей строкой.

**Частые паттерны в проекте:**
```ts
// BAD — page reloads но тест не ждет
page.reload();
await expect(element).toBeVisible();  // Может проверить ДО завершения reload

// BAD — page.close() не awaited
page.close();

// BAD — navigation не awaited
page.goto(url);
```

**GOOD:**
```ts
await page.reload();
await expect(element).toBeVisible();

await page.close();

await page.goto(url);
```

**Различие с reliability #13:** Этот пункт — missing `await` на `page.*` и `locator.*` методах. Reliability #13 — missing `await` именно на `expect()` assertions с Playwright matchers.

**Не флажить:**
- Намеренно fire-and-forget (крайне редко — если сомневаешься, флажь)
- Внутри `Promise.all()` — они awaited wrapper'ом

**Аннотация:**
```ts
// CRITICAL: page.reload() without await — fires without waiting for completion
// FIX: Add await: await page.reload()
page.reload();
```

---

## 11. Asserting on Locator/Promise Object (SEVERITY: CRITICAL)

**Что искать:** `expect(locator).toBeTruthy()` или `expect(locator).toBeDefined()` где `locator` — Playwright `Locator` объект. Locator всегда truthy/defined — ассерт всегда проходит независимо от наличия элемента в DOM.

**BAD:**
```ts
// BAD — Locator object is ALWAYS truthy, это no-op assertion
expect(athletePage.newAthleteButton).toBeTruthy();
expect(planPage.saveButton).toBeTruthy();

// BAD — тоже no-op с soft assertion (тихо всегда проходит)
expect.soft(planPage.searchInput).toBeTruthy();
```

**GOOD:**
```ts
// GOOD — проверяем реальную видимость в DOM
await expect(athletePage.newAthleteButton).toBeVisible();
await expect(planPage.saveButton).toBeVisible();

// GOOD — soft version
await expect.soft(planPage.searchInput).toBeVisible();
```

**Различие от reliability #3 (Weak assertions):** `expect(locator).toBeTruthy()` — не weak assertion, это **no-op assertion**. Не тестирует ничего. Классифицировать как #11, не #3.

**Аннотация:**
```ts
// CRITICAL: expect(locator).toBeTruthy() — Locator is always truthy, this is a no-op
// FIX: Use await expect(locator).toBeVisible() to check actual DOM presence
expect(athletePage.newAthleteButton).toBeTruthy();
```

---

## 12. Sleep Wrappers in Shared Hooks (SEVERITY: HIGH)

**Что искать:** `sleepBefore(n)` или `waitForTimeout(ms)` внутри `afterEach`, `beforeEach`, `afterAll` хуков. Хук выполняется для каждого теста — delay множится. 5s sleep в `afterEach` × 20 тестов = 100s dead time за прогон.

**В проекте:** Пока нет, но если добавят в `beforeEach` / `afterEach` — сразу флажить.

**BAD:**
```ts
test.afterEach(async () => {
    await sleepBefore(5);
    await page.close();
});
```

**GOOD:**
```ts
test.afterEach(async () => {
    await page.close();
});
```

**Различие от #2:** Если wait в shared hook (общий код) → **#12** (multiplied impact). Если в теле теста (single-use) → **#2**.

**Не флажить:**
- `sleepBefore()` в хуке с комментарием почему нужно (rate limiting)
- Waits genuinely needed для state cleanup (но suger event-based alternatives)

**Аннотация:**
```ts
// HIGH: sleepBefore(5) in afterEach — 5s × N tests = Ns dead time per run
// FIX: Remove sleep; if needed, wait for specific page/API state before close
await sleepBefore(5);
```

---

## 13. Shared Mutable Module-Scoped State (SEVERITY: HIGH)

**Что искать:** `let page: Page` или `let context: BrowserContext` объявленные на уровне `test.describe` и перезаписываемые внутри отдельных тестов. Если тест падает mid-execution, переменная может держать stale state утекающий в следующий тест `afterEach`.

**BAD:**
```ts
test.describe("Suite", () => {
    let page: Page;

    test("Test A", async ({ browser }) => {
        page = await loginAs('owner');  // Assigns to shared var
        // ... если это крашнется, page может быть в broken state
    });

    test("Test B", async ({ browser }) => {
        page = await loginAs('coach');  // Overwrites shared var
    });

    test.afterEach(async () => {
        await page.close();  // Закрывает какой-то page — может быть stale из Test A
    });
});
```

**GOOD:**
```ts
test("Test A", async ({ browser }) => {
    const page = await loginAs('owner');
    try {
        // test logic
    } finally {
        await page.close();
    }
});
```

**Не флажить:**
- Переменные на describe scope но записываемые только в `beforeAll` (не per-test) — intended pattern для shared setup
- Переменные намеренно shared (например, token используемый всеми тестами)

**Аннотация:**
```ts
// HIGH: Shared mutable page variable — if test fails, afterEach closes stale page
// FIX: Scope page inside each test or use try/finally for cleanup
let page: Page;
```

---

## Tie-Break Rules

- **#2 vs #9:** Если `waitForTimeout` прямо после click/action триггерящего API call → **#9 (Missing waitForResponse)**. Если после reload, navigation, или non-API action → **#2 (Hard-coded wait)**.
- **#6 vs #1:** Если sequential logins И action происходит между ними → **#1 (Call before participants ready)** — higher severity. Только #6 если все логины до любого action но все равно sequential.
- **#4 vs #10:** Standalone missing `await` на Playwright call → **#10**. Missing `await` внутри `Promise.all` → **#4**.
- **#11 vs weak assertions:** `expect(locator).toBeTruthy()` → **#11** (no-op). Shallow но correct matcher (e.g., `.toBeVisible()` когда `.toHaveText()` лучше) → reliability **#3**.
- **#12 vs #2:** Sleep/wait в shared hook → **#12** (multiplied). Sleep/wait в test body → **#2**.
- **#13 vs test isolation:** Variable reassignment at describe scope → **#13**. Data pollution между тестами → reliability **#7**.

**Master rule:** Нет `await` на любом ассерте с Playwright matcher → CRITICAL, перекрывает всё. Это single most impactful bug: ассерт буквально не выполняется.

**Никогда не double-annotate одну строку за overlapping категории. Выбирай самый специфичный.**

---

## Использование в 04-test-review-and-fixes.md

То же что и для reliability: проходить по 1-13, ставить inline annotations, обновлять summary block, cap 20, idempotent.