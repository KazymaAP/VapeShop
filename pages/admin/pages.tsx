import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface StaticPage {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminPages() {
  const { user } = useTelegramWebApp();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/pages');
      const data = await res.json();
      setPages(data.pages || []);
    } catch {
      // fallback
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim() || !formData.title.trim() || !formData.content.trim()) return;

    setSaving(true);
    setMessage('');

    try {
      if (editingSlug) {
        await fetch('/api/pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        setMessage('Страница обновлена');
      } else {
        await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        setMessage('Страница создана');
      }
      setFormData({ slug: '', title: '', content: '' });
      setEditingSlug(null);
      setShowForm(false);
      fetchPages();
    } catch {
      setMessage('Ошибка сохранения');
    }

    setSaving(false);
  };

  const startEdit = async (page: StaticPage) => {
    try {
      const res = await fetch(`/api/pages?slug=${page.slug}`);
      const data = await res.json();
      setFormData({ slug: data.slug, title: data.title, content: data.content });
      setEditingSlug(data.slug);
      setShowForm(true);
    } catch {
      setMessage('Ошибка загрузки страницы');
    }
  };

  const deletePage = async (slug: string) => {
    if (!confirm('Удалить эту страницу?')) return;
    await fetch(`/api/pages?slug=${slug}`, { method: 'DELETE' });
    fetchPages();
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Статические страницы</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingSlug(null); setFormData({ slug: '', title: '', content: '' }); }}
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
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                placeholder="Slug (например: about)"
                required
                disabled={!!editingSlug}
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon disabled:opacity-50"
              />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Заголовок"
                required
                className="bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
              />
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Содержимое страницы (поддерживается HTML)"
              required
              rows={8}
              className="w-full bg-bgDark border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-neon text-white rounded-full px-6 py-2.5 text-sm font-medium ripple disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : editingSlug ? 'Обновить' : 'Создать'}
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
        ) : pages.length === 0 ? (
          <div className="text-center py-12 text-textSecondary">
            <p className="text-lg">Страниц пока нет</p>
            <p className="text-sm mt-1">Создайте первую страницу (О нас, Доставка и т.д.)</p>
          </div>
        ) : (
          <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Slug</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Заголовок</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Обновлено</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.slug} className="border-b border-border/50 hover:bg-bgDark/50">
                    <td className="p-4 font-mono text-sm text-neon">/{page.slug}</td>
                    <td className="p-4 text-textPrimary font-medium">{page.title}</td>
                    <td className="p-4 text-textSecondary text-sm">{new Date(page.updated_at).toLocaleDateString('ru-RU')}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(page)}
                          className="text-textSecondary hover:text-neon transition-colors"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePage(page.slug)}
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
