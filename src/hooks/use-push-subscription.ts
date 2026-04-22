import { useCallback } from 'react';
import { VAPID_PUBLIC_KEY } from '@/firebase/config';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Analytics } from '@/lib/analytics';

/**
 * Hook per la gestione della sottoscrizione alle notifiche Push Web.
 * Gestisce i permessi e la registrazione del service worker.
 */
export function usePushSubscription(
  firestore: any,
  userId: string | undefined
) {
  const ensurePushSubscription = useCallback(async () => {
    if (!('Notification' in window) || !userId || !firestore) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          Analytics.notifPermissionGranted().catch(() => {});
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_PUBLIC_KEY,
          });
        } else if (permission === 'denied') {
          Analytics.notifPermissionDenied().catch(() => {});
        }
      }

      if (subscription) {
        updateDocumentNonBlocking(firestore, `users/${userId}`, {
          pushSubscription: subscription.toJSON(),
        });
      }
      return subscription;
    } catch (e) {
      console.warn('Push subscription error:', e);
      return null;
    }
  }, [firestore, userId]);

  return { ensurePushSubscription };
}
