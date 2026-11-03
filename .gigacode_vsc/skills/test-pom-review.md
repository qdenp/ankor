# test-pom-review.md — Page Object Review Checklist для Ankor

Адаптирован из e2e-pom-review. Проверяет качество Page Object файлов в `tests/pages/`.

Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review PO.

**Scope:** Весь PO файл. Прямые импорты только если это другие PO или shared utilities вызванные методами этого файла.

**Cap:** 15 аннотаций за запуск. Overflow → в отчёт.

---

## 1. Hard-Coded Waits Inside Methods (SEVERITY: HIGH)

**Что искать:** `page.waitForTimeout(ms)` или эквивалентные hard waits зарытые внутри PO методов. Callers не знают про hidden delay, он множится во всех тестах вызывающих метод.

**В проекте (base-page.ts):**
- Lines 82-84: `waitForElement` — принимает `timeout`, делает `waitFor({ state: 'visible', timeout })`
- Lines 87-89: `waitForElementGone` — принимает `timeout`, делает `waitFor({ state: 'hidden', timeout })`

Эти методы скрывают ожидание. Callers думают что это быстрая проверка, а внутри — wait.

**BAD (pattern):**
```ts
// BAD — hidden 5s wait inside reusable method
async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ timeout, state: 'visible' });
}
```

**GOOD:** Убрать методы. Callers должны использовать Playwright built-in assertions со своими таймаутами:
```ts
// GOOD — callers используют auto-retrying expect с явными таймаутами
await expect(locator).toBeVisible({ timeout: 5000 });
await expect(locator).not.toBeVisible({ timeout: 5000 });
```

**Не флажить:**
- Явные таймауты на `waitFor()` / `waitForResponse()` намеренно tuned для конкретных медленных операций (file upload)
- `waitForLoadState()` вызовы — это event-based, не time-based

**Аннотация:**
```ts
// HIGH: Hidden wait with configurable timeout — multiplied across every caller
// FIX: Remove method; callers should use await expect(locator).toBeVisible({ timeout: X })
async waitForElement(locator: Locator, timeout?: number): Promise<void> {
```

---

## 2. Missing `await` on Internal Calls (SEVERITY: CRITICAL)

**Что искать:** Async Playwright API вызовы внутри PO методов без `await`. Call fires но метод продолжает без ожидания завершения.

**Паттерн:**
```ts
// BAD — click fires но метод не ждет
async closeDialog() {
    this.closeButton.click();  // Missing await!
    this.page.waitForTimeout(1000);  // Also missing await!
}
```

**GOOD:**
```ts
async closeDialog() {
    await this.closeButton.click();
    await this.page.waitForLoadState('domcontentloaded');
}
```

**В проекте:** Проверить все методы в `base-page.ts` и конкретных PO. Особенно `clickButton`, `fillInput`, `selectOption`, `click`, `clickLink`, `click` (line 97-99).

**Аннотация:**
```ts
// CRITICAL: Missing await on click() — fires without waiting for completion
// FIX: Add await before this.closeButton.click()
this.closeButton.click();
```

---

## 3. Fragile Selectors in Constructor (SEVERITY: HIGH)

**Что искать:** Локаторы в конструкторе использующие хрупкие стратегии селекторов, ломающиеся при DOM изменениях.

**Хрупкие паттерны:**
- XPath с positional axes: `//div[3]/button`
- Глубокое CSS nesting: `div.parent > div.child > span.text`
- Class-based селекторы только для стилей: `.mat-button-wrapper`
- Index-based: `.locator('button').nth(2)` в конструкторе

**В проекте (base-page.ts line 19):**
```ts
this.profileButton = page.locator('[role="button"]:has(svg), [role="button"]:has(img), [role="button"]:has(.MuiAvatar-root)').first();
```
Сложный селектор с `:has()` и `.first()` — флажить как потенциально хрупкий. Лучше: `page.getByRole('button', { name: 'User menu' })` или `data-testid`.

**Стабильные альтернативы:**
- `page.getByRole('button', { name: 'Submit' })` — accessibility-based
- `page.getByTestId('submit-btn')` — explicit test hook
- `page.locator('[data-testid="value"]')` — test attribute
- `page.getByText('Submit')` — стабильный видимый текст

