'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

interface Order {
  id: string;
  code_6digit: string;
  customer_name: string;
  total_price: number;
  status: string;
  created_at: string;
  user_telegram_id: number;
}

interface KanbanData {
  new: Order[];
  confirmed: Order[];
  readyship: Order[];
  shipped: Order[];
  done: Order[];
  cancelled: Order[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  readyship: 'Готов к выдаче',
  shipped: 'В доставке',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-900',
  confirmed: 'bg-yellow-900',
  readyship: 'bg-orange-900',
  shipped: 'bg-purple-900',
  done: 'bg-green-900',
  cancelled: 'bg-red-900',
};

// Компонент карточки заказа
interface OrderCardProps {
  order: Order;
  isDragging: boolean;
}

function OrderCard({ order, isDragging }: OrderCardProps) {
  const { setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-cardBg border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-neon transition ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-neon">#{order.code_6digit}</p>
          <p className="text-sm text-gray-400">{order.customer_name}</p>
        </div>
        <span className="text-xs bg-border text-gray-300 px-2 py-1 rounded">
          {new Date(order.created_at).toLocaleDateString('ru-RU')}
        </span>
      </div>
      <p className="text-lg font-bold text-white">{order.total_price.toLocaleString('ru-RU')} ₽</p>
      <p className="text-xs text-gray-500 mt-2">ID: {order.user_telegram_id}</p>
    </div>
  );
}

// Компонент колонки статуса
interface KanbanColumnProps {
  status: string;
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
}

function KanbanColumn({ status, orders, onStatusChange }: KanbanColumnProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOrderClick = async (order: Order) => {
    const nextStatuses: Record<string, string> = {
      new: 'confirmed',
      confirmed: 'readyship',
      readyship: 'shipped',
      shipped: 'done',
      done: 'done',
      cancelled: 'cancelled',
    };

    const nextStatus = nextStatuses[status];
    if (nextStatus === status) {
      alert('Этот статус является финальным');
      return;
    }

    const confirmed = window.confirm(
      `Изменить статус заказа #${order.code_6digit} с "${STATUS_LABELS[status]}" на "${STATUS_LABELS[nextStatus]}"?`
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        await onStatusChange(order.id, nextStatus);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 min-w-[300px] bg-bgDark border border-border rounded-lg p-4">
      <h3 className="font-bold text-lg mb-4 text-neon">
        {STATUS_LABELS[status]} ({orders.length})
      </h3>
      <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} onClick={() => handleOrderClick(order)} className="cursor-pointer">
              <OrderCard order={order} isDragging={isLoading} />
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// Основная страница канбана
export default function KanbanPage() {
  const { user, isReady } = useTelegramWebApp();
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Загрузка данных
  const loadKanbanData = useCallback(async () => {
    if (!isReady) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (searchCustomer) params.append('searchCustomer', searchCustomer);

      const response = await fetch(`/api/admin/orders-kanban?${params.toString()}`, {
        headers: {
          'X-Telegram-Id': user?.id?.toString() || '',
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки данных');

      const data = await response.json();
      setKanbanData(data);
    } catch (error) {
      console.error('Kanban load error:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, [isReady, user?.id, dateFrom, dateTo, searchCustomer]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Изменение статуса заказа
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Ошибка обновления статуса');

      // Перезагружаем данные
      await loadKanbanData();
      alert('Статус заказа обновлён');
    } catch (error) {
      console.error('Status update error:', error);
      alert('Ошибка при изменении статуса');
    }
  };

  // Drag and drop handler
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Здесь можно реализовать логику перемещения между колонками
    // Пока просто показываем сообщение
    alert('Перемещение заказов между колонками - используйте кнопки на карточках для изменения статуса');
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

  if (!kanbanData) {
    return (
      <div className="min-h-screen bg-bgDark text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Ошибка загрузки канбана</p>
        </div>
      </div>
    );
  }

  const statuses: Array<keyof KanbanData> = ['new', 'confirmed', 'readyship', 'shipped', 'done', 'cancelled'];

  return (
    <div className="min-h-screen bg-bgDark text-white p-4">
      <div className="max-w-full">
        {/* Заголовок */}
        <h1 className="text-3xl font-bold mb-6 text-neon">Канбан доска заказов</h1>

        {/* Фильтры */}
        <div className="bg-cardBg border border-border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Фильтры</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Фильтр по дате начала */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">От:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
              />
            </div>

            {/* Фильтр по дате конца */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">До:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
              />
            </div>

            {/* Поиск по покупателю */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Поиск (имя/ID):</label>
              <input
                type="text"
                placeholder="Введите имя или ID..."
                value={searchCustomer}
                onChange={e => setSearchCustomer(e.target.value)}
                className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white placeholder-gray-600"
              />
            </div>
          </div>

          {/* Кнопка применения фильтров */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadKanbanData}
              className="px-4 py-2 bg-neon text-bgDark font-semibold rounded hover:opacity-80 transition"
            >
              Применить фильтры
            </button>
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchCustomer('');
              }}
              className="px-4 py-2 bg-border text-white font-semibold rounded hover:opacity-80 transition"
            >
              Очистить
            </button>
          </div>
        </div>

        {/* Канбан доска */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statuses.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                orders={kanbanData[status]}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </DndContext>

        {/* Всего заказов */}
        <div className="mt-6 bg-cardBg border border-border rounded-lg p-4">
          <p className="text-sm text-gray-400">
            Всего заказов:{' '}
            <span className="text-neon font-semibold">
              {statuses.reduce((sum, status) => sum + kanbanData[status].length, 0)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
