/**
 * Компоненты для PHASE 4 функций
 */

import React, { useState } from 'react';

// ===== DELIVERY SELECTOR =====
interface DeliverySelectorProps {
  onSelect: (type: 'courier' | 'pickup', details: Record<string, unknown>) => void;
  pickupLocations?: Array<{ id: string; name: string; hours: string }>;
}

export function DeliverySelector({ onSelect, pickupLocations = [] }: DeliverySelectorProps) {
  const [selected, setSelected] = useState<'courier' | 'pickup'>('courier');
  const [selectedLocation, setSelectedLocation] = useState('');

  return (
    <div className="p-4 border border-border rounded-lg bg-cardBg">
      <h3 className="font-semibold text-textPrimary mb-4">Способ доставки</h3>

      <div className="space-y-3">
        {/* Courier option */}
        <label
          className="flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition"
          style={{ borderColor: selected === 'courier' ? '#c084fc' : 'var(--color-border)' }}
        >
          <input
            type="radio"
            name="delivery"
            value="courier"
            checked={selected === 'courier'}
            onChange={(e) => setSelected(e.target.value as 'courier')}
            className="mt-1 w-4 h-4 accent-neon"
          />
          <div className="flex-1">
            <p className="font-semibold text-textPrimary">🚗 Доставка курьером</p>
            <p className="text-xs text-textSecondary">1-3 дня, по всей России</p>
            <p className="text-sm text-neon font-semibold mt-1">от 200₽</p>
          </div>
        </label>

        {/* Pickup option */}
        {pickupLocations.length > 0 && (
          <label
            className="flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition"
            style={{ borderColor: selected === 'pickup' ? '#c084fc' : 'var(--color-border)' }}
          >
            <input
              type="radio"
              name="delivery"
              value="pickup"
              checked={selected === 'pickup'}
              onChange={(e) => setSelected(e.target.value as 'pickup')}
              className="mt-1 w-4 h-4 accent-neon"
            />
            <div className="flex-1">
              <p className="font-semibold text-textPrimary">📍 Самовывоз</p>
              <p className="text-xs text-textSecondary">Забрать из пункта выдачи</p>
              <p className="text-sm text-success font-semibold mt-1">Бесплатно</p>

              {selected === 'pickup' && (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="mt-2 w-full px-2 py-1 text-sm bg-bgDark border border-border rounded text-textPrimary"
                >
                  <option value="">Выберите пункт выдачи</option>
                  {pickupLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.hours})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>
        )}
      </div>

      <button
        onClick={() => onSelect(selected, { location: selectedLocation })}
        className="w-full mt-4 px-4 py-2 bg-neon text-bgDark rounded font-semibold hover:opacity-90 transition"
      >
        Продолжить
      </button>
    </div>
  );
}

// ===== REFERRAL LINK SHARE =====
interface ReferralShareProps {
  code: string;
  stats?: {
    total_referrals: number;
    bonus_awarded: number;
    total_bonus: number;
  };
}

export function ReferralShare({ code, stats }: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://your-app.com/?ref=${code}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-cardBg border border-border rounded-lg">
      <h3 className="font-semibold text-textPrimary mb-4">💰 Ваша реферальная ссылка</h3>

      {/* Link display */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={link}
          readOnly
          className="flex-1 px-3 py-2 bg-bgDark border border-border rounded text-textPrimary text-sm"
        />
        <button
          onClick={copyToClipboard}
          className={`px-3 py-2 rounded font-semibold transition ${
            copied ? 'bg-success text-white' : 'bg-neon text-bgDark hover:opacity-90'
          }`}
        >
          {copied ? '✓ Скопировано' : '📋 Копировать'}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() =>
            window.open(
              `https://t.me/share/url?url=${encodeURIComponent(link)}&text=Присоединяйся к VapeShop!`
            )
          }
          className="flex-1 px-3 py-2 bg-[#0088cc] text-white rounded hover:opacity-90 transition text-sm font-semibold"
        >
          Telegram
        </button>
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(link)}`)}
          className="flex-1 px-3 py-2 bg-[#25d366] text-white rounded hover:opacity-90 transition text-sm font-semibold"
        >
          WhatsApp
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 bg-bgDark rounded">
            <p className="text-textSecondary">Приглашено</p>
            <p className="text-lg font-bold text-neon">{stats.total_referrals}</p>
          </div>
          <div className="p-2 bg-bgDark rounded">
            <p className="text-textSecondary">Выплачено</p>
            <p className="text-lg font-bold text-success">{stats.bonus_awarded}</p>
          </div>
          <div className="p-2 bg-bgDark rounded">
            <p className="text-textSecondary">Сумма</p>
            <p className="text-lg font-bold text-warning">{stats.total_bonus}₽</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ORDER TRACKING MAP =====
interface TrackingPoint {
  status: string;
  location: string;
  time: string;
  completed: boolean;
}

interface OrderTrackingProps {
  points: TrackingPoint[];
  currentStatus: string;
}

export function OrderTracking({ points, currentStatus }: OrderTrackingProps) {
  return (
    <div className="p-4 bg-cardBg border border-border rounded-lg">
      <h3 className="font-semibold text-textPrimary mb-4">📍 Отслеживание заказа</h3>

      <div className="space-y-4">
        {points.map((point, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  point.completed
                    ? 'bg-success text-white'
                    : currentStatus === point.status
                      ? 'bg-neon text-bgDark'
                      : 'bg-border text-textSecondary'
                }`}
              >
                {point.completed ? '✓' : idx + 1}
              </div>
              {idx < points.length - 1 && (
                <div className={`w-1 h-12 my-1 ${point.completed ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>

            <div className="flex-1 pb-4">
              <p className="font-semibold text-textPrimary">{point.status}</p>
              <p className="text-xs text-textSecondary">{point.location}</p>
              <p className="text-xs text-textSecondary mt-1">{point.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== COMPARISON TABLE =====
interface ComparisonProduct {
  id: string;
  name: string;
  price: number;
  rating: number;
  specs: Record<string, string>;
}

interface ComparisonTableProps {
  products: ComparisonProduct[];
  specs: string[];
}

export function ComparisonTable({ products, specs }: ComparisonTableProps) {
  if (products.length === 0) {
    return (
      <div className="p-8 text-center text-textSecondary">
        <p>Добавьте товары для сравнения</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-3 text-left">Параметр</th>
            {products.map((p) => (
              <th key={p.id} className="p-3 text-center min-w-[150px]">
                <p className="font-semibold text-textPrimary">{p.name}</p>
                <p className="text-xs text-neon mt-1">{p.price}₽</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec} className="border-b border-border hover:bg-cardBg">
              <td className="p-3 font-semibold text-textPrimary">{spec}</td>
              {products.map((p) => (
                <td key={p.id} className="p-3 text-center text-textSecondary">
                  {p.specs[spec] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
