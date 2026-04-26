import type { NextConfig } from 'next';

/**
 * Configurazione ottimizzata per Next.js 15 e Firebase App Hosting.
 * Include la transpilazione per Mapbox e Firebase per prevenire errori di runtime.
 */
const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Transpilazione necessaria per i moduli Firebase, Mapbox e icone
  transpilePackages: [
    'firebase',
    '@firebase',
    'lucide-react',
    'react-map-gl',
    'mapbox-gl'
  ],
};

export default nextConfig;
