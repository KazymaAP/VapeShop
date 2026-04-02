import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface Promocode {
  code: string;
  discount_type: string;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminPromocodes() {
  const { user } = useTelegramWebApp();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    min_order_amount: '',
    max_uses: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    try {
      const res = await fetch('/api/promocodes');
      const data = await res.json();
      setPromocodes(data.promocodes || []);
    } catch {
      // fallback
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.discount_value) return;

    setSaving(true);
    setMessage('');

    try {
      const payload = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      };

      if (editingCode) {
        await fetch('/api/promocodes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setMessage('Промокод обновлён');
      } else {
        await fetch('/api/promocodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setMessage('Промокод создан');
      }
      resetForm();
      fetchPromocodes();
    } catch {
      setMessage('Ошибка сохранения');
    }

    setSaving(false);
  };

  const resetForm = () => {
    setFormData({ code: '', discount_type: 'percent' as const, discount_value: '', valid_from: '', valid_until: '', min_order_amount: '', max_uses: '' });
    setEditingCode(null);
    setShowForm(false);
  };

  const startEdit = (promo: Promocode) => {
    setFormData({
      code: promo.code,
      discount_type: promo.discount_type as 'percent' | 'fixed',
      discount_value: promo.discount_value.toString(),
      valid_from: promo.valid_from ? promo.valid_from.slice(0, 16) : '',
      valid_until: promo.valid_until ? promo.valid_until.slice(0, 16) : '',
      min_order_amount: promo.min_order_amount.toString(),
      max_uses: promo.max_uses?.toString() || '',
    });
    setEditingCode(promo.code);
    setShowForm(true);
  };

  const deletePromo = async (code: string) => {
    if (!confirm('Удалить промокод?')) return;
    await fetch(`/api/promocodes?code=${code}`, { method: 'DELETE' });
    fetchPromocodes();
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Промокоды</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingCode(null); resetForm(); }}
            className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-4 py-2 text-sm text-white font-medium ripple"
          >
            {showForm ? 'Отмена' : '+ Добавить'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-cardBg border border-border rounded-2xl p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="Код (например: SALE20)"
                required
                disabled={!!editingCode}
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon disabled:opacity-50"
              />
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              >
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder={formData.discount_type === 'percent' ? 'Процент скидки' : 'Сумма скидки'}
                required
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                placeholder="Мин. сумма заказа"
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
              <input
                type="datetime-local"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                placeholder="Действует с"
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              />
              <input
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                placeholder="Действует до"
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              />
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="Макс. использований (пусто = ∞)"
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-neon text-white rounded-full px-6 py-2.5 text-sm font-medium ripple disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : editingCode ? 'Обновить' : 'Создать'}
            </button>
          </form>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${message.startsWith('Ошибка') ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16" />
            ))}
          </div>
        ) : promocodes.length === 0 ? (
          <div className="text-center py-12 text-textSecondary">
            <p className="text-lg">Промокодов пока нет</p>
            <p className="text-sm mt-1">Создайте первый промокод</p>
          </div>
        ) : (
          <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Код</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Скидка</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Мин. заказ</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Использования</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Срок</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Действия</th>
                </tr>
              </thead>
              <tbody>
                {promocodes.map((promo) => (
                  <tr key={promo.code} className="border-b border-border/50 hover:bg-bgDark/50">
                    <td className="p-4 font-mono text-sm text-neon font-bold">{promo.code}</td>
                    <td className="p-4 text-textPrimary">
                      {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `${promo.discount_value} ₽`}
                    </td>
                    <td className="p-4 text-textSecondary text-sm">{promo.min_order_amount > 0 ? `${promo.min_order_amount} ₽` : '—'}</td>
                    <td className="p-4 text-textSecondary text-sm">
                      {promo.used_count}{promo.max_uses ? ` / ${promo.max_uses}` : ' / ∞'}
                    </td>
                    <td className="p-4 text-textSecondary text-xs">
                      {promo.valid_from ? new Date(promo.valid_from).toLocaleDateString('ru-RU') : '—'}
                      {' → '}
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('ru-RU') : '∞'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(promo)}
                          className="text-textSecondary hover:text-neon transition-colors"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePromo(promo.code)}
                          className="text-textSecondary hover:text-danger transition-colors"
                          title="Удалить"
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
