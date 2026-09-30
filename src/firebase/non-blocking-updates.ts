'use client';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  DocumentReference,
  CollectionReference,
  SetOptions,
  Firestore,
  serverTimestamp as firebaseServerTimestamp,
} from 'firebase/firestore';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

export const serverTimestamp = firebaseServerTimestamp;

export function setDocumentNonBlocking(
  firestore: Firestore,
  path: string,
  data: any,
  options: SetOptions = {}
) {
  const ref = doc(firestore, path);
  setDoc(ref, data, options).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: ref.path,
      operation: 'merge' in options && options.merge ? 'update' : 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function addDocumentNonBlocking(
    ref: CollectionReference,
    data: any,
  ) {
    addDoc(ref, data).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }

export function updateDocumentNonBlocking(
  firestore: Firestore,
  path: string,
  data: any
) {
  const ref = doc(firestore, path);
  updateDoc(ref, data).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: ref.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteDocumentNonBlocking(
  firestore: Firestore,
  path: string
) {
  const ref = doc(firestore, path);
  deleteDoc(ref).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: ref.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Scrive sul documento dell'utente creandolo se non esiste (setDoc + merge).
 * updateDoc fallirebbe sul primo accesso perché nessuno crea il documento users/{uid}.
 */
export function mergeUserDoc(firestore: Firestore, uid: string, data: Record<string, unknown>) {
  setDocumentNonBlocking(firestore, `users/${uid}`, data, { merge: true });
}
