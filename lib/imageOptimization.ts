/**
 * Конфигурация оптимизации изображений для Next.js
 */

export const IMAGE_OPTIMIZATION_CONFIG = {
  // Размеры для разных breakpoints
  sizes: {
    sm: 200, // мобила
    md: 400, // планшет
    lg: 600, // десктоп
    xl: 800, // большой экран
  },

  // Классы для разных размеров
  responsiveSizes: `
    (max-width: 640px) 200px,
    (max-width: 1024px) 400px,
    600px
  `,

  // Quality по умолчанию (1-100)
  quality: 85,

  // Приоритет загрузки
  priority: {
    hero: true,
    featured: true,
    list: false,
    thumbnail: false,
  },
};

/**
 * Утилита для сжатия изображений перед загрузкой на сервер
 */
export async function compressImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Уменьшаем если больше maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => resolve(blob || file), 'image/webp', 0.85);
      };
    };
  });
}
