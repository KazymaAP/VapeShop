import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/frontend/auth';

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ActivationModalProps {
  productIds: string[];
  tier1Price: number | null;
  tier2Price: number | null;
  tier3Price: number | null;
  distributorPrice: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * ActivationModal - модальное окно для активации товаров
 *
 * Позволяет выбрать финальную цену, категорию, бренд,
 * загрузить изображения и установить флаги товара.
 */
export default function ActivationModal({
  productIds,
  tier1Price,
  tier2Price,
  tier3Price,
  distributorPrice,
  isOpen,
  onClose,
  onSuccess,
}: ActivationModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [priceType, setPriceType] = useState<
    'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
  >('tier1');
  const [manualPrice, setManualPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategoriesAndBrands();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const fetchCategoriesAndBrands = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        fetchWithAuth('/api/categories'),
        fetchWithAuth('/api/brands'),
      ]);
      const catsData = await catsRes.json();
      const brandsData = await brandsRes.json();
      setCategories(catsData.categories || []);
      setBrands(brandsData.brands || []);
    } catch (err) {
      console.error('Error fetching categories/brands:', err);
    }
  };

  const getSelectedPrice = (): number | null => {
    if (priceType === 'tier1') return tier1Price;
    if (priceType === 'tier2') return tier2Price;
    if (priceType === 'tier3') return tier3Price;
    if (priceType === 'distributor') return distributorPrice;
    if (priceType === 'manual') return manualPrice ? parseFloat(manualPrice) : null;
    return null;
  };

  const validate = (): boolean => {
    setError('');

    const finalPrice = getSelectedPrice();
    if (!finalPrice || finalPrice <= 0) {
      setError('Выберите валидную финальную цену (> 0)');
      return false;
    }

    // Валидация категории
    const catName = newCategoryName?.trim() || '';
    if (!categoryId && !catName) {
      setError('Выберите категорию или введите новую');
      return false;
    }
    if (catName && catName.length < 2) {
      setError('Название категории должно быть минимум 2 символа');
      return false;
    }
    if (catName && catName.length > 100) {
      setError('Название категории не может быть больше 100 символов');
      return false;
    }

    // Валидация бренда
    const brandName = newBrandName?.trim() || '';
    if (!brandId && !brandName) {
      setError('Выберите бренд или введите новый');
      return false;
    }
    if (brandName && brandName.length < 2) {
      setError('Название бренда должно быть минимум 2 символа');
      return false;
    }
    if (brandName && brandName.length > 100) {
      setError('Название бренда не может быть больше 100 символов');
      return false;
    }

    // Валидация изображений
    const validUrls = imageUrls.filter((url) => {
      try {
        const trimmed = url.trim();
        if (!trimmed) return false;
        new URL(trimmed); // Проверка валидности URL
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      setError('Добавьте минимум одно корректное изображение (валидный URL)');
      return false;
    }

    if (validUrls.length > 10) {
      setError('Максимум 10 изображений');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const finalPrice = getSelectedPrice();
      const validUrls = imageUrls.filter((url) => url.trim());

      const payload = {
        price_import_ids: productIds,
        final_price: finalPrice,
        category_id: categoryId || null,
        new_category_name: newCategoryName || null,
        brand_id: brandId || null,
        new_brand_name: newBrandName || null,
        images: validUrls,
        is_promotion: isPromotion,
        is_hit: isHit,
        is_new: isNew,
      };

      const res = await fetchWithAuth('/api/admin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Ошибка при активации');
      }

      setSuccess('Товары успешно активированы!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || 'Ошибка при активации товаров');
    } finally {
      setLoading(false);
    }
  };

  const addImageUrl = () => {
    setImageUrls([...imageUrls, '']);
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const updateImageUrl = (index: number, value: string) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-cardBg border border-neon/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-cardBg">
            <h2 className="text-xl font-bold text-textPrimary">Активация товаров</h2>
            <button
              onClick={onClose}
              className="text-textSecondary hover:text-neon transition-colors p-1"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error/Success messages */}
            {error && (
              <div className="p-4 bg-danger/20 border border-danger/50 rounded-xl text-danger text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-success/20 border border-success/50 rounded-xl text-success text-sm">
                {success}
              </div>
            )}

            {/* Price Selection */}
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-3">
                Выбор итоговой цены
              </label>
              <div className="space-y-2">
                {tier1Price !== null && (
                  <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="price"
                      value="tier1"
                      checked={priceType === 'tier1'}
                      onChange={(e) =>
                        setPriceType(
                          e.target.value as 'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-textSecondary">
                      Tier 1: {tier1Price.toLocaleString('ru-RU')} ₽
                    </span>
                  </label>
                )}
                {tier2Price !== null && (
                  <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="price"
                      value="tier2"
                      checked={priceType === 'tier2'}
                      onChange={(e) =>
                        setPriceType(
                          e.target.value as 'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-textSecondary">
                      Tier 2: {tier2Price.toLocaleString('ru-RU')} ₽
                    </span>
                  </label>
                )}
                {tier3Price !== null && (
                  <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="price"
                      value="tier3"
                      checked={priceType === 'tier3'}
                      onChange={(e) =>
                        setPriceType(
                          e.target.value as 'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-textSecondary">
                      Tier 3: {tier3Price.toLocaleString('ru-RU')} ₽
                    </span>
                  </label>
                )}
                {distributorPrice !== null && (
                  <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="price"
                      value="distributor"
                      checked={priceType === 'distributor'}
                      onChange={(e) =>
                        setPriceType(
                          e.target.value as 'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-textSecondary">
                      Дистрибьюторская: {distributorPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="price"
                    value="manual"
                    checked={priceType === 'manual'}
                    onChange={(e) =>
                      setPriceType(
                        e.target.value as 'tier1' | 'tier2' | 'tier3' | 'distributor' | 'manual'
                      )
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-textSecondary">Ручной ввод</span>
                </label>
                {priceType === 'manual' && (
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Введите цену"
                    min="0"
                    step="0.01"
                    className="w-full bg-bgDark border border-neon/50 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon ml-7"
                  />
                )}
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Категория *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {!categoryId && (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Или создайте новую категорию"
                  className="w-full mt-2 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
                />
              )}
            </div>

            {/* Brand Selection */}
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Бренд *</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              >
                <option value="">Выберите бренд</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {!brandId && (
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Или создайте новый бренд"
                  className="w-full mt-2 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
                />
              )}
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">
                Изображения *
              </label>
              <div className="space-y-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="px-3 py-2 bg-danger/20 border border-danger/50 text-danger rounded-xl hover:bg-danger/30 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addImageUrl}
                className="mt-2 text-sm text-neon hover:underline"
              >
                + Добавить изображение
              </button>
            </div>

            {/* Flags */}
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-3">
                Флаги товара
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isPromotion}
                    onChange={(e) => setIsPromotion(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-textSecondary">☐ Акция (is_promotion)</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isHit}
                    onChange={(e) => setIsHit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-textSecondary">☐ Хит (is_hit)</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-bgDark rounded-xl border border-border hover:border-neon/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(e) => setIsNew(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-textSecondary">☐ Новинка (is_new)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-4 py-2.5 text-sm text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Активация...' : 'Активировать'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-bgDark border border-border rounded-full px-4 py-2.5 text-sm text-textPrimary hover:border-neon/50 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
