import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminFaq() {
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ question: '', answer: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchFaq();
  }, []);

  const fetchFaq = async () => {
    try {
      const res = await fetch('/api/faq');
      const data = await res.json();
      setFaq(data.faq || []);
    } catch {
      // fallback
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    setSaving(true);
    setMessage('');

    try {
      if (editingId) {
        await fetch('/api/faq', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
        setMessage('Вопрос обновлён');
      } else {
        await fetch('/api/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        setMessage('Вопрос добавлен');
      }
      setFormData({ question: '', answer: '', sort_order: 0 });
      setEditingId(null);
      setShowForm(false);
      fetchFaq();
    } catch {
      setMessage('Ошибка сохранения');
    }

    setSaving(false);
  };

  const startEdit = (item: FaqItem) => {
    setFormData({ question: item.question, answer: item.answer, sort_order: item.sort_order });
    setEditingId(item.id);
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Удалить этот вопрос?')) return;
    await fetch(`/api/faq?id=${id}`, { method: 'DELETE' });
    fetchFaq();
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">FAQ</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ question: '', answer: '', sort_order: 0 }); }}
            className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-4 py-2 text-sm text-white font-medium ripple"
          >
            {showForm ? 'Отмена' : '+ Добавить'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-cardBg border border-border rounded-2xl p-6 mb-6 space-y-4">
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Вопрос"
              required
              className="w-full bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
            />
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Ответ"
              required
              rows={4}
              className="w-full bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
            />
            <div className="flex items-center gap-4">
              <label className="text-sm text-textSecondary">
                Порядок:
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="ml-2 w-20 bg-bgDark border border-border rounded-lg px-3 py-1.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-neon text-white rounded-full px-6 py-2.5 text-sm font-medium ripple disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : editingId ? 'Обновить' : 'Добавить'}
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
        ) : faq.length === 0 ? (
          <div className="text-center py-12 text-textSecondary">
            <p className="text-lg">Вопросов пока нет</p>
            <p className="text-sm mt-1">Добавьте первый вопрос и ответ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faq.map((item) => (
              <div key={item.id} className="bg-cardBg border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-textPrimary font-medium">{item.question}</p>
                    <p className="text-textSecondary text-sm mt-1 line-clamp-2">{item.answer}</p>
                    <span className="text-xs text-textSecondary mt-2 inline-block">Порядок: {item.sort_order}</span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-textSecondary hover:text-neon transition-colors"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-textSecondary hover:text-danger transition-colors"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
