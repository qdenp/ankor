import * as fs from 'fs';
import * as path from 'path';

/**
 * Хранилище тестовых сущностей между прогонами (REVIEW-PLAN 3.12).
 *
 * Запись на стенде создаёт только тест, который проверяет само создание; остальные тесты (view, edit,
 * права) берут её отсюда. Файл переживает прогон, поэтому зависимый тест работает и когда тест создания
 * в этом прогоне не запускался (`--grep`) или упал — тогда берётся сущность прошлого прогона.
 *
 * Файлы: tests/.data/<role>/<entity>.json (в .gitignore, как tests/.auth). Отдельный файл на роль:
 * проекты ролей идут параллельно и не должны писать в один файл.
 * Хранить стабильный ключ (email / уникальное имя) и текущее отображаемое имя; тест, который меняет
 * сущность (edit), сохраняет её заново — иначе следующий прогон будет искать по старому имени.
 * В CI папки нет (чистый checkout) — там тесты создания идут в том же прогоне.
 */
const DATA_DIR = path.join('tests', '.data');

function entityFile(role: string, entity: string): string {
  return path.join(DATA_DIR, role, `${entity}.json`);
}

/** Сохранить сущность (после успешного создания или изменения) */
export function rememberEntity<T>(role: string, entity: string, data: T): void {
  const file = entityFile(role, entity);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/**
 * Сущность из этого или прошлого прогона. Нет файла — понятная ошибка с названием теста создания.
 * Существует ли сущность на стенде, проверяет сам тест (поиск в списке): её могли деактивировать.
 */
export function recallEntity<T>(role: string, entity: string, createTestTitle: string): T {
  const file = entityFile(role, entity);
  if (!fs.existsSync(file)) {
    throw new Error(`No saved ${role}/${entity} (${file}). Run the create test first: "${createTestTitle}"`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}
