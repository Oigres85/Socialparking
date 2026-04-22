'use client';
import {
  collection,
  onSnapshot,
  query,
  where,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T>(
  path: string | null,
  options?: {
    where?: [string, '==', any];
  }
) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const whereCondition = JSON.stringify(options?.where);

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

    let q: Query<DocumentData> = collection(firestore, path);
    if (options?.where) {
      q = query(q, where(...options.where));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as T[];
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setData(null);
        setLoading(false);
        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, whereCondition]);

  return { data, loading, error };
}
