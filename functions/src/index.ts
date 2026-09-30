/**
 * Cloud Functions di Social Parking.
 *
 * Sostituiscono i vecchi "server action" Genkit (incompatibili con le app native e chiamabili
 * da chiunque con coordinate arbitrarie). Ora tutto parte da trigger Firestore:
 *  - onParkingCreated   → punti/streak/badge, statistiche pubbliche, push a chi cerca vicino
 *  - onParkingUpdated   → push al proprietario quando qualcuno prenota ("sta arrivando!"), bonus scambio
 *  - onParkingDeleted   → push a chi aveva prenotato se il posto viene ritirato
 *  - onReferralClaimed  → accredito inviti (loop virale) + push all'invitante
 *  - onUserCreated      → contatore utenti pubblico
 *  - cleanup            → cancella segnalazioni vecchie (privacy + costi)
 *
 * NOTA REGIONE: i trigger Firestore devono stare nella stessa location del database.
 * Default us-central1 (database nam5). Se il database è in Europa (eur3) usa region 'europe-west1'.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp, DocumentReference } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import webpush from 'web-push';

import { computePoints, unlockedBadges, levelFor, normalizeStats, INVITEE_BONUS, UserStats } from './gamification';

initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 10 });

const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');
const VAPID_PUBLIC_KEY = 'BBrXf7IR6V3uDqZ8mrHOTYMTYSa_3w4fcnCF3arkcsW2ae8docYjP23mhEzlhg5hFMbB8LEt2UBhVztUh_6Sc04';
const VAPID_SUBJECT = 'mailto:privacy@siigep.tech';

/** Raggio entro cui avvisare chi sta cercando (≈ 2 minuti di guida in città). */
const NOTIFY_RADIUS_M = 800;
/** Chi cerca è considerato "attivo" se ha aggiornato la posizione nelle ultime 2 ore. */
const SEARCHER_ACTIVE_MS = 2 * 60 * 60 * 1000;
/** Anti-farming: al massimo un posto premiato ogni 10 minuti per utente. */
const MIN_FREE_INTERVAL_MS = 10 * 60 * 1000;
/** Le segnalazioni vengono cancellate dopo 1 ora. */
const PARKING_TTL_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------- utilità

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function romeDateKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

type Lang = 'it' | 'en';
const msg = (lang: Lang | undefined, it: string, en: string) => (lang === 'en' ? en : it);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type: string;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  try {
    const key = VAPID_PRIVATE_KEY.value();
    if (!key) return false;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, key);
    vapidReady = true;
  } catch (e) {
    logger.warn('VAPID non configurata', e);
  }
  return vapidReady;
}

/** Invia una notifica a un utente su tutti i canali disponibili (FCM nativo + Web Push). */
async function sendPush(uid: string, user: FirebaseFirestore.DocumentData, p: PushPayload): Promise<boolean> {
  let sent = false;
  const cleanup: Record<string, FieldValue> = {};

  if (user.fcmToken) {
    try {
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title: p.title, body: p.body },
        data: { url: p.url ?? '/', type: p.type },
        android: { priority: 'high', notification: { sound: 'default', tag: p.type } },
        apns: { payload: { aps: { sound: 'default', 'thread-id': p.type } } },
      });
      sent = true;
    } catch (e: any) {
      const code = e?.errorInfo?.code ?? e?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
        cleanup.fcmToken = FieldValue.delete();
      } else {
        logger.error('FCM error', uid, code);
      }
    }
  }

  if (user.pushSubscription && ensureVapid()) {
    try {
      await webpush.sendNotification(
        user.pushSubscription,
        JSON.stringify({ title: p.title, body: p.body, url: p.url ?? '/', type: p.type, tag: p.type, icon: '/icon-192.png', badge: '/icon-192.png' }),
        { urgency: 'high', TTL: 120 }
      );
      sent = true;
    } catch (e: any) {
      const status = e?.statusCode;
      if (status === 404 || status === 410) cleanup.pushSubscription = FieldValue.delete();
      else logger.error('WebPush error', uid, status, e?.message);
    }
  }

  if (Object.keys(cleanup).length) {
    await db.doc(`users/${uid}`).update(cleanup).catch(() => {});
  }
  return sent;
}

