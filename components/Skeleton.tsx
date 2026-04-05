import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '20px',
  count = 1,
  circle = false,
  className = '',
}: SkeletonProps) {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className={`
            bg-gradient-to-r from-cardBg via-border to-cardBg
            animate-pulse
            ${circle ? 'rounded-full' : 'rounded'}
            ${className}
          `}
          style={{
            width,
            height,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { backgroundPosition: 200% 0; }
          100% { backgroundPosition: -200% 0; }
        }
      `}</style>
    </>
  );
}
