/**
 * Утилиты для Accessibility и Interaction
 * Только утилиты, без JSX компонентов (JSX должны быть в .tsx файлах)
 */

/**
 * Hook для управления фокусом при открытии/закрытии модалей
 */
export function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen || !containerRef.current) return;

    if (e.key === 'Escape') {
      // Разработчик должен передать callback для закрытия модали
      const event = new CustomEvent('modal:close');
      containerRef.current.dispatchEvent(event);
    }

    // Tab навигация в пределах модали
    if (e.key === 'Tab') {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  return handleKeyDown;
}

/**
 * Классы Tailwind для hover effects
 */
export const HOVER_EFFECTS = {
  scale: 'hover:scale-105 transition-transform duration-200',
  shadow: 'hover:shadow-lg transition-shadow duration-200',
  opacity: 'hover:opacity-80 transition-opacity duration-200',
  translateY: 'hover:-translate-y-1 transition-transform duration-200',
  color: 'hover:text-neon transition-colors duration-200',
  combined: 'hover:scale-105 hover:shadow-neon hover:-translate-y-1 transition-all duration-200'
};

/**
 * Утилита для keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    // Ctrl/Cmd + key
    if ((e.ctrlKey || e.metaKey) && shortcuts[`ctrl+${key}`]) {
      e.preventDefault();
      shortcuts[`ctrl+${key}`]?.();
    }

    // Alt + key
    if (e.altKey && shortcuts[`alt+${key}`]) {
      e.preventDefault();
      shortcuts[`alt+${key}`]?.();
    }

    // Простой key
    if (!e.ctrlKey && !e.metaKey && !e.altKey && shortcuts[key]) {
      shortcuts[key]?.();
    }
  };

  return handleKeyDown;
}

/**
 * Утилита для auto-focus при открытии элемента
 */
export function useAutoFocus(isOpen: boolean, ref: React.RefObject<HTMLInputElement>) {
  return (isOpen: boolean) => {
    if (isOpen && ref.current) {
      setTimeout(() => ref.current?.focus(), 0);
    }
  };
}

import React from 'react';
