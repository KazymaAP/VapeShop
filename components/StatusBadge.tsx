/**
 * Компонент StatusBadge для отображения статусов заказов с цветовой кодировкой
 */

interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface StatusConfig {
  bg: string;
  text: string;
  icon: string;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: '⏳',
    label: 'Ожидание',
  },
  confirmed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
    icon: '✓',
    label: 'Подтверждён',
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-200',
    icon: '⚙️',
    label: 'В обработке',
  },
  ready_for_pickup: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-200',
    icon: '📦',
    label: 'Готов к отправке',
  },
  on_delivery: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-200',
    icon: '🚚',
    label: 'На доставке',
  },
  completed: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-800 dark:text-gray-200',
    icon: '✓✓',
    label: 'Завершён',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-200',
    icon: '✕',
    label: 'Отменён',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        ${config.bg} ${config.text} ${className}
      `}
      role="status"
      aria-label={config.label}
    >
      <span className="text-xs">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
