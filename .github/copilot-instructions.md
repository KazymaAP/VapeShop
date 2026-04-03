# Copilot Instructions for VapeShop Mini App

## Project Overview

**VapeShop Mini App** is a Telegram Mini App (web app running inside Telegram) built with Next.js. It's an e-commerce platform for vape products that integrates deeply with Telegram's Bot API for user authentication and notifications.

### Tech Stack
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Neon)
- **Telegram Integration**: grammy bot library + Telegram WebApp API
- **Storage**: Supabase (image hosting)

## Build, Test, and Lint Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Production
npm run build        # Build optimized bundle
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

**Note**: No test suite currently exists. When adding tests, follow Next.js conventions with Jest or Vitest.

## Architecture

### Directory Structure

```
├── pages/
│   ├── _app.tsx              # Next.js app wrapper
│   ├── *.tsx                 # Page components (index, cart, profile, admin, etc.)
│   └── api/                  # Backend API routes (organized by feature)
│       ├── bot.ts            # Telegram bot webhook endpoint
│       ├── products/         # Product CRUD operations
│       ├── orders/           # Order management
│       ├── cart/             # Shopping cart operations
│       ├── users/            # User profile & role management
│       ├── admin/            # Admin-only endpoints (stats, products, orders, broadcast)
│       ├── addresses/        # Delivery address management
│       ├── favorites/        # Product favorites/wishlist
│       └── ...
├── components/
│   ├── AdminSidebar.tsx      # Admin navigation component
│   └── ProductCard.tsx       # Reusable product display component
├── lib/
│   ├── db.ts                 # PostgreSQL connection pool (Neon)
│   ├── telegram.ts           # Telegram WebApp hook (client-side integration)
│   ├── bot/                  # Telegram bot handler logic
│   ├── users.ts              # User-related utilities
│   ├── utils/                # Helper functions
│   └── ...
├── styles/
│   └── globals.css           # Global styles
├── public/                   # Static assets
└── Config files              # tsconfig.json, next.config.js, tailwind.config.js
```

### Data Flow

1. **Telegram WebApp Initialization**: Users open the app in Telegram → `useTelegramWebApp()` hook retrieves user data from Telegram
2. **Frontend Pages**: React components fetch data from API routes using client-side requests
3. **API Routes**: Handle authentication via Telegram user data, query PostgreSQL, interact with bot
4. **Database**: PostgreSQL (Neon) stores all app data
5. **Telegram Bot**: Receives webhook callbacks at `/api/bot` for notifications and commands

### Authentication Model

- **No traditional login**: Users are authenticated via Telegram's WebApp API
- Telegram provides `initDataUnsafe.user` containing `id`, `first_name`, `last_name`, `username`
- User roles are stored in database: `admin`, `manager`, `seller`, `customer`
- Admin/manager endpoints validate Telegram ID against environment variable lists (`ADMIN_TELEGRAM_IDS`, etc.)

## Key Conventions

### API Route Patterns