**Не флажить:**
- `.locator('[role="dialog"]')` или похожие ARIA-based — стабильны
- Селекторы с `data-testid` или `data-test` атрибутами
- `.first()` / `.last()` когда порядок гарантирован приложением

**Аннотация:**
```ts
// HIGH: Complex :has() selector with .first() — breaks if DOM structure changes
// FIX: Use getByRole, getByTestId, or data-attribute selector
this.profileButton = page.locator('[role="button"]:has(svg), [role="button"]:has(img), [role="button"]:has(.MuiAvatar-root)').first();
```

---

## 4. Methods That Swallow Errors (SEVERITY: HIGH)

**Что искать:** `try/catch` блоки ловящие ошибки и возвращающие дефолтное значение (false, null, empty string) вместо проброса ошибки. Это скрывает реальные фейлы — тест проходит но фича сломана.

**В проекте (base-page.ts lines 77-79):**
```ts
async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
}
```
Возвращает `boolean` вместо ассерта. Caller делает `if (await po.isVisible(...))` — если элемент не виден, тест продолжается без фейла, баг скрыт.

**BAD pattern:**
```ts
async isElementPresent(locator: Locator): Promise<boolean> {
    try {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        return true;
    } catch (error) {
        return false;  // Swallowed: could be timeout, could be real bug
    }
}
```

**GOOD:** Убрать метод. Callers должны использовать Playwright built-in negative assertions:
```ts
// Expect present:
await expect(locator).toBeVisible();
// Expect absent:
await expect(locator).not.toBeVisible();
```

**Различие от #1:** Если метод Имеет И hard wait И error swallowing → **#4 (error swallowing)** — hidden failure хуже hidden wait.

**Не флажить:**
- try/catch логирующий ошибку и re-throwing
- try/catch вокруг cleanup кода в `afterEach`-style методах где фейл ожидаем

**Аннотация:**
```ts
// HIGH: Method returns boolean instead of asserting — hides real failures from callers
// FIX: Remove method; callers should use await expect(locator).toBeVisible() / not.toBeVisible()
async isVisible(locator: Locator): Promise<boolean> {
```

---

## 5. isVisible Wrappers Hiding Waits (SEVERITY: HIGH)

**Что искать:** Методы названные `isVisible`, `isPresent`, `isDisplayed`, `elementExists` которые внутри используют `waitForTimeout` или `waitFor` с таймаутом перед проверкой видимости. Имя говорит "quick check", но секретно ждет.

