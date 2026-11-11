# test-antipatterns.md — Anti-Pattern Checklist для Ankor

Адаптирован из e2e-spec-antipatterns. Убраны пункты, неприменимые к проекту: API-специфичные (в проекте нет API-слоя) и multi-user (звонки, параллельные логины — `loginAs` работает с одной общей `page` теста).
Осталось **11 анти-паттернов** эффективности.

Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review.

---

## 1. Hard-Coded `waitForTimeout()` / `sleep()` (SEVERITY: HIGH)

**Что искать:** Любое использование `page.waitForTimeout(ms)`. Почти всегда заменяется на ожидание элемента или ответа сервера.

**В проекте:** сейчас нет (проверка: `grep -rn "waitForTimeout(" tests/`). Если появится — сразу флажить.

**Частые замены:**
- `waitForTimeout(5000)` после click → `await expect(element).toBeVisible()`
- `waitForTimeout(10000)` после reload → `await page.waitForLoadState('domcontentloaded')` затем `await expect(element).toBeVisible()`
- `waitForTimeout(5000)` в ожидании API → `await page.waitForResponse(res => res.url().includes('/api/endpoint'))`
- `waitForTimeout(3000)` после закрытия диалога → `await expect(dialog).toBeHidden()`

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

## 2. Double-Wait Chains (SEVERITY: MEDIUM)

**Что искать:** Два последовательных ожидания одного элемента, где второе подразумевает первое.

**BAD:**
```ts
await element.waitFor({ state: 'attached' });
await element.waitFor({ state: 'visible' });

// Или: явное ожидание перед действием, которое и так ждёт (actionability)
await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
await moreActions.click();
```

**GOOD:**
```ts
await element.waitFor({ state: 'visible' });

await moreActions.click(); // click сам ждёт visible + enabled
```

**Где проверять:** Методы PO (`openEditCoach`, `openEditParent`, `deleteEvaluation` и т.п.), методы `base-page.ts`.

**Аннотация:**
```ts
// MEDIUM: Double-wait — click() already waits for visibility
// FIX: Remove the expect(...).toBeVisible() line before click()
await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
```

---

## 3. Broken Promise.all / Promise.race (SEVERITY: CRITICAL)

**Что искать:** `Promise.all()` или `Promise.race()` без `await`, или с `await` внутри массива.

**BAD:**
```ts
let result: string;
Promise.all([
    result = await page.evaluate(() => navigator.clipboard.readText()),
    page.waitForTimeout(5000)
]);
await page.goto(result);  // Unreliable — Promise.all не контролирует flow
```

`await` внутри массива означает, что `result` присваивается ДО запуска `Promise.all`, делая его бессмысленным. `waitForTimeout` выполняется detached без эффекта на main flow.

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

## 4. Unnecessary Wrapper Method Usage (SEVERITY: LOW)

**Что искать:** Вызовы wrapper-методов из `base-page.ts`, которые не добавляют ценности над прямыми методами Playwright.

**В проекте (`base-page.ts`):** `click`, `getText`, `getCount`, `waitForElement`, `waitForElementGone`.

**Флажить только если тест уже рефакторится. Не предлагать массовую миграцию рабочих wrapper вызовов.**

- `basePage.click(locator)` → `await locator.click()`
- `basePage.getText(locator)` → `await expect(locator).toHaveText(...)` (вместо чтения текста)
- `basePage.getCount(locator)` → `await expect(locator).toHaveCount(N)`
- `basePage.waitForElement(locator)` → `await expect(locator).toBeVisible()`
- `basePage.waitForElementGone(locator)` → `await expect(locator).toBeHidden()`

**Аннотация:**
```ts
// LOW: click wrapper — await locator.click() does the same thing
// FIX: Replace with direct locator.click()
await basePage.click(someLocator);
```

---

## 5. Redundant Logins in Same Test (SEVERITY: MEDIUM)

**Что искать:** Повторный `loginAs()` той же роли в одном тесте (или в `beforeEach` + в теле теста). Второй вызов лишний: сессия уже есть.

