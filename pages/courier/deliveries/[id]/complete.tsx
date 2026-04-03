import React, { useState } from 'react';
import { useTelegramWebApp } from '../../../../lib/telegram';

export default function CourierCompleteDeliveryPage() {
  const { user } = useTelegramWebApp();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<string>('');

  const deliveryId = typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : '';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('notes', notes);
      if (photo) formData.append('photo', photo);
      formData.append('signature', signature);

      const response = await fetch(`/api/courier/deliveries/${deliveryId}/complete`, {
        method: 'POST',
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
        body: formData
      });

      if (response.ok) {
        alert('Доставка отмечена как завершённая');
        window.history.back();
      }
    } catch (err) {
      console.error('Failed to complete delivery:', err);
      alert('Ошибка при завершении доставки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Завершить доставку</h1>

      <div className="bg-cardBg rounded-lg border border-border p-6 space-y-4">
        <div>
          <label className="block text-textPrimary font-semibold mb-2">Фото доказательства</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
          />
          {photo && <p className="text-success text-sm mt-1">✓ {photo.name}</p>}
        </div>

        <div>
          <label className="block text-textPrimary font-semibold mb-2">Подпись клиента</label>
          <div className="border border-border rounded bg-bgDark p-4">
            <canvas
              id="signature-canvas"
              className="w-full border border-border rounded cursor-crosshair"
              width={300}
              height={150}
              onMouseDown={(e) => {
                const canvas = e.currentTarget;
                const ctx = canvas.getContext('2d');
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(x, y);

                const handleMove = (moveEvent: MouseEvent) => {
                  const moveX = moveEvent.clientX - rect.left;
                  const moveY = moveEvent.clientY - rect.top;
                  ctx.lineTo(moveX, moveY);
                  ctx.stroke();
                };

                const handleUp = () => {
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                  setSignature(canvas.toDataURL());
                };

                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-textPrimary font-semibold mb-2">Примечания</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительные примечания..."
            className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary placeholder-textSecondary"
            rows={4}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !photo}
          className="w-full px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Завершить доставку'}
        </button>
      </div>
    </div>
  );
}
