#!/bin/bash
# Автоматизированные действия для исправления VapeShop

# Эти команды должны быть выполнены в CI/CD или локально:

echo "=== VapeShop Fix Actions ==="

# Миграции БД
echo "1. Применение миграций..."
psql "$DATABASE_URL" -f db/migrations/025_fix_from_claude_report.sql
psql "$DATABASE_URL" -f db/migrations/026_create_missing_tables.sql

# NPM зависимости
echo "2. Установка новых зависимостей..."
npm install @upstash/redis @upstash/ratelimit
npm run lint -- --fix
npm run build

# Проверка
echo "3. Проверка сборки..."
npm run lint

echo "=== Готово ==="
echo "Оставшиеся ручные действия находятся в docs/act2/manual_instructions.md"
