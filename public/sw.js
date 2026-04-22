/**
 * Service Worker per Social Parking Italia.
 * Gestisce le notifiche Push in background su iOS (Web Push) e Android.
 *
 * NOTA iOS: le push notifications su iOS richiedono:
 * 1. App installata come PWA (aggiunta alla schermata Home)
 * 2. iOS 16.4+
 * 3. Permesso notifiche concesso dall'utente
 * 4. Icone PNG valide nel manifest.json (non SVG)
 */

self.addEventListener('install', (event) => {
  // Attivazione immediata senza attendere la chiusura delle tab esistenti
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',  // PNG per iOS
      badge: '/icon-192.png',              // PNG per iOS
      tag: data.tag || 'parking-alert',
      data: data.url || '/',
      vibrate: [200, 100, 200],
      renotify: true,                      // Mostra anche se tag uguale
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (e) {
    // Fallback per payload non-JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Social Parking', { body: text, icon: '/icon-192.png' })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Se l'app è già aperta, portala in foreground
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
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
