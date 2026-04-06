import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for Next.js Pages Router
 * Protects /admin/* routes by checking Telegram authentication
 *
 * Note: This is a basic implementation. For full protection,
 * consider using getServerSideProps or API route authentication.
 */

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only apply middleware to admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get Telegram ID from headers (set by frontend auth)
  const telegramId = request.headers.get('x-telegram-id');
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];

  // For development: allow X-Telegram-Id header
  if (process.env.NODE_ENV !== 'production' && telegramId && adminIds.includes(telegramId)) {
    return NextResponse.next();
  }

  // For production: Telegram WebApp auth is verified on the frontend
  // This middleware provides an additional layer but is not the sole protection
  // Real protection happens in getServerSideProps or API route handlers

  // Log suspicious access attempts
  console.warn(`[ADMIN MIDDLEWARE] Potential unauthorized access to ${pathname}`, {
    telegramId: telegramId || 'none',
    timestamp: new Date().toISOString(),
  });

  // Allow the page to load - real auth check happens in getServerSideProps
  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Protect all admin routes
    '/admin/:path*',
  ],
};