**BAD:**
```ts
test.beforeEach(async ({ loginAs }) => { await loginAs('owner'); });

test('should create team', async ({ loginAs, page }) => {
    await loginAs('owner');  // уже залогинен в beforeEach
    ...
});
```

**Аннотация:**
```ts
// MEDIUM: Same role already logged in by beforeEach
// FIX: Remove the repeated loginAs('owner') call
await loginAs('owner');
```

---

## 6. Redundant Setup / Cleanup Calls (SEVERITY: LOW)

**Что искать:** `beforeEach`/`afterEach`, которые чистят или готовят данные для всех тестов файла, хотя нужны не всем.

**В проекте:** `12-evaluations.spec.ts` — `afterEach` удаляет все оценки шаблона после каждого теста, включая тест, который ничего не сохраняет (`should block rating above 5`).

**Только флажить если:** Вызов явно лишний для конкретных тестов. Не флажить, если тесты действительно нуждаются в чистом состоянии.

**Аннотация:**
```ts
// LOW: Deletes all evaluations after every test — not all tests create one
// FIX: Clean up only in tests that save an evaluation
await evaluationPage.deleteAllByTemplate(TEMPLATE_NAME);
```

---

## 7. Missing `waitForResponse()` for API-Triggered UI Updates (SEVERITY: MEDIUM)

**Что искать:** После клика, вызывающего запрос к серверу, тест ждёт по таймеру (`waitForTimeout`) вместо реального ответа.

**В проекте:** Запросы идут при создании планов, пользователей, команд. Сейчас тесты ждут UI-состояния (закрытие диалога, heading списка) — это допустимо. `waitForResponse` нужен, только если UI-признака нет.

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

## 8. Missing `await` on Fire-and-Forget Calls (SEVERITY: CRITICAL)

**Что искать:** Async вызовы Playwright без `await`. Вызов стартует, но выполнение идёт дальше, не дожидаясь результата. Действие может произойти, а может и не успеть до следующей строки.

**Частые паттерны:**
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

**Различие с reliability #13:** Этот пункт — missing `await` на методах `page.*` и `locator.*`. Reliability #13 — missing `await` именно на `expect()` с Playwright matchers.

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

## 9. Asserting on Locator/Promise Object (SEVERITY: CRITICAL)

**Что искать:** `expect(locator).toBeTruthy()` или `expect(locator).toBeDefined()`, где `locator` — объект `Locator`. Locator всегда truthy/defined — ассерт проходит независимо от наличия элемента в DOM.

**BAD:**
```ts
// BAD — Locator object is ALWAYS truthy, это no-op assertion
expect(athletePage.newAthleteButton).toBeTruthy();
expect(planPage.prebuiltCheckbox).toBeTruthy();

// BAD — тоже no-op с soft assertion (тихо всегда проходит)
expect.soft(planPage.searchInput).toBeTruthy();
```

**GOOD:**
```ts
// GOOD — проверяем реальную видимость в DOM
await expect(athletePage.newAthleteButton).toBeVisible();
await expect(planPage.prebuiltCheckbox).toBeVisible();

// GOOD — soft version
await expect.soft(planPage.searchInput).toBeVisible();
```

**Различие от reliability #3 (Weak assertions):** `expect(locator).toBeTruthy()` — не слабый ассерт, а **no-op**. Не тестирует ничего. Классифицировать как #9, не reliability #3.

**Аннотация:**
```ts
// CRITICAL: expect(locator).toBeTruthy() — Locator is always truthy, this is a no-op
// FIX: Use await expect(locator).toBeVisible() to check actual DOM presence
expect(athletePage.newAthleteButton).toBeTruthy();
```

---

## 10. Waits in Shared Hooks (SEVERITY: HIGH)

**Что искать:** `waitForTimeout(ms)` внутри `beforeEach`, `afterEach`, `beforeAll`, `afterAll`. Хук выполняется для каждого теста — задержка умножается. 5 с в `afterEach` × 20 тестов = 100 с простоя за прогон.

