import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTelegramWebApp, useMainButton, hapticImpact, hapticSuccess } from '../lib/telegram';

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock: number;
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

  useEffect(() => {
    if (!user) return;
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    const res = await fetch(`/api/cart?telegram_id=${user.id}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(productId);
      return;
    }
    await fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: user?.id, product_id: productId, quantity }),
    });
    fetchCart();
  };

  const removeItem = async (productId: string) => {
    await fetch(`/api/cart?telegram_id=${user?.id}&product_id=${productId}`, {
      method: 'DELETE',
    });
    fetchCart();
  };

  const applyPromo = async () => {
    const res = await fetch('/api/promocodes/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode, total }),
    });
    const data = await res.json();
    if (data.valid) {
      setPromoDiscount(data.discount);
      hapticSuccess();
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - promoDiscount;

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    hapticImpact('heavy');

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: user.id,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
        delivery_method: deliveryMethod,
        delivery_date: deliveryDate || null,
        address: deliveryMethod === 'courier' ? address : null,
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
    }
  };

  useMainButton(
    `Оформить заказ — ${total.toLocaleString('ru-RU')} ₽`,
    handleCheckout,
    items.length > 0
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
        <svg className="w-20 h-20 text-neon opacity-50 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.66 16H19.4A2 2 0 0 0 21.28 14.63L23 6H6" />
        </svg>
        <h2 className="text-xl font-bold text-textPrimary">Корзина пуста</h2>
        <p className="text-textSecondary mt-2 text-center">Добавьте товары из каталога</p>
        <Link href="/" className="mt-6 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-8 py-3 text-white font-semibold ripple">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark pb-32">
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-textSecondary hover:text-neon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold gradient-text">Корзина ({items.length})</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div key={item.product_id} className="bg-cardBg border border-border rounded-2xl p-4 flex gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1f1f2a] to-[#131318] rounded-xl flex items-center justify-center flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-contain rounded-xl" />
              ) : (
                <svg className="w-8 h-8 text-neon opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  >
                    −
                  </button>
                  <span className="text-textPrimary font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-bgDark border border-border flex items-center justify-center text-textPrimary hover:border-neon"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="text-danger hover:opacity-80"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            />
            <button
              onClick={applyPromo}
              className="bg-neon text-white rounded-xl px-4 py-2.5 text-sm font-medium ripple"
            >
              Применить
            </button>
          </div>
          {promoDiscount > 0 && (
            <p className="text-success text-sm mt-2">Скидка: −{promoDiscount.toLocaleString('ru-RU')} ₽</p>
          )}
        </div>

        {/* Delivery Method */}
        <div className="bg-cardBg border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-textPrimary mb-3">Способ доставки</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setDeliveryMethod('pickup')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === 'pickup'
                  ? 'bg-neon text-white'
                  : 'bg-bgDark border border-border text-textSecondary'
              }`}
            >
              Самовывоз
            </button>
            <button
              onClick={() => setDeliveryMethod('courier')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === 'courier'
                  ? 'bg-neon text-white'
                  : 'bg-bgDark border border-border text-textSecondary'
              }`}
            >
              Курьер
            </button>
          </div>

          {deliveryMethod === 'pickup' && (
            <p className="text-textSecondary text-sm mt-3">ул. Примерная, д. 1 (ежедневно 10:00–22:00)</p>
          )}

          {deliveryMethod === 'courier' && (
            <>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Адрес доставки"
                className="w-full mt-3 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full mt-2 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              />
            </>
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
