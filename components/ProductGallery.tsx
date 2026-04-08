/**
 * Компонент для галереи изображений товара с навигацией и зумом
 * Поддерживает: слайдер, превью, зум на клик
 */

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  defaultImageUrl?: string;
}

export function ProductGallery({
  images,
  productName,
  defaultImageUrl = '/images/product-placeholder.png',
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Фильтруем пустые изображения
  const validImages = images.filter((img) => img && img.length > 0);
  const displayImages = validImages.length > 0 ? validImages : [defaultImageUrl];
  const currentImage = displayImages[selectedIndex];

  // Обработка зума на движение мыши
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isZoomed) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setZoomPosition({ x, y });
    },
    [isZoomed]
  );

  // Навигация стрелками
  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  // Клавиатурная навигация
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <div className="w-full">
      {/* Главное изображение с зумом */}
      <div
        className="relative w-full bg-cardBg rounded-lg overflow-hidden border border-border"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={`Галерея товара: ${productName}`}
      >
        {/* Изображение */}
        <div className="relative w-full aspect-square">
          <Image
            src={currentImage}
            alt={`${productName} - изображение ${selectedIndex + 1}`}
            fill
            className={`object-cover transition-transform duration-300 cursor-zoom-in ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
            style={
              isZoomed
                ? {
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }
                : undefined
            }
            onClick={() => setIsZoomed(!isZoomed)}
            priority
          />
        </div>

        {/* Кнопки навигации (если > 1 изображения) */}
        {displayImages.length > 1 && (
          <>
            {/* Левая стрелка */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
              aria-label="Предыдущее изображение"
            >
              ◀
            </button>

            {/* Правая стрелка */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
              aria-label="Следующее изображение"
            >
              ▶
            </button>

            {/* Индикатор позиции */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          </>
        )}

        {/* Зум подсказка */}
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          {isZoomed ? 'Нажми для выхода' : 'Нажми для зума'}
        </div>
      </div>

      {/* Превью изображений */}
      {displayImages.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded border-2 transition overflow-hidden ${
                selectedIndex === idx ? 'border-neon' : 'border-border hover:border-neon/50'
              }`}
              aria-label={`Выбрать изображение ${idx + 1}`}
            >
              <Image
                src={img || defaultImageUrl}
                alt={`${productName} - превью ${idx + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
