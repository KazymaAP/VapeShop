import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface Product {
  id: string;
  name: string;
  specification: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  is_new: boolean;
  is_hit: boolean;
  promotion: boolean;
  brand_name: string | null;
  category_name: string | null;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminProducts() {
  const { user } = useTelegramWebApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    price: '',
    stock: '',
    brand_id: '',
    category_id: '',
    is_new: false,
    is_hit: false,
    promotion: false,
  });

  useEffect(() => {
    if (!user) return;
    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [user, search]);

  const fetchProducts = async () => {
    const params = search ? `?search=${search}` : '';
    const res = await fetch(`/api/admin/products${params}`);
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setShowForm(false);
    setFormData({
      name: '',
      specification: '',
      price: '',
      stock: '',
      brand_id: '',
      category_id: '',
      is_new: false,
      is_hit: false,
      promotion: false,
    });
    fetchProducts();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    });
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Управление товарами</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-4 py-2 text-sm text-white font-medium ripple"
          >
            {showForm ? 'Отмена' : '+ Добавить'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-cardBg border border-border rounded-2xl p-6 mb-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Название"
                required
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="text"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="Характеристика"
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Цена"
                required
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="Остаток"
                required
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-textSecondary">
                <input
                  type="checkbox"
                  checked={formData.is_new}
                  onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                />
                Новинка
              </label>
              <label className="flex items-center gap-2 text-sm text-textSecondary">
                <input
                  type="checkbox"
                  checked={formData.is_hit}
                  onChange={(e) => setFormData({ ...formData, is_hit: e.target.checked })}
                />
                Хит
              </label>
              <label className="flex items-center gap-2 text-sm text-textSecondary">
                <input
                  type="checkbox"
                  checked={formData.promotion}
                  onChange={(e) => setFormData({ ...formData, promotion: e.target.checked })}
                />
                Акция
              </label>
            </div>
            <button
              type="submit"
              className="bg-neon text-white rounded-full px-6 py-2.5 text-sm font-medium ripple"
            >
              Сохранить
            </button>
          </form>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full md:w-80 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16"
              />
            ))}
          </div>
        ) : (
          <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                    Название
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Цена</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                    Остаток
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                    Статус
                  </th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border/50 hover:bg-bgDark/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-textPrimary font-medium">{product.name}</p>
                      <p className="text-textSecondary text-xs">{product.brand_name || ''}</p>
                    </td>
                    <td className="p-4 text-neon font-bold">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-4">
                      <span className={product.stock < 5 ? 'text-warning' : 'text-success'}>
                        {product.stock} шт
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${product.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}
                      >
                        {product.is_active ? 'Активен' : 'Скрыт'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(product.id, product.is_active)}
                          className="text-textSecondary hover:text-neon transition-colors"
                          title={product.is_active ? 'Скрыть' : 'Показать'}
                        >
                          {product.is_active ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-textSecondary hover:text-danger transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
