'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTelegramWebApp } from '../../../../lib/telegram';
import 'react-quill/dist/quill.snow.css';

// Динамическая загрузка ReactQuill для избежания ошибок SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface Page {
  slug: string;
  title: string;
  content: string;
  seo_description?: string;
  is_published: boolean;
}

export default function EditPagePage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, isReady } = useTelegramWebApp();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Загрузка страницы
  useEffect(() => {
    if (!slug || !isReady) return;

    const loadPage = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/pages/${slug}`, {
          headers: {
            'X-Telegram-Id': user?.id?.toString() || '',
          },
        });

        if (!response.ok) throw new Error('Ошибка загрузки');

        const data: Page = await response.json();
        setPage(data);
        setTitle(data.title);
        setContent(data.content);
        setSeoDescription(data.seo_description || '');
        setIsPublished(data.is_published);
      } catch (error) {
        console.error('Load page error:', error);
        alert('Ошибка при загрузке страницы');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [slug, isReady, user?.id]);

  // Сохранение страницы
  const savePage = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Заполните заголовок и содержимое');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          slug,
          title,
          content,
          seo_description: seoDescription,
          is_published: isPublished,
        }),
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      alert('Страница сохранена');
    } catch (error) {
      console.error('Save page error:', error);
      alert('Ошибка при сохранении страницы');
    } finally {
      setSaving(false);
    }
  };

  if (!isReady || loading) {
    return (
      <div className="min-h-screen bg-bgDark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-bgDark text-white flex items-center justify-center">
        <div className="text-center text-red-400">Страница не найдена</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-neon">Редактирование: {page.slug}</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-border text-white font-semibold rounded hover:opacity-80 transition"
          >
            ← Назад
          </button>
        </div>

        {/* Форма редактирования */}
        <div className="bg-cardBg border border-border rounded-lg p-6 space-y-6">
          {/* Заголовок */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Заголовок:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bgDark border border-border rounded px-4 py-2 text-white text-lg"
              placeholder="Введите заголовок"
            />
          </div>

          {/* SEO описание */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">SEO описание:</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              className="w-full bg-bgDark border border-border rounded px-4 py-2 text-white text-sm"
              placeholder="Описание для поисковых систем"
            />
          </div>

          {/* Контент - WYSIWYG редактор */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Содержимое (WYSIWYG):</label>
            <div className="bg-white rounded">
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    ['link', 'image'],
                    ['clean'],
                  ],
                }}
                theme="snow"
              />
            </div>
          </div>

          {/* Статус публикации */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-5 h-5 rounded border border-border bg-bgDark cursor-pointer"
            />
            <label htmlFor="published" className="cursor-pointer">
              Опубликовать эту страницу
            </label>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={savePage}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-neon text-bgDark font-semibold rounded hover:opacity-80 disabled:opacity-50 transition"
            >
              {saving ? 'Сохраняется...' : 'Сохранить'}
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-border text-white font-semibold rounded hover:opacity-80 transition"
            >
              Отмена
            </button>
          </div>
        </div>

        {/* Предпросмотр */}
        <div className="mt-6 bg-cardBg border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-neon mb-4">Предпросмотр</h2>
          <div
            className="prose dark:prose-invert max-w-none text-white"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
