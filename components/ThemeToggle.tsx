import React, { useState, useEffect } from 'react';

interface ThemeToggleProps {
  onToggle?: (isDark: boolean) => void;
}

export default function ThemeToggle({ onToggle }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Инициализируем тему после монтирования компонента (клиент-сайд)
  useEffect(() => {
    setIsMounted(true);
    // Загружаем сохранённую тему из localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const isDarkTheme = savedTheme === 'dark';
        setIsDark(isDarkTheme);

        // Применяем класс к document
        if (isDarkTheme) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (err) {
        console.error('Ошибка при загрузке темы:', err);
      }
    }
  }, []);

  const handleToggle = () => {
    if (typeof window === 'undefined') return;

    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);

      if (newIsDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

      onToggle?.(newIsDark);
    } catch (err) {
      console.error('Ошибка при изменении темы:', err);
    }
  };

  // Пока компонент не смонтирован, не рендерим, чтобы избежать hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-cardBg border border-border text-neon hover:bg-bgDark"
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
