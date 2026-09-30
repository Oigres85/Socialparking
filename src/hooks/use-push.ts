import { useCallback, useEffect } from 'react';
import type { Firestore } from 'firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { VAPID_PUBLIC_KEY } from '@/firebase/config';
import { mergeUserDoc } from '@/firebase/non-blocking-updates';
import { Analytics } from '@/lib/analytics';
import { getPlatform, isNative } from '@/lib/platform';

/**
 * Hook unico per le notifiche push.
 * - App nativa: token FCM (Android + iOS via APNs) salvato in users/{uid}.fcmToken
 * - Web/PWA: sottoscrizione Web Push VAPID salvata in users/{uid}.pushSubscription
 * L'invio avviene lato server nelle Cloud Functions (functions/src/index.ts).
 */
export function usePush(firestore: Firestore | null, userId: string | undefined, onOpen?: (data: Record<string, unknown>) => void) {
  const ensurePush = useCallback(async (): Promise<boolean> => {
    if (!userId || !firestore) return false;

    if (isNative()) {
      try {
        let perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await FirebaseMessaging.requestPermissions();
        }
        if (perm.receive !== 'granted') {
          Analytics.notifPermissionDenied().catch(() => {});
          return false;
        }
        Analytics.notifPermissionGranted().catch(() => {});
        const { token } = await FirebaseMessaging.getToken();
        if (token) mergeUserDoc(firestore, userId, { fcmToken: token, platform: getPlatform() });
        return !!token;
      } catch (e) {
        console.warn('Native push error:', e);
        return false;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return false;
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
        mergeUserDoc(firestore, userId, { pushSubscription: subscription.toJSON(), platform: 'web' });
      }
      return !!subscription;
    } catch (e) {
      console.warn('Push subscription error:', e);
      return false;
    }
  }, [firestore, userId]);

  // Rinnovo token FCM e tap sulle notifiche native
  useEffect(() => {
    if (!isNative() || !userId || !firestore) return;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [
      FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        mergeUserDoc(firestore, userId, { fcmToken: token, platform: getPlatform() });
      }),
      FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        onOpen?.((notification.data as Record<string, unknown>) ?? {});
      }),
    ];
    return () => { handles.forEach(h => h.then(x => x.remove()).catch(() => {})); };
  }, [firestore, userId, onOpen]);

  // Tap sulle notifiche web (messaggio dal service worker)
  useEffect(() => {
    if (isNative() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') onOpen?.(event.data.data ?? {});
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [onOpen]);

  return { ensurePush };
}
