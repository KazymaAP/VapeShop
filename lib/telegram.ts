import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          query_id?: string;
        };
        initData: string;
        colorScheme: string;
        themeParams: Record<string, string>;
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        openInvoice: (url: string, callback: (status: string) => void) => void;
      };
    };
  }
}

export function useTelegramWebApp() {
  const [user, setUser] = useState<{
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe.user) {
        setUser(tg.initDataUnsafe.user);
      }
      setIsReady(true);
    }
  }, []);

  return {
    webapp: typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined,
    user,
    isReady,
  };
}

export function useMainButton(text: string, onClick: () => void, visible = true) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.MainButton.setText(text);
    if (visible) {
      tg.MainButton.show();
      tg.MainButton.enable();
    } else {
      tg.MainButton.hide();
    }

    tg.MainButton.onClick(onClick);
    return () => {
      tg.MainButton.offClick(onClick);
    };
  }, [text, onClick, visible]);
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
}

export function hapticSuccess() {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
}

export function hapticError() {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
}
