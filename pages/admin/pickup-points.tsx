import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminPickupPoints() {
  const { _isReady } = useTelegramWebApp();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchPickupPoints();
  }, []);

  const fetchPickupPoints = async () => {
    try {
      const res = await fetch('/api/admin/pickup-points');
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setPickupPoints(data.pickup_points || []);
    } catch (err) {
      console.error('Error fetching pickup points:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setMessage('Заполните все поля');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/pickup-points/${editingId}` : '/api/admin/pickup-points';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      setMessage(editingId ? 'Точка обновлена' : 'Точка добавлена');
      setMessageType('success');
      resetForm();
      fetchPickupPoints();
    } catch (err) {
      console.error('Error:', err);
      setMessage('Ошибка сохранения');
      setMessageType('error');
    }

    setSaving(false);
  };

  const handleEdit = (point: PickupPoint) => {
    setFormData({
      name: point.name,
      address: point.address,
      active: point.active,
    });
    setEditingId(point.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту точку?')) return;

    try {
      const res = await fetch(`/api/admin/pickup-points/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('Точка удалена');
        setMessageType('success');
        fetchPickupPoints();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Ошибка удаления');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Error:', err);
      setMessage('Ошибка удаления');
      setMessageType('error');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', active: true });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary">Управление точками самовывоза</h1>
              <p className="text-textSecondary mt-1">Добавляйте и редактируйте пункты доставки</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-[#7c3aed] to-neon text-white rounded-xl px-6 py-3 font-medium hover:shadow-neon transition-all"
            >
              + Добавить точку
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl border ${
                messageType === 'success'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-danger/10 border-danger/30 text-danger'
              }`}
            >
              {message}
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
              <div className="bg-cardBg border border-border rounded-2xl w-full md:max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-textPrimary mb-4">
                  {editingId ? 'Редактировать точку' : 'Добавить новую точку'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-textSecondary mb-2">Название</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Пункт самовывоза №1"
                      className="w-full bg-bgDark border border-border rounded-xl px-4 py-3 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-textSecondary mb-2">Адрес</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Улица, дом, этаж, помещение"
                      className="w-full bg-bgDark border border-border rounded-xl px-4 py-3 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon transition-colors resize-none"
                      rows={3}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-bgDark border border-border cursor-pointer hover:border-neon transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 accent-neon"
                    />
                    <span className="text-textPrimary text-sm">Активна</span>
                  </label>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-2 rounded-xl border border-border text-textSecondary hover:border-neon hover:text-textPrimary transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-neon text-white font-medium hover:shadow-neon transition-all disabled:opacity-50"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-cardBg border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-3 border-neon border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pickupPoints.length === 0 ? (
              <div className="p-8 text-center text-textSecondary">
                <p>Точек самовывоза не найдено</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-bgDark/50">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-textPrimary">Название</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-textPrimary">Адрес</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-textPrimary">Статус</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-textPrimary">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickupPoints.map((point) => (
                      <tr key={point.id} className="border-b border-border hover:bg-bgDark/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-textPrimary font-medium">{point.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-textSecondary text-sm">{point.address}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              point.active
                                ? 'bg-success/20 text-success'
                                : 'bg-border/50 text-textSecondary'
                            }`}
                          >
                            {point.active ? '● Активна' : '○ Неактивна'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(point)}
                              className="px-3 py-2 rounded-lg bg-bgDark border border-border text-textSecondary hover:border-neon hover:text-neon transition-colors text-sm font-medium"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDelete(point.id)}
                              className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors text-sm font-medium"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

