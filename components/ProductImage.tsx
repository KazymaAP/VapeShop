import React, { useState } from 'react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '', priority = false }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Дефолтное изображение (можно заменить на URL плейсхолдера)
  const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%232a2a33%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%236b7280%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📦%3C/text%3E%3C/svg%3E';

  const imageSrc = !error && src ? src : defaultImage;

  return (
    <div className={`relative overflow-hidden bg-cardBg ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-border via-cardBg to-border animate-pulse" />
      )}
    </div>
  );
};

export default ProductImage;
