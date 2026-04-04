/**
 * Утилиты для безопасного построения SQL запросов
 * Предотвращает SQL-инъекции при работе с динамическими UPDATE запросами
 */

/**
 * Список разрешённых полей для каждой таблицы (белый список)
 * Это предотвращает SQL-инъекции через имена колонок
 */
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  faq: new Set(['question', 'answer', 'sort_order']),
  pickup_points: new Set(['name', 'address', 'is_active']),
  pages: new Set(['slug', 'title', 'content', 'is_published']),
  promocodes: new Set(['code', 'discount_percent', 'discount_fixed', 'max_uses', 'is_active']),
  products: new Set(['name', 'description', 'price', 'stock', 'category_id', 'brand_id', 'is_active']),
  users: new Set(['role', 'is_blocked', 'phone', 'email']),
};

/**
 * Безопасно строит SET часть UPDATE запроса
 * 
 * @param tableName Имя таблицы (используется для проверки белого списка)
 * @param updates Объект с полями и значениями
 * @returns Кортеж [SET clause, values array, параметр idx для WHERE]
 * 
 * @example
 * const [setClause, values, nextIdx] = buildUpdateSet('users', { email: 'new@example.com', role: 'admin' });
 * // setClause: 'email = $1, role = $2'
 * // values: ['new@example.com', 'admin']
 * // nextIdx: 3
 * 
 * await query(`UPDATE users SET ${setClause} WHERE id = $${nextIdx}`, [...values, userId]);
 */
export function buildUpdateSet(
  tableName: string,
  updates: Record<string, unknown>
): [string, unknown[], number] {
  const allowedFields = ALLOWED_FIELDS[tableName];
  
  if (!allowedFields) {
    throw new Error(`Таблица '${tableName}' не добавлена в белый список ALLOWED_FIELDS`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    // Проверяем, что поле находится в белом списке
    if (!allowedFields.has(key)) {
      throw new Error(
        `Поле '${key}' не разрешено для таблицы '${tableName}'. ` +
        `Разрешённые поля: ${Array.from(allowedFields).join(', ')}`
      );
    }

    // Пропускаем undefined значения
    if (value !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error('Не указаны поля для обновления');
  }

  return [fields.join(', '), values, idx];
}

/**
 * Добавляет новую таблицу в белый список
 * Вызывайте это при добавлении новых таблиц
 * 
 * @param tableName Имя таблицы
 * @param fields Набор разрешённых полей
 */
export function registerAllowedFields(tableName: string, fields: string[]): void {
  ALLOWED_FIELDS[tableName] = new Set(fields);
}
