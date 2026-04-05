/**
 * Утилиты для адаптивной вёрстки (мобильная + планшет + десктоп)
 * Используются для добавления медиа-запросов и Tailwind классов
 */

import React from 'react';

/**
 * Класс для адаптивной сетки
 * Мобильный: 1 колонка
 * Планшет (768px+): 2 колонки
 * Десктоп (1024px+): 3 колонки
 */
export const RESPONSIVE_GRID_COLS = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

/**
 * Класс для адаптивных отступов
 * Мобильный: px-4 py-3
 * Планшет+: px-6 py-4
 */
export const RESPONSIVE_PADDING = 'px-4 py-3 md:px-6 md:py-4';

/**
 * Класс для адаптивного размера шрифта
 * Мобильный: text-lg
 * Планшет+: text-xl
 * Десктоп+: text-2xl
 */
export const RESPONSIVE_HEADING = 'text-lg md:text-xl lg:text-2xl';

/**
 * Класс для адаптивного расстояния между элементами
 * Мобильный: gap-2
 * Планшет+: gap-3
 * Десктоп+: gap-4
 */
export const RESPONSIVE_GAP = 'gap-2 md:gap-3 lg:gap-4';

/**
 * Класс для таблицы на мобильных (горизонтальный скролл)
 */
export const TABLE_RESPONSIVE = 'overflow-x-auto -mx-4 md:mx-0';

/**
 * Класс для модального окна
 * На мобильной: во всю высоту с закруглением сверху
 * На планшете+: по центру с ограниченной шириной
 */
export const MODAL_RESPONSIVE =
  'fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center';

/**
 * Класс для контента модального окна
 * На мобильной: во всю ширину, максимум 90vh
 * На планшете+: 96 ширины (w-96)
 */
export const MODAL_CONTENT_RESPONSIVE =
  'bg-white dark:bg-gray-900 rounded-t-lg md:rounded-lg w-full md:w-96 p-6 max-h-[90vh] overflow-y-auto shadow-lg';

/**
 * Класс для боковой панели
 * На мобильной: скрыта (используется меню)
 * На планшете+: отображается рядом
 */
export const SIDEBAR_RESPONSIVE = 'hidden md:block';

/**
 * CSS для адаптивной сетки товаров
 * Мобильный (360px+): 2 колонки
 * Планшет (640px+): 3 колонки
 * Десктоп (1024px+): 4 колонки
 */
export const PRODUCTS_GRID_RESPONSIVE =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4';

/**
 * CSS для адаптивного контейнера
 * Мобильный: max-w-full, px-3
 * Планшет+: max-w-5xl, px-4
 * Десктоп+: max-w-7xl, px-6
 */
export const CONTAINER_RESPONSIVE = 'w-full max-w-5xl lg:max-w-7xl mx-auto px-3 md:px-4 lg:px-6';

/**
 * CSS для адаптивного header'а
 * На мобильной: расстояние поменьше, шрифт поменьше
 * На планшете+: нормальное расстояние и размер
 */
export const HEADER_RESPONSIVE = 'text-lg md:text-2xl font-bold mb-3 md:mb-4';

/**
 * CSS для кнопок на мобильных
 * На мобильной: во всю ширину, с margin-bottom
 * На планшете+: инлайн
 */
export const BUTTON_FULL_MOBILE = 'w-full md:w-auto';

/**
 * Утилита для скрытия на мобильных (показывается только на планшете+)
 */
export const HIDE_ON_MOBILE = 'hidden md:block';

/**
 * Утилита для скрытия на планшетах+ (показывается только на мобильных)
 */
export const HIDE_ON_DESKTOP = 'md:hidden';

/**
 * Утилита для flex layout, который становится column на мобильных
 */
export const FLEX_RESPONSIVE = 'flex flex-col md:flex-row';

/**
 * Утилита для text-align
 * На мобильной: по центру
 * На планшете+: слева
 */
export const TEXT_RESPONSIVE = 'text-center md:text-left';

/**
 * Утилита для адаптивного display
 * На мобильной: block
 * На планшете+: grid с 2 колонками
 */
export const DISPLAY_RESPONSIVE = 'block md:grid md:grid-cols-2 md:gap-4';

export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;

/**
 * Hook для определения размера экрана (клиентская сторона)
 * Используется только в браузере
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowSize.width < TABLET_BREAKPOINT,
    isTablet: windowSize.width >= TABLET_BREAKPOINT && windowSize.width < DESKTOP_BREAKPOINT,
    isDesktop: windowSize.width >= DESKTOP_BREAKPOINT,
    width: windowSize.width,
    height: windowSize.height,
  };
}

// === CSS CUSTOM PROPERTIES (для использования в CSS файлах) ===
// Добавить в styles/globals.css:
/*
@media (max-width: 767px) {
  :root {
    --container-padding: 0.75rem;
    --element-gap: 0.5rem;
    --font-size-heading: 1.125rem;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    --container-padding: 1rem;
    --element-gap: 0.75rem;
    --font-size-heading: 1.25rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --container-padding: 1.5rem;
    --element-gap: 1rem;
    --font-size-heading: 1.5rem;
  }
}

.container-responsive {
  width: 100%;
  max-width: 100%;
  padding: 0 var(--container-padding);
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container-responsive {
    max-width: 720px;
  }
}

@media (min-width: 1024px) {
  .container-responsive {
    max-width: 1200px;
  }
}

@media (min-width: 1280px) {
  .container-responsive {
    max-width: 1280px;
  }
}
*/
