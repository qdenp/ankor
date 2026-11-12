# test-pom-review.md — Page Object Review Checklist для Ankor

Адаптирован из e2e-pom-review. Проверяет качество Page Object файлов в `tests/pages/`.

Используется в **04-test-review-and-fixes.md** (Шаг 2) для cold review PO.

**Scope:** Весь PO файл. Прямые импорты только если это другие PO или shared utilities вызванные методами этого файла.

**Cap:** 15 аннотаций за запуск. Overflow → в отчёт.

---

## 1. Hard-Coded Waits Inside Methods (SEVERITY: HIGH)

**Что искать:** `page.waitForTimeout(ms)` или эквивалентные hard waits зарытые внутри PO методов. Callers не знают про hidden delay, он множится во всех тестах вызывающих метод.

**В проекте (`base-page.ts`):**
- `waitForElement` — принимает `timeout`, делает `waitFor({ state: 'visible', timeout })`
- `waitForElementGone` — принимает `timeout`, делает `waitFor({ state: 'hidden', timeout })`

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

**В проекте:** Проверить все методы в `base-page.ts` и конкретных PO. Особенно обёртки `selectOption`, `click` и методы с несколькими действиями подряд (`createScorecard`, `deleteDraftsCreatedSince`, `fillAthleteForm`).

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

**В проекте (`base-page.ts`, `profileButton`):**
```ts
this.profileButton = page
  .getByRole('button', { name: /profile|user|account|username/i })
  .or(page.locator('[role="button"]:has(svg)'))
  .or(page.locator('[role="button"]:has(img)'))
  .or(page.locator('[role="button"]:has(.MuiAvatar-root)'))
  .first();
```
Цепочка с `:has(svg)` и `.first()` совпадает с любой кнопкой-иконкой — флажить как потенциально хрупкий. Кнопка профиля называется именем пользователя (например, `Parent User`), поэтому лучше привязка к имени из `CREDENTIALS` или `data-testid`.

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
// HIGH: :has(svg) fallback with .first() matches any icon button — breaks if DOM structure changes
// FIX: Use getByRole with the user's name, getByTestId, or data-attribute selector
.or(page.locator('[role="button"]:has(svg)'))
```

---

## 4. Methods That Swallow Errors (SEVERITY: HIGH)

**Что искать:** `try/catch` блоки ловящие ошибки и возвращающие дефолтное значение (false, null, empty string) вместо проброса ошибки. Это скрывает реальные фейлы — тест проходит но фича сломана.

**В проекте (`athlete-page.ts`, аналогично `isCoachExists` / `isParentExists`):**
```ts
async isAthleteExists(email: string): Promise<boolean> {
    return await this.athleteRows.filter({ hasText: email }).first().isVisible({ timeout: TIMEOUTS.short });
}
```
Возвращает `boolean` вместо ассерта. Caller делает `if (!await po.isAthleteExists(...))` — если таблица ещё не загрузилась, тест решает «не существует» и идёт по другой ветке, баг скрыт.

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

**Различие от #1:** Если метод имеет и hard wait, и error swallowing → **#4 (error swallowing)** — hidden failure хуже hidden wait.

**Не флажить:**
- try/catch логирующий ошибку и re-throwing
- try/catch вокруг cleanup кода в `afterEach`-style методах где фейл ожидаем

**Аннотация:**
```ts
// HIGH: Method returns boolean instead of asserting — hides real failures from callers
// FIX: Remove method; callers should use await expect(locator).toBeVisible() / not.toBeVisible()
async isAthleteExists(email: string): Promise<boolean> {
```

---

## 5. isVisible Wrappers Hiding Waits (SEVERITY: HIGH)

**Что искать:** Методы названные `isVisible`, `isPresent`, `isDisplayed`, `elementExists` которые внутри используют `waitForTimeout` или `waitFor` с таймаутом перед проверкой видимости. Имя говорит "quick check", но секретно ждет.

**В проекте:**
- `isAthleteExists` / `isParentExists` — `isVisible({ timeout })`: имя говорит «быстрая проверка», но ждёт до `TIMEOUTS.short` (и возвращает boolean — см. #4)
- `base-page.ts` `waitForElement` — именуется как wait, но callers могут не ожидать wait
- `base-page.ts` `getText` — возвращает `textContent()` один раз, без авто-ретрая
- `base-page.ts` `getCount` — возвращает `count()` один раз, скрывает, что список мог ещё не загрузиться

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

**В проекте (`scorecard-template-page.ts`): `fillFirstCategory` / `addAndFillCategory` — ~40 строк, ветвление по количеству опций, логика продублирована в двух методах:**
```ts
await videoSelect.click();
await expect(this.page.getByRole('option').first()).toBeVisible({ timeout: TIMEOUTS.medium });

const options = this.page.getByRole('option');
const optionCount = await options.count();

if (optionCount > 0) {
  if (params.videoName) {
    await options.filter({ hasText: params.videoName }).first().click();
  } else {
    await options.first().click();
  }
} else {
  // Мёртвая ветка: выше уже дождались, что опция есть
  await this.page.keyboard.press('Escape');
}
```

**FIX:** Разбить на меньшие single-purpose методы (`fillCategory(index, …)`, `selectLinkedVideo(name?)`), убрать недостижимую ветку и дублирование.

**Не флажить:**
- Методы выполняющие single multi-step UI interaction (заполнение формы с 5 полями)
- Методы genuinely one logical operation несмотря на длину

**Аннотация:**
```ts
// MEDIUM: Method fills category + skill + video with branching duplicated in addAndFillCategory
// FIX: Split into smaller methods; remove the unreachable branch and the duplication
async fillFirstCategory(params: {
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
tests/pages/base-page.ts           ← highest priority: наследуется всеми PO
tests/pages/athlete-page.ts
tests/pages/coach-page.ts
tests/pages/parent-page.ts
tests/pages/plan-page.ts
tests/pages/organization-page.ts
tests/pages/team-page.ts
tests/pages/skill-page.ts
tests/pages/drill-page.ts
tests/pages/scorecard-template-page.ts
tests/pages/evaluation-page.ts
tests/pages/sign-in-page.ts
tests/pages/sign-up-page.ts
tests/pages/home-page.ts
```