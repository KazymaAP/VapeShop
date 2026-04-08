import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { sanitizeHTML } from '../../lib/sanitize';

interface PageData {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export async function getServerSideProps(context: { params: { slug: string } }) {
  return { props: { slug: context.params?.slug || '' } };
}

export default function StaticPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      const res = await fetch(`/api/pages?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data);
      } else {
        setPage(null);
      }
    } catch {
      setPage(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark p-4 space-y-4">
        <div className="h-8 skeleton rounded w-1/2" />
        <div className="h-4 skeleton rounded w-full" />
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-5/6" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-bgDark flex flex-col items-center justify-center px-4">
        <svg
          className="w-20 h-20 text-neon opacity-50 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <h2 className="text-xl font-bold text-textPrimary">Страница не найдена</h2>
        <p className="text-textSecondary mt-2 text-center">Запрашиваемая страница не существует</p>
        <Link
          href="/"
          className="mt-6 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-8 py-3 text-white font-semibold ripple"
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-textSecondary hover:text-neon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold gradient-text">{page.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-cardBg border border-border rounded-2xl p-6">
          <div
            className="prose prose-invert max-w-none text-textSecondary text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHTML(page.content.replace(/\n/g, '<br />')),
            }}
          />
          <p className="text-textSecondary text-xs mt-6 pt-4 border-t border-border">
            Обновлено: {new Date(page.updated_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cardBg/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex justify-around py-2">
          <Link
            href="/"
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
