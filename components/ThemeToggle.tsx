import React, { useState } from 'react';

interface ThemeToggleProps {
  onToggle?: (isDark: boolean) => void;
}

export default function ThemeToggle({ onToggle }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true);

  const handleToggle = () => {
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
  };

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
