'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { mergeUserDoc } from '@/firebase/non-blocking-updates';
import { isNative } from '@/lib/platform';

/**
 * Registra il Service Worker (solo web/PWA: nelle app native le push passano da FCM)
 * e aggiorna la subscription quando il browser la rinnova (pushsubscriptionchange).
 */
export default function ServiceWorkerSetup() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined' || isNative() || !('serviceWorker' in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => console.error('[SW] Registrazione fallita:', err));
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  useEffect(() => {
    if (isNative() || !('serviceWorker' in navigator) || !currentUser || !firestore) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_RENEWED') {
        mergeUserDoc(firestore, currentUser.uid, { pushSubscription: event.data.subscription });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [currentUser, firestore]);

  return null;
}
