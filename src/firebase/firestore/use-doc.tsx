'use client';
import {
  doc,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useDoc<T>(path: string | null) {
  const firestore = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // Wait for the Firebase instance to be ready.
    // On the server and initial client render, `firestore` will be null.
    // By returning here, we remain in the initial `loading: true` state,
    // preventing a hydration mismatch.
    if (!firestore) {
      return;
    }

    // If the path is null, we are explicitly told not to fetch.
    // In this case, we are not loading and there is no data.
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    
    // We have a path and firestore, so we are fetching.
    setLoading(true);

    const docRef = doc(firestore, path);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id } as T);
        } else {
          setData(null); // Document doesn't exist
        }
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setData(null);
        setLoading(false);
        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [firestore, path]);

  return { data, loading, error };
}
