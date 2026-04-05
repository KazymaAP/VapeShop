import { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminImport() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setMessage('Пожалуйста, выберите CSV файл');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message || 'Импорт завершён');
    } catch {
      setMessage('Ошибка при импорте');
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Импорт CSV</h1>
        </div>

        <div className="bg-cardBg border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Загрузка прайс-листа</h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragOver ? 'border-neon bg-neon/5' : 'border-border'
            }`}
          >
            <svg
              className="w-12 h-12 mx-auto text-neon opacity-70 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p className="text-textPrimary mb-2">Перетащите CSV файл сюда или</p>
            <label className="text-neon cursor-pointer hover:underline">
              выберите файл
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
            </label>
            <p className="text-textSecondary text-xs mt-3">
              Колонки: Наименование, Характеристика, КОЛИЧЕСТВО, до 50.000 р, от 50.000 р, от
              100.000 р, ДИСТР.ЦЕНА
            </p>
          </div>

          {uploading && (
            <div className="mt-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
              <p className="text-textSecondary text-sm mt-2">Обработка файла...</p>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm ${
                message.startsWith('Ошибка')
                  ? 'bg-danger/20 text-danger'
                  : 'bg-success/20 text-success'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
