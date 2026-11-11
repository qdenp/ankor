# TestOps Integration — Allure TestOps

## URL
https://rallyup.testops.cloud

## Доступные проекты
Список проектов доступен в TestOps. Уточни ID нужного проекта через веб-интерфейс.

## Как использовать

### 1. Найти тест-кейсы
Открой TestOps и введи в поиск:
- URL: `https://rallyup.testops.cloud`
- Раздел: **Test Cases**
- Поиск по названию, ID или тегу

### 2. Найти прогоны (раны)
- Раздел: **Launches**
- Фильтр по проекту, дате, статусу

### 3. MCP-инструменты (для VS Code агентов)
Если агент работает внутри VS Code с MCP-сервером, доступны инструменты:
- `testops_find_testcases` — поиск тест-кейсов
- `testops_find_testresults` — поиск прогонов

### 4. API (если нужен программный доступ)
```
Base URL: https://rallyup.testops.cloud/api
Authorization: api-token <TOKEN>
```

## Маппинг TC из CSV → TestOps
- `allure_id` из CSV (91XXX/93XXX) = ID тест-кейса в TestOps
- `test_case_id` из CSV = внутренний ID тест-кейса
- В тестах используй `@TC-XXXXX` (test_case_id), НЕ allure_id

## Примеры
- TC 91859 (allure_id) → 72600 (test_case_id) → Create Plan as Administrator/Owner
- TC 91830 (allure_id) → 72679 (test_case_id) → Home page (System Administrator)
- TC 91866 (allure_id) → 71460 (test_case_id) → Create evaluation
