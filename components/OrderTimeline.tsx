/**
 * Компонент для визуализации временной шкалы статуса заказа
 */

interface TimelineEvent {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  timestamp?: Date;
  description: string;
  icon?: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  currentStatus: TimelineEvent['status'];
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Ожидание',
    icon: '⏳',
    color: 'border-warning',
    bgColor: 'bg-warning/10',
  },
  processing: {
    label: 'В обработке',
    icon: '⚙️',
    color: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  shipped: {
    label: 'Отправлено',
    icon: '📦',
    color: 'border-neon',
    bgColor: 'bg-neon/10',
  },
  delivered: {
    label: 'Доставлено',
    icon: '✓',
    color: 'border-success',
    bgColor: 'bg-success/10',
  },
  cancelled: {
    label: 'Отменено',
    icon: '✕',
    color: 'border-danger',
    bgColor: 'bg-danger/10',
  },
};

export function OrderTimeline({ events, currentStatus, className = '' }: OrderTimelineProps) {
  // Определяем последовательность статусов
  const statusOrder: TimelineEvent['status'][] = ['pending', 'processing', 'shipped', 'delivered'];

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timeline events */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

        {/* Events */}
        {statusOrder.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={status} className="mb-6 last:mb-0">
              {/* Timeline dot */}
              <div
                className={`
                  absolute -left-2 w-5 h-5 rounded-full border-4 transition
                  ${
                    isCompleted
                      ? 'bg-success border-success'
                      : isCurrent
                        ? 'bg-neon border-neon'
                        : 'bg-bgDark border-border'
                  }
                `}
              />

              {/* Content */}
              <div
                className={`
                  p-4 rounded-lg border-l-4 transition
                  ${config.color} ${config.bgColor}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-textPrimary flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      {config.label}
                    </h3>

                    {/* Event details if provided */}
                    {events[index] && (
                      <>
                        <p className="text-sm text-textSecondary mt-1">
                          {events[index].description}
                        </p>
                        {events[index].timestamp && (
                          <p className="text-xs text-textSecondary mt-2">
                            {new Date(events[index].timestamp!).toLocaleString('ru-RU')}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Status badge */}
                  {isCurrent && (
                    <div className="text-xs font-semibold bg-neon text-bgDark px-2 py-1 rounded">
                      Текущее
                    </div>
                  )}
                  {isCompleted && (
                    <div className="text-xs font-semibold bg-success text-white px-2 py-1 rounded">
                      Завершено
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled state (if applicable) */}
      {currentStatus === 'cancelled' && (
        <div className="p-4 rounded-lg border-2 border-danger bg-danger/10">
          <div className="flex items-start gap-3">
            <span className="text-lg">✕</span>
            <div>
              <h3 className="font-semibold text-danger">Заказ отменен</h3>
              <p className="text-sm text-danger/70 mt-1">
                Если это произошло по ошибке, свяжитесь с поддержкой
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estimated delivery */}
      {currentStatus !== 'cancelled' && currentStatus !== 'delivered' && (
        <div className="p-4 rounded-lg bg-cardBg border border-border">
          <p className="text-sm text-textSecondary">
            <span className="font-semibold">⏱️ Ожидаемая доставка:</span> 3-5 рабочих дней
          </p>
        </div>
      )}
    </div>
  );
}

// Компонент для отслеживания заказа на карте (для курьерской доставки)
interface DeliveryTrackingProps {
  courierName?: string;
  courierPhone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export function DeliveryTracking({ courierName, courierPhone, location }: DeliveryTrackingProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-cardBg">
      <h3 className="font-semibold text-textPrimary mb-4 flex items-center gap-2">
        <span>📍</span> Информация о доставке
      </h3>

      <div className="space-y-3">
        {courierName && (
          <div>
            <p className="text-xs text-textSecondary">Курьер</p>
            <p className="font-medium text-textPrimary">{courierName}</p>
          </div>
        )}

        {courierPhone && (
          <div>
            <p className="text-xs text-textSecondary">Телефон курьера</p>
            <a href={`tel:${courierPhone}`} className="font-medium text-neon hover:underline">
              {courierPhone}
            </a>
          </div>
        )}

        {location && (
          <div>
            <p className="text-xs text-textSecondary">Текущая локация</p>
            <p className="font-medium text-textPrimary">{location}</p>
          </div>
        )}

        {!courierName && !courierPhone && !location && (
          <p className="text-sm text-textSecondary">
            Информация о доставке появится после отправки
          </p>
        )}
      </div>
    </div>
  );
}
