import type { NextApiRequest, NextApiResponse } from 'next';
import type { PoolClient } from 'pg';
import { query, transaction } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface ActivateProductRequest {
  price_import_ids: string[];
  final_price: number;
  category_id?: string | null;
  new_category_name?: string | null;
  brand_id?: string | null;
  new_brand_name?: string | null;
  images: string[];
  is_promotion: boolean;
  is_hit: boolean;
  is_new: boolean;
}

interface ActivateProductResponse {
  success?: boolean;
  message?: string;
  activated_count?: number;
  details?: Array<{
    price_import_id: string;
    action: 'created' | 'updated';
    product_id?: string;
    name: string;
  }>;
  error?: string;
}

/**
 * Валидирует входные данные для активации товаров
 * @param body Тело запроса
 * @returns Объект с результатом валидации
 */
function validateActivateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: ActivateProductRequest;
} {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Неверный формат тела запроса' };
  }

  const req = body as Record<string, unknown>;

  // Проверка обязательных полей
  if (!req.price_import_ids || !Array.isArray(req.price_import_ids)) {
    return { valid: false, error: 'Поле price_import_ids обязательно и должно быть массивом' };
  }

  if (req.price_import_ids.length === 0) {
    return { valid: false, error: 'Массив price_import_ids не может быть пустым' };
  }

  if (typeof req.final_price !== 'number' || req.final_price <= 0) {
    return { valid: false, error: 'Поле final_price обязательно и должно быть числом > 0' };
  }

  // Категория: либо category_id, либо new_category_name
  const hasCategory =
    (req.category_id && String(req.category_id).trim()) ||
    (req.new_category_name && String(req.new_category_name).trim());
  if (!hasCategory) {
    return { valid: false, error: 'Выберите категорию или введите новую' };
  }

  // Бренд: либо brand_id, либо new_brand_name
  const hasBrand =
    (req.brand_id && String(req.brand_id).trim()) ||
    (req.new_brand_name && String(req.new_brand_name).trim());
  if (!hasBrand) {
    return { valid: false, error: 'Выберите бренд или введите новый' };
  }

  if (!Array.isArray(req.images)) {
    return { valid: false, error: 'Поле images обязательно и должно быть массивом' };
  }

  const validImages = req.images.filter((img) => String(img).trim().length > 0);
  if (validImages.length === 0) {
    return { valid: false, error: 'Добавьте минимум одно изображение' };
  }

  if (typeof req.is_promotion !== 'boolean') {
    return { valid: false, error: 'Поле is_promotion должно быть булевым' };
  }

  if (typeof req.is_hit !== 'boolean') {
    return { valid: false, error: 'Поле is_hit должно быть булевым' };
  }

  if (typeof req.is_new !== 'boolean') {
    return { valid: false, error: 'Поле is_new должно быть булевым' };
  }

  // Валидация всех элементов в массиве price_import_ids (должны быть числа или строки)
  const validIds = req.price_import_ids.every((id) => {
    return typeof id === 'string' || typeof id === 'number';
  });

  if (!validIds) {
    return {
      valid: false,
      error: 'Все элементы price_import_ids должны быть числами или строками',
    };
  }

  return {
    valid: true,
    data: {
      price_import_ids: req.price_import_ids.map(String),
      final_price: req.final_price,
      category_id: req.category_id ? String(req.category_id).trim() : null,
      new_category_name: req.new_category_name ? String(req.new_category_name).trim() : null,
      brand_id: req.brand_id ? String(req.brand_id).trim() : null,
      new_brand_name: req.new_brand_name ? String(req.new_brand_name).trim() : null,
      images: validImages,
      is_promotion: req.is_promotion,
      is_hit: req.is_hit,
      is_new: req.is_new,
    },
  };
}

/**
 * Получает данные товаров из price_import BATCH запросом (HIGH-002 fix)
 * @param client БД клиент транзакции
 * @param priceImportIds Массив ID в таблице price_import
 * @returns Map ID → данные товара
 */
