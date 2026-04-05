/**
 * Модальное окно для подтверждения опасных операций (DELETE, и т.д.)
 */

import { useState } from 'react';
import clsx from 'clsx';

declare global {
  interface Window {
    __confirmModalHandlers?: {
      onConfirm: () => void | Promise<void>;
      onCancel: () => void;
    };
  }
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  dangerButtonText?: string;
  cancelButtonText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  dangerButtonText = '🗑️ Удалить',
  cancelButtonText = 'Отмена',
  isDangerous = true,
  isLoading = false,
  onConfirm,
  onCancel,
  className = '',
}: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Modal */}
      <div
        className={clsx(
          'bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Иконка */}
        <div
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center mb-4',
            isDangerous ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          )}
        >
          <span className="text-2xl">{isDangerous ? '⚠️' : '❓'}</span>
        </div>

        {/* Заголовок */}
        <h2
          className="text-xl font-bold text-gray-900 dark:text-white mb-2"
          id="confirm-dialog-title"
        >
          {title}
        </h2>

        {/* Сообщение */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

        {/* Кнопки */}
        <div className="flex gap-3">
          {/* Отмена */}
          <button
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition disabled:opacity-50"
            aria-label="Отмена"
          >
            {cancelButtonText}
          </button>

          {/* Подтверждение (опасная операция) */}
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className={clsx(
              'flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2',
              isDangerous
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
            aria-label={isDangerous ? 'Подтвердить удаление' : 'Подтвердить'}
          >
            {isSubmitting || isLoading ? (
              <>
                <Spinner />
                Подождите...
              </>
            ) : (
              dangerButtonText
            )}
          </button>
        </div>

        {/* Подсказка для опасных операций */}
        {isDangerous && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-4 text-center">
            ⚠️ Это действие нельзя отменить
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Hook для управления состоянием модального окна
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<
    Omit<ConfirmModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>
  >({
    title: '',
    message: '',
  });

  const open = (
    newConfig: Omit<ConfirmModalProps, 'isOpen' | 'onConfirm' | 'onCancel'>,
    onConfirm: () => void | Promise<void>
  ) => {
    setConfig(newConfig);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      const handleConfirm = async () => {
        await onConfirm();
        setIsOpen(false);
        resolve(true);
      };

      const handleCancel = () => {
        setIsOpen(false);
        resolve(false);
      };

      // Переопределяем обработчики в модальном окне
      (window as Window).__confirmModalHandlers = {
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      };
    });
  };

  return { isOpen, setIsOpen, config, open };
}

/**
 * Простой компонент-спиннер для загрузки
 */
function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
