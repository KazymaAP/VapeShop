import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTelegramWebApp } from '../lib/telegram';
import { TIMERS } from '../lib/constants';
import { logger } from '../lib/logger';
import ProductCard from '../components/ProductCard';
import type { ProductID } from '../types';
// Skeleton loading handled by ProductCard

const DEFAULT_PRODUCT_IMAGE = '/no-image.png';

interface Product {
  id: ProductID;
  name: string;
  specification: string | null;
  price: number;
  stock: number;
  images: string[];
  promotion: boolean;
  is_new: boolean;
  is_hit: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function Home() {
  const { user } = useTelegramWebApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      sort: sortBy,
      order: sortOrder,
    });
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);

    const res = await fetch(`/api/products?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch products (HTTP ${res.status}): ${params.toString()}`);
    }
    const data = await res.json();
    setProducts(data.products);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  const fetchFilters = async () => {
    const res = await fetch('/api/products?filters=1');
    if (!res.ok) {
      throw new Error(`Failed to fetch product filters (HTTP ${res.status})`);
    }
    const data = await res.json();
    setCategories(data.categories);
    setBrands(data.brands);
  };

  const fetchCartCount = async () => {
    if (!user) return;
    const res = await fetch(`/api/cart?telegram_id=${user.id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch cart for user ${user.id} (HTTP ${res.status})`);
    }
    const data = await res.json();
    const count =
      data.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0;
    setCartCount(count);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  useEffect(() => {
    // Восстанавливаем фильтры из localStorage
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('catalogFilters');
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          setSelectedCategory(filters.category || '');
          setSelectedBrand(filters.brand || '');
          setSortBy(filters.sortBy || 'created_at');
          setSortOrder(filters.sortOrder || 'desc');
          setPriceMin(filters.priceMin || '');
          setPriceMax(filters.priceMax || '');
        } catch (err) {
          // MEDIUM-008 FIX: Use logger with context instead of console.error
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error('Failed to restore catalog filters from localStorage', {
            error: errorMsg,
            context: 'Filter recovery on component mount',
          });
        }
      }
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (search) {
        setPage(1);
        fetchProducts();
      }
    }, TIMERS.SEARCH_DEBOUNCE);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setPage(1); // Reset to first page when filter changes
    fetchProducts();
    saveFilters();
  }, [page, sortBy, sortOrder, selectedCategory, selectedBrand]);

  useEffect(() => {
    fetchCartCount();
  }, [user]);

  const saveFilters = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'catalogFilters',
        JSON.stringify({
          category: selectedCategory,
          brand: selectedBrand,
          sortBy,
          sortOrder,
          priceMin,
          priceMax,
        })
      );
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) return;
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: user.id, product_id: productId, quantity: 1 }),
    });
    fetchCartCount();
  };

  return (
    <div className="min-h-screen bg-bgDark pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold gradient-text">VAPOR DARK</h1>
            <Link href="/cart" className="relative p-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.66 16H19.4A2 2 0 0 0 21.28 14.63L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-neon text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск товаров..."
              className="flex-1 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-xl px-4 text-white font-medium ripple"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-cardBg border border-border rounded-xl px-3 text-textSecondary hover:border-neon transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="20" y2="12" />
                <line x1="12" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </form>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-3 border-t border-border pt-3 space-y-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(1);
              }}
              className="w-full bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
            >
              <option value="">Все бренды</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Цена от"
                className="flex-1 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Цена до"
                className="flex-1 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              >
                <option value="created_at">По дате</option>
                <option value="price">По цене</option>
                <option value="name">По названию</option>
                <option value="views">По популярности</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="bg-cardBg border border-border rounded-xl px-4 text-textSecondary hover:border-neon transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedBrand('');
                setPriceMin('');
                setPriceMax('');
                setSortBy('created_at');
                setSortOrder('desc');
                setPage(1);
              }}
              className="w-full text-sm text-textSecondary hover:text-neon transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </header>

      {/* Products Grid */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                  <div className="h-6 skeleton rounded w-1/3" />
                  <div className="h-10 skeleton rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-textSecondary">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-lg">Ничего не найдено</p>
            <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.images?.[0] || DEFAULT_PRODUCT_IMAGE}
                    specification={product.specification || undefined}
                    stock={product.stock}
                    promotion={product.promotion}
                    isNew={product.is_new}
                    isHit={product.is_hit}
                    onAddToCart={handleAddToCart}
                  />
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-cardBg border border-border rounded-xl px-4 py-2 text-sm text-textPrimary disabled:opacity-50 hover:border-neon transition-colors"
                >
                  ← Назад
                </button>
                <span className="text-textSecondary text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="bg-cardBg border border-border rounded-xl px-4 py-2 text-sm text-textPrimary disabled:opacity-50 hover:border-neon transition-colors"
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cardBg/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center py-1 px-3 text-neon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9L12 3L21 9L21 20H15V14H9V20H3V9Z" />
            </svg>
            <span className="text-xs mt-0.5">Каталог</span>
          </Link>
          <Link
            href="/compare"
            className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3Z" />
              <path d="M9 8L11 11L15 7" />
            </svg>
            <span className="text-xs mt-0.5">Сравнить</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-xs mt-0.5">Профиль</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
