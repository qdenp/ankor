# test-antipatterns.md — Anti-Pattern Checklist для Ankor

Адаптирован из e2e-spec-antipatterns. Убраны пункты, неприменимые к проекту: API-специфичные (в проекте нет API-слоя) и multi-user (звонки, параллельные логины — `loginAs` работает с одной общей `page` теста).
Осталось **11 анти-паттернов** эффективности.

Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review.

---

## 1. Hard-Coded `waitForTimeout()` / `sleep()` (SEVERITY: HIGH)

**Что искать:** Любое использование `page.waitForTimeout(ms)`. Почти всегда заменяется на ожидание элемента или ответа сервера.

**В проекте:** сейчас нет (проверка: `grep -rn "waitForTimeout(" tests/`). Если появится — сразу отмечать.

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

**Не считать нарушением:** Реально необходимые waits для real-time фич (нет UI индикатора). Пометить как acceptable:
```ts
// ACCEPTABLE: No UI indicator for state — hard wait required
await page.waitForTimeout(5000);
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

**Где проверять:** Методы PO (`openEditCoach`, `openEditParent`, `deleteDraftsCreatedSince` и т.п.), методы `base-page.ts`.

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

---

## 6. Redundant Setup / Cleanup Calls (SEVERITY: LOW)

**Что искать:** `beforeEach`/`afterEach`, которые чистят или готовят данные для всех тестов файла, хотя нужны не всем.

**В проекте:** `12-evaluations.spec.ts` — `afterEach` после каждого теста открывает Evaluations и ищет свои черновики, включая тест, который ничего не сохраняет (`should block rating above 5`).

**Только отмечать если:** Вызов явно лишний для конкретных тестов. Не считать нарушением, если тесты действительно нуждаются в чистом состоянии.

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

**Не считать нарушением:**
- Намеренно fire-and-forget (крайне редко — если сомневаешься, отмечай)
- Внутри `Promise.all()` — они awaited wrapper'ом

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

---

## 10. Waits in Shared Hooks (SEVERITY: HIGH)

**Что искать:** `waitForTimeout(ms)` внутри `beforeEach`, `afterEach`, `beforeAll`, `afterAll`. Хук выполняется для каждого теста — задержка умножается. 5 с в `afterEach` × 20 тестов = 100 с простоя за прогон.

**В проекте:** Пока нет, но если добавят в `beforeEach` / `afterEach` — сразу отмечать.

**BAD:**
```ts
test.afterEach(async ({ page }) => {
    await page.waitForTimeout(5000);
    await evaluationPage.deleteDraftsCreatedSince(testStartedAt);
});
```

**GOOD:**
```ts
test.afterEach(async () => {
    await evaluationPage.deleteDraftsCreatedSince(testStartedAt);
});
```

**Различие от #1:** Если wait в shared hook (общий код) → **#10** (умноженный эффект). Если в теле теста (single-use) → **#1**.

**Не считать нарушением:**
- Wait в хуке с комментарием, почему он нужен (rate limiting)
- Ожидания, действительно нужные для очистки состояния (но предложить event-based альтернативы)

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

**Не считать нарушением:**
- Переменные на describe scope, записываемые только в `beforeAll` (не per-test) — intended pattern для shared setup
- Данные сущности, созданной тестом создания и переиспользуемой следующими тестами serial-серии (например, `createdParent` в `07-parents.spec.ts`) — это намеренный паттерн, см. REVIEW-PLAN 3.12

---

## Tie-Break Rules

- **#1 vs #7:** Если `waitForTimeout` прямо после click/action, вызывающего запрос к серверу → **#7 (Missing waitForResponse)**. Если после reload, навигации или действия без запроса → **#1 (Hard-coded wait)**.
- **#3 vs #8:** Standalone missing `await` на вызове Playwright → **#8**. Missing `await` у `Promise.all` → **#3**.
- **#9 vs weak assertions:** `expect(locator).toBeTruthy()` → **#9** (no-op). Слабый, но корректный matcher (например, `.toBeVisible()`, когда лучше `.toHaveText()`) → reliability **#3**.
- **#10 vs #1:** Wait в shared hook → **#10** (умноженный). Wait в теле теста → **#1**.
- **#11 vs test isolation:** Переприсваивание переменной на describe scope → **#11**. Загрязнение данных между тестами → reliability **#7**.

**Master rule:** Нет `await` на любом ассерте с Playwright matcher → CRITICAL, перекрывает всё. Это самый влиятельный баг: ассерт буквально не выполняется.

**Одно нарушение — одна категория: выбирай самую специфичную.**

---

## Использование в 04-test-review-and-fixes.md

Пройти по пунктам 1-11. Результаты ревью — **только в чат**, файлы на этом шаге не правятся (комментарии `// SEVERITY` в код не вставлять). Каждое нарушение — строка отчёта: severity, `файл:строка`, категория, что исправить.
