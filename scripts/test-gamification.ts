/**
 * Test di gamification e codici invito, e verifica che la copia server-side
 * (functions/src/gamification.ts) sia allineata a quella del client.
 * Run: npx tsx scripts/test-gamification.ts
 */
import assert from 'node:assert/strict';
import * as client from '../src/lib/gamification';
import * as server from '../functions/src/gamification';
import { referralCodeFor, isValidReferralCode } from '../src/lib/referral';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✅ ${name}`);
}

test('punti client == server', () => {
  const samples = [{}, { parkingsFreed: 3 }, { parkingsFreed: 12, handovers: 4, invites: 2, bookingsMade: 7 }];
  for (const s of samples) assert.equal(client.computePoints(s), server.computePoints(s));
  assert.deepEqual(client.POINTS, server.POINTS);
});

test('badge client == server', () => {
  const s = { parkingsFreed: 11, handovers: 1, invites: 5 };
  assert.deepEqual(client.unlockedBadges(s, 7), server.unlockedBadges(s, 7));
  assert.deepEqual(client.BADGES.map(b => b.id), server.unlockedBadges({ parkingsFreed: 99, handovers: 9, invites: 9 }, 99));
});

test('soglie livelli client == server', () => {
  assert.deepEqual(client.LEVELS.map(l => l.minPoints), server.LEVEL_THRESHOLDS);
  for (const p of [0, 29, 30, 99, 100, 600, 5000]) assert.equal(client.getLevel(p).current.level, server.levelFor(p));
});

test('progresso livello', () => {
  const l = client.getLevel(65);
  assert.equal(l.current.level, 2);
  assert.equal(l.next?.level, 3);
  assert.ok(Math.abs(l.progress - 0.5) < 1e-9);
  assert.equal(client.getLevel(10_000).next, null);
});

test('impatto stimato', () => {
  assert.deepEqual(client.impact({ parkingsFreed: 5 }), { minutes: 40, co2Kg: 2 });
});

test('codici invito: stabili, validi e ben distribuiti', () => {
  assert.equal(referralCodeFor('abc'), referralCodeFor('abc'));
  const codes = new Set<string>();
  for (let i = 0; i < 5000; i++) {
    const c = referralCodeFor(`uid-${i}-${Math.random()}`);
    assert.ok(isValidReferralCode(c), c);
    codes.add(c);
  }
  assert.ok(codes.size > 4990, `collisioni: ${5000 - codes.size}`);
  assert.equal(isValidReferralCode('ABC1O0'), false);
});

console.log(`\n${passed} test superati`);
