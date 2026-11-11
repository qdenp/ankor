# test-reliability.md — Quality Checklist для Ankor

Полный чек-лист из 17 паттернов надёжности. Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review.

Каждый пункт: severity + code example (bad/good) + fix + tie-break rules.

---

## 1. Race Conditions (SEVERITY: CRITICAL)

**Что искать:** Действия без ожидания завершения предыдущего. Тест может проходить локально, но флакать в CI.

**Паттерны:**
- Click → сразу assert без ожидания UI update
- Navigate → сразу interact без ожидания загрузки
- Fill → сразу submit без валидации
- API setup → сразу UI тест без подтверждения данных

**BAD:**
```ts
await button.click();
expect(await label.textContent()).toBe('Updated');  // Race: UI не успело обновиться
```

**GOOD:**
```ts
await button.click();
await expect(label).toHaveText('Updated');  // Auto-retries
```

**Аннотация:**
```ts
// CRITICAL: expect(await ...) не авто-ретраит — race condition
// FIX: await expect(locator).toHaveText('value')
expect(await label.textContent()).toBe('Updated');
```

---

## 2. Fragile Selectors (SEVERITY: HIGH)

**Что искать:** Селекторы, ломающиеся при изменении DOM, хотя фича работает.

**Хрупкие паттерны:**
- `.nth(N)`, `.first()`, `.last()` — ломаются при смене порядка
- Глубокие CSS: `div > div > span.class` — ломаются на любом wrapper
- Индексные: `tr:nth-child(3)` — ломаются при реордере строк
- Текст с динамическим контентом (даты, счетчики)

**Стабильные альтернативы:**
- `page.getByRole('button', { name: 'Submit' })` — accessibility-based
- `page.getByTestId('plan-card')` — явный test hook
- `page.getByText('exact static text')` — если текст стабилен
- `page.locator('[data-testid="value"]')` — тестовый атрибут

**Не флажить:**
- `.first()` / `.last()` когда действительно один элемент или порядок гарантирован
- Локаторы в PO (флажить определение в PO, не использование в спеке)

**Аннотация:**
```ts
// HIGH: .nth(2) selector — breaks if row order changes
// FIX: Use getByRole, getByTestId, or data-attribute selector
await page.locator('tr').nth(2).click();
```

---

## 3. Weak or Missing Assertions (SEVERITY: HIGH)

**Что искать:** Много действий, мало проверок. Тест проходит, но ничего не верифицирует.

**Признаки:**
- 50 строк теста, 1 ассерт в конце
- `test.step('Verify')` с только `.toBeVisible()` на одном элементе
- Проверяют наличие (`toBeVisible`), но не контент (`toHaveText`)
- Только happy path, нет промежуточных проверок

**Также:** Ассерты без кастомных сообщений. В проекте **каждый `expect()` должен иметь описательный второй аргумент**.

**BAD:**
```ts
await test.step('Fill form and submit', async () => {
    await nameInput.fill('Test');
    await emailInput.fill('test@example.com');
    await submitButton.click();
});
```

**GOOD:**
```ts
await test.step('Fill form and submit', async () => {
    await nameInput.fill('Test');
    await emailInput.fill('test@example.com');
    await submitButton.click();
    await expect(successMessage, "Expected success message after form submit").toBeVisible();
});
```

**Аннотация:**
```ts
// HIGH: test.step has 4 actions but no assertions — doesn't verify anything
// FIX: Add expect() to verify the outcome of these actions
await test.step('Fill form and submit', async () => {
```

---

## 4. Assertion-Title Mismatch (SEVERITY: MEDIUM)

**Что искать:** Title говорит "verify X", ассерты проверяют Y. X остается непротестированным.

**Пример из проекта:** тест `should generate report and workout after submit` (12-evaluations) проверяет только появление оценки в таблице — ни report, ни workout не проверяются.

**Аннотация:**
```ts
// MEDIUM: Title says "generate report and workout" but assertions only check the evaluation row
// FIX: Add assertions for the report and workout named in the test title
test('should generate report and workout after submit', async ({ page }) => {
```

---

## 5. Inline Locators in Spec Files (SEVERITY: MEDIUM)

