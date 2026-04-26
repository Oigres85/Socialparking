
'use client';
import { ReactNode, useEffect, useState } from 'react';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Messaging, getMessaging } from 'firebase/messaging';

import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseInstances {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  messaging: Messaging | null;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<FirebaseInstances>({
    app: null,
    auth: null,
    firestore: null,
    messaging: null,
  });

  useEffect(() => {
    // Assicura l'inizializzazione solo sul client
    if (typeof window === 'undefined') return;

    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      
      let messaging: Messaging | null = null;
      if ('serviceWorker' in navigator) {
        try {
          messaging = getMessaging(app);
        } catch (e) {
          console.warn('Firebase Messaging not supported or blocked in this environment');
        }
      }
      
      setInstances({ app, auth, firestore, messaging });
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }, []);

  return (
    <FirebaseProvider
      app={instances.app}
      auth={instances.auth}
      firestore={instances.firestore}
      messaging={instances.messaging}
    >
      {children}
    </FirebaseProvider>
  );
}
