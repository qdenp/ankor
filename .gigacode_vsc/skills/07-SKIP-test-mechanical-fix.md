# Скилл: Механические Фиксы (Заготовка — не используется)

## Назначение
Автоматическое исправление **только механических** ошибок, найденных Ревью (04). Работает по аннотациям `// CRITICAL:`, `// HIGH:`, `// FIX:`.

## Когда использовать
**ПОКА НЕ ИСПОЛЬЗУЕТСЯ** — для личной практики ручной фикс быстрее и полезнее.
Активировать когда: команда, CI, много тестов, разделение ролей writer/reviewer.

## Порядок в пайплайне
```
03: Writer
04: Review        → ставит аннотации
07: Mech Fix      → авто-фиксит механическое, удаляет аннотации
05: Harvester     → анализирует остальное
```

## Hard Rule
Фикс применяется **ТОЛЬКО** когда ОБА условия:
1. Над строкой есть аннотация от 04 (`// CRITICAL:`/`// HIGH:`/`// MEDIUM:`/`// LOW:` + `// FIX:`)
2. Паттерн попадает в таблицу ниже (10 паттернов)

Иначе — не трогать. Никаких "пока тут" улучшений.

---

## 10 Паттернов автофикса (Included Fix Patterns)

### Fix 1: Missing `await` on Playwright calls
| Before | After |
|---|---|
| `page.reload();` | `await page.reload();` |
| `page.goto(url);` | `await page.goto(url);` |
| `page.close();` | `await page.close();` |
| `locator.click();` | `await locator.click();` |
| `locator.fill(value);` | `await locator.fill(value);` |

Только standalone statements — не assigned, не returned, не уже в `await`.

### Fix 2: Missing `await` on `expect()` assertions
| Before | After |
|---|---|
| `expect(el).toBeVisible();` | `await expect(el).toBeVisible();` |
| `expect(el).toHaveText('X');` | `await expect(el).toHaveText('X');` |
| `expect(el).toHaveValue('X');` | `await expect(el).toHaveValue('X');` |
| `expect(el).toHaveCount(3);` | `await expect(el).toHaveCount(3);` |
| `expect(el).toBeEnabled();` | `await expect(el).toBeEnabled();` |
| `expect(el).not.toBeVisible();` | `await expect(el).not.toBeVisible();` |
| `expect.soft(el).toBeVisible();` | `await expect.soft(el).toBeVisible();` |

`.soft` сохранять — не превращать в hard.

### Fix 3: Non-retrying text assertions
| Before | After |
|---|---|
| `expect(await el.textContent()).toBe('X')` | `await expect(el).toHaveText('X')` |
| `expect(await el.textContent()).toContain('X')` | `await expect(el).toContainText('X')` |
| `expect(await el.innerText()).toBe('X')` | `await expect(el).toHaveText('X')` |

### Fix 4: Non-retrying visibility assertions
| Before | After |
|---|---|
| `expect(await el.isVisible()).toBe(true)` | `await expect(el).toBeVisible()` |
| `expect(await el.isVisible()).toBe(false)` | `await expect(el).not.toBeVisible()` |
| `expect(await el.isVisible()).toBeTruthy()` | `await expect(el).toBeVisible()` |
| `expect(await el.isHidden()).toBe(true)` | `await expect(el).toBeHidden()` |

### Fix 5: Non-retrying value assertions
| Before | After |
|---|---|
| `expect(await el.inputValue()).toBe('X')` | `await expect(el).toHaveValue('X')` |
| `expect(await el.inputValue()).toContain('X')` | `await expect(el).toHaveValue(/X/)` |

### Fix 6: Non-retrying count assertions
| Before | After |
|---|---|
| `expect(await el.count()).toBe(3)` | `await expect(el).toHaveCount(3)` |
| `expect(await el.count()).toBeGreaterThan(0)` | `await expect(el).not.toHaveCount(0)` |

