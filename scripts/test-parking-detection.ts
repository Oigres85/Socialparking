/**
 * Test della macchina a stati di rilevamento parcheggio.
 * Run: npx tsx scripts/test-parking-detection.ts
 */
import assert from 'node:assert/strict';
import { initialParkingState, onLocation, onTick, secondsToParked, ParkingMachineState, ParkingEvent } from '../src/lib/parking-machine';

const BASE = { latitude: 40.6824, longitude: 14.7681 }; // Salerno
const north = (m: number) => ({ latitude: BASE.latitude + m / 111_320, longitude: BASE.longitude });

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✅ ${name}`);
}

function run(steps: Array<[number, { latitude: number; longitude: number; speed?: number | null } | 'tick']>) {
  let s: ParkingMachineState = initialParkingState;
  const events: ParkingEvent[] = [];
  for (const [t, sample] of steps) {
    const [next, ev] = sample === 'tick' ? onTick(s, t) : onLocation(s, sample, t);
    s = next;
    if (ev) events.push(ev);
  }
  return { s, events };
}

test('fermo a casa (mai guidato) → nessun parcheggio rilevato', () => {
  const { s, events } = run([[0, { ...BASE, speed: 0 }], [60_000, { ...BASE, speed: 0 }], [200_000, 'tick']]);
  assert.equal(s.phase, 'idle');
  assert.deepEqual(events, []);
});

test('guida poi fermo 90s → parked', () => {
  const { s, events } = run([
    [0, { ...north(-500), speed: 12 }],
    [10_000, { ...BASE, speed: 0 }],
    [60_000, { ...north(3), speed: 0 }],
    [101_000, 'tick'],
  ]);
  assert.equal(s.phase, 'parked');
  assert.deepEqual(events, ['parked']);
  assert.ok(s.car && Math.abs(s.car.latitude - BASE.latitude) < 1e-9);
});

test('semaforo (fermo 40s poi riparte) → nessun parcheggio', () => {
  const { s, events } = run([
    [0, { ...north(-300), speed: 13 }],
    [5_000, { ...BASE, speed: 0 }],
    [45_000, { ...BASE, speed: 0 }],
    [50_000, { ...north(100), speed: 10 }],
  ]);
  assert.equal(s.phase, 'driving');
  assert.deepEqual(events, []);
});

test('parcheggio → a piedi lontano → ritorno all\'auto → evento returning', () => {
  const { s, events } = run([
    [0, { ...north(-500), speed: 12 }],
    [10_000, { ...BASE, speed: 0 }],
    [101_000, 'tick'],
    [400_000, { ...north(250), speed: 1.2 }],
    [3_600_000, { ...north(40), speed: 1.3 }],
  ]);
  assert.equal(s.phase, 'returning');
  assert.deepEqual(events, ['parked', 'returning']);
});

test('ritorno e ripartenza in auto → drove-away e auto dimenticata', () => {
  const { s, events } = run([
    [0, { ...north(-500), speed: 12 }],
    [10_000, { ...BASE, speed: 0 }],
    [101_000, 'tick'],
    [400_000, { ...north(250), speed: 1 }],
    [3_600_000, { ...north(20), speed: 1 }],
    [3_700_000, { ...north(150), speed: 9 }],
  ]);
  assert.equal(s.phase, 'driving');
  assert.equal(s.car, null);
  assert.deepEqual(events, ['parked', 'returning', 'drove-away']);
});

test('velocità stimata dalle posizioni se il GPS non la fornisce', () => {
  const { s } = run([
    [0, { ...north(0), speed: null }],
    [10_000, { ...north(150), speed: null }], // 15 m/s
  ]);
  assert.equal(s.phase, 'driving');
});

test('campioni GPS imprecisi vengono ignorati', () => {
  const [s] = onLocation(initialParkingState, { ...BASE, speed: 20, accuracy: 500 }, 0);
  assert.equal(s.phase, 'idle');
});

test('countdown per la UI', () => {
  const [s] = onLocation({ ...initialParkingState, phase: 'driving' }, { ...BASE, speed: 0 }, 0);
  assert.equal(secondsToParked(s, 30_000), 60);
});

console.log(`\n${passed} test superati`);
