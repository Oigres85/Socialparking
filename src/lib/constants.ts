/**
 * @fileOverview Costanti globali dell'applicazione Social Parking.
 * Centralizzare qui i "magic numbers" per facilitare la manutenzione.
 */

/** Durata validità di un parcheggio/prenotazione in millisecondi (default: 3 minuti) */
export const PARKING_EXPIRY_MS = 3 * 60 * 1000; // 180_000

/** Durata in secondi, usata per il calcolo del progresso nel CountdownTimer */
export const PARKING_EXPIRY_SECS = PARKING_EXPIRY_MS / 1000; // 180

/** Soglia minima in metri per aggiornare la posizione GPS su Firestore */
export const GPS_UPDATE_THRESHOLD_M = 10;

/** Throttle minimo in ms tra due chiamate notifyNearby consecutive */
export const NOTIFY_THROTTLE_MS = 30_000;

/** Raggio in metri per la ricerca parcheggi nella lista */
export const NEARBY_SEARCH_RADIUS_M = 5_000;

/** Raggio in metri per le notifiche push ai cercatori vicini */
export const NOTIFY_RADIUS_M = 200;
