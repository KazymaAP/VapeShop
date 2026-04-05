import React from 'react';

export const SkeletonLoader: React.FC<{ count?: number; className?: string }> = ({
  count = 1,
  className = '',
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-cardBg rounded-lg p-4 animate-pulse ${className}`}>
          <div className="h-4 bg-border rounded mb-4 w-3/4"></div>
          <div className="h-3 bg-border rounded mb-2 w-full"></div>
          <div className="h-3 bg-border rounded w-5/6"></div>
        </div>
      ))}
    </>
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-cardBg rounded-lg p-4 animate-pulse">
    <div className="h-40 bg-border rounded mb-4"></div>
    <div className="h-4 bg-border rounded mb-2 w-3/4"></div>
    <div className="h-3 bg-border rounded mb-4 w-full"></div>
    <div className="h-4 bg-border rounded w-1/2"></div>
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="bg-cardBg rounded-lg p-4 animate-pulse border border-border">
    <div className="flex justify-between mb-4">
      <div className="h-4 bg-border rounded w-1/3"></div>
      <div className="h-4 bg-border rounded w-1/4"></div>
    </div>
    <div className="h-3 bg-border rounded mb-2 w-2/3"></div>
    <div className="h-3 bg-border rounded mb-4 w-1/2"></div>
    <div className="flex gap-2">
      <div className="h-3 bg-border rounded flex-1"></div>
      <div className="h-3 bg-border rounded flex-1"></div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr className="border-b border-border">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-border rounded animate-pulse"></div>
      </td>
    ))}
  </tr>
);

export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={className}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-3 bg-border rounded mb-2 animate-pulse"
        style={{ width: i === lines - 1 ? '70%' : '100%' }}
      ></div>
    ))}
  </div>
);
