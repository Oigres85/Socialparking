import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { AudioProvider } from '@/hooks/use-audio';
import ServiceWorkerSetup from '@/components/ServiceWorkerSetup';
import IOSInstallPrompt from '@/components/IOSInstallPrompt';
import NativeSetup from '@/components/NativeSetup';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  // Esperienza da app nativa: la mappa gestisce il pinch-zoom, l'interfaccia no
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.siigep.tech'),
  title: 'Social Parking – Trova parcheggio in tempo reale',
  applicationName: 'Social Parking',
  keywords: ['parcheggio', 'parcheggio libero', 'trova parcheggio', 'posto auto', 'parking', 'Salerno', 'Roma', 'Napoli', 'Milano', 'community'],
  description: 'La community italiana che condivide i parcheggi liberi. Gratuito, anonimo, immediato. Scarica la PWA e inizia subito.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    url: 'https://www.siigep.tech',
    title: '🅿️ Social Parking – Parcheggio Libero!',
    description: 'Trova un parcheggio libero in tempo reale grazie alla community. Gratuito e anonimo.',
    siteName: 'Social Parking',
    images: [
      {
        url: 'https://www.siigep.tech/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Social Parking – Trova parcheggio in tempo reale',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '🅿️ Social Parking',
    description: 'Trova parcheggio libero in tempo reale grazie alla community italiana.',
    images: ['https://www.siigep.tech/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Social Parking',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="bg-black">
      <head>
        <link rel="icon" href="/icon-p.svg" type="image/svg+xml" />
        {/* FIX: apple-touch-icon deve essere PNG, non SVG – iOS ignora gli SVG */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Social Parking" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <FirebaseClientProvider>
          <AudioProvider>
            <NativeSetup />
            <ServiceWorkerSetup />
            {children}
            <Toaster />
            <IOSInstallPrompt />
          </AudioProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}