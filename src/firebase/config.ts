import { initializeApp, getApps, getApp } from 'firebase/app';

/**
 * @fileOverview Configurazione Firebase e chiave pubblica VAPID per le notifiche push web.
 * Questi valori sono pubblici per design: la sicurezza è garantita da firestore.rules.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCcaJI-Ab6wKbk8_C9BckHf5JXblK8aLQs",
  authDomain: "studio-6366379090-251c5.firebaseapp.com",
  projectId: "studio-6366379090-251c5",
  storageBucket: "studio-6366379090-251c5.firebasestorage.app",
  messagingSenderId: "898470092455",
  appId: "1:898470092455:web:8a65404f01381d2d660582"
};

// Chiave VAPID pubblica (la privata vive solo nel secret VAPID_PRIVATE_KEY delle Cloud Functions)
export const VAPID_PUBLIC_KEY = "BBrXf7IR6V3uDqZ8mrHOTYMTYSa_3w4fcnCF3arkcsW2ae8docYjP23mhEzlhg5hFMbB8LEt2UBhVztUh_6Sc04";

export const getFirebaseApp = () => (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp());