**Что искать:** Сырые селекторы прямо в спеке вместо PO. Обходят POM pattern, становятся maintenance nightmare.

**BAD:**
```ts
await page.locator('.MuiDialog-root .MuiDialogActions-root button').click();
await page.locator('input[type="number"]').first().fill('2');
```

**FIX:** Перенести в соответствующий PO как публичный locator property.

**Не флажить:**
- One-off селекторы уникальные для этого теста
- `page.getByRole()` / `page.getByText()` для простых стабильных элементов

**Аннотация:**
```ts
// MEDIUM: Inline selector — should be in a page object for reuse and maintenance
// FIX: Move to the appropriate page object as a public Locator property
await page.locator('.MuiDialog-root .MuiDialogActions-root button').click();
```

---

## 6. Hardcoded Magic Values (SEVERITY: MEDIUM)

**Что искать:** Email, ID, URL, даты, hardcoded в спеке. Должны быть в `config.ts`, `CREDENTIALS`, `PAGES`, `DATA_TEST`.

**Признаки:**
- Email адреса как строковые литералы
- API URLs не через `PAGES` или `BASE_URL`
- User IDs / entity IDs как raw числа
- Даты, которые устареют (например, ожидаемая дата последней оценки)

**Не флажить:**
- Assertion expected values статичные ("Active", "Completed")
- Test data намеренно уникальная для одного теста

**Аннотация:**
```ts
// MEDIUM: Hardcoded email — should come from config.ts CREDENTIALS
// FIX: Use CREDENTIALS.owner.email or test data constant
await loginPage.emailInput.fill('owner@test.com');
```

---

## 7. Missing Cleanup / Dirty State (SEVERITY: HIGH)

**Что искать:** Тесты создают данные, но не чистят — загрязняют следующий запуск.

**Проверить:**
- `beforeAll` создает данные, нет cleanup в `afterAll`
- Тест меняет настройку, не ревертит
- Тест создаёт team — не удаляет
- `afterEach` без `close()` для созданных вручную контекстов (`browser.newContext()`)

**Ограничение стенда:** удалять можно только Teams. Пользователей любых ролей удалить нельзя — только деактивировать через Manage Users. Для них «cleanup» = не создавать лишних: новых создаёт только тест создания, остальные переиспользуют (REVIEW-PLAN 3.12).

**Best practice в проекте:** Cleanup в `beforeEach` (не `afterEach`) — тест начинает чисто даже если предыдущий упал. Но создание БЕЗ ЛЮБОГО cleanup path — проблема.

**Аннотация:**
```ts
// HIGH: Creates team via UI but never deletes it — pollutes the stand
// FIX: Delete the created team at the end of the test (afterEach / finally)
await teamPage.createTeam({ name: teamName, active: true });
```

---

## 8. Test Order Dependency (SEVERITY: CRITICAL)

**Что искать:** Тесты проходят только после конкретного другого теста. Требуют `--workers 1` и порядок файлов.

**Признаки:**
- Тест использует переменную модуля, которую заполняет только другой тест (например, `DRILL_NAME` в `10-drills.spec.ts`): при запуске одного теста через `--grep` переменная `undefined`
- Тест предполагает состояние приложения, оставленное предыдущим тестом
- Комментарии "must run after X" или "depends on Y running first"

**Не флажить:**
- Переиспользование сущности из теста создания, если тест явно проверяет её наличие и падает с понятным сообщением, а в перспективе берёт её из хранилища прошлого прогона (REVIEW-PLAN 3.12)

**Аннотация:**
```ts
// CRITICAL: DRILL_NAME is set only by another test — undefined when this test runs alone
// FIX: Assert the dependency with a clear message, or load the entity saved by the create test
await drillPage.fillName(DRILL_NAME);
```

---

## 9. Missing Error Messages on Assertions (SEVERITY: LOW)

**Что искать:** `expect()` без кастомного failure message. Проект требует descriptive messages.

**BAD:**
```ts
expect(response.status()).toBe(200);
await expect(element).toBeVisible();
```

**GOOD:**
```ts
expect(response.status(), "Expected plan creation to return 200").toBe(200);
await expect(element, "Expected success banner after form submit").toBeVisible();
```

