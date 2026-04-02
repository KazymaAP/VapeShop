import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTelegramWebApp, hapticImpact, hapticSuccess } from '../../lib/telegram';

interface Product {
  id: string;
  name: string;
  specification: string | null;
  price: number;
  stock: number;
  images: string[];
  promotion: boolean;
  is_new: boolean;
  is_hit: boolean;
  attributes: Record<string, string> | null;
  brand_name: string | null;
  category_name: string | null;
  category_id: string | null;
  views: number;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useTelegramWebApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isInCompare, setIsInCompare] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);
  const [alsoBought, setAlsoBought] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<{ id: string; comment: string; first_name: string | null; username: string | null; created_at: string }[]>([]);
  const [newReview, setNewReview] = useState('');
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem('compare_list');
    if (stored) {
      const ids = JSON.parse(stored);
      setIsInCompare(ids.includes(id));
    }
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    fetch(`/api/favorites?telegram_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const favs = data.products || [];
        setIsInFavorites(favs.some((p: { id: string }) => p.id === id));
      });
  }, [id, user]);

  useEffect(() => {
    if (!product?.category_id) return;
    fetch(`/api/products?category=${product.category_id}&page=1&sort=created_at&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.products || []).filter((p: { id: string }) => p.id !== product.id);
        setAlsoBought(filtered.slice(0, 4));
      });
  }, [product]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reviews?product_id=${id}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []));
  }, [id]);

  const submitReview = async () => {
    if (!user || !product || !newReview.trim()) return;
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, user_telegram_id: user.id, comment: newReview }),
    });
    setNewReview('');
    fetch(`/api/reviews?product_id=${id}`).then((r) => r.json()).then((data) => setReviews(data.reviews || []));
    hapticSuccess();
  };

  const toggleCompare = () => {
    const stored = localStorage.getItem('compare_list');
    let ids: string[] = stored ? JSON.parse(stored) : [];
    if (isInCompare) {
      ids = ids.filter((pid: string) => pid !== id);
    } else {
      ids.push(id as string);
    }
    localStorage.setItem('compare_list', JSON.stringify(ids));
    setIsInCompare(!isInCompare);
    hapticSuccess();
  };

  const toggleFavorite = async () => {
    if (!user || !product) return;
    if (isInFavorites) {
      await fetch(`/api/favorites?telegram_id=${user.id}&product_id=${product.id}`, { method: 'DELETE' });
    } else {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, product_id: product.id }),
      });
    }
    setIsInFavorites(!isInFavorites);
    hapticSuccess();
  };

  const addToCart = async () => {
    if (!user || !product) return;
    hapticImpact('medium');
    for (let i = 0; i < quantity; i++) {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, product_id: product.id, quantity: 1 }),
      });
    }
    hapticSuccess();
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark p-4 space-y-4">
        <div className="aspect-square skeleton rounded-2xl" />
        <div className="h-6 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/2" />
        <div className="h-8 skeleton rounded w-1/3" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center">
        <p className="text-textSecondary">Товар не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark pb-24">
      {/* Back Button */}
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-textSecondary hover:text-neon transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <button
          onClick={toggleFavorite}
          className={`p-2 rounded-full transition-colors ${
            isInFavorites ? 'text-danger' : 'text-textSecondary hover:text-danger'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isInFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Image Gallery */}
      <div className="px-4">
        <div className="relative aspect-square bg-gradient-to-br from-[#1f1f2a] to-[#131318] rounded-2xl flex items-center justify-center overflow-hidden">
          {product.images?.[currentImage] ? (
            <Image
              src={product.images[currentImage]}
              alt={product.name}
              width={400}
              height={400}
              className="object-contain"
            />
          ) : (
            <svg className="w-1/2 h-1/2 text-neon opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M7 9H5L3 12L5 15H7M17 9H19L21 12L19 15H17M9 6L12 3L15 6L12 9L9 6ZM12 9V21" />
            </svg>
          )}
          {product.promotion && (
            <span className="absolute top-4 left-4 bg-danger text-white text-sm font-bold px-3 py-1.5 rounded-full">Акция</span>
          )}
          {product.is_new && !product.promotion && (
            <span className="absolute top-4 left-4 bg-neon text-white text-sm font-bold px-3 py-1.5 rounded-full">Новинка</span>
          )}
          {product.is_hit && !product.promotion && !product.is_new && (
            <span className="absolute top-4 left-4 bg-warning text-white text-sm font-bold px-3 py-1.5 rounded-full">Хит</span>
          )}
        </div>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${
                  idx === currentImage ? 'border-neon' : 'border-border'
                }`}
              >
                <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-4 mt-6">
        <h1 className="text-2xl font-bold text-textPrimary">{product.name}</h1>
        {product.brand_name && (
          <p className="text-textSecondary mt-1">Бренд: {product.brand_name}</p>
        )}
        {product.category_name && (
          <p className="text-textSecondary">Категория: {product.category_name}</p>
        )}

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-neon">{product.price.toLocaleString('ru-RU')} ₽</span>
          {product.stock > 0 ? (
            <span className="text-success text-sm">● В наличии ({product.stock} шт)</span>
          ) : (
            <span className="text-danger text-sm">Нет в наличии</span>
          )}
        </div>

        {/* Specification */}
        {product.specification && (
          <div className="mt-4 bg-cardBg border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-textPrimary mb-2">Характеристики</h3>
            <p className="text-textSecondary text-sm">{product.specification}</p>
          </div>
        )}

        {/* Attributes */}
        {product.attributes && Object.keys(product.attributes).length > 0 && (
          <div className="mt-4 bg-cardBg border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-textPrimary mb-3">Параметры</h3>
            <div className="space-y-2">
              {Object.entries(product.attributes).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-textSecondary">{key}</span>
                  <span className="text-textPrimary">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-cardBg border border-border flex items-center justify-center text-textPrimary hover:border-neon transition-colors"
          >
            −
          </button>
          <span className="text-xl font-bold text-textPrimary w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-full bg-cardBg border border-border flex items-center justify-center text-textPrimary hover:border-neon transition-colors"
          >
            +
          </button>
        </div>

        {/* Compare Button */}
        <button
          onClick={toggleCompare}
          className={`mt-4 w-full border rounded-full py-3 text-sm font-medium transition-colors ripple ${
            isInCompare
              ? 'bg-neon/20 border-neon text-neon'
              : 'bg-cardBg border-border text-textSecondary hover:border-neon hover:text-neon'
          }`}
        >
          <svg className="inline w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3Z" />
            <path d="M9 8L11 11L15 7" />
          </svg>
          {isInCompare ? '✓ В списке сравнения' : 'Сравнить'}
        </button>

        {/* Also Bought */}
        {alsoBought.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-textPrimary mb-4">С этим также покупают</h3>
            <div className="grid grid-cols-2 gap-3">
              {alsoBought.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="bg-cardBg border border-border rounded-2xl overflow-hidden hover:border-neon transition-colors">
                  <div className="aspect-square bg-gradient-to-br from-[#1f1f2a] to-[#131318] flex items-center justify-center">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} width={120} height={120} className="object-contain" />
                    ) : (
                      <svg className="w-10 h-10 text-neon opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M7 9H5L3 12L5 15H7M17 9H19L21 12L19 15H17" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-textPrimary truncate">{p.name}</p>
                    <p className="text-neon font-bold mt-1">{p.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-8">
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-bold text-textPrimary">Отзывы ({reviews.length})</h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-textSecondary transition-transform ${showReviews ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showReviews && (
            <div className="mt-4 space-y-3">
              {reviews.length === 0 ? (
                <p className="text-textSecondary text-sm text-center py-4">Отзывов пока нет</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-cardBg border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-neon flex items-center justify-center text-xs font-bold text-white">
                        {review.first_name?.[0] || review.username?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm text-textPrimary font-medium">{review.first_name || review.username || 'Пользователь'}</p>
                        <p className="text-xs text-textSecondary">{new Date(review.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>
                    <p className="text-textSecondary text-sm">{review.comment}</p>
                  </div>
                ))
              )}

              {user && (
                <div className="mt-4">
                  <textarea
                    value={newReview}
                    onChange={(e) => setNewReview(e.target.value)}
                    placeholder="Написать отзыв..."
                    rows={3}
                    className="w-full bg-cardBg border border-border rounded-xl px-4 py-3 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={!newReview.trim()}
                    className="mt-2 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-6 py-2 text-sm text-white font-medium disabled:opacity-50 ripple"
                  >
                    Отправить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-cardBg/95 backdrop-blur-md border-t border-border p-4 z-30">
        <button
          onClick={addToCart}
          disabled={product.stock === 0}
          className="w-full bg-gradient-to-r from-[#7c3aed] to-neon rounded-full py-3.5 text-white font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 ripple"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.66 16H19.4A2 2 0 0 0 21.28 14.63L23 6H6" />
          </svg>
          {product.stock === 0 ? 'Нет в наличии' : `В корзину — ${(product.price * quantity).toLocaleString('ru-RU')} ₽`}
        </button>
      </div>
    </div>
  );
}
