import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const navItems = [
  { key: 'dashboard', label: 'Дашборд', icon: 'M3 9L12 3L21 9L21 20H15V14H9V20H3V9Z', href: '/admin' },
  { key: 'products', label: 'Товары', icon: 'M3 3h18v18H3V3zm3 6h6M3 9h18M9 3v18', href: '/admin/products' },
  { key: 'orders', label: 'Заказы', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', href: '/admin/orders' },
  { key: 'pickup-points', label: 'Пункты самовывоза', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a2 2 0 100-4 2 2 0 000 4z', href: '/admin/pickup-points' },
  { key: 'users', label: 'Пользователи', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', href: '/admin/users' },
  { key: 'import', label: 'Импорт CSV', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', href: '/admin/import' },
  { key: 'price-import', label: 'Импортированные', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/price-import' },
  { key: 'activate', label: 'Активация', icon: 'M5 13l4 4L19 7', href: '/admin/activate' },
  { key: 'promocodes', label: 'Промокоды', icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01', href: '/admin/promocodes' },
  { key: 'faq', label: 'FAQ', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01', href: '/admin/faq' },
  { key: 'pages', label: 'Страницы', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6', href: '/admin/pages' },
  { key: 'settings', label: 'Настройки', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33-1.82l-.04-.04A10 10 0 0 0 12 17.66a10 10 0 0 0-6.36-2.62l-.04.04a1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66M19.4 9a1.65 1.65 0 0 0-.33 1.82l.04.04A10 10 0 0 1 12 6.34a10 10 0 0 1-6.36 2.62l-.04-.04a1.65 1.65 0 0 1 .33-1.82l.04-.04A10 10 0 0 1 12 6.34', href: '/admin/settings' },
  { key: 'broadcast', label: 'Рассылка', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z', href: '/admin/broadcast' },
];

export default function AdminSidebar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return router.pathname === '/admin';
    return router.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-cardBg/90 backdrop-blur border border-neon rounded-xl p-2"
        aria-label="Открыть меню администратора"
        aria-expanded={isOpen}
        aria-controls="admin-sidebar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0c0c12] border-r border-neon/25 backdrop-blur-md z-40 transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        role="navigation"
        aria-label="Главное меню администратора"
      >
        <div className="p-5 border-b border-neon/20">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.5">
              <rect x="8" y="8" width="8" height="12" rx="2" />
              <path d="M12 6V4M10 4H14" />
              <circle cx="12" cy="18" r="1" fill="#c084fc" />
            </svg>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-[#e9d5ff] to-neon bg-clip-text text-transparent">
                VAPOR DARK
              </span>
              <p className="text-xs text-textSecondary">ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <nav className="p-3">
          <ul>
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all ${
                    isActive(item.href)
                      ? 'bg-neon/15 text-neon shadow-[0_0_8px_rgba(192,132,252,0.2)] border-l-[3px] border-l-neon'
                      : 'text-textSecondary hover:bg-neon/5 hover:text-textPrimary'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={item.icon} />
                  </svg>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-textSecondary hover:text-neon transition-colors text-sm"
            aria-label="Вернуться на главную страницу"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Вернуться в магазин
          </Link>
        </div>
      </aside>
    </>
  );
}