**В проекте (base-page.ts):**
- Lines 77-79: `isVisible` — просто `locator.isVisible()` без wait (но возвращает boolean — см. #4)
- Lines 82-84: `waitForElement` — именуется как wait, но callers могут не ожидать wait
- Lines 92-94: `getText` — возвращает `textContent()`, скрывает что элемент может быть stale
- Lines 101-104: `getCount` — возвращает `count()`, скрывает что список может быть пустым

**Паттерн:**
```ts
// BAD — name says "is visible?" но на самом деле ждет 5 секунд
async isElementPresent(locator: Locator): Promise<boolean> {
    await this.page.waitForTimeout(5000);
    return await locator.isVisible();
}
```

**FIX:** Убрать метод. Использовать Playwright assertions напрямую:
```ts
// Expect visible:
await expect(locator).toBeVisible({ timeout: 5000 });
// Expect not visible:
await expect(locator).not.toBeVisible({ timeout: 5000 });
```

**Различие от #1:** Если метод primary purpose — checking visibility И имеет hidden wait → **#5**. Если метод делает что-то другое (click, fill, navigate) и имеет wait → **#1**.

**Аннотация:**
```ts
// HIGH: waitForElement hides configurable wait — callers may not expect delay
// FIX: Remove method; use await expect(locator).toBeVisible({ timeout: X })
async waitForElement(locator: Locator, timeout?: number): Promise<void> {
```

---

## 6. Overly Complex Methods (SEVERITY: MEDIUM)

**Что искать:** Один PO метод делающий слишком много — click + fill + navigate + wait + assert. Трудно реюзать, трудно дебажить, скрывает intent теста.

**Признаки:**
- Метод 20+ строк
- 4+ distinct Playwright actions (click, fill, goto, waitFor, etc.)
- Метод включает assertions (`expect()`) — PO должен expose state, не ассертить
- Имя метода не четко описывает что делает

**В проекте (base-page.ts lines 107-125): `openProfileMenu` — 18 строк, 3 фоллбека, сложная логика:**
```ts
async openProfileMenu(): Promise<void> {
    // Try primary profile button (avatar in header)
    if (await this.profileButton.isVisible({ timeout: 3000 })) {
        await this.profileButton.click({ timeout: TIMEOUTS.medium });
    } else {
        // Fallback: button with avatar/icon in header area
        let fallbackButton = this.page.locator('header [role="button"]:has(svg), header [role="button"]:has(img), header [role="button"]:has(.MuiAvatar-root)').first();
        if (await fallbackButton.isVisible({ timeout: 3000 })) {
            await fallbackButton.click({ timeout: TIMEOUTS.medium });
        } else {
            // Fallback 2: any button in header with aria-haspopup or aria-expanded (menu trigger)
            fallbackButton = this.page.locator('header [role="button"][aria-haspopup="true"], header [role="button"][aria-expanded]').first();
            await fallbackButton.click({ timeout: TIMEOUTS.medium });
        }
    }
    
    // Wait for dropdown menu
    await expect(this.logoutMenuItem).toBeVisible({ timeout: TIMEOUTS.medium });
}
```

**FIX:** Разбить на меньшие single-purpose методы. Вынести фоллбеки в отдельные приватные методы.

**Не флажить:**
- Методы выполняющие single multi-step UI interaction (заполнение формы с 5 полями)
- Методы genuinely one logical operation несмотря на длину

**Аннотация:**
```ts
// MEDIUM: Method does multiple fallbacks + click + wait + assert — too many responsibilities
// FIX: Split into smaller methods; move assertions to the spec; extract fallback logic
async openProfileMenu(): Promise<void> {
```

---

## Tie-Break Rules

- **#1 vs #5:** Если метод имеет `waitForTimeout` И является `isVisible`/`isPresent` wrapper → **#5** (hidden wait — специфичная проблема). Если wait в non-visibility методе → **#1**.
- **#3 vs #6:** Если один локатор селектор хрупкий → **#3**. Если метод делает слишком много независимо от селекторов → **#6**.
- **#2 vs #4:** Если missing `await` внутри try/catch swallowing error → **#4** (error swallowing вреднее missing await alone).

**Никогда не double-annotate одну строку. Выбирай самый специфичный.**

---

## Execution Rules

1. **Read first.** Прочитать целевой PO файл полностью перед аннотированием.
2. **Annotate source file.** Использовать Edit tool для вставки severity annotations прямо в код.
3. **Don't modify logic.** Только комментарии — никогда не менять, не двигать, не удалять код.
4. **One pair per problem.** Каждое finding → ровно один severity comment + один fix comment.
5. **Skip clean code.** Если секция чистая — не добавлять похвалы.
6. **Trace base classes.** Если PO extends BasePage, прочитать BasePage проверить не оттуда ли проблемы.
7. **Idempotency.** Если файл уже имеет severity annotations от предыдущего запуска, НЕ добавлять дубликаты для той же проблемы на той же строке.
8. **Line numbers.** Точные line numbers когда возможно. Если файл сдвинулся во время аннотации — использовать "near `methodName()`" как fallback.
9. **After annotating,** вывести summary report в chat.

---

## Summary Report Format

```
## PO Review: [filename]

### Annotations Added: X total

### Critical
- Line X: [one-line description]

### High
- Line X: [one-line description]

### Medium
- Line X: [one-line description]

### Low
- Line X: [one-line description]

### Summary
- X critical, X high, X medium, X low
- Impact: [reliability / maintainability / performance]
- Files annotated: [list]
```

---

## Файлы для ревью в проекте

```
tests/pages/base-page.ts           ← highest priority (found issues: #1, #2, #3, #4, #5, #6)
tests/pages/athlete-page.ts
tests/pages/coach-page.ts
tests/pages/parent-page.ts
tests/pages/plan-page.ts
tests/pages/organization-page.ts
tests/pages/team-page.ts
tests/pages/sign-in-page.ts
tests/pages/sign-up-page.ts
tests/pages/home-page.ts
```