**Аннотация:**
```ts
// LOW: Missing custom failure message on expect()
// FIX: Add descriptive string as second arg: expect(value, "Expected X").toBe(Y)
expect(response.status()).toBe(200);
```

---

## 10. Stale Element Patterns (SEVERITY: HIGH)

**Что искать:** Сохранение результата локатора (`textContent()`, `inputValue()`, `isVisible()`) и использование ПОСЛЕ действия, меняющего DOM.

**BAD:**
```ts
const text = await label.textContent();
await button.click();  // Это меняет label
expect(text).toBe('New Value');  // text — старое значение
```

**GOOD:**
```ts
await button.click();
await expect(label).toHaveText('New Value');
```

**Также:** Переменные, захватывающие состояние элемента рано в тесте, используемые в ассертах много строк позже после взаимодействий.

**Аннотация:**
```ts
// HIGH: Text captured before action — will be stale after button click on next line
// FIX: Move assertion after the click and use await expect(label).toHaveText()
const text = await label.textContent();
```

---

## 11. Non-Retrying Assertions (SEVERITY: HIGH)

**Что искать:** `expect(await locator.method())` вместо `await expect(locator).method()`. Первый — single-shot, второй — auto-retry до timeout.

| Non-retrying (BAD) | Auto-retrying (GOOD) |
|---|---|
| `expect(await el.textContent()).toBe('X')` | `await expect(el).toHaveText('X')` |
| `expect(await el.isVisible()).toBe(true)` | `await expect(el).toBeVisible()` |
| `expect(await el.inputValue()).toBe('X')` | `await expect(el).toHaveValue('X')` |
| `expect(await el.getAttribute('class')).toContain('active')` | `await expect(el).toHaveClass(/active/)` |
| `expect(await el.count()).toBe(3)` | `await expect(el).toHaveCount(3)` |

**Exception:** `expect.soft()` с `await` допустим когда намеренно нужен single-check soft assert.

**Аннотация:**
```ts
// HIGH: Non-retrying assertion — evaluates once, will flake if UI still updating
// FIX: Use await expect(locator).toHaveText('value') for auto-retry
expect(await element.textContent()).toBe('Expected');
```

---

## 12. Overly Broad Test Scope (SEVERITY: LOW)

**Что искать:** Один тест делает слишком много несвязанного. При фейле непонятно какая фича сломана.

**Признаки:**
- 8+ `test.step()` блоков тестирующих разные фичи
- Title использует "and" многократно ("Verify X and Y and Z")
- Тест 3+ минуты
- Фейл в step 2 делает steps 3-8 бессмысленными но они всё равно падают

**Не флажить:**
- Multi-step тесты для одного flow end-to-end (create → modify → verify → cleanup)
- Тесты намеренно покрывающие user journey

**Аннотация:**
```ts
// LOW: Test covers 3 unrelated features — hard to pinpoint failure
// FIX: Split into separate tests for each feature, sharing setup via beforeEach
test('should create, view and edit a coach', async ({ page }) => {
```

---

## 13. Missing `await` on Playwright Assertions (SEVERITY: CRITICAL)

**Что искать:** `expect(locator).toBeVisible()` или любой Playwright matcher БЕЗ `await`. Без `await` возвращается Promise — всегда truthy. Ассерт **не выполняется**.

**BAD:**
```ts
expect(element).toBeVisible();
expect(planPage.myPlansTab).toBeVisible();
expect.soft(element).toHaveText('Saved');

// ОЧЕНЬ ПЛОХО — внутри if/ternary, еще более скрыто
if (expect(element).toBeVisible()) {  // Всегда truthy!
```

**GOOD:**
```ts
await expect(element).toBeVisible();
await expect(planPage.myPlansTab).toBeVisible();
await expect.soft(element).toHaveText('Saved');
```

**Различие:**
- #13: `expect(locator).toBeVisible()` — нет `await` на самом ассерте
- antipatterns #8: `page.reload()` — нет `await` на вызове Playwright API
- reliability #1 / #11: `expect(await locator.textContent()).toBe()` — `await` есть, но паттерн неверный (single-shot)

**Аннотация:**
```ts
// CRITICAL: Missing await on expect() — assertion is a no-op (Promise is truthy)
// FIX: Add await: await expect(element).toBeVisible()
expect(element).toBeVisible();
```