/** Aggiorna le statistiche di un utente e ricalcola punti, livello e badge in transazione. */
async function updateUserStats(
  ref: DocumentReference,
  mutate: (stats: Required<UserStats>, user: FirebaseFirestore.DocumentData) => Record<string, unknown> | null
) {
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const user = snap.data() ?? {};
    const stats = normalizeStats(user.stats);
    const extra = mutate(stats, user);
    if (extra === null) return null;
    const bestStreak = Math.max(Number(extra.bestStreak ?? user.bestStreak ?? 0), 0);
    const bonus = Number(extra.bonusPoints ?? user.bonusPoints ?? 0);
    const points = computePoints(stats) + bonus;
    const update = {
      ...extra,
      stats,
      points,
      level: levelFor(points),
      badges: unlockedBadges(stats, bestStreak),
    };
    tx.set(ref, update, { merge: true });
    return { before: user, after: update };
  });
}

// ---------------------------------------------------------------- trigger

export const onParkingCreated = onDocumentCreated({ document: 'parkings/{parkingId}', secrets: [VAPID_PRIVATE_KEY] }, async event => {
  const parking = event.data?.data();
  if (!parking) return;
  const now = Date.now();
  const today = romeDateKey();
  const yesterday = romeDateKey(new Date(now - 24 * 60 * 60 * 1000));

  // 1. Statistiche pubbliche (contatori mostrati in app e nella landing page)
  await Promise.all([
    db.doc('stats/global').set({ freed: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    db.doc(`stats/day_${today}`).set({ freed: FieldValue.increment(1), date: today }, { merge: true }),
  ]);

  // 2. Punti, streak e badge per chi ha liberato il posto
  await updateUserStats(db.doc(`users/${parking.userId}`), (stats, user) => {
    const lastAt = user.lastFreedAt instanceof Timestamp ? user.lastFreedAt.toMillis() : 0;
    if (now - lastAt < MIN_FREE_INTERVAL_MS) return null;
    stats.parkingsFreed += 1;
    const streak = user.lastFreedDate === today ? user.streak ?? 1 : user.lastFreedDate === yesterday ? (user.streak ?? 0) + 1 : 1;
    return {
      streak,
      bestStreak: Math.max(streak, user.bestStreak ?? 0),
      lastFreedDate: today,
      lastFreedAt: Timestamp.fromMillis(now),
    };
  }).catch(e => logger.error('updateUserStats failed', e));

  // 3. Notifica a chi sta cercando nelle vicinanze
  const searchers = await db
    .collection('users')
    .where('isSearching', '==', true)
    .where('lastLocationUpdate', '>=', Timestamp.fromMillis(now - SEARCHER_ACTIVE_MS))
    .get();

  const jobs = searchers.docs
    .filter(d => d.id !== parking.userId)
    .map(d => ({ id: d.id, data: d.data() }))
    .filter(u => typeof u.data.latitude === 'number' && typeof u.data.longitude === 'number')
    .map(u => ({ ...u, dist: distanceM(parking.latitude, parking.longitude, u.data.latitude, u.data.longitude) }))
    .filter(u => u.dist <= NOTIFY_RADIUS_M);

  const results = await Promise.all(jobs.map(u => sendPush(u.id, u.data, {
    title: msg(u.data.lang, 'Parcheggio libero! 🅿️', 'Free parking spot! 🅿️'),
    body: msg(u.data.lang, `Un posto si è appena liberato a ${Math.round(u.dist)} m da te. Prenotalo ora!`, `A spot just opened ${Math.round(u.dist)} m from you. Book it now!`),
    type: 'parking-found',
  })));
  logger.info('onParkingCreated', { parkingId: event.params.parkingId, notified: results.filter(Boolean).length });
});

export const onParkingUpdated = onDocumentUpdated({ document: 'parkings/{parkingId}', secrets: [VAPID_PRIVATE_KEY] }, async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const ownerRef = db.doc(`users/${after.userId}`);

  // Qualcuno ha prenotato il posto
  if (before.status === 'libero' && after.status === 'in arrivo') {
    const owner = (await ownerRef.get()).data();
    if (owner) {
      await sendPush(after.userId, owner, {
        title: msg(owner.lang, '🚗 Qualcuno sta arrivando!', '🚗 Someone is on the way!'),
        body: msg(owner.lang, `Aspetta l'utente con il codice ${after.bookingCode}. Grazie per la gentilezza!`, `Wait for the driver with code ${after.bookingCode}. Thanks for being kind!`),
        type: 'spot-booked',
      });
    }

    // Bonus "scambio" solo alla prima prenotazione del posto (evita di farmare punti annullando e riprenotando)
    if (!after.handoverCredited && after.reservedById) {
      await event.data!.after.ref.update({ handoverCredited: true });
      await Promise.all([
        updateUserStats(ownerRef, stats => { stats.handovers += 1; return {}; }),
        updateUserStats(db.doc(`users/${after.reservedById}`), stats => { stats.bookingsMade += 1; return {}; }),
      ]).catch(e => logger.error('handover stats failed', e));
    }
    return;
  }

  // Chi aveva prenotato ha annullato
  if (before.status === 'in arrivo' && after.status === 'libero') {
    const owner = (await ownerRef.get()).data();
    if (owner) {
      await sendPush(after.userId, owner, {
        title: msg(owner.lang, 'Prenotazione annullata', 'Booking cancelled'),
        body: msg(owner.lang, 'Il tuo posto è di nuovo visibile a chi cerca in zona.', 'Your spot is visible again to drivers nearby.'),
        type: 'booking-cancelled',
      });
    }
  }
});

export const onParkingDeleted = onDocumentDeleted({ document: 'parkings/{parkingId}', secrets: [VAPID_PRIVATE_KEY] }, async event => {
  const parking = event.data?.data();
  if (!parking || parking.status !== 'in arrivo' || !parking.reservedById) return;
  // Ignora le cancellazioni della pulizia automatica (segnalazioni già scadute)
  const ts = parking.timestamp instanceof Timestamp ? parking.timestamp.toMillis() : 0;
  if (Date.now() - ts > 10 * 60 * 1000) return;

  const booker = (await db.doc(`users/${parking.reservedById}`).get()).data();
  if (!booker) return;
  await sendPush(parking.reservedById, booker, {
    title: msg(booker.lang, 'Posto non più disponibile', 'Spot no longer available'),
    body: msg(booker.lang, "Chi liberava il posto ha annullato. Riattiva la ricerca: ne arriveranno altri!", 'The driver cancelled. Turn search back on: more spots will come!'),
    type: 'booking-cancelled',
  });
});

/** Il client crea referralClaims/{uid} = { code } alla prima apertura da un link d'invito. */
export const onReferralClaimed = onDocumentCreated({ document: 'referralClaims/{uid}', secrets: [VAPID_PRIVATE_KEY] }, async event => {
  const uid = event.params.uid;
  const code = event.data?.data()?.code;
  if (typeof code !== 'string') return;

  const referral = await db.doc(`referrals/${code}`).get();
  const inviterUid = referral.data()?.uid;
  if (!inviterUid || inviterUid === uid) return;

  const inviteeRef = db.doc(`users/${uid}`);
  const already = await db.runTransaction(async tx => {
    const snap = await tx.get(inviteeRef);
    if (snap.data()?.referredBy) return true;
    tx.set(inviteeRef, { referredBy: code }, { merge: true });
    return false;
  });
  if (already) return;

  await updateUserStats(inviteeRef, (_stats, user) => ({ bonusPoints: Number(user.bonusPoints ?? 0) + INVITEE_BONUS }));
  await updateUserStats(db.doc(`users/${inviterUid}`), stats => { stats.invites += 1; return {}; });

  const inviter = (await db.doc(`users/${inviterUid}`).get()).data();
  if (inviter) {
    await sendPush(inviterUid, inviter, {
      title: msg(inviter.lang, '🎉 Un amico si è unito!', '🎉 A friend joined!'),
      body: msg(inviter.lang, 'Ha usato il tuo codice invito: +25 punti per te. Continua così!', 'They used your invite code: +25 points for you. Keep going!'),
      type: 'referral',
    });
  }
});

export const onUserCreated = onDocumentCreated('users/{uid}', async () => {
  await db.doc('stats/global').set({ users: FieldValue.increment(1) }, { merge: true });
});

/** "Elimina i miei dati": rimuove anche i documenti che il client non può cancellare. */
export const onUserDeleted = onDocumentDeleted('users/{uid}', async event => {
  await db.doc(`referralClaims/${event.params.uid}`).delete().catch(() => {});
});

/** Ogni 30 minuti: cancella le segnalazioni vecchie e spegne la ricerca per chi è inattivo. */
export const cleanup = onSchedule({ schedule: 'every 30 minutes', timeZone: 'Europe/Rome' }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - PARKING_TTL_MS);
  const old = await db.collection('parkings').where('timestamp', '<', cutoff).limit(450).get();
  const batch = db.batch();
  old.docs.forEach(d => batch.delete(d.ref));

  const staleSearchers = await db
    .collection('users')
    .where('isSearching', '==', true)
    .where('lastLocationUpdate', '<', Timestamp.fromMillis(Date.now() - 6 * SEARCHER_ACTIVE_MS))
    .limit(50)
    .get();
  staleSearchers.docs.forEach(d => batch.update(d.ref, { isSearching: false }));

  await batch.commit();
  logger.info('cleanup', { parkings: old.size, searchers: staleSearchers.size });
});
