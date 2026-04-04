import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function FaqPage() {
  const router = useRouter();
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchFaq();
  }, []);

  const fetchFaq = async () => {
    try {
      const res = await fetch('/api/faq');
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setFaq(data.faq || []);
    } catch {
      // fallback empty
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bgDark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-bgDark/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-textSecondary hover:text-neon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold gradient-text">FAQ / Помощь</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16" />
            ))}
          </div>
        ) : faq.length === 0 ? (
          <div className="text-center py-16 text-textSecondary">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" />
            </svg>
            <p className="text-lg">Вопросов пока нет</p>
            <p className="text-sm mt-1">Обратитесь в поддержку: @support</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faq.map((item) => (
              <div
                key={item.id}
                className="bg-cardBg border border-border rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-bgDark/30 transition-colors"
                >
                  <span className="text-textPrimary font-medium pr-4">{item.question}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-neon flex-shrink-0 transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openId === item.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <p className="text-textSecondary text-sm mt-3 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-8 bg-cardBg border border-border rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-textPrimary mb-2">Не нашли ответ?</h3>
          <p className="text-textSecondary text-sm mb-4">
            Напишите нам в поддержку — мы всегда рады помочь!
          </p>
          <a
            href="https://t.me/support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-8 py-3 text-white font-semibold ripple"
          >
            Написать в поддержку
          </a>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cardBg/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9L12 3L21 9L21 20H15V14H9V20H3V9Z" />
            </svg>
            <span className="text-xs mt-0.5">Каталог</span>
          </Link>
          <Link href="/compare" className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V5C20 3.89543 19.1046 3 18 3Z" />
              <path d="M9 8L11 11L15 7" />
            </svg>
            <span className="text-xs mt-0.5">Сравнить</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center py-1 px-3 text-textSecondary hover:text-neon transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
