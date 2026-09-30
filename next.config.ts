import type { NextConfig } from 'next';

/**
 * Export statico: la stessa build (cartella out/) serve
 *  - il sito/PWA su Firebase Hosting
 *  - le app native iOS/Android tramite Capacitor (webDir: out)
 * Tutta la logica server (notifiche, punti, statistiche) vive nelle Cloud Functions (functions/).
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['lucide-react', 'react-map-gl', 'mapbox-gl'],
};

export default nextConfig;
