import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#c084fc" />
        <meta
          name="description"
          content="VapeShop – Telegram Mini App для покупки товаров. Безопасные покупки, быстрая доставка."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://app.vapeshop.store'}
        />
        <meta property="og:title" content="VapeShop - Telegram Shop" />
        <meta property="og:description" content="Покупайте товары прямо в Telegram" />
        <meta
          property="og:image"
          content={`${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://app.vapeshop.store'}/og-image.png`}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