**Standard HTTP method handling** in route files:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Handle GET
  } else if (req.method === 'POST') {
    // Handle POST
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

**Database queries**: Use the `query()` helper from `lib/db.ts` with parameterized queries for SQL injection prevention.

**Error handling**: Always use try-catch blocks and return appropriate HTTP status codes:
```typescript
try {
  const result = await query('SELECT * FROM products WHERE id = $1', [productId]);
  res.status(200).json(result.rows[0]);
} catch (err) {
  res.status(500).json({ error: 'Database error' });
}
```

**User authentication**: Extract Telegram user ID from requests using `getTelegramIdFromRequest()` from `lib/auth.ts`. Supports both X-Telegram-Id header (for testing) and Telegram WebApp's initData.

### Telegram WebApp Integration

**Client-side hook usage**:
```typescript
import { useTelegramWebApp } from '../lib/telegram';
import { useMainButton, hapticSuccess, hapticError } from '../lib/telegram';

const { user, webapp } = useTelegramWebApp();
```

The hook provides:
- `user`: Telegram user object (id, first_name, last_name, username)
- `webapp`: Direct access to Telegram WebApp API for advanced features

**UI Controls and Feedback**:
```typescript
// Main button control
useMainButton('Send Order', () => {
  submitOrder();
}, true);  // visible parameter

// Haptic feedback for interactions
hapticSuccess();    // Success notification (vibration)
hapticError();      // Error notification (vibration)
hapticImpact('medium');  // Light/medium/heavy impact
```

**Data persists across the session** — users maintain the same Telegram user ID from initial load, so you can rely on `user.id` for all API calls.

**Theme Sync**: The app automatically syncs with Telegram's color scheme; custom colors are defined in `tailwind.config.js`.

### Styling

- **Framework**: Tailwind CSS with custom dark theme colors
- **Color Palette**: Custom neon theme defined in `tailwind.config.js`
  - `bgDark`: `#0a0a0f` (main background)
  - `cardBg`: `#111115` (card background)
  - `neon`: `#c084fc` (accent/purple)
  - `border`: `#2a2a33` (divider color)
  - `textPrimary`, `textSecondary`: Text colors
  - `danger`, `success`, `warning`: Status colors
- **Typography**: Inter font via system-ui fallback
- **Custom Shadows**: `shadow-neon` and `shadow-neon-lg` for glow effects

### Telegram Bot Integration (Backend)

The bot runs via webhook at `/api/bot` using the **grammy** library:

```typescript
// In pages/api/bot.ts
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('start', handleStart);
bot.on('callback_query:data', async (ctx) => {
  // Handle inline button clicks
});

export default webhookCallback(bot, 'http');  // Vercel webhook handler
```

**Bot Commands Structure**:
- Commands are defined in `lib/bot/handlers.ts` (start, menu, orders, etc.)
- Payments handled via `lib/bot/payments.ts`
- Inline keyboards built in `lib/bot/keyboards.ts`
- All bot actions query the same PostgreSQL database as the webapp

**Sending Messages to Users**:
Use `getBot()` from `lib/notifications.ts` to send messages from backend:
```typescript
const bot = getBot();
await bot.api.sendMessage(telegramUserId, 'Your order is confirmed!');
```

### Data Fetching Patterns

**Frontend Pages** use `getServerSideProps` for initial data (optional) and `useEffect` for client-side fetches:
```typescript
// No auth needed - Telegram user sent in request
const [products, setProducts] = useState<Product[]>([]);

useEffect(() => {
  fetch('/api/products?page=1')
    .then(r => r.json())
    .then(data => setProducts(data.products));
}, []);
```

**API Routes** typically return paginated results with filtering:
- Pagination: `page` and `PAGE_SIZE` constants (usually 12)
- Filtering: `search`, `category`, `brand`, `price_min`, `price_max`
- Sorting: `sort` and `order` (asc/desc) parameters
- Example: `/api/products?search=pod&category=2&page=1`

### Image Handling

- Remote images from Supabase (`*.supabase.co`) configured in `next.config.js`
- Use Next.js `Image` component for optimization
- Supabase credentials via environment variables

### TypeScript

- **Strict mode enabled** in `tsconfig.json`
- Define interfaces for API responses and database models
- Use `.tsx` for React components, `.ts` for utilities/API routes

### Environment Variables

Required (see `.env.example`):
- `TELEGRAM_BOT_TOKEN`: Bot API token for Telegram Bot
- `NEON_DATABASE_URL`: PostgreSQL connection string
- `WEBAPP_URL`: Deployed app URL (for Telegram bot settings)
- `ADMIN_TELEGRAM_IDS`: Comma-separated list of admin Telegram IDs
- `MANAGER_TELEGRAM_IDS`, `SELLER_TELEGRAM_IDS`: Similar role lists
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Supabase config for image hosting

## Important Notes

- **Telegram Integration is Critical**: The entire app assumes Telegram WebApp context. Pages won't function outside Telegram.
- **Role-Based Access**: Admin/manager endpoints check `process.env.ADMIN_TELEGRAM_IDS` against the requesting user's Telegram ID.
- **Database**: Neon is a serverless PostgreSQL provider; ensure connections are properly released via the pool in `lib/db.ts`.
- **No Logout**: Users are authenticated per session via Telegram; they simply close the app to "log out".

## Common Tasks

### Adding a New API Endpoint

1. Create file in `pages/api/feature-name.ts` or `pages/api/feature-name/action.ts`
2. Export default handler with `NextApiRequest` and `NextApiResponse`
3. Check HTTP method and Telegram user if needed
4. Query database using `query()` from `lib/db.ts` with parameterized queries
5. Return JSON response

### Adding a New Page

1. Create `.tsx` file in `pages/` directory
2. Import `useTelegramWebApp()` hook for Telegram integration
3. Use Tailwind CSS classes matching the neon dark theme
4. Fetch data from API routes in `useEffect` or via `getServerSideProps`

### Adding Admin-Only Feature

1. Add Telegram ID validation at route start:
   ```typescript
   const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
   if (!adminIds.includes(user?.id?.toString())) {
     return res.status(403).json({ error: 'Unauthorized' });
   }
   ```
2. Place route in `pages/api/admin/` directory
3. Only expose controls in UI after checking user role

### Sending User Notifications

Use the notification system in `lib/notifications.ts`:

```typescript
import { getBot } from '../lib/notifications';

// Check if event type is enabled
const enabled = await isNotificationEnabled('order_created');

if (enabled) {
  const bot = getBot();
  await bot.api.sendMessage(userId, 'Your order #123 was created!');
}
```

Supported event types: `order_created`, `order_updated`, `abandoned_cart`, etc.

### Building Telegram Bot Commands

Define handlers in `lib/bot/handlers.ts`, register in `pages/api/bot.ts`:

```typescript
bot.command('orders', async (ctx) => {
  const userId = ctx.from?.id;
  // Fetch user's orders from database
  // Send formatted message with inline buttons
});

// For inline buttons (callback queries):
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith('order:')) {
    // Handle order action
  }
});
```

Button markup example:
```typescript
reply_markup: {
  inline_keyboard: [
    [{ text: 'Open App', web_app: { url: process.env.WEBAPP_URL } }],
    [{ text: 'View Order', callback_data: 'order:123' }],
  ],
}
```
