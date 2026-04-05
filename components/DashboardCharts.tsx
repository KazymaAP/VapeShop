/**
 * Компонент для отображения графиков выручки на дашборде
 * Использует recharts для визуализации
 */

'use client';

import React, { useState, useEffect } from 'react';

interface ChartData {
  date: string;
  revenue: number;
  orders_count: number;
  avg_order_value: number;
}

interface RevenueChartProps {
  period?: 'day' | 'week' | 'month';
}

export function RevenueChart({ period = 'month' }: RevenueChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>(period);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/dashboard-stats?period=${selectedPeriod}`);
      const json = await res.json();

      if (json.data?.revenueChart) {
        setData(json.data.revenueChart);
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block">⌛ Загружаю график...</div>
      </div>
    );
  }

  // Простой текстовой вывод графика (альтернатива recharts)
  const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 1);

  return (
    <div className="p-4 bg-cardBg border border-border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-textPrimary">📊 Выручка</h3>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 text-sm rounded transition ${
                selectedPeriod === p
                  ? 'bg-neon text-bgDark'
                  : 'bg-border text-textSecondary hover:bg-border/80'
              }`}
            >
              {p === 'day' ? '24ч' : p === 'week' ? '7д' : '30д'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-8 text-center text-textSecondary">Нет данных</div>
      ) : (
        <div className="space-y-2">
          {data.map((point, idx) => {
            const barWidth = ((point.revenue || 0) / maxRevenue) * 100;
            const dateStr = new Date(point.date).toLocaleDateString('ru-RU', {
              month: 'short',
              day: 'numeric',
              hour: selectedPeriod === 'day' ? '2-digit' : undefined,
            });

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-textSecondary">{dateStr}</span>
                  <span className="text-neon font-semibold">{point.revenue}₽</span>
                </div>
                <div className="h-6 bg-bgDark rounded overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-neon to-purple-600 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white pointer-events-none">
                    {point.orders_count} заказов
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== TOP PRODUCTS CHART =====
interface TopProduct {
  name: string;
  revenue: number;
  sold_count: number;
}

interface TopProductsChartProps {
  limit?: number;
}

export function TopProductsChart({ limit = 10 }: TopProductsChartProps) {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dashboard-stats?period=month');
      const json = await res.json();

      if (json.data?.topProducts) {
        setProducts(json.data.topProducts.slice(0, limit));
      }
    } catch (err) {
      console.error('Failed to fetch top products:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-textSecondary">⌛ Загружаю...</div>;
  }

  if (products.length === 0) {
    return <div className="p-4 text-center text-textSecondary">Нет данных</div>;
  }

  const maxRevenue = Math.max(...products.map((p) => p.revenue || 0), 1);

  return (
    <div className="p-4 bg-cardBg border border-border rounded-lg">
      <h3 className="font-semibold text-textPrimary mb-4">🏆 Топ товаров</h3>

      <div className="space-y-3">
        {products.map((product, idx) => {
          const barWidth = ((product.revenue || 0) / maxRevenue) * 100;

          return (
            <div key={idx}>
              <div className="flex justify-between items-center mb-1 text-sm">
                <p className="text-textPrimary font-semibold truncate">{product.name}</p>
                <p className="text-neon font-bold text-xs">{product.revenue}₽</p>
              </div>
              <div className="h-5 bg-bgDark rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-green-600 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="text-xs text-textSecondary mt-1">Продано: {product.sold_count} шт</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== METRICS CARD =====
interface MetricsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  period: string;
}

interface MetricsCardProps {
  data: MetricsData;
}

export function MetricsCard({ data }: MetricsCardProps) {
  const periodLabel =
    {
      day: 'За 24 часа',
      week: 'За неделю',
      month: 'За месяц',
    }[data.period] || data.period;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 bg-cardBg border border-border rounded-lg">
        <p className="text-xs text-textSecondary">Выручка</p>
        <p className="text-2xl font-bold text-neon mt-1">{data.totalRevenue}₽</p>
        <p className="text-xs text-textSecondary mt-1">{periodLabel}</p>
      </div>

      <div className="p-3 bg-cardBg border border-border rounded-lg">
        <p className="text-xs text-textSecondary">Заказы</p>
        <p className="text-2xl font-bold text-success mt-1">{data.totalOrders}</p>
        <p className="text-xs text-textSecondary mt-1">всего</p>
      </div>

      <div className="p-3 bg-cardBg border border-border rounded-lg">
        <p className="text-xs text-textSecondary">Сред. чек</p>
        <p className="text-2xl font-bold text-warning mt-1">{data.avgOrderValue}₽</p>
        <p className="text-xs text-textSecondary mt-1">на заказ</p>
      </div>
    </div>
  );
}
