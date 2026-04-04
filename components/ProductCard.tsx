import Image from 'next/image';
import { useState } from 'react';
import { hapticImpact, hapticSuccess } from '../lib/telegram';
import { Skeleton } from './Skeleton';

const DEFAULT_PRODUCT_IMAGE = '/no-image.png';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  specification?: string;
  stock: number;
  promotion?: boolean;
  isNew?: boolean;
  isHit?: boolean;
  loading?: boolean;
  onAddToCart: (id: string) => void;
}

export default function ProductCard({ id, name, price, image, specification, stock, promotion, isNew, isHit, loading = false, onAddToCart }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const addToCart = async () => {
    hapticImpact('medium');
    setIsFlying(true);
    setTimeout(() => {
      setIsFlying(false);
      setIsAdded(true);
      hapticSuccess();
      onAddToCart(id);
      setTimeout(() => setIsAdded(false), 1500);
    }, 600);
  };

  if (loading) {
    return (
      <div className="bg-cardBg border border-border rounded-2xl overflow-hidden transition-all duration-200">
        <div className="aspect-square bg-gradient-to-br from-[#1f1f2a] to-[#131318] flex items-center justify-center p-4">
          <Skeleton width="100%" height="200px" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton width="80%" height="20px" />
          <Skeleton width="60%" height="16px" />
          <Skeleton width="60%" height="24px" />
          <Skeleton width="100%" height="40px" className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cardBg border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:border-neon hover:shadow-neon hover:-translate-y-1" role="article">
      <div className="relative aspect-square bg-gradient-to-br from-[#1f1f2a] to-[#131318] flex items-center justify-center">
        {promotion && (
          <span className="absolute top-3 left-3 bg-danger text-white text-xs font-bold px-2 py-1 rounded-full z-10">Акция</span>
        )}
        {isNew && !promotion && (
          <span className="absolute top-3 left-3 bg-neon text-white text-xs font-bold px-2 py-1 rounded-full z-10">Новинка</span>
        )}
        {isHit && !promotion && !isNew && (
          <span className="absolute top-3 left-3 bg-warning text-white text-xs font-bold px-2 py-1 rounded-full z-10">Хит</span>
        )}
        {image ? (
          <Image
            src={image}
            alt={name}
            width={200}
            height={200}
            className={`object-contain ${isFlying ? 'fly-to-cart' : ''}`}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
            }}
          />
        ) : (
          <Image
            src={DEFAULT_PRODUCT_IMAGE}
            alt={name}
            width={200}
            height={200}
            className="object-contain"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-textPrimary truncate" role="heading" aria-level={3}>{name}</h3>
        {specification && <p className="text-sm text-textSecondary truncate" aria-label={`Спецификация: ${specification}`}>{specification}</p>}
        <div className="mt-2 text-neon text-xl font-bold" role="doc-credit" aria-label={`Цена: ${price.toLocaleString('ru-RU')} рублей`}>{price.toLocaleString('ru-RU')} ₽</div>
        <div className="mt-1 text-xs">
          {stock > 0 ? (
            <span className="text-success" aria-label={`В наличии ${stock} штук`}>● осталось {stock} шт</span>
          ) : (
            <span className="text-danger" aria-label="Товар нет в наличии">нет в наличии</span>
          )}
        </div>
        <button
          onClick={addToCart}
          disabled={stock === 0}
          className="mt-3 w-full bg-gradient-to-r from-[#7c3aed] to-neon rounded-full py-2.5 text-white font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 ripple"
          aria-label={`Добавить ${name} в корзину`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.66 16H19.4A2 2 0 0 0 21.28 14.63L23 6H6" />
          </svg>
          {isAdded ? '✓ Добавлено' : 'В корзину'}
        </button>
      </div>
    </div>
  );
}
