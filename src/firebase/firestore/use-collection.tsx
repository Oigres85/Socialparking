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
  WhereFilterOp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WhereClause = [string, WhereFilterOp, unknown];

export function useCollection<T>(
  path: string | null,
  options?: {
    where?: WhereClause[];
  }
) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const whereKey = JSON.stringify(options?.where ?? [], (_k, v) => (v instanceof Date ? v.toISOString() : v));

  useEffect(() => {
    if (!firestore) return;

    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    let q: Query<DocumentData> = collection(firestore, path);
    for (const clause of options?.where ?? []) {
      q = query(q, where(...clause));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        setData(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err);
        setData(null);
        setLoading(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: 'list' }));
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, whereKey]);

  return { data, loading, error };
}