async function getPriceImportDataBatch(
  client: PoolClient,
  priceImportIds: string[]
): Promise<
  Map<
    string,
    {
      id: string;
      name: string;
      specification: string;
      stock: number;
      price_tier_1: number;
      price_tier_2: number;
      price_tier_3: number;
      distributor_price: number;
      is_activated: boolean;
    }
  >
> {
  if (priceImportIds.length === 0) {
    return new Map();
  }

  try {
    // BATCH запрос вместо N отдельных запросов
    const result = await client.query(
      `SELECT id, name, specification, stock, price_tier_1, price_tier_2, price_tier_3, 
              distributor_price, is_activated
       FROM price_import
       WHERE id = ANY($1::text[])`,
      [priceImportIds]
    );

    const map = new Map();
    result.rows.forEach((row: Record<string, unknown>) => {
      map.set(row.id as string, row);
    });
    return map;
  } catch (err) {
    logger.error('getPriceImportDataBatch error:', err);
    throw err;
  }
}

/**
 * Проверяет наличие товаров в таблице products BATCH запросом (HIGH-002 fix)
 * @param client БД клиент транзакции
 * @param items Массив {name, specification}
 * @returns Map "name|specification" → product.id
 */
async function findExistingProductsBatch(
  client: PoolClient,
  items: Array<{ name: string; specification: string }>
): Promise<Map<string, string>> {
  if (items.length === 0) {
    return new Map();
  }

  try {
    // BATCH запрос для проверки всех товаров сразу
    const names = items.map((i) => i.name);
    const specs = items.map((i) => i.specification);

    const result = await client.query(
      `SELECT id, name, specification 
       FROM products 
       WHERE (name, specification) IN (SELECT * FROM UNNEST($1::text[], $2::text[]))`,
      [names, specs]
    );

    const map = new Map();
    result.rows.forEach((row: Record<string, unknown>) => {
      const key = `${row.name as string}|${row.specification as string}`;
      map.set(key, row.id as string);
    });
    return map;
  } catch (err) {
    logger.error('findExistingProductsBatch error:', err);
    throw err;
  }
}

/**
 * Получает существующий товар из products (используется внутри транзакции)
 * @param client БД клиент транзакции
 * @param name Название товара
 * @param specification Спецификация товара
 * @returns ID товара или null
 */
async function findExistingProduct(
  client: PoolClient,
  name: string,
  specification: string
): Promise<string | null> {
  try {
    const result = await client.query(
      `SELECT id FROM products WHERE name = $1 AND specification = $2 LIMIT 1`,
      [name, specification]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (err) {
    logger.error('findExistingProduct error:', err);
    throw err;
  }
}

/**
 * Получает или создаёт категорию внутри транзакции
 * @param client БД клиент транзакции
 * @param categoryId ID существующей категории или null
 * @param newCategoryName Имя новой категории
 * @returns ID категории
 */
async function getOrCreateCategory(
  client: PoolClient,
  categoryId: string | null,
  newCategoryName: string | null
): Promise<string | null> {
  try {
    if (categoryId) {
      return categoryId;
    }

    if (!newCategoryName || !newCategoryName.trim()) {
      return null;
    }

    // Проверяем, существует ли уже категория с таким именем
    const existing = await client.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [
      newCategoryName.trim(),
    ]);

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Создаём новую категорию
    const result = await client.query(
      'INSERT INTO categories (name, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories)) RETURNING id',
      [newCategoryName.trim()]
    );

    return result.rows[0].id;
  } catch (err) {
    logger.error('getOrCreateCategory error:', err);
    throw err;
  }
}

/**
 * Получает или создаёт бренд внутри транзакции
 * @param client БД клиент транзакции
 * @param brandId ID существующего бренда или null
 * @param newBrandName Имя нового бренда
 * @returns ID бренда
 */
async function getOrCreateBrand(
  client: PoolClient,
  brandId: string | null,
  newBrandName: string | null
): Promise<string | null> {
  try {
    if (brandId) {
      return brandId;
    }

    if (!newBrandName || !newBrandName.trim()) {
      return null;
    }

    // Проверяем, существует ли уже бренд с таким именем
    const existing = await client.query('SELECT id FROM brands WHERE LOWER(name) = LOWER($1)', [
      newBrandName.trim(),
    ]);

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Создаём новый бренд
    const result = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [
      newBrandName.trim(),
    ]);

    return result.rows[0].id;
  } catch (err) {
    logger.error('getOrCreateBrand error:', err);
    throw err;
  }
}

