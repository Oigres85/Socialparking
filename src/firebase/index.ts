'use client';

/**
 * @fileOverview Barrel file centrale per le funzionalità Firebase.
 * Esporta hook, provider e utility per garantire una risoluzione coerente dei moduli.
 */

export { FirebaseProvider, useFirebaseApp, useFirestore, useAuth, useMessaging } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
export { 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  setDocumentNonBlocking,
  serverTimestamp 
} from './non-blocking-updates';
