'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCache() {
  const router = useRouter();

  useEffect(() => {
    // Vider tout le cache
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Forcer le rechargement complet
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Nettoyage du cache...</h1>
        <p>Redirection dans 1 seconde...</p>
      </div>
    </div>
  );
}