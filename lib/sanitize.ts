/**
 * HTML Sanitizer - Защита от XSS атак
 * Используется для безопасной обработки пользовательского HTML контента
 */

import { logger } from './logger';

/**
 * Санитизирует HTML строку, удаляя опасный контент
 * 
 * На клиенте использует DOMPurify
 * На сервере использует базовую фильтрацию
 */
export function sanitizeHTML(html: string): string {
  // Проверяем окружение
  if (typeof document !== 'undefined') {
    // Браузер - используем DOMPurify
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DOMPurify = require('isomorphic-dompurify');
      return DOMPurify.default.sanitize(html);
    } catch (err) {
      logger.warn('DOMPurify not available, using fallback sanitization');
    }
  }

  // Fallback: базовая санитизация (удаляем script теги и dangerous атрибуты)
  return sanitizeHTMLFallback(html);
}

/**
 * Fallback санитизация для server-side или когда DOMPurify недоступен
 */
function sanitizeHTMLFallback(html: string): string {
  // Удаляем <script> теги и их содержимое
  let result = html.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Удаляем обработчики событий
  result = result.replace(/on\w+\s*=\s*["']([^"']*)["']/gi, '');

  // Удаляем javascript: протокол в ссылках
  result = result.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  result = result.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');

  // Удаляем iframe теги
  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // Удаляем object и embed теги
  result = result.replace(/<(object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');

  return result;
}

/**
 * Экранирует HTML спецсимволы
 * Используется когда нужно отобразить текст как текст, а не как HTML
 */
export function escapeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Проверяет содержит ли строка потенциально опасный контент
 */
export function containsDangerousContent(html: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(html));
}
