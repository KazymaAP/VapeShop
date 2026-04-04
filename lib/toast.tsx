/**
 * Toast Notification System
 * Глобальная система уведомлений для успеха, ошибок, информации и warning
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);

    // Auto-remove через duration
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Компонент контейнера для отображения всех тостов
function ToastContainer({
  toasts,
  onRemove
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  const getConfig = (type: ToastType) => {
    const configs: Record<ToastType, { bg: string; text: string; icon: string; border: string }> = {
      success: {
        bg: 'bg-green-500 dark:bg-green-600',
        text: 'text-white',
        icon: '✓',
        border: 'border-green-600 dark:border-green-700'
      },
      error: {
        bg: 'bg-red-500 dark:bg-red-600',
        text: 'text-white',
        icon: '✕',
        border: 'border-red-600 dark:border-red-700'
      },
      info: {
        bg: 'bg-blue-500 dark:bg-blue-600',
        text: 'text-white',
        icon: 'ℹ',
        border: 'border-blue-600 dark:border-blue-700'
      },
      warning: {
        bg: 'bg-yellow-500 dark:bg-yellow-600',
        text: 'text-white',
        icon: '⚠',
        border: 'border-yellow-600 dark:border-yellow-700'
      }
    };
    return configs[type];
  };

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:right-4 md:max-w-sm z-50 pointer-events-none"
      role="region"
      aria-label="Notification area"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => {
        const config = getConfig(toast.type);
        return (
          <div
            key={toast.id}
            className={`
              ${config.bg} ${config.text}
              px-4 py-3 rounded-lg shadow-lg mb-3
              flex items-center gap-3
              border ${config.border}
              pointer-events-auto
              animate-in fade-in slide-in-from-bottom-4 duration-300
            `}
            role="alert"
          >
            <span className="text-lg flex-shrink-0">{config.icon}</span>
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 hover:opacity-80 transition"
              aria-label="Закрыть уведомление"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