/**
 * Создаёт или обновляет товар в таблице products внутри транзакции
 * @param client БД клиент транзакции
 * @param priceImportData Данные из price_import
 * @param finalPrice Итоговая цена
 * @param categoryId ID категории
 * @param brandId ID бренда
 * @param images Массив URL изображений
 * @param isPromotion Флаг акции
 * @param isHit Флаг хита
 * @param isNew Флаг новинки
 * @returns ID созданного или обновлённого товара
 */
async function createOrUpdateProduct(
  client: PoolClient,
  priceImportData: {
    name: string;
    specification: string;
    stock: number;
  },
  finalPrice: number,
  categoryId: string | undefined,
  brandId: string | undefined,
  images: string[],
  isPromotion: boolean,
  isHit: boolean,
  isNew: boolean
): Promise<{ action: 'created' | 'updated'; productId: string }> {
  try {
    const existingProductId = await findExistingProduct(
      client,
      priceImportData.name,
      priceImportData.specification
    );

    if (existingProductId) {
      // Обновляем существующий товар
      await client.query(
        `UPDATE products 
         SET price = $1, stock = $2, updated_at = NOW()
         WHERE id = $3`,
        [finalPrice, priceImportData.stock, existingProductId]
      );

      return { action: 'updated', productId: existingProductId };
    } else {
      // Создаём новый товар
      const result = await client.query(
        `INSERT INTO products 
         (name, specification, price, stock, category_id, brand_id, images, 
          promotion, is_hit, is_new, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          priceImportData.name,
          priceImportData.specification,
          finalPrice,
          priceImportData.stock,
          categoryId || null,
          brandId || null,
          JSON.stringify(images),
          isPromotion,
          isHit,
          isNew,
          true,
        ]
      );

      return { action: 'created', productId: result.rows[0].id };
    }
  } catch (err) {
    logger.error('createOrUpdateProduct error:', err);
    throw err;
  }
}

/**
 * Отмечает товары в price_import как активированные BATCH запросом (HIGH-002 fix) внутри транзакции
 * @param client БД клиент транзакции
 * @param priceImportIds Массив ID в price_import
 */
async function markAsActivatedBatch(client: PoolClient, priceImportIds: string[]): Promise<void> {
  if (priceImportIds.length === 0) return;

  try {
    await client.query(
      `UPDATE price_import 
       SET is_activated = true, updated_at = NOW()
       WHERE id = ANY($1::text[])`,
      [priceImportIds]
    );
  } catch (err) {
    logger.error('markAsActivatedBatch error:', err);
    throw err;
  }
}

/**
 * Логирует действие админа в таблицу admin_logs
 * @param telegramId Telegram ID админа
 * @param details Детали действия
 */
async function logAdminAction(telegramId: number, details: Record<string, unknown>): Promise<void> {
  try {
    // HIGH-023 FIX: Используем единую таблицу audit_log вместо admin_logs
    await query(
      `INSERT INTO audit_log (user_id, action, target_type, details, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [telegramId, 'activate_products', 'product', JSON.stringify(details), 'success']
    ).catch((err) => {
      logger.error('Logging error:', err);
    });
  } catch (err) {
    logger.error('logAdminAction error:', err);
  }
}

/**
 * POST handler для активации товаров из price_import
 * Принимает массив ID товаров и активирует их в продакшене
 * Все операции выполняются внутри единой транзакции
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActivateProductResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const telegramId = getTelegramId(req);

  try {
    // Валидация входных данных
    const validation = validateActivateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data!;

    // Логируем начало операции (вне транзакции для надёжности логирования)
    await logAdminAction(telegramId, {
      action_type: 'start_activation',
      price_import_ids: data.price_import_ids,
    });

    const details: ActivateProductResponse['details'] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // ============= ГЛАВНАЯ ТРАНЗАКЦИЯ =============
    // ВСЕ INSERT/UPDATE операции находятся внутри этой транзакции
    await transaction(async (client) => {
      const activatedIds: string[] = [];

      // BATCH запрос: получаем все товары из price_import за один запрос (HIGH-002 fix)
      const priceImportMap = await getPriceImportDataBatch(client, data.price_import_ids);

      // Фильтруем валидные товары и подготавливаем данные для поиска
      const validItems: Array<{
        priceImportId: string;
        priceImportData: typeof priceImportMap extends Map<string, infer V> ? V : never;
      }> = [];

      for (const priceImportId of data.price_import_ids) {
        const priceImportData = priceImportMap.get(priceImportId);

        if (!priceImportData) {
          errors.push({ id: priceImportId, error: 'Товар не найден в таблице price_import' });
          continue;
        }

        if (priceImportData.is_activated) {
          errors.push({ id: priceImportId, error: 'Товар уже активирован' });
          continue;
        }

        validItems.push({ priceImportId, priceImportData });
      }

      // BATCH запрос: проверяем существующие товары все за один запрос (HIGH-002 fix)
      await findExistingProductsBatch(
        client,
        validItems.map((v) => ({
          name: v.priceImportData.name,
          specification: v.priceImportData.specification,
        }))
      );

      // Получаем или создаём категорию и бренд один раз (не в цикле)
      const finalCategoryId = await getOrCreateCategory(
        client,
        data.category_id || null,
        data.new_category_name || null
      );
      const finalBrandId = await getOrCreateBrand(
        client,
        data.brand_id || null,
        data.new_brand_name || null
      );

      // Обрабатываем товары с уже полученными данными
      for (const { priceImportId, priceImportData } of validItems) {
        try {
          // Используем уже полученные ID категории и бренда
          const { action, productId } = await createOrUpdateProduct(
            client,
            {
              name: priceImportData.name,
              specification: priceImportData.specification,
              stock: priceImportData.stock,
            },
            data.final_price,
            finalCategoryId || undefined,
            finalBrandId || undefined,
            data.images,
            data.is_promotion,
            data.is_hit,
            data.is_new
          );

          details.push({
            price_import_id: priceImportId,
            action,
            product_id: productId,
            name: priceImportData.name,
          });

          activatedIds.push(priceImportId);
        } catch (err) {
          logger.error(`Error activating product ${priceImportId}:`, err);
          // Если произойдёт ошибка при обработке товара - откатываем всю транзакцию
          throw new Error(
            `Ошибка при обработке товара ${priceImportId}: ${String(err)}`
          );
        }
      }

      // BATCH маркировка: отмечаем все активированные товары за один запрос (HIGH-002 fix)
      // Это последняя операция внутри транзакции
      if (activatedIds.length > 0) {
        await markAsActivatedBatch(client, activatedIds);
      }
    }); // Конец транзакции

    // ============= КОНЕЦ ГЛАВНОЙ ТРАНЗАКЦИИ =============
    // Логируем завершение операции (вне транзакции)
    await logAdminAction(telegramId, {
      action_type: 'complete_activation',
      activated_count: details.length,
      error_count: errors.length,
      details,
      errors,
    });

    // Если были ошибки
    if (errors.length > 0) {
      return res.status(400).json({
        message: `Активировано ${details.length} товаров, ${errors.length} ошибок`,
        activated_count: details.length,
        details,
        error: errors.map((e) => `${e.id}: ${e.error}`).join('; '),
      });
    }

    // Все товары успешно активированы
    res.status(201).json({
      success: true,
      message: `Успешно активировано ${details.length} товаров`,
      activated_count: details.length,
      details,
    });
  } catch (err) {
    logger.error('Activate products error:', err);

    // При ошибке логируем её вне транзакции (не будет затронуто rollback'ом)
    await logAdminAction(telegramId, {
      action_type: 'activation_error',
      error: String(err),
    }).catch(() => {});

    res.status(500).json({ error: 'Ошибка активации товаров' });
  }
}

export default requireAuth(handler, ['admin']);
