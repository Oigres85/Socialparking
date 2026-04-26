/**
 * Service Worker per Social Parking Italia.
 * Gestisce le notifiche Push in background su iOS (Web Push) e Android.
 * Supporta VAPID (Voluntary Application Server Identification) per push server-side.
 *
 * NOTA iOS: le push notifications su iOS richiedono:
 * 1. App installata come PWA (aggiunta alla schermata Home)
 * 2. iOS 16.4+
 * 3. Permesso notifiche concesso dall'utente
 * 4. Icone PNG valide nel manifest.json (non SVG)
 */

const VAPID_PUBLIC_KEY = 'BEnWY3lE5VFAD-dZC0EXppMFwWLcspOcFW9tOYCXzfVATjkd8YH5gkT2a4lO4tYkYLKLiXKKnTrh5G5j1lV_lnI';

self.addEventListener('install', (event) => {
  // Attivazione immediata senza attendere la chiusura delle tab esistenti
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('[SW] Push received without data');
    return;
  }

  let data = null;
  try {
    data = event.data.json();
  } catch (e) {
    // Fallback per payload non-JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Social Parking', {
        body: text,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'parking-alert',
        vibrate: [200, 100, 200],
        requireInteraction: false,
      })
    );
    return;
  }

  // Normalizza i dati ricevuti dal server
  const title = data.title || 'Social Parking';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'parking-alert',
    data: {
      url: data.url || '/',
      type: data.type || 'general'
    },
    vibrate: data.vibrate || [200, 100, 200],
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch(err => {
      console.error('[SW] Error showing notification:', err);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Se l'app è già aperta, portala in foreground
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (event.notification.data && event.notification.data.type === 'parking-found') {
            // Invia il messaggio al client per attivare la ricerca
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: event.notification.data
            });
          }
          return;
        }
      }
      // Altrimenti apri una nuova finestra
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

/**
 * pushsubscriptionchange: fired quando iOS/browser rinnova la subscription.
 * Invia la nuova subscription al server per aggiornarla su Firestore.
 */
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then(subscription => {
      // Notifica il client principale di aggiornare Firestore
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_RENEWED',
            subscription: subscription.toJSON()
          });
        });
      });
    }).catch(err => console.error('[SW] pushsubscriptionchange error:', err))
  );
});
