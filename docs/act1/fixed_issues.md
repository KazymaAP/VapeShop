# 🔴 CRITICAL ISSUES - Чек-лист исправлений

## Priority 1: Security & Infrastructure (CRITICAL)

- [x] SEC-CSRF-001: In-Memory CSRF Store → Redis migration (lib/csrf.ts)
- [x] SEC-RATE-001: In-Memory Rate Limiting → Redis (lib/rateLimit.ts)
- [x] SEC-IMG-001: Browser APIs на сервере → sharp (lib/imageOptimization.ts)
- [x] SEC-XSS-001: dangerouslySetInnerHTML → DOMPurify (components/ChatWindow.tsx, Phase4Components.tsx, pages/page/[slug].tsx)
- [x] RACE-001: Race Condition в заказах → SERIALIZABLE (pages/api/orders.ts, lib/db.ts)
- [x] DB-SOFT-DELETE-001: Soft Delete без истории → audit log (lib/db.ts, pages/api/cart.ts)
- [x] DB-MIGRATION-001: Дублирующиеся таблицы → IF NOT EXISTS (db/migrations/036)
- [x] INT-OVERFLOW-001: Integer Overflow → DECIMAL (db/migrations/037)
- [x] DB-UUID-001: Несоответствие типов ID (db/migrations/038)
- [x] NO-AUTH-ADMIN-001: Missing requireAuth на /admin/* (все файлы уже имеют requireAuth)
- [x] BOT-TOKEN-001: TELEGRAM_BOT_TOKEN validation (pages/api/bot.ts)
- [x] NO-PAYMENT-VALIDATION-001: Payment amount verification (lib/bot/payments.ts)
- [x] TELEGRAM-ID-SPOOFABLE-001: Telegram ID header spoofing → HMAC (lib/auth.ts)
- [x] JSONB-CORRUPTION-001: Corrupted JSONB handling (pages/api/cart.ts)
- [x] MISSING-VALIDATION-001: No input validation → zod (lib/validationSchemas.ts, pages/api/cart.ts)
- [x] UNHANDLED-ERROR-001: No global error handling → withErrorHandler (lib/errorHandler.ts)
- [ ] NO-TRANSACTION-001: Missing transactions (pages/api/*)

---


