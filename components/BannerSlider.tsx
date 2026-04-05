/**
 * Компонент слайдера баннеров (carousel) для главной страницы
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';

interface Banner {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  order?: number;
}

interface BannerSliderProps {
  banners: Banner[];
  autoPlay?: boolean;
  autoPlayDuration?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export function BannerSlider({
  banners = [],
  autoPlay = true,
  autoPlayDuration = 5000,
  showDots = true,
  showArrows = true,
  className = '',
}: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout>();

  // Auto-play
  useEffect(() => {
    if (banners.length === 0 || !autoPlay || banners.length <= 1) return;

    autoPlayIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoPlayDuration);

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [autoPlay, autoPlayDuration, banners.length]);

  if (banners.length === 0) {
    return null;
  }

  // Сброс auto-play при взаимодействии
  const resetAutoPlay = () => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
    }
    if (autoPlay && banners.length > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, autoPlayDuration);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    resetAutoPlay();
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    resetAutoPlay();
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetAutoPlay();
  };

  // Touch/Swipe handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = startX - currentX;
    if (Math.abs(diff) > 50) {
      // Минимум 50px для считывания как свайп
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  return (
    <div className={clsx('relative w-full overflow-hidden rounded-lg', className)}>
      {/* Слайды */}
      <div
        ref={sliderRef}
        className="relative w-full h-64 md:h-96 lg:h-[500px] bg-gray-200 dark:bg-gray-800"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {banners.map((banner, index) => (
          <Link key={banner.id} href={banner.link_url || '#'}>
            <a
              className={clsx(
                'absolute inset-0 transition-opacity duration-500',
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Image
                src={banner.image_url}
                alt={banner.title}
                layout="fill"
                objectFit="cover"
                priority={index === currentIndex}
              />
              {/* Оверлей с текстом */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-12">
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-2">{banner.title}</h3>
                {banner.description && (
                  <p className="text-gray-200 text-sm md:text-base max-w-md">
                    {banner.description}
                  </p>
                )}
              </div>
            </a>
          </Link>
        ))}
      </div>

      {/* Стрелки навигации */}
      {showArrows && banners.length > 1 && (
        <>
          {/* Левая стрелка */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 text-white rounded-full p-2 transition"
            aria-label="Previous slide"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Правая стрелка */}
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 text-white rounded-full p-2 transition"
            aria-label="Next slide"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Точки навигации (dots) */}
      {showDots && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={clsx(
                'w-2 h-2 rounded-full transition',
                index === currentIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Счётчик слайдов */}
      {banners.length > 1 && (
        <div className="absolute top-4 right-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {banners.length}
        </div>
      )}
    </div>
  );
}

/**
 * Hook для загрузки баннеров
 */
export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/banners');
        if (!res.ok) throw new Error('Failed to load banners');
        const data = await res.json();
        setBanners(data.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadBanners();
  }, []);

  return { banners, isLoading, error };
}
