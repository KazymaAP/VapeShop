# Инструкции для ручных действий

## CRIT-001: Ротация токенов (РУЧНОЕ ДЕЙСТВИЕ)

### Проблема
В репозитории обнаружены реальные секреты:
- TELEGRAM_BOT_TOKEN в .env.local
- DATABASE_URL с паролем в .env.local
- ADMIN_TELEGRAM_ID в .env.local
- Реальные значения в .env.local.example

**КРИТИЧНО**: Эти файлы могли быть закоммичены ранее. Необходимо сразу же ротировать учётные данные.

### Шаги для пользователя

#### 1. Ротация TELEGRAM_BOT_TOKEN
1. Открыть BotFather в Telegram (@BotFather)
2. Команда `/token`
3. Выбрать бота VapeShop
4. Получить новый токен
5. Скопировать новый токен
6. Обновить в Vercel или локально:
   ```
   TELEGRAM_BOT_TOKEN=<новый_токен>
   ```

#### 2. Ротация DATABASE_URL пароля
1. Открыть Neon console: https://console.neon.tech
2. Перейти в Database → Settings → Security
3. Сменить пароль для пользователя нeon_owner
4. Скопировать новый DATABASE_URL:
   ```
   postgresql://neon_owner:<новый_пароль>@...
   ```
5. Обновить переменную окружения

#### 3. Обновление .env.local.example
После ротации заменить реальные значения на плейсхолдеры:
```
TELEGRAM_BOT_TOKEN=<your_bot_token_here>
DATABASE_URL=<your_database_url_here>
ADMIN_TELEGRAM_IDS=<comma_separated_ids>
TELEGRAM_WEBHOOK_SECRET=<your_webhook_secret>
```

#### 4. Проверка истории репозитория
Если .env.local или .env.local.example были когда-то в git:
```bash
# Найти в истории
git log --full-history --source --all -- .env.local
git log --full-history --source --all -- .env.local.example

# Если нужно очистить историю:
git filter-branch --tree-filter 'rm -f .env.local' -- --all
git push origin --force --all
```

---
