import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTelegramWebApp } from '../lib/telegram';

interface Product {
  id: string;
  name: string;
  price: number;
  specification: string | null;
  stock: number;
  images: string[];
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function ComparePage() {
  const router = useRouter();
  const { user } = useTelegramWebApp();
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompareList();
  }, []);

  const fetchCompareList = async () => {
    const stored = localStorage.getItem('compare_list');
    if (stored) {
      const ids = JSON.parse(stored);
      const products = await Promise.all(
        ids.map(async (id: string) => {
          const res = await fetch(`/api/products/${id}`);
          return res.json();
        })
      );
      setCompareList(products.filter(Boolean));
    }
    setLoading(false);
  };

  const removeFromCompare = (id: string) => {
    const stored = localStorage.getItem('compare_list');
    if (stored) {
      const ids = JSON.parse(stored);
      const filtered = ids.filter((pid: string) => pid !== id);
      localStorage.setItem('compare_list', JSON.stringify(filtered));
      setCompareList(compareList.filter((p) => p.id !== id));
    }
  };

  const attributes = [
    { label: 'Цена', key: 'price' as const, format: (v: number) => `${v.toLocaleString('ru-RU')} ₽` },
    { label: 'Наличие', key: 'stock' as const, format: (v: number) => v > 0 ? `${v} шт` : 'Нет' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark p-4">
        <div className="skeleton h-10 w-48 rounded mb-4" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-bgDark flex flex-col items-center justify-center px-4">
        <svg className="w-20 h-20 text-neon opacity-50 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3Z" />
          <path d="M9 8L11 11L15 7" />
        </svg>
        <h2 className="text-xl font-bold text-textPrimary">Список сравнения пуст</h2>
        <p className="text-textSecondary mt-2 text-center">Добавьте товары для сравнения из каталога</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-8 py-3 text-white font-semibold ripple"
        >
          Перейти в каталог
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark pb-20">
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-textSecondary hover:text-neon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold gradient-text">Сравнение ({compareList.length})</h1>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="p-4 text-left text-textSecondary text-sm w-32">Параметр</th>
              {compareList.map((product) => (
                <th key={product.id} className="p-4 text-center min-w-[160px]">
                  <div className="relative">
                    <button
                      onClick={() => removeFromCompare(product.id)}
                      className="absolute -top-2 -right-2 text-danger hover:opacity-80"
                    >
                      ×
                    </button>
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#1f1f2a] to-[#131318] rounded-xl flex items-center justify-center mb-2">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <svg className="w-8 h-8 text-neon opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M7 9H5L3 12L5 15H7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-textPrimary text-sm font-medium truncate">{product.name}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attributes.map((attr) => (
              <tr key={attr.key} className="border-t border-border">
                <td className="p-4 text-textSecondary text-sm">{attr.label}</td>
                {compareList.map((product) => (
                  <td key={product.id} className="p-4 text-center text-textPrimary">
                    {attr.format(product[attr.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="p-4 text-textSecondary text-sm">Характеристики</td>
              {compareList.map((product) => (
                <td key={product.id} className="p-4 text-center text-textSecondary text-sm">
                  {product.specification || '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
