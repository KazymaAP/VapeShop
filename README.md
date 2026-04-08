# VapeShop - E-Commerce Platform

Modern e-commerce platform for vape products built with Next.js, PostgreSQL, and Telegram Bot API integration.

## 🚀 Features

### Core Features
- **Telegram Bot Integration** - Seamless integration with Telegram Web App
- **Product Catalog** - Advanced product filtering, search, and recommendations
- **Shopping Cart** - Real-time cart management with persistent storage
- **Order Management** - Complete order lifecycle management with tracking
- **Payment Processing** - Telegram Stars payment integration
- **User Authentication** - Secure Telegram-based authentication
- **Admin Dashboard** - Comprehensive analytics and management interface

### Advanced Features
- **Role-Based Access Control** - Admin, Manager, Courier, Support roles
- **Gamification System** - Leaderboards, levels, and rewards
- **AI-Powered Recommendations** - Product suggestions based on user behavior
- **A/B Testing** - Built-in experimentation framework
- **Performance Analytics** - Detailed metrics and insights
- **Internationalization** - Multi-language support

### Technical Highlights
- **Type Safety** - 100% TypeScript with strict mode
- **Security Hardened** - CSRF protection, SQL injection prevention, timing-safe comparisons
- **Database Migrations** - Version-controlled schema management with 40+ migrations
- **Rate Limiting** - Redis-backed rate limiting for API endpoints
- **Error Handling** - Comprehensive error recovery and logging
- **Responsive Design** - Mobile-first UI with Tailwind CSS

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React** - UI component library
- **TypeScript** - Static type checking
- **Tailwind CSS** - Utility-first CSS framework
- **SWR** - Data fetching and caching

### Backend
- **Node.js** - Runtime environment
- **Next.js API Routes** - Serverless backend
- **PostgreSQL** - Relational database
- **Redis (Upstash)** - Caching and rate limiting

### Infrastructure
- **Vercel** - Platform deployment
- **Docker** - Containerization
- **GitHub** - Version control

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 12+
- Redis instance (Upstash)

## ⚙ Installation

1. **Clone the repository**
```bash
git clone https://github.com/KazymaAP/VapeShop.git
cd VapeShop
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vapeshop

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_APP_SECRET=your_app_secret

# Redis/Cache
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Payment
TELEGRAM_STARS_ENABLED=true

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📚 Project Structure

```
├── components/          # React components
├── db/
│   └── migrations/      # Database migrations
├── lib/                 # Utility functions
│   ├── auth.ts         # Authentication logic
│   ├── db.ts           # Database client
│   └── telegram.ts     # Telegram integration
├── pages/
│   ├── api/            # API routes
│   ├── admin/          # Admin dashboard
│   └── ...             # Public pages
├── public/             # Static assets
├── styles/             # Global styles
├── types/              # TypeScript types
└── middleware.ts       # Request middleware
```

## 🔐 Security Features

- **CSRF Protection** - Token-based CSRF tokens with Redis storage
- **Rate Limiting** - Per-endpoint rate limiting
- **SQL Injection Prevention** - Parameterized queries throughout
- **Timing-Safe Comparisons** - Protection against timing attacks
- **CIDR Validation** - Telegram webhook IP verification
- **Input Sanitization** - XSS prevention with DOMPurify

## 📊 Database Schema

The project includes 40+ database migrations covering:
- User accounts and authentication
- Products and categories
- Orders and payments
- Cart and saved items
- Reviews and ratings
- Gamification system
- Admin audit logs

Key tables:
- `users` - User accounts
- `products` - Product catalog
- `orders` - Order history
- `cart_items` - Shopping cart
- `user_roles` - Access control
- `audit_logs` - Activity tracking

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Select your repository
- Configure environment variables
- Deploy

### Environment Variables for Production
Set these in Vercel Project Settings:
- `DATABASE_URL` - Production PostgreSQL connection
- `TELEGRAM_BOT_TOKEN` - Bot token
- `UPSTASH_REDIS_REST_*` - Redis credentials
- All other `.env.local` variables

## 📝 API Documentation

### Authentication
All API endpoints require Telegram authentication via `initData` parameter.

### Key Endpoints

```
GET  /api/products              # Get products
GET  /api/products/[id]         # Get product details
POST /api/cart                  # Add to cart
GET  /api/orders                # Get user orders
POST /api/orders                # Create order
GET  /api/admin/stats           # Admin dashboard stats
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Build & Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Generate standalone build
npm run build:standalone
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Verify connection string
psql $DATABASE_URL -c "SELECT 1"

# Run migrations
npm run migrate
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Redis Connection
Ensure Upstash Redis URL and token are correctly set in environment.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@vapeshop.app or open an issue on GitHub.

## 🔗 Links

- **GitHub**: https://github.com/KazymaAP/VapeShop
- **Live Demo**: https://vapeshop.vercel.app
- **Documentation**: https://docs.vapeshop.app

---

**Last Updated**: April 2026
**Version**: 2.0.0
**Status**: Production Ready
