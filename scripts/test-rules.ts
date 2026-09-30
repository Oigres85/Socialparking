/**
 * Test delle regole di sicurezza Firestore sull'emulatore.
 * Run: npm run test:rules   (richiede Firebase CLI e Java)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
let passed = 0;
async function test(name: string, fn: () => Promise<unknown>) {
  await fn();
  passed++;
  console.log(`✅ ${name}`);
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: 'demo-social-parking',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });

  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();
  const anon = env.unauthenticatedContext().firestore();

  await test('utente crea il proprio profilo con campi consentiti', () =>
    assertSucceeds(setDoc(doc(alice, 'users/alice'), { referralCode: 'ABCDEF', lang: 'it', createdAt: serverTimestamp() }, { merge: true })));

  await test('utente NON può assegnarsi punti o statistiche', () =>
    assertFails(setDoc(doc(alice, 'users/alice'), { points: 9999, stats: { parkingsFreed: 500 } }, { merge: true })));

  await test('utente NON può leggere il profilo di un altro', () => assertFails(getDoc(doc(bob, 'users/alice'))));

  await test('segnalazione valida', () =>
    assertSucceeds(addDoc(collection(alice, 'parkings'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: serverTimestamp(), userId: 'alice' })));

  await test('segnalazione con timestamp falso rifiutata', () =>
    assertFails(addDoc(collection(alice, 'parkings'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: Timestamp.fromMillis(Date.now() + 1e9), userId: 'alice' })));

  await test('segnalazione a nome di un altro rifiutata', () =>
    assertFails(addDoc(collection(alice, 'parkings'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: serverTimestamp(), userId: 'bob' })));

  await test('segnalazione con campi extra rifiutata', () =>
    assertFails(addDoc(collection(alice, 'parkings'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: serverTimestamp(), userId: 'alice', points: 1 })));

  // Posto di test creato bypassando le regole
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'parkings/p1'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: Timestamp.now(), userId: 'alice' });
    await setDoc(doc(ctx.firestore(), 'parkings/old'), { latitude: 40.68, longitude: 14.76, status: 'libero', timestamp: Timestamp.fromMillis(Date.now() - 10 * 60_000), userId: 'alice' });
  });

  await test('non si può prenotare il proprio posto', () =>
    assertFails(updateDoc(doc(alice, 'parkings/p1'), { status: 'in arrivo', reservedById: 'alice', bookingCode: 'AB12' })));

  await test('non si può prenotare un posto scaduto', () =>
    assertFails(updateDoc(doc(bob, 'parkings/old'), { status: 'in arrivo', reservedById: 'bob', bookingCode: 'AB12' })));

  await test('non si può spostare un posto mentre lo si prenota', () =>
    assertFails(updateDoc(doc(bob, 'parkings/p1'), { status: 'in arrivo', reservedById: 'bob', bookingCode: 'AB12', latitude: 0 })));

  await test('prenotazione valida', () =>
    assertSucceeds(updateDoc(doc(bob, 'parkings/p1'), { status: 'in arrivo', reservedById: 'bob', bookingCode: 'AB12' })));

  await test('un terzo non può annullare la prenotazione altrui', async () => {
    const carol = env.authenticatedContext('carol').firestore();
    await assertFails(updateDoc(doc(carol, 'parkings/p1'), { status: 'libero', reservedById: null, bookingCode: null }));
  });

  await test('chi ha prenotato può annullare', () =>
    assertSucceeds(updateDoc(doc(bob, 'parkings/p1'), { status: 'libero', reservedById: null, bookingCode: null })));

  await test('solo il proprietario può cancellare la segnalazione', async () => {
    await assertFails(deleteDoc(doc(bob, 'parkings/p1')));
    await assertSucceeds(deleteDoc(doc(alice, 'parkings/p1')));
  });

  await test('codice invito: registrazione e lettura', async () => {
    await assertSucceeds(setDoc(doc(alice, 'referrals/ABCDEF'), { uid: 'alice' }));
    await assertFails(setDoc(doc(bob, 'referrals/ABCDEF'), { uid: 'bob' }));
    await assertFails(setDoc(doc(bob, 'referrals/QWERTZ'), { uid: 'alice' }));
    await assertSucceeds(getDoc(doc(bob, 'referrals/ABCDEF')));
  });

  await test('claim invito: una volta, solo per sé', async () => {
    await assertSucceeds(setDoc(doc(bob, 'referralClaims/bob'), { code: 'ABCDEF' }));
    await assertFails(setDoc(doc(bob, 'referralClaims/bob'), { code: 'QWERTZ' }));
    await assertFails(setDoc(doc(bob, 'referralClaims/alice'), { code: 'ABCDEF' }));
  });

  await test('statistiche pubbliche leggibili ma non scrivibili', async () => {
    await assertSucceeds(getDoc(doc(anon, 'stats/global')));
    await assertFails(setDoc(doc(alice, 'stats/global'), { freed: 1e6 }));
  });

  await test('utente può eliminare il proprio profilo', () => assertSucceeds(deleteDoc(doc(alice, 'users/alice'))));

  await env.cleanup();
  console.log(`\n${passed} test superati`);
  assert.ok(passed > 0);
}

main().catch(async e => {
  console.error('❌', e);
  await env?.cleanup();
  process.exit(1);
});
