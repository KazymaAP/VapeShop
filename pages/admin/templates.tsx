import React, { useState, useEffect } from 'react';

interface Template {
  id: string;
  title: string;
  text: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'Ваш заказ передан в доставку',
    text: 'Ваш заказ передан в доставку. Ожидаемое время доставки: 2-3 дня.'
  },
  {
    id: '2',
    title: 'Товар закончился',
    text: 'К сожалению, выбранный товар закончился. Предлагаю вам аналогичный товар с лучшей характеристикой.'
  },
  {
    id: '3',
    title: 'Ожидаем платеж',
    text: 'Ваш заказ создан и ожидает оплаты. Произведите оплату в течение 2 часов.'
  },
  {
    id: '4',
    title: 'Спасибо за покупку',
    text: 'Спасибо за вашу покупку! Приходите к нам ещё. Используйте код скидки WELCOME10 на следующий заказ.'
  }
];

export default function TemplatesPage() {
  const { user } = useTelegramWebApp();
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [selectedText, setSelectedText] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена');
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Шаблоны ответов</h1>

      {selectedText && (
        <div className="bg-info rounded-lg p-4 mb-6">
          <p className="text-white text-sm mb-2">Выбранный текст:</p>
          <p className="text-white mb-3">{selectedText}</p>
          <button
            onClick={() => copyToClipboard(selectedText)}
            className="w-full px-4 py-2 bg-white text-info rounded font-semibold hover:bg-opacity-90"
          >
            Скопировать
          </button>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-cardBg rounded-lg border border-border p-4 cursor-pointer hover:border-neon transition"
            onClick={() => setSelectedText(template.text)}
          >
            <h3 className="font-bold text-textPrimary mb-2">{template.title}</h3>
            <p className="text-textSecondary text-sm">{template.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

