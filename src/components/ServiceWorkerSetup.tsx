'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Registra il Service Worker e gestisce il rinnovo automatico
 * della push subscription (evento pushsubscriptionchange).
 * Questo è critico su iOS dove le subscription scadono periodicamente.
 */
export default function ServiceWorkerSetup() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[SW] Registrato con scope:', registration.scope);
      } catch (err) {
        console.error('[SW] Registrazione fallita:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  // Ascolta il messaggio PUSH_SUBSCRIPTION_RENEWED dal SW
  // e aggiorna la subscription su Firestore automaticamente
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !currentUser || !firestore) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_RENEWED') {
        console.log('[SW] Push subscription rinnovata, aggiorno Firestore...');
        updateDocumentNonBlocking(firestore, `users/${currentUser.uid}`, {
          pushSubscription: event.data.subscription
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [currentUser, firestore]);

  return null;
}
