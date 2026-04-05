import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useTelegramWebApp, hapticSuccess } from '../lib/telegram';

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items: { product_id: string; name: string; quantity: number; price: number }[];
}

interface FavoriteProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  brand_name: string | null;
}

interface UserProfile {
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  role: string;
  bonus_balance: number;
  referral_code: string | null;
}

interface Address {
  id: string;
  address: string;
  is_default: boolean;
}

const statusLabels: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  readyship: 'Готов к отправке',
  shipped: 'Отправлен',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-purple-500/20 text-purple-400',
  readyship: 'bg-warning/20 text-warning',
  shipped: 'bg-neon/20 text-neon',
  done: 'bg-success/20 text-success',
  cancelled: 'bg-danger/20 text-danger',
};

export async function getServerSideProps() {
  return { props: {} };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useTelegramWebApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'addresses' | 'saved' | 'compare' | 'balance' | 'referral' | 'gamification' | 'settings'>('orders');
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formAddress, setFormAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchOrders();
    fetchFavorites();
    fetchAddresses();
  }, [user]);

  const fetchProfile = async () => {
    const res = await fetch(`/api/users/profile?telegram_id=${user?.id}`);
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    const data = await res.json();
    setProfile(data);
  };

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders?telegram_id=${user?.id}`);
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  const fetchFavorites = async () => {
    const res = await fetch(`/api/favorites?telegram_id=${user?.id}`);
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    const data = await res.json();
    setFavorites(data.products || []);
  };

  const fetchAddresses = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/addresses?telegram_id=${user.id}`);
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const removeFavorite = async (productId: string) => {
    await fetch(`/api/favorites?telegram_id=${user?.id}&product_id=${productId}`, {
      method: 'DELETE',
    });
    fetchFavorites();
  };

  const addFavoriteToCart = async (productId: string) => {
    if (!user) return;
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: user.id, product_id: productId, quantity: 1 }),
    });
    hapticSuccess();
  };

  const repeatOrder = async (order: Order) => {
    if (!user) return;
    for (const item of order.items) {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, product_id: item.product_id, quantity: item.quantity }),
      });
    }
    router.push('/cart');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');

    if (formAddress.trim().length < 10) {
      setAddressError('Адрес должен быть не менее 10 символов');
      return;
    }

    setSavingAddress(true);

    try {
      const method = editingAddressId ? 'PUT' : 'POST';
      const url = editingAddressId
        ? `/api/addresses/${editingAddressId}`
        : '/api/addresses';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.id,
          address: formAddress.trim(),
        }),
      });

      if (res.ok) {
        resetAddressForm();
        fetchAddresses();
      } else {
        const data = await res.json();
        setAddressError(data.error || 'Ошибка сохранения');
      }
    } catch (err) {
      console.error('Error:', err);
      setAddressError('Ошибка сохранения адреса');
    }

    setSavingAddress(false);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Удалить этот адрес?')) return;

    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { 'X-Telegram-Id': String(user?.id) },
      });

      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: { 'X-Telegram-Id': String(user?.id) },
      });

      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetAddressForm = () => {
    setFormAddress('');
    setEditingAddressId(null);
    setShowAddressForm(false);
    setAddressError('');
  };

  const referralLink = profile?.referral_code
    ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'your_bot'}?start=ref_${profile.referral_code}`
    : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  return (
    <div className="min-h-screen bg-bgDark pb-20">
      {/* Header */}
      <div className="bg-cardBg border-b border-border px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-neon flex items-center justify-center text-2xl font-bold text-white">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-textPrimary">
              {user?.first_name} {user?.last_name || ''}
            </h1>
            {user?.username && (
              <p className="text-textSecondary text-sm">@{user.username}</p>
            )}
          </div>
        </div>
        {profile && (
          <div className="mt-4 bg-bgDark rounded-xl p-3 flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold text-neon">{orders.length}</p>
              <p className="text-xs text-textSecondary">Заказов</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{profile.bonus_balance}</p>
              <p className="text-xs text-textSecondary">Бонусы</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{referralStats.count}</p>
              <p className="text-xs text-textSecondary">Рефералы</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className="bg-cardBg border border-border rounded-xl py-3 text-center text-xs font-medium text-textPrimary hover:border-neon transition-colors"
        >
          <span className="block text-lg mb-1">📋</span>
          Заказы
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className="bg-cardBg border border-border rounded-xl py-3 text-center text-xs font-medium text-textPrimary hover:border-neon transition-colors"
        >
          <span className="block text-lg mb-1">❤️</span>
          Избранное ({favorites.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className="bg-cardBg border border-border rounded-xl py-3 text-center text-xs font-medium text-textPrimary hover:border-neon transition-colors"
        >
          <span className="block text-lg mb-1">📍</span>
          Адреса ({addresses.length})
        </button>
      </div>
      <div className="flex border-b border-border overflow-x-auto">
        {([
          { key: 'orders', label: 'Заказы' },
          { key: 'favorites', label: 'Избранное' },
          { key: 'addresses', label: 'Мои адреса' },
          { key: 'saved', label: 'Отложено' },
          { key: 'compare', label: 'Сравнение' },
          { key: 'balance', label: 'Баланс' },
          { key: 'referral', label: 'Рефералы' },
          { key: 'gamification', label: 'Уровень' },
          { key: 'settings', label: 'Настройки' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-neon border-b-2 border-neon'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-20" />
              ))
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-textSecondary">
                <p className="text-lg">Заказов пока нет</p>
                <Link href="/" className="text-neon mt-2 inline-block">
                  Перейти в каталог →
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-cardBg border border-border rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-textPrimary font-semibold">Заказ #{order.id.slice(0, 8)}</p>
                      <p className="text-textSecondary text-xs">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-border text-textSecondary'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-textSecondary text-sm">{order.items?.length || 0} товаров</span>
                    <span className="text-neon font-bold">{order.total?.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <button
                    onClick={() => repeatOrder(order)}
                    className="mt-3 w-full bg-bgDark border border-border rounded-full py-2 text-sm text-textSecondary hover:border-neon hover:text-neon transition-colors ripple"
                  >
                    Повторить заказ
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Favorites */}
        {activeTab === 'favorites' && (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <div className="text-center py-12 text-textSecondary">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p>Избранное пусто</p>
              </div>
            ) : (
              favorites.map((product) => (
                <div key={product.id} className="bg-cardBg border border-border rounded-2xl p-4 flex gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#1f1f2a] to-[#131318] rounded-xl flex items-center justify-center flex-shrink-0">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt={product.name} className="w-full h-full object-contain rounded-xl" width={80} height={80} />
                    ) : (
                      <svg className="w-8 h-8 text-neon opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M7 9H5L3 12L5 15H7M17 9H19L21 12L19 15H17" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-textPrimary truncate">{product.name}</h3>
                    {product.brand_name && <p className="text-textSecondary text-xs">{product.brand_name}</p>}
                    <p className="text-neon font-bold mt-1">{product.price.toLocaleString('ru-RU')} ₽</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-success">{product.stock > 0 ? `● ${product.stock} шт` : 'Нет в наличии'}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addFavoriteToCart(product.id)}
                          disabled={product.stock === 0}
                          className="text-neon text-sm hover:opacity-80 disabled:opacity-30"
                        >
                          В корзину
                        </button>
                        <button
                          onClick={() => removeFavorite(product.id)}
                          className="text-danger text-sm hover:opacity-80"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Addresses */}
        {activeTab === 'addresses' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAddressForm(true)}
              className="w-full bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-4 py-3 font-medium hover:shadow-neon transition-all mb-4"
            >
              + Добавить адрес
            </button>

            {showAddressForm && (
              <div className="bg-cardBg border border-neon/30 rounded-2xl p-4 mb-4">
                <h3 className="font-semibold text-textPrimary mb-3">
                  {editingAddressId ? 'Редактировать адрес' : 'Добавить новый адрес'}
                </h3>
                <form onSubmit={handleAddAddress} className="space-y-3">
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Улица, дом, квартира, город"
                    className="w-full bg-bgDark border border-border rounded-xl px-4 py-3 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
                    rows={3}
                    required
                  />
                  {addressError && (
                    <p className="text-danger text-xs px-2">{addressError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetAddressForm}
                      className="flex-1 px-4 py-2 rounded-xl border border-border text-textSecondary hover:border-neon hover:text-textPrimary transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-neon text-white font-medium hover:shadow-neon transition-all disabled:opacity-50"
                    >
                      {savingAddress ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="text-center py-12 text-textSecondary">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <p>Адреса не добавлены</p>
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="bg-cardBg border border-border rounded-2xl p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-textPrimary font-medium">{addr.address}</p>
                      {addr.is_default && (
                        <span className="bg-neon/20 text-neon text-xs px-2 py-1 rounded-full">⭐ Основной</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-sm px-2 py-1 rounded-lg bg-bgDark border border-border text-textSecondary hover:border-neon hover:text-neon transition-colors"
                      >
                        По умолчанию
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setFormAddress(addr.address);
                        setEditingAddressId(addr.id);
                        setShowAddressForm(true);
                      }}
                      className="text-sm px-2 py-1 rounded-lg bg-bgDark border border-border text-textSecondary hover:border-neon hover:text-neon transition-colors"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-sm px-2 py-1 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Referral */}
        {activeTab === 'referral' && (
          <div className="space-y-4">
            <div className="bg-cardBg border border-border rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-textPrimary mb-2">Реферальная программа</h3>
              <p className="text-textSecondary text-sm mb-4">
                Приглашайте друзей и получайте 10% от их заказов на бонусный счёт
              </p>
              {referralLink && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="bg-neon text-white rounded-xl px-4 py-2.5 text-sm font-medium ripple"
                  >
                    Копировать
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cardBg border border-border rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-neon">{referralStats.count}</p>
                <p className="text-textSecondary text-sm mt-1">Приглашено</p>
              </div>
              <div className="bg-cardBg border border-border rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-success">{referralStats.earned} ₽</p>
                <p className="text-textSecondary text-sm mt-1">Заработано</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('addresses')}
              className="w-full bg-cardBg border border-border rounded-2xl p-4 flex items-center justify-between hover:border-neon transition-colors text-left"
            >
              <span className="text-textPrimary">Мои адреса</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSecondary">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button className="w-full bg-cardBg border border-border rounded-2xl p-4 flex items-center justify-between hover:border-neon transition-colors text-left">
              <span className="text-textPrimary">Уведомления</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSecondary">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <Link
              href="/faq"
              className="block bg-cardBg border border-border rounded-2xl p-4 flex items-center justify-between hover:border-neon transition-colors"
            >
              <span className="text-textPrimary">Помощь / FAQ</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSecondary">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        )}

        {/* Saved for Later */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            <p className="text-center text-textSecondary py-8">Отложенные товары синхронизируются с приложением</p>
            <Link href="/saved-for-later" className="block bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-4 py-3 font-medium text-center hover:shadow-neon transition-all">
              Перейти в отложенное
            </Link>
          </div>
        )}

        {/* Compare */}
        {activeTab === 'compare' && (
          <div className="space-y-3">
            <p className="text-center text-textSecondary py-8">Сравнивайте характеристики товаров</p>
            <Link href="/compare" className="block bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-4 py-3 font-medium text-center hover:shadow-neon transition-all">
              Перейти в сравнение
            </Link>
          </div>
        )}

        {/* Balance */}
        {activeTab === 'balance' && (
          <div className="space-y-3">
            <p className="text-center text-textSecondary py-8">История бонусов и платежей</p>
            <Link href="/balance" className="block bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-4 py-3 font-medium text-center hover:shadow-neon transition-all">
              Перейти в баланс
            </Link>
          </div>
        )}

        {/* Gamification */}
        {activeTab === 'gamification' && (
          <div className="space-y-3">
            <p className="text-center text-textSecondary py-8">Уровни и достижения</p>
            <Link href="/gamification" className="block bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-4 py-3 font-medium text-center hover:shadow-neon transition-all">
              Перейти в достижения
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cardBg/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9L12 3L21 9L21 20H15V14H9V20H3V9Z" />
            </svg>
            <span className="text-xs mt-0.5">Каталог</span>
          </Link>
          <Link href="/compare" className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3Z" />
              <path d="M9 8L11 11L15 7" />
            </svg>
            <span className="text-xs mt-0.5">Сравнить</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center py-1 px-3 text-neon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-xs mt-0.5">Профиль</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
