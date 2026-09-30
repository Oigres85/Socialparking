'use client';
import { ReactNode, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';

import { FirebaseProvider } from '@/firebase/provider';
import { getFirebaseApp } from '@/firebase/config';
import { isNative } from '@/lib/platform';

interface FirebaseInstances {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

let cached: FirebaseInstances | null = null;

function initFirebase(): FirebaseInstances {
  if (cached) return cached;
  const app = getFirebaseApp();

  let auth: Auth;
  let firestore: Firestore;
  if (isNative()) {
    // Nella WebView di iOS getAuth() carica il resolver popup/redirect (iframe) e può bloccarsi:
    // inizializziamo solo la persistenza, sufficiente per l'accesso anonimo.
    try { auth = initializeAuth(app, { persistence: indexedDBLocalPersistence }); } catch { auth = getAuth(app); }
    try { firestore = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch { firestore = getFirestore(app); }
  } else {
    auth = getAuth(app);
    firestore = getFirestore(app);
  }

  cached = { app, auth, firestore };
  return cached;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<FirebaseInstances>({ app: null, auth: null, firestore: null });

  useEffect(() => {
    try {
      setInstances(initFirebase());
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }, []);

  return (
    <FirebaseProvider app={instances.app} auth={instances.auth} firestore={instances.firestore}>
      {children}
    </FirebaseProvider>
  );
}
