import { initializeApp, getApps } from 'firebase/app';

/**
 * @fileOverview Configurazione Firebase e chiavi VAPID per notifiche push.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCcaJI-Ab6wKbk8_C9BckHf5JXblK8aLQs",
  authDomain: "studio-6366379090-251c5.firebaseapp.com",
  projectId: "studio-6366379090-251c5",
  storageBucket: "studio-6366379090-251c5.firebasestorage.app",
  messagingSenderId: "898470092455",
  appId: "1:898470092455:web:8a65404f01381d2d660582"
};

// Chiave VAPID URL-Safe per la sottoscrizione push fornita dall'utente
export const VAPID_PUBLIC_KEY = "BBrXf7IR6V3uDqZ8mrHOTYMTYSa_3w4fcnCF3arkcsW2ae8docYjP23mhEzlhg5hFMbB8LEt2UBhVztUh_6Sc04";

// Esporta l'istanza dell'app per l'uso globale (es. Analytics)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
