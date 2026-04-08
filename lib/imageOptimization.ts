/**
 * Конфигурация оптимизации изображений для Next.js
 */

import { logger } from './logger';

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
 * Browser-based: Утилита для сжатия изображений перед загрузкой на сервер
 * Используется ТОЛЬКО на клиенте!
 */
export async function compressImageBrowser(file: File, maxWidth = 1200): Promise<Blob> {
  // Проверяем что мы в браузере
  if (typeof document === 'undefined') {
    throw new Error('compressImageBrowser can only be used in browser context');
  }
  
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

/**
 * Server-based: Оптимизация изображения с помощью sharp
 * Используется ТОЛЬКО на сервере (Next.js API, SSR)
 * 
 * @param imageUrl - URL изображения или path
 * @param options - опции оптимизации
 */
export async function optimizeImageServer(
  imageBuffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): Promise<Buffer> {
  // Проверяем что Sharp доступен (Node.js environment)
  let sharp;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharp = require('sharp');
  } catch (err) {
    throw new Error('sharp package is required for server-side image optimization. Install it with: npm install sharp');
  }

  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 85,
    format = 'webp',
  } = options;

  try {
    let pipeline = sharp(imageBuffer);

    // Resize if needed
    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to desired format
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    return await pipeline.toBuffer();
  } catch (error) {
    logger.error('Image optimization error:', error);
    throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch и оптимизировать изображение с URL
 * Используется на сервере для обработки удалённых изображений
 */
export async function fetchAndOptimizeImage(
  imageUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): Promise<Buffer> {
  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'VapeShop-ImageOptimizer/1.0',
      },
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Оптимизируем
    return await optimizeImageServer(buffer, options);
  } catch (error) {
    logger.error('Fetch and optimize image error:', error);
    throw new Error(`Failed to fetch and optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
