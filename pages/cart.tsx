import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import {
  useTelegramWebApp,
  useMainButton,
  hapticImpact,
  hapticSuccess,
  hapticError,
} from '../lib/telegram';
import type { ProductID } from '../types';

// ⚠️ ИСПРАВЛЕНО: Добавлены строгие типы для product_id
interface CartItem {
  product_id: ProductID;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock: number;
}

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

interface SavedAddress {
  id: string;
  address: string;
  is_default: boolean;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useTelegramWebApp();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'courier'>('pickup');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [address, setAddress] = useState('');
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [_cartError, _setCartError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCart();
    fetchDeliveryOptions();
  }, [user]);

  const fetchDeliveryOptions = async () => {
    setLoadingDelivery(true);
    try {
      const [pickupRes, addressesRes] = await Promise.all([
        fetch('/api/pickup-points?active=true'),
        fetch(`/api/addresses?telegram_id=${user?.id}`),
      ]);

      if (pickupRes.ok) {
        const pickupData = await pickupRes.json();
        setPickupPoints(pickupData.pickup_points || []);
        if (pickupData.pickup_points?.length > 0) {
          setSelectedPickupPointId(pickupData.pickup_points[0].id);
        }
      }

      if (addressesRes.ok) {
        const addressesData = await addressesRes.json();
        setSavedAddresses(addressesData.addresses || []);
      }
    } catch (err) {
      console.error('Error fetching delivery options:', err);
    }
    setLoadingDelivery(false);
  };

  const fetchCart = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/cart?telegram_id=${user.id}`);
      if (!res.ok) {
        // ⚠️ ИСПРАВЛЕНО: Добавлен proper error handling для cart fetch
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Cart API error:', errorData.error || `API Error: ${res.status}`);
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      // ⚠️ ИСПРАВЛЕНО: Network error handling
      console.error('Cart fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(productId);
      return;
    }
    try {
      // ⚠️ ИСПРАВЛЕНО: Добавлен error handling в updateQuantity
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user?.id, product_id: productId, quantity }),
      });
      if (!res.ok) {
        _setCartError('Failed to update cart');
        return;
      }
      await fetchCart();
    } catch (err) {
      _setCartError('Network error while updating cart');
      console.error('Update quantity error:', err);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      // ⚠️ ИСПРАВЛЕНО: Добавлен error handling в removeItem
      const res = await fetch(`/api/cart?telegram_id=${user?.id}&product_id=${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        _setCartError('Failed to remove item');
        return;
      }
      await fetchCart();
    } catch (err) {
      _setCartError('Network error while removing item');
      console.error('Remove item error:', err);
    }
  };

  const applyPromo = async () => {
    try {
      const res = await fetch('/api/promocodes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, total: subtotal }),
      });
      const data = await res.json();

      if (data.valid) {
        setPromoDiscount(data.discount);
        hapticSuccess();
      } else {
        hapticError();
        alert(data.error || 'Промокод недействителен');
      }
    } catch {
      hapticError();
      alert('Ошибка применения промокода');
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - promoDiscount;

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;

    setDeliveryError('');

    // Validate delivery method
    if (deliveryMethod === 'pickup') {
      if (!selectedPickupPointId) {
        setDeliveryError('Выберите пункт самовывоза');
        hapticError();
        return;
      }
    } else if (deliveryMethod === 'courier') {
      // Проверка формата адреса - должен быть в формате "Город, Улица, № дома"
      const addressRegex = /^[а-яёА-ЯЁ\s,№\-\d]{10,}$/;
      if (!address.trim() || address.trim().length < 10 || !addressRegex.test(address)) {
        setDeliveryError('Адрес должен содержать: город, улицу, номер дома (минимум 10 символов)');
        hapticError();
        return;
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const selectedDate = new Date(deliveryDate);
      if (!deliveryDate || selectedDate < tomorrow) {
        setDeliveryError('Выберите дату доставки (не ранее завтра)');
        hapticError();
        return;
      }
    }

    hapticImpact('heavy');
    setCheckingOut(true);

    try {
      // Получаем initData из Telegram WebApp для аутентификации
      const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Добавляем initData в Authorization заголовок для верификации на backend
          ...(initData && { Authorization: `Bearer ${initData}` }),
        },
        body: JSON.stringify({
          telegram_id: user.id,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: i.price,
          })),
          delivery_method: deliveryMethod,
          pickup_point_id: deliveryMethod === 'pickup' ? selectedPickupPointId : null,
          delivery_date: deliveryMethod === 'courier' ? deliveryDate : null,
          address: deliveryMethod === 'courier' ? address : null,
          save_address: deliveryMethod === 'courier' && saveAddressChecked,
          promo_code: promoCode || null,
          discount: promoDiscount,
        }),
      });

      const data = await res.json();
      if (data.invoice_url) {
        window.Telegram?.WebApp?.openInvoice?.(data.invoice_url, (status) => {
          if (status === 'paid') {
            hapticSuccess();
            router.push('/profile');
          }
        });
      } else if (data.error) {
        setDeliveryError(data.error);
        hapticError();
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setDeliveryError('Ошибка оформления заказа');
      hapticError();
    } finally {
      setCheckingOut(false);
    }
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getSelectedPickupPoint = () => {
    return pickupPoints.find((p) => p.id === selectedPickupPointId);
  };

  useMainButton(
    `Оформить заказ — ${total.toLocaleString('ru-RU')} ₽`,
    handleCheckout,
    items.length > 0 && !checkingOut
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-24" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bgDark flex flex-col items-center justify-center px-4">
        <svg
          className="w-20 h-20 text-neon opacity-50 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.66 16H19.4A2 2 0 0 0 21.28 14.63L23 6H6" />
        </svg>
        <h2 className="text-xl font-bold text-textPrimary">Корзина пуста</h2>
        <p className="text-textSecondary mt-2 text-center">Добавьте товары из каталога</p>
        <Link
          href="/"
          className="mt-6 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-8 py-3 text-white font-semibold ripple"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark pb-32">
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-textSecondary hover:text-neon"
            aria-label="Вернуться назад"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold gradient-text">Корзина ({items.length})</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="bg-cardBg border border-border rounded-2xl p-4 flex gap-4"
            role="listitem"
            aria-label={`Товар ${item.name}, количество ${item.quantity}, цена ${item.price.toLocaleString('ru-RU')} ₽`}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#1f1f2a] to-[#131318] rounded-xl flex items-center justify-center flex-shrink-0">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain rounded-xl"
                  width={80}
                  height={80}
                />
              ) : (
                <svg
                  className="w-8 h-8 text-neon opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M7 9H5L3 12L5 15H7M17 9H19L21 12L19 15H17" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-textPrimary truncate">{item.name}</h3>
              <p className="text-neon font-bold mt-1">{item.price.toLocaleString('ru-RU')} ₽</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-bgDark border border-border flex items-center justify-center text-textPrimary hover:border-neon"
                    aria-label={`Уменьшить количество ${item.name}`}
                  >
                    −
                  </button>
                  <span
                    className="text-textPrimary font-semibold w-6 text-center"
                    aria-label={`Количество: ${item.quantity}`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-bgDark border border-border flex items-center justify-center text-textPrimary hover:border-neon"
                    aria-label={`Увеличить количество ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="text-danger hover:opacity-80"
                  aria-label={`Удалить ${item.name} из корзины`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Promo Code */}
        <div className="bg-cardBg border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-textPrimary mb-3">Промокод</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Введите промокод"
              className="flex-1 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              aria-label="Промокод"
            />
            <button
              onClick={applyPromo}
              className="bg-neon text-white rounded-xl px-4 py-2.5 text-sm font-medium ripple"
              aria-label="Применить промокод"
            >
              Применить
            </button>
          </div>
          {promoDiscount > 0 && (
            <p className="text-success text-sm mt-2">
              Скидка: −{promoDiscount.toLocaleString('ru-RU')} ₽
            </p>
          )}
        </div>

        {/* Delivery Method */}
        <div className="bg-cardBg border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-textPrimary mb-3">Доставка</h3>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setDeliveryMethod('pickup');
                setDeliveryError('');
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === 'pickup'
                  ? 'bg-neon text-white'
                  : 'bg-bgDark border border-border text-textSecondary'
              }`}
              aria-pressed={deliveryMethod === 'pickup'}
              aria-label="Самовывоз"
            >
              Самовывоз
            </button>
            <button
              onClick={() => {
                setDeliveryMethod('courier');
                setDeliveryError('');
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === 'courier'
                  ? 'bg-neon text-white'
                  : 'bg-bgDark border border-border text-textSecondary'
              }`}
              aria-pressed={deliveryMethod === 'courier'}
              aria-label="Доставка курьером"
            >
              Курьер
            </button>
          </div>

          {deliveryMethod === 'pickup' && (
            <div className="space-y-3">
              {loadingDelivery ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pickupPoints.length === 0 ? (
                <p className="text-textSecondary text-sm">Пункты самовывоза не найдены</p>
              ) : (
                <div className="space-y-2">
                  {pickupPoints.map((point) => (
                    <label
                      key={point.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-bgDark border border-border hover:border-neon cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="pickup-point"
                        value={point.id}
                        checked={selectedPickupPointId === point.id}
                        onChange={(e) => setSelectedPickupPointId(e.target.value)}
                        className="mt-1 w-4 h-4 accent-neon"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-textPrimary font-medium text-sm">{point.name}</p>
                        <p className="text-textSecondary text-xs">{point.address}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {getSelectedPickupPoint() && (
                <p className="text-success text-xs mt-2">
                  ✓ Выбрана точка: {getSelectedPickupPoint()?.name}
                </p>
              )}
            </div>
          )}

          {deliveryMethod === 'courier' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-textSecondary block mb-1">Мои адреса</label>
                {loadingDelivery ? (
                  <div className="text-center py-2">
                    <div className="inline-block w-5 h-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : savedAddresses.length > 0 ? (
                  <select
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
                  >
                    <option value="">Выберите адрес</option>
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.address}>
                        {addr.address} {addr.is_default ? '(основной)' : ''}
                      </option>
                    ))}
                    <option value="">Добавить новый адрес</option>
                  </select>
                ) : null}
              </div>

              <div>
                <label className="text-xs text-textSecondary block mb-1">Адрес доставки</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Улица, дом, квартира, город"
                  className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs text-textSecondary block mb-1">Дата доставки</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={getTomorrow()}
                  className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-bgDark border border-border cursor-pointer hover:border-neon transition-colors">
                <input
                  type="checkbox"
                  checked={saveAddressChecked}
                  onChange={(e) => setSaveAddressChecked(e.target.checked)}
                  className="w-4 h-4 accent-neon"
                />
                <span className="text-sm text-textSecondary">Сохранить адрес в профиль</span>
              </label>
            </div>
          )}

          {deliveryError && (
            <p className="text-danger text-xs mt-3 px-3 py-2 bg-danger/10 rounded-lg">
              {deliveryError}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-cardBg border border-border rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-textSecondary">Товары ({items.length})</span>
            <span className="text-textPrimary">{subtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-textSecondary">Скидка</span>
              <span className="text-success">−{promoDiscount.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span className="text-textPrimary">Итого</span>
            <span className="text-neon">{total.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>
    </div>
  );
}
