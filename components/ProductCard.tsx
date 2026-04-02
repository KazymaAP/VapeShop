import Image from 'next/image';
import { useState } from 'react';
import { hapticImpact, hapticSuccess } from '../lib/telegram';

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
  onAddToCart: (id: string) => void;
}

export default function ProductCard({ id, name, price, image, specification, stock, promotion, isNew, isHit, onAddToCart }: ProductCardProps) {
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

  return (
    <div className="bg-cardBg border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:border-neon hover:shadow-neon hover:-translate-y-1">
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
          />
        ) : (
          <svg className="w-1/2 h-1/2 text-neon opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M7 9H5L3 12L5 15H7M17 9H19L21 12L19 15H17M9 6L12 3L15 6L12 9L9 6ZM12 9V21" />
          </svg>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-textPrimary truncate">{name}</h3>
        {specification && <p className="text-sm text-textSecondary truncate">{specification}</p>}
        <div className="mt-2 text-neon text-xl font-bold">{price.toLocaleString('ru-RU')} ₽</div>
        <div className="mt-1 text-xs">
          {stock > 0 ? (
            <span className="text-success">● осталось {stock} шт</span>
          ) : (
            <span className="text-danger">нет в наличии</span>
          )}
        </div>
        <button
          onClick={addToCart}
          disabled={stock === 0}
          className="mt-3 w-full bg-gradient-to-r from-[#7c3aed] to-neon rounded-full py-2.5 text-white font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 ripple"
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