---

## 14. Conditional Assertions That Silently Skip (SEVERITY: HIGH)

**Что искать:** Ассерты в `if` блоках где условие может быть false — ассерт молча не выполняется. Тест проходит, но ничего не верифицировало.

**BAD:**
```ts
const isVisible = await element.isVisible();
if (isVisible) {
    await expect(element).toHaveText('Expected');
}

// BAD — try/catch проглатывает assertion failures
try {
    await expect(element).toHaveText('Expected');
} catch {
    // Silently swallowed — test passes with no verification
}
```

**GOOD:**
```ts
// Assert unconditionally
await expect(element).toBeVisible();
await expect(element).toHaveText('Expected');

// Или если элемент действительно может быть или не быть:
await expect.soft(element, "Element should be visible for this test path").toBeVisible();
await expect.soft(element, "Element should have expected text").toHaveText('Expected');
```

**Не флажить:**
- Conditionals проверяющие ДРУГОЕ условие для выбора какого ассерта запустить (branching logic, не skipping)
- `if (process.env.FEATURE_FLAG)` type guards намеренно пропускающие тесты в некоторых env

**Аннотация:**
```ts
// HIGH: Assertion inside if-block — silently skips if condition is false
// FIX: Assert unconditionally, or use expect.soft() to report when skipped
if (isVisible) {
```

---

## 15. Type Coercion in Assertions (SEVERITY: CRITICAL)

**Что искать:** `.toBe(true)` / `.toBe(false)` на значении, которое на самом деле строка (`"true"` / `"false"`). С strict equality `"true" !== true` — ассерт всегда фейлит. С `expect.soft()` — фейлит **молча** (тест продолжается, soft failure может игнорироваться в отчетах).

**Паттерн:**
```ts
// BAD — getAttribute возвращает string "true", .toBe(true) ожидает boolean
expect.soft(await el.getAttribute('aria-checked')).toBe(true);   // "true" !== true → FAIL
expect.soft(await el.getAttribute('aria-expanded')).toBe(false);  // "false" !== false → FAIL

// ОЧЕНЬ ПЛОХО с soft — failure silent
expect.soft(someStringValue).toBe(true);  // Всегда фейлит, никогда не репортится
```

**GOOD:**
```ts
// Compare strings to strings
expect.soft(await el.getAttribute('aria-checked')).toBe("true");
expect.soft(await el.getAttribute('aria-expanded')).toBe("false");

// ЛУЧШЕ — Playwright attribute assertion
await expect.soft(el).toHaveAttribute('aria-checked', 'true');
```

**Где случается:** Любой ассерт на результате `getAttribute()`, `textContent()`, `inputValue()`, `evaluate()` возвращающих string.

**Аннотация:**
```ts
// CRITICAL: Type coercion — getAttribute returns "true" (string), .toBe(true) expects boolean
// FIX: Use .toBe("true") or await expect(el).toHaveAttribute('aria-checked', 'true')
expect.soft(await el.getAttribute('aria-checked')).toBe(true);
```

---

## 16. Discarded Return Values (SEVERITY: HIGH)

**Что искать:** `await` метода, возвращающего значение, но результат не используется. Частый кейс: `await locator.isVisible();` как standalone statement — эвалюирует, но boolean выбрасывается.

**BAD:**
```ts
await element.isVisible();  // Не ассертит ничего
await element.textContent();
await elements.count();
```

**GOOD:**
```ts
await expect(element).toBeVisible();
await expect(element).toHaveText('expected');
await expect(elements).toHaveCount(expectedCount);
```

**Различие с #13:** Нет `expect()` вообще, просто standalone call → **#16**. Есть `expect()` но нет `await` → **#13**.

**Не флажить:**
- Return values assigned: `const text = await el.textContent();` — intentional
- Методы для side effects (`await page.goto()` — navigation is the point)

**Аннотация:**
```ts
// HIGH: await el.isVisible() — result discarded, this doesn't assert anything
// FIX: Use await expect(el).toBeVisible() to actually verify visibility
await element.isVisible();
```

---

## 17. Missing Data Load Wait After Navigation/Filter (SEVERITY: CRITICAL)

