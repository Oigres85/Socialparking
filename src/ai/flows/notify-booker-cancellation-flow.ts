'use server';
/**
 * @fileOverview Flusso Genkit per inviare notifiche push al prenotante quando il proprietario annulla.
 */

import { ai } from '../genkit';
import { z } from 'genkit';
import webpush from 'web-push';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig, VAPID_PUBLIC_KEY } from '../../firebase/config';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Configurazione VAPID sicura
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:info@socialparking.it',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.warn('VAPID_PRIVATE_KEY non valida o non correttamente codificata in Base64 (deve essere di 32 byte).');
  }
}

const NotifyBookerCancellationInputSchema = z.object({
  bookerId: z.string(),
  spotId: z.string(),
});

export async function notifyBookerCancellation(input: z.infer<typeof NotifyBookerCancellationInputSchema>) {
  return notifyBookerCancellationFlow(input);
}

const notifyBookerCancellationFlow = ai.defineFlow(
  {
    name: 'notifyBookerCancellationFlow',
    inputSchema: NotifyBookerCancellationInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    if (!VAPID_PRIVATE_KEY) {
      console.warn('Impossibile inviare notifiche: VAPID_PRIVATE_KEY mancante.');
      return { success: false };
    }

    try {
      const userRef = doc(db, 'users', input.bookerId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return { success: false };
      
      const userData = userSnap.data();
      if (userData.pushSubscription) {
        const payload = JSON.stringify({
          title: "Prenotazione Annullata",
          body: "L'utente non libera più il parcheggio. La tua prenotazione è stata rimossa.",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'booking-cancellation'
        });

        await webpush.sendNotification(userData.pushSubscription, payload, {
          urgency: 'high',
          TTL: 60
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Errore invio push cancellazione:', error);
    }
    return { success: false };
  }
);
