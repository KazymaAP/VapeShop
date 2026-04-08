/**
 * Amplitude инициализация для аналитики пользователей
 * Используется в pages/_app.tsx
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { logger } from './logger';

// Типов для Amplitude SDK
interface AmplitudeInstance {
  init: (apiKey: string, userId: string | null, options: AmplitudeConfig) => void;
  getInstance: () => AmplitudeInstance;
  logEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  setUserId: (userId: string) => void;
  setUserProperties: (properties: Record<string, unknown>) => void;
}

interface AmplitudeConfig {
  saveEvents: boolean;
  includeUtm: boolean;
  includeFbclid: boolean;
  trackingOptions: {
    country: boolean;
    city: boolean;
    region: boolean;
    dma: boolean;
    ip_address: boolean;
    language: boolean;
    platform: boolean;
    carrier: boolean;
    device_model: boolean;
    device_manufacturer: boolean;
    os_name: boolean;
    os_version: boolean;
    browser: boolean;
    browser_version: boolean;
    referrer: boolean;
    referring_domain: boolean;
  };
}

declare global {
  interface Window {
    amplitude?: {
      getInstance: () => AmplitudeInstance;
    };
  }
}

export function initAmplitude() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    logger.warn('Amplitude API key not configured');
    return;
  }

  // Загружаем Amplitude SDK
  const script = document.createElement('script');
  script.src = 'https://cdn.amplitude.com/libs/amplitude-8.10.0-min.js.gz';
  script.async = true;
  script.onload = () => {
    if (window.amplitude) {
      window.amplitude.getInstance().init(apiKey, null, {
        saveEvents: true,
        includeUtm: true,
        includeFbclid: true,
        trackingOptions: {
          country: true,
          city: true,
          region: true,
          dma: true,
          ip_address: false, // Не отправляем IP
          language: true,
          platform: true,
          carrier: true,
          device_model: true,
          device_manufacturer: true,
          os_name: true,
          os_version: true,
          browser: true,
          browser_version: true,
          referrer: true,
          referring_domain: true,
        },
      });

      // Отслеживаем page views
      window.amplitude.getInstance().logEvent('page_view', {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    }
  };
  document.head.appendChild(script);
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.amplitude) {
    window.amplitude.getInstance().logEvent(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }
}

export function setUserId(userId: string) {
  if (typeof window !== 'undefined' && window.amplitude) {
    window.amplitude.getInstance().setUserId(userId);
  }
}

export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.amplitude) {
    window.amplitude.getInstance().setUserProperties(properties);
  }
}

// Hook для отслеживания page views
export function useAmplitudePageView() {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackEvent('page_view', {
        path: url,
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
}
