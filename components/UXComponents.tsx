/**
 * Компоненты для улучшений админ панели и профиля пользователя
 */

import { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab = tabs[0]?.id, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const activeTabItem = tabs.find(t => t.id === activeTab);

  return (
    <div className={className}>
      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-3 font-medium whitespace-nowrap transition border-b-2
              ${
                activeTab === tab.id
                  ? 'text-neon border-neon'
                  : 'text-textSecondary border-transparent hover:text-textPrimary'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTabItem?.content}
      </div>
    </div>
  );
}

// Компонент для сворачиваемого sidebar (для админа)
interface CollapsibleSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSidebar({
  isOpen,
  onToggle,
  children,
  className = '',
}: CollapsibleSidebarProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-cardBg border border-border rounded-lg hover:bg-bgDark transition md:hidden"
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-cardBg border-r border-border w-64 z-40 transition-transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:block md:z-0
        `}
      >
        {children}
      </aside>

      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Компонент для Info card с иконкой
interface InfoCardProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function InfoCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  className = '',
}: InfoCardProps) {
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-textSecondary';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className={`p-4 rounded-lg bg-cardBg border border-border ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-textSecondary">{title}</p>
          <p className="text-2xl font-bold text-textPrimary mt-1">{value}</p>
          {subtitle && <p className="text-xs text-textSecondary mt-1">{subtitle}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      {trend && (
        <div className={`text-xs font-semibold mt-2 ${trendColor}`}>
          {trendIcon} {trend === 'up' ? 'Увеличилось' : trend === 'down' ? 'Уменьшилось' : 'Без изменений'}
        </div>
      )}
    </div>
  );
}

// Компонент для Infinite Scroll
interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
  threshold?: number;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  children,
  threshold = 0.1,
}: InfiniteScrollProps) {
  const [sentinelRef, setSentinelRef] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!sentinelRef || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold }
    );

    observer.observe(sentinelRef);

    return () => observer.disconnect();
  }, [sentinelRef, hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div>
      {children}

      {/* Sentinel element for intersection */}
      {hasMore && (
        <div ref={setSentinelRef} className="py-8 text-center">
          {isLoading ? (
            <div className="text-textSecondary">⌛ Загружаю...</div>
          ) : (
            <div className="text-textSecondary text-sm">Прокрутите для загрузки ещё</div>
          )}
        </div>
      )}

      {/* No more items */}
      {!hasMore && (
        <div className="py-8 text-center text-textSecondary text-sm">
          ✓ Больше нечего загружать
        </div>
      )}
    </div>
  );
}
