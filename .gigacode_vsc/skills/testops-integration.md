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

### 3. MCP-инструменты (для агентов)
Сервер `https://rallyup.testops.cloud/api/mcp` подключён для обоих агентов, токен в обоих случаях из `TESTOPS_AUTH_HEADER`:
- **GigaCode** — `.gigacode_vsc/gigacode.jsonc` (через `npx mcp-remote`);
- **Claude Code** — `.mcp.json` в корне (HTTP напрямую). При первом запуске Claude Code спросит, одобрить ли сервер `allure-testops`.

Инструменты только для чтения — использовать свободно:
- `testops_find_testcases` — поиск тест-кейсов (по `test_case_id`, названию)
- `testops_find_testresults` — поиск прогонов
- `testops_find_sharedsteps`, `testops_get_project`, `testops_get_issue_details`

Инструменты, которые **меняют данные TestOps** (общие для команды) — только по явной просьбе пользователя:
`testops_create_testcase`, `testops_update_testcase`, `testops_delete_testcase`, `testops_restore_testcase`,
`testops_create_sharedstep`, `testops_update_sharedstep`, `testops_create_mute`, `testops_delete_mute`.

**Настройка токена (один раз на машине).** MCP-сервер настроен в `.gigacode_vsc/gigacode.jsonc` и берёт заголовок авторизации из пользовательской переменной окружения `TESTOPS_AUTH_HEADER`. Токен в репозиторий не коммитить.
```powershell
[Environment]::SetEnvironmentVariable('TESTOPS_AUTH_HEADER', 'api-token <TOKEN>', 'User')
```
После этого полностью перезапустить VS Code, чтобы он подхватил переменную.

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
