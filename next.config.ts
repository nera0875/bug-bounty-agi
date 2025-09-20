import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force le revalidation des pages pour éviter le cache
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
        {
          key: 'Pragma',
          value: 'no-cache',
        },
        {
          key: 'Expires',
          value: '0',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
      ],
    },
  ],
  // Force la génération de nouveaux hashes pour les assets
  generateBuildId: async () => {
    return 'build-' + Date.now().toString();
  },
  // Désactive les optimisations qui peuvent causer du cache
  compress: false,
  poweredByHeader: false,
};

export default nextConfig;