**Что искать:** Переход к списку записей или фильтрация без ожидания загрузки данных. Тест кликает "перейти" или вводит фильтр — и сразу ищет строку в таблице. Данные ещё не подгрузились.

**Паттерны:**
- Переход на страницу списка → сразу `getByRole('row', { name: email })` → FAIL (данные не загрузились)
- Ввод email в search → сразу `getByRole('row', { name: email })` → FAIL (фильтр не применился)
- Создание записи → возврат на список → сразу проверка строки → FAIL (список не обновился)
- Удаление записи → возврат на список → сразу проверка что строки нет → FAIL (список не обновился)

**BAD:**
```ts
// Переход на страницу → сразу ищем запись
await coachPage.goto();
await expect(coachPage.getCoachRow(COACH_EMAIL)).toBeVisible();  // FAIL: данные не загрузились

// Поиск → сразу проверяем результат
await coachPage.searchInput.fill(COACH_EMAIL);
await expect(coachPage.getCoachRow(COACH_EMAIL)).toBeVisible();  // FAIL: фильтр не применился
```

**GOOD:**
```ts
// Переход на страницу → ждём появления heading (данные загрузились)
await coachPage.goto();
await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });
// Если нужно проверить конкретную запись — ищем через поиск
await coachPage.searchInput.fill(COACH_EMAIL);
await expect(coachPage.page.getByRole('row', { name: COACH_EMAIL, exact: false })).toBeVisible({ timeout: TIMEOUTS.long });

// Создание → возврат на список → ждём обновления
await createButton.click();
await expect(successMessage).toBeVisible();
await listButton.click();
await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });
// Проверяем запись через поиск
await coachPage.searchInput.fill(COACH_EMAIL);
await expect(coachPage.page.getByRole('row', { name: COACH_EMAIL, exact: false })).toBeVisible({ timeout: TIMEOUTS.long });
```

**Правила:**
1. **После `goto()`** — всегда ждать `heading` или `newButton` (признак загрузки данных)
2. **После `fill(searchInput)`** — искать запись через `getByRole('row', { name: email })`, не через `getCoachRow(email)` (который ищет по `hasText` в row)
3. **После create/update/delete** — ждать подтверждения действия, затем возвращаться на список и ждать `heading`
4. **Длинные email** — могут обрезаться в grid, использовать поиск для точного совпадения

**Аннотация:**
```ts
// CRITICAL: Searching for row in table immediately after navigation — data may not be loaded
// FIX: Wait for heading first, then use search input to find the record
await expect(coachPage.getCoachRow(COACH_EMAIL)).toBeVisible();
```

---

## Tie-Break Rules

- **#1 vs #11:** Если `expect(await locator.textContent())` сразу после действия → **#1 (Race condition)**. Если standalone → **#11 (Non-retrying)**.
- **#3 vs #4:** Weak assertions + не match title → **#4 (Assertion-title mismatch)**. Только слабые ассерты → **#3**.
- **#2 vs #5:** Fragile selector inline в спеке → **#5 (Inline locator)**. В PO → **#2 (Fragile selector)**.
- **#13 vs #1 vs #11:** Нет `await` на expect() → **#13**. Есть `await`, но неверный паттерн → **#1** или **#11** по контексту.
- **#14 vs #3:** Assertion в conditional → **#14**. Без conditional но shallow → **#3**.
- **#15 vs #11:** Wrong type comparison (string vs boolean) → **#15**. Wrong pattern (non-retrying) → **#11**.
- **#16 vs #13:** Нет `expect()` совсем, просто standalone call → **#16**. Есть `expect()` но нет `await` → **#13**.

**Master rule:** Нет `await` на любом ассерте с Playwright matcher → **CRITICAL**, перекрывает все категории. Это самый влиятельный баг: ассерт буквально не выполняется.

**Никогда не double-annotate одну строку. Выбирай самый специфичный.**

---

## Использование в 04-test-review-and-fixes.md

1. Открыть тест + используемые PO
2. Пройти по пунктам 1-17
3. Каждое нарушение → inline annotation `// SEVERITY: ...` + `// FIX: ...`
4. Обновить summary block в начале файла
5. Cap: 20 аннотаций за запуск. Overflow → в chat report
6. Idempotent: не дублировать существующие аннотации на тех же строках