**В проекте:** Пока нет, но если добавят в `beforeEach` / `afterEach` — сразу флажить.

**BAD:**
```ts
test.afterEach(async ({ page }) => {
    await page.waitForTimeout(5000);
    await evaluationPage.deleteAllByTemplate(TEMPLATE_NAME);
});
```

**GOOD:**
```ts
test.afterEach(async () => {
    await evaluationPage.deleteAllByTemplate(TEMPLATE_NAME);
});
```

**Различие от #1:** Если wait в shared hook (общий код) → **#10** (умноженный эффект). Если в теле теста (single-use) → **#1**.

**Не флажить:**
- Wait в хуке с комментарием, почему он нужен (rate limiting)
- Ожидания, действительно нужные для очистки состояния (но предложить event-based альтернативы)

**Аннотация:**
```ts
// HIGH: 5s wait in afterEach — 5s × N tests = Ns dead time per run
// FIX: Remove wait; if needed, wait for specific page/API state
await page.waitForTimeout(5000);
```

---

## 11. Shared Mutable Module-Scoped State (SEVERITY: HIGH)

**Что искать:** `let page: Page` или `let context: BrowserContext` на уровне `test.describe`/модуля, перезаписываемые внутри отдельных тестов. Если тест падает посреди выполнения, переменная хранит устаревшее состояние, которое утекает в следующий тест или `afterEach`.

**BAD:**
```ts
test.describe("Suite", () => {
    let extraPage: Page;

    test("Test A", async ({ browser }) => {
        extraPage = await browser.newPage();  // Assigns to shared var
        // ... если это упадёт, extraPage может быть в broken state
    });

    test("Test B", async ({ browser }) => {
        extraPage = await browser.newPage();  // Overwrites shared var
    });

    test.afterEach(async () => {
        await extraPage.close();  // Закрывает какую-то page — может быть stale из Test A
    });
});
```

**GOOD:**
```ts
test("Test A", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    try {
        // test logic
    } finally {
        await context.close();
    }
});
```

**Не флажить:**
- Переменные на describe scope, записываемые только в `beforeAll` (не per-test) — intended pattern для shared setup
- Данные сущности, созданной тестом создания и переиспользуемой следующими тестами serial-серии (например, `createdParent` в `07-parents.spec.ts`) — это намеренный паттерн, см. REVIEW-PLAN 3.12

**Аннотация:**
```ts
// HIGH: Shared mutable page variable — if test fails, afterEach closes stale page
// FIX: Scope page inside each test or use try/finally for cleanup
let extraPage: Page;
```

---

## Tie-Break Rules

- **#1 vs #7:** Если `waitForTimeout` прямо после click/action, вызывающего запрос к серверу → **#7 (Missing waitForResponse)**. Если после reload, навигации или действия без запроса → **#1 (Hard-coded wait)**.
- **#3 vs #8:** Standalone missing `await` на вызове Playwright → **#8**. Missing `await` у `Promise.all` → **#3**.
- **#9 vs weak assertions:** `expect(locator).toBeTruthy()` → **#9** (no-op). Слабый, но корректный matcher (например, `.toBeVisible()`, когда лучше `.toHaveText()`) → reliability **#3**.
- **#10 vs #1:** Wait в shared hook → **#10** (умноженный). Wait в теле теста → **#1**.
- **#11 vs test isolation:** Переприсваивание переменной на describe scope → **#11**. Загрязнение данных между тестами → reliability **#7**.

**Master rule:** Нет `await` на любом ассерте с Playwright matcher → CRITICAL, перекрывает всё. Это самый влиятельный баг: ассерт буквально не выполняется.

**Никогда не double-annotate одну строку за overlapping категории. Выбирай самый специфичный.**

---

## Использование в 04-test-review-and-fixes.md

То же, что и для reliability: проходить по 1-11, ставить inline annotations, обновлять summary block, cap 20, idempotent.
