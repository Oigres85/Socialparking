'use client';
import { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Messaging } from 'firebase/messaging';

interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  messaging: Messaging | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  firestore: null,
  messaging: null,
});

export const useFirebaseApp = () => {
  return useContext(FirebaseContext).app;
};

export const useAuth = () => {
  return useContext(FirebaseContext).auth;
};

export const useFirestore = () => {
  return useContext(FirebaseContext).firestore;
};

export const useMessaging = () => {
  return useContext(FirebaseContext).messaging;
};


export function FirebaseProvider({
  children,
  app,
  auth,
  firestore,
  messaging,
}: {
  children: ReactNode;
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  messaging: Messaging | null;
}) {
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore, messaging }}>
      {children}
    </FirebaseContext.Provider>
  );
}
