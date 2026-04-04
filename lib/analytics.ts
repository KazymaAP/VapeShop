/**
 * Amplitude инициализация для аналитики пользователей
 * Используется в pages/_app.tsx
 */

import { useEffect } from "react";
import { useRouter } from "next/router";

declare global {
  interface Window {
    amplitude?: any;
  }
}

export function initAmplitude() {
  if (typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn("Amplitude API key not configured");
    return;
  }

  // Загружаем Amplitude SDK
  const script = document.createElement("script");
  script.src = "https://cdn.amplitude.com/libs/amplitude-8.10.0-min.js.gz";
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
      window.amplitude.getInstance().logEvent("page_view", {
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    }
  };
  document.head.appendChild(script);
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== "undefined" && window.amplitude) {
    window.amplitude.getInstance().logEvent(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }
}

export function setUserId(userId: string) {
  if (typeof window !== "undefined" && window.amplitude) {
    window.amplitude.getInstance().setUserId(userId);
  }
}

export function setUserProperties(properties: Record<string, any>) {
  if (typeof window !== "undefined" && window.amplitude) {
    window.amplitude.getInstance().setUserProperties(properties);
  }
}

// Hook для отслеживания page views
export function useAmplitudePageView() {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackEvent("page_view", {
        path: url,
      });
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);
}