### Fix 7: Non-retrying attribute assertions
| Before | After |
|---|---|
| `expect(await el.getAttribute('X')).toBe('Y')` | `await expect(el).toHaveAttribute('X', 'Y')` |
| `expect(await el.getAttribute('X')).toContain('Y')` | `await expect(el).toHaveAttribute('X', /Y/)` |

### Fix 8: Asserting on Locator object (no-op)
| Before | After |
|---|---|
| `expect(locator).toBeTruthy()` | `await expect(locator).toBeVisible()` |
| `expect(locator).toBeDefined()` | `await expect(locator).toBeVisible()` |
| `expect.soft(locator).toBeTruthy()` | `await expect.soft(locator).toBeVisible()` |

Locator всегда truthy — intent был visibility.

### Fix 9: Type coercion in assertions
| Before | After |
|---|---|
| `expect.soft(await el.getAttribute('X')).toBe(true)` | `expect.soft(await el.getAttribute('X')).toBe("true")` |
| `expect.soft(await el.getAttribute('X')).toBe(false)` | `expect.soft(await el.getAttribute('X')).toBe("false")` |
| `.toBe(true)` на известном string | `.toBe("true")` |
| `.toBe(false)` на известном string | `.toBe("false")` |

Только когда LHS — known string (`getAttribute`, `textContent`, `inputValue`).

### Fix 10: Discarded boolean return values
| Before | After |
|---|---|
| `await locator.isVisible();` (statement) | `await expect(locator).toBeVisible();` |
| `await locator.isHidden();` (statement) | `await expect(locator).toBeHidden();` |
| `await locator.isEnabled();` (statement) | `await expect(locator).toBeEnabled();` |
| `await locator.isDisabled();` (statement) | `await expect(locator).toBeDisabled();` |

Не применять если assigned: `const visible = await locator.isVisible();` — intentional.

---

## Explicitly EXCLUDED (Не фиксить — требуют judgement)

| Категория | Почему не механическая |
|---|---|
| `waitForTimeout` removal | Нужен контекст: что тест ждёт, чем заменить |
| Fragile selector replacement | Требует DOM знаний приложения |
| Inline locator → PO extraction | Требует выбора destination PO и naming |
| Adding new PO methods/locators | Затрагивает другие файлы |
| Timeout bumps | Контекстуально: surface, network, precedent |
| Soft → hard assertion conversions | Иногда soft правильный (independent checks) |
| Test step reordering | Меняет execution semantics |
| Cross-test data dependency changes | Структурно, влияет на sibling тесты |

Оставить аннотацию, добавить `[manual review needed]` в `// FIX:` line.

---

## Annotation Handling
- После успешного фикса: **удалить** severity comment + `// FIX:` line
- `// ACCEPTABLE:` — **никогда** не трогать код под ними, не удалять аннотацию
- Excluded categories: оставить severity, добавить `[manual review needed]` в `// FIX:`
- Summary block: обновить counts, нормализовать формат

---

## Execution Rules
1. Read entire file first, catalogue every annotation
2. Never edit unannotated lines
3. Never expand scope (one spec file per invocation)
4. Apply in severity order: CRITICAL → HIGH → MEDIUM → LOW
5. Match pattern exactly — no "close enough"
6. Run lint after: `npx eslint <file> --quiet` (or project lint)
7. Emit fix report to chat

---

## Stop Conditions
- No annotations → instruct: run 04 first
- Annotations exist but none match Included → report categories, recommend manual
- Lint fails → stop, report failure
- File missing or not `.spec.ts`

---

## Формат вывода (Fix Report)
```
## Fix Report: <filename>

### Fixed (N)
- L45 — Missing await — `page.reload();` → `await page.reload();`
- L102 — Non-retrying text — `expect(await el.textContent()).toBe('X')` → `await expect(el).toHaveText('X')`

### Skipped — excluded categories (N)
- L78 — Hard-coded wait — context-dependent, manual review needed
- L210 — Fragile selector — requires DOM knowledge, manual review needed

### Summary
- Fixed: N, Skipped: N, Remaining annotations: N
- Lint: PASS | FAIL (details)
```