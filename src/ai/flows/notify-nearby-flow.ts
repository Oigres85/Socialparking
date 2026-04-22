'use server';
/**
 * @fileOverview Flusso Genkit per inviare notifiche push agli utenti vicini.
 */

import { ai } from '../genkit';
import { z } from 'genkit';
import webpush from 'web-push';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteField } from 'firebase/firestore';
import { firebaseConfig, VAPID_PUBLIC_KEY } from '../../firebase/config';
import { NOTIFY_RADIUS_M } from '../../lib/constants';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:info@socialparking.it',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.warn('VAPID_PRIVATE_KEY non valida o non correttamente codificata in Base64.');
  }
}

const NotifyNearbyInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  excludeUserId: z.string(),
});

export async function notifyNearby(input: z.infer<typeof NotifyNearbyInputSchema>) {
  return notifyNearbyFlow(input);
}

const notifyNearbyFlow = ai.defineFlow(
  {
    name: 'notifyNearbyFlow',
    inputSchema: NotifyNearbyInputSchema,
    outputSchema: z.object({ sentCount: z.number() }),
  },
  async (input) => {
    if (!VAPID_PRIVATE_KEY) {
      console.warn('Impossibile inviare notifiche: VAPID_PRIVATE_KEY mancante.');
      return { sentCount: 0 };
    }

    const twoHoursAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 60 * 1000);

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('isSearching', '==', true),
      where('lastLocationUpdate', '>=', twoHoursAgo)
    );
    const querySnapshot = await getDocs(q);

    let sentCount = 0;

    const promises = querySnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();

      if (userDoc.id === input.excludeUserId) return;

      if (userData.latitude && userData.longitude) {
        const distance = getDistance(
          input.latitude,
          input.longitude,
          userData.latitude,
          userData.longitude
        );

        if (distance <= NOTIFY_RADIUS_M && userData.pushSubscription) {
          try {
            const payload = JSON.stringify({
              title: "Parcheggio Libero! 🅿️",
              body: `Un posto è disponibile a ${Math.round(distance)}m da te`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'parking-alert',
              url: '/'
            });

            await webpush.sendNotification(userData.pushSubscription, payload, {
              urgency: 'high',
              TTL: 60
            });
            sentCount++;
          } catch (error: any) {
            // HTTP 410 Gone o 404 Not Found = subscription scaduta/non valida
            // La eliminiamo da Firestore per non sprecare risorse nelle chiamate future
            const statusCode = error?.statusCode || error?.status;
            if (statusCode === 410 || statusCode === 404) {
              try {
                await updateDoc(doc(db, 'users', userDoc.id), {
                  pushSubscription: deleteField(),
                  isSearching: false, // Reset anche searching, non può più ricevere notifiche
                });
                console.log(`[Push] Subscription scaduta rimossa per utente: ${userDoc.id}`);
              } catch (cleanupError) {
                console.error('[Push] Errore cleanup subscription:', cleanupError);
              }
            } else {
              console.error('[Push] Errore invio a', userDoc.id, '- status:', statusCode, error?.message);
            }
          }
        }
      }
    });

    await Promise.all(promises);
    return { sentCount };
  }
);

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}