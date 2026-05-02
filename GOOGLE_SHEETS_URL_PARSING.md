# Google Sheets URL Auto-Parsing Implementation

## Summary
Реализована функция автоматического парсинга URL Google Sheets для извлечения `spreadsheet_id` и `sheet_gid`. Пользователи теперь могут вставить полную ссылку, вместо того чтобы вручную указывать ID и GID.

## What Changed

### Backend Changes

#### 1. `app/services/google_sheets_connector.py`
- **Добавлена функция `parse_google_sheets_url(url: str) -> tuple[str, str]`**
  - Извлекает Spreadsheet ID используя regex: `/spreadsheets/d/([a-zA-Z0-9-_]+)`
  - Извлекает Sheet GID используя regex: `[#&]gid=([0-9]+)` (или 0 по умолчанию)
  - Поддерживает различные форматы URL:
    - `https://docs.google.com/spreadsheets/d/{id}/edit#gid={gid}`
    - `https://docs.google.com/spreadsheets/d/{id}/edit?usp=sharing&gid={gid}`
    - `https://docs.google.com/spreadsheets/d/{id}/edit` (GID = 0)

#### 2. `app/schemas/source.py`
- **Обновлена схема `GoogleSheetsSourceCreateRequest`**
  - Добавлено поле `sheet_url: str | None` для принятия полной ссылки
  - Поля `spreadsheet_id` и `sheet_gid` теперь опциональные
  - Изменено описание: "Can be either direct URL or spreadsheet IDs"
  - Клиент может отправить либо `sheet_url`, либо `spreadsheet_id` + `sheet_gid`

#### 3. `app/api/routes/sources.py`
- **Обновлен маршрут `/api/sources/google-sheets`**
  - Если задана `sheet_url`, парсит её через `parse_google_sheets_url()`
  - Если нет URL, использует прямые `spreadsheet_id` и `sheet_gid`
  - Валидирует, что присутствует хотя бы одно из значений
  - Обработка ошибок парсинга URL с возвратом 400 Bad Request

### Frontend Changes

#### 1. `frontend/src/app/api/sources.ts`
- **Обновлен тип `GoogleSheetsSourceCreatePayload`**
  - Добавлено поле `sheet_url?: string`
  - Поле `spreadsheet_id` теперь опциональное
  - Поле `sheet_gid` теперь опциональное

#### 2. `frontend/src/app/pages/DataSourcesPage.tsx`
- **Обновлено состояние формы Google Sheets**
  - Добавлено поле `sheetUrl` к `googleSheetsForm`
  - Переименовано `spreadsheetId` → `spreadsheetId` для согласованности

- **Обновлена обработка ввода в форме**
  - Единое поле ввода для URL или Spreadsheet ID
  - Автоматическое определение: если текст содержит `docs.google.com`, сохраняется в `sheetUrl`, иначе в `spreadsheetId`
  - GID и Sheet Name остаються опциональными

- **Обновлена функция `handleGoogleSheetsSubmit`**
  - Передает `sheet_url` и/или `spreadsheet_id` на бэкенд
  - Правильно обрабатывает опциональные поля

- **Обновлена UI с новыми placeholder'ами**
  - "Sheet URL or Spreadsheet ID" (вместо только "Spreadsheet ID")
  - "Sheet GID (optional, auto-detected from URL)"

### Tests

#### `backend/tests/test_google_sheets_url_parser.py`
Добавлены 10 комплексных тестов:
- Parse URL с GID
- Parse URL с различным GID значением
- Parse URL с GID в query параметрах
- Parse URL без GID (default 0)
- Parse URL с дефисами и подчеркиваниями в ID
- Parse URL с пробелами
- Ошибка на некорректный URL
- Ошибка на пустой URL
- Parse только Spreadsheet ID
- Parse URL с &gid параметром

**Все 10 тестов успешно прошли.**

## User Experience

### Before
```
Пользователь должен был:
1. Открыть Google Sheets
2. Найти URL: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=0
3. Вручную вырезать ID: 1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU
4. Вручную вырезать GID из URL или из параметра get
5. Вставить оба значения в отдельные поля
```

### After
```
Пользователь теперь:
1. Открыть Google Sheets
2. Скопировать всю ссылку: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=0
3. Вставить в поле "Sheet URL or Spreadsheet ID"
4. Программа автоматически извлекает ID и GID
5. Нажать "Connect"
```

## Backward Compatibility

✅ Полная обратная совместимость:
- Старый способ (передача `spreadsheet_id` и `sheet_gid`) продолжает работать
- Новый способ (передача `sheet_url`) также поддерживается
- Клиент может выбрать удобный для него способ

## Example API Calls

### Method 1: Using URL (NEW)
```bash
curl -X POST http://127.0.0.1:8000/api/sources/google-sheets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d {
    "name": "My Sheet",
    "sheet_url": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=123"
  }
```

### Method 2: Using IDs directly (OLD, still works)
```bash
curl -X POST http://127.0.0.1:8000/api/sources/google-sheets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d {
    "name": "My Sheet",
    "spreadsheet_id": "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU",
    "sheet_gid": "123"
  }
```

## Testing

Запустить тесты:
```bash
cd backend
python -m pytest tests/test_google_sheets_url_parser.py -v
```

Результат: **10/10 tests PASSED** ✅
