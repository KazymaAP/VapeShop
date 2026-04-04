/**
 * Компонент для загрузки изображений с preview и drag-and-drop
 */

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  onUpload: (files: File[]) => Promise<string[]>; // Возвращает URLs загруженных файлов
  maxFiles?: number;
  maxFileSize?: number; // в МБ
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  onUpload,
  maxFiles = 5,
  maxFileSize = 5, // 5MB
  accept = 'image/*',
  multiple = true,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Валидация файлов
  const validateFiles = useCallback((files: File[]): boolean => {
    // Проверка количества
    if (previews.length + files.length > maxFiles) {
      setError(`Максимум ${maxFiles} файлов`);
      return false;
    }

    // Проверка размера каждого файла
    for (const file of files) {
      if (file.size > maxFileSize * 1024 * 1024) {
        setError(`Файл "${file.name}" больше ${maxFileSize}MB`);
        return false;
      }

      // Проверка типа
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" не является изображением`);
        return false;
      }
    }

    return true;
  }, [maxFiles, maxFileSize, previews.length]);

  // Обработка файлов
  const handleFiles = useCallback(async (files: File[]) => {
    if (!validateFiles(files)) return;

    setError(null);
    setUploading(true);

    try {
      // Создаём preview'ы
      const newPreviews: string[] = [];
      for (const file of files) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === files.length) {
            setPreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }

      // Загружаем на сервер
      const urls = await onUpload(files);
      console.log('Uploaded:', urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      // Удаляем preview'ы при ошибке
      setPreviews(prev => prev.slice(0, -files.length));
    } finally {
      setUploading(false);
    }
  }, [validateFiles, onUpload]);

  // Drag & drop обработчики
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(multiple ? files : files.slice(0, 1));
  };

  // File input обработчик
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(multiple ? files : files.slice(0, 1));
  };

  // Удаление preview
  const removePreview = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag & Drop зона */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition
          ${isDragging
            ? 'border-neon bg-neon/10'
            : 'border-border hover:border-neon/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <label className="cursor-pointer block">
          <div className="text-4xl mb-2">📁</div>
          <p className="text-textPrimary font-semibold mb-1">
            Перетащите файлы сюда
          </p>
          <p className="text-textSecondary text-sm mb-3">или нажмите для выбора</p>
          
          <p className="text-xs text-textSecondary">
            {maxFiles > 1
              ? `Максимум ${maxFiles} файлов, ${maxFileSize}MB каждый`
              : `Максимум ${maxFileSize}MB`}
          </p>

          <input
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled || uploading}
            className="hidden"
            aria-label="Загрузить файл"
          />
        </label>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
          ✕ {error}
        </div>
      )}

      {/* Preview'ы */}
      {previews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-textPrimary">
            Загруженные файлы ({previews.length}/{maxFiles})
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previews.map((preview, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden border border-border"
              >
                {/* Изображение */}
                <div className="relative w-full aspect-square">
                  <Image
                    src={preview}
                    alt={`Preview ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Кнопка удаления */}
                <button
                  onClick={() => removePreview(idx)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  aria-label={`Удалить файл ${idx + 1}`}
                >
                  <span className="text-white text-2xl">✕</span>
                </button>

                {/* Номер */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Статус загрузки */}
      {uploading && (
        <div className="bg-blue-500/10 border border-blue-500 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="animate-spin">⌛</div>
          Загружаю...
        </div>
      )}
    </div>
  );
}
