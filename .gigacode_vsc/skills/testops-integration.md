# TestOps: кейсы через MCP

Allure TestOps — https://rallyup.testops.cloud, **проект 366** (Ankor). Источник шагов и ожиданий кейсов.

## MCP
Сервер `https://rallyup.testops.cloud/api/mcp`, токен — из пользовательской переменной окружения `TESTOPS_AUTH_HEADER` (`api-token <TOKEN>`; в репозиторий не коммитить):
- GigaCode — `.gigacode_vsc/gigacode.jsonc` (через `npx mcp-remote`);
- Claude Code — `.mcp.json` в корне.

Настройка на новой машине (затем перезапустить VS Code):
```powershell
[Environment]::SetEnvironmentVariable('TESTOPS_AUTH_HEADER', 'api-token <TOKEN>', 'User')
```

**Читать — свободно:** `testops_find_testcases` (`projectId: 366`, `aql: "id = 72600"`, `expand: ["scenario"]` — шаги), `testops_find_testresults` (результаты запуска: `aql: "launch = <id>"`), `testops_get_project`, `testops_find_sharedsteps`.
**Менять** (данные общие для команды) — только по явной просьбе пользователя: `create/update/delete/restore_testcase`, `*_sharedstep`, `*_mute`.

## Номер кейса в тесте
- В тесте — `test_case_id` (например, 72600): `await allure.allureId('72600')` первой строкой (AGENTS §6).
- Номера вида 91XXX — это allure_id из старой выгрузки CSV, в тестах не использовать.
- Выгрузка результатов из CI не переписывает название и поля кейса только благодаря настройке проекта (Settings → Upload → Meta data update policies: `from_test_case` для Name и Custom Fields).
