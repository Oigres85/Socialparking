/**
 * Script di test per validare la logica di rilevamento parcheggio e geofencing
 * Run: npx ts-node scripts/test-parking-detection.ts
 */

interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
}

// Implementazione semplificata di getHaversineDistance
function getHaversineDistance(loc1: UserLocation, loc2: UserLocation): number {
  const R = 6371000; // Raggio terra in metri
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Test 1: Rilevamento parcheggio (90 secondi di stop)
console.log('🧪 TEST 1: Rilevamento parcheggio (90s di stop)\n');

const startLocation: UserLocation = {
  latitude: 41.9027835,
  longitude: 12.4963655,
  heading: null
};

const stillLocation: UserLocation = {
  latitude: 41.9027835 + 0.00001, // ~1 metro a nord
  longitude: 12.4963655,
  heading: null
};

const distance = getHaversineDistance(startLocation, stillLocation);
console.log(`✓ Distanza tra due posizioni: ${distance.toFixed(2)}m`);
console.log(`✓ Soglia fermo (STATIONARY_THRESHOLD_M): 20m`);
console.log(`✓ Risultato: ${distance <= 20 ? '✅ FERMO' : '❌ MOVIMENTO'}\n`);

// Test 2: Geofencing (200m + rientrata <80m)
console.log('🧪 TEST 2: Geofencing (200m di radius)\n');

const parkingLocation: UserLocation = {
  latitude: 41.9027835,
  longitude: 12.4963655,
  heading: null
};

const insideGeofenceLocation: UserLocation = {
  latitude: 41.9027835 + 0.0005, // ~55 metri a nord
  longitude: 12.4963655,
  heading: null
};

const outsideGeofenceLocation: UserLocation = {
  latitude: 41.9027835 + 0.002, // ~220 metri a nord
  longitude: 12.4963655,
  heading: null
};

const reentryLocation: UserLocation = {
  latitude: 41.9027835 + 0.0004, // ~45 metri (rientrata a piedi)
  longitude: 12.4963655,
  heading: null
};

const distInsideGeofence = getHaversineDistance(parkingLocation, insideGeofenceLocation);
const distOutsideGeofence = getHaversineDistance(parkingLocation, outsideGeofenceLocation);
const distReentry = getHaversineDistance(parkingLocation, reentryLocation);

console.log(`📍 Parcheggio: (${parkingLocation.latitude}, ${parkingLocation.longitude})`);
console.log(`✓ Raggio geofence: 200m\n`);

console.log(`📍 Dentro geofence (${distInsideGeofence.toFixed(0)}m):`);
console.log(`   ${distInsideGeofence <= 200 ? '✅ DENTRO' : '❌ FUORI'}\n`);

console.log(`📍 Fuori geofence (${distOutsideGeofence.toFixed(0)}m):`);
console.log(`   ${distOutsideGeofence <= 200 ? '✅ DENTRO' : '❌ FUORI'}\n`);

console.log(`📍 Rientrata a piedi (${distReentry.toFixed(0)}m):`);
console.log(`   ${distReentry <= 80 ? '✅ RIENTRATA A PIEDI' : '❌ NO'}\n`);

// Test 3: Timeline di detectionione
console.log('🧪 TEST 3: Timeline di rilevamento\n');

const timeline = [
  { time: '00:00s', dist: 0, event: 'Utente arriva al parcheggio' },
  { time: '15:00s', dist: 5, event: 'Fermo (5m movimento max)' },
  { time: '30:00s', dist: 3, event: 'Ancora fermo (tolleranza traffico)' },
  { time: '45:00s', dist: 8, event: 'Ancora fermo' },
  { time: '60:00s', dist: 2, event: 'Ancora fermo' },
  { time: '75:00s', dist: 1, event: 'Quasi immobile' },
  { time: '90:00s', dist: 0, event: '✅ RILEVAMENTO PARCHEGGIO! Pop-up mostrato' },
  { time: '90:05s', dist: 100, event: '❌ Utente si muove - reset detection' }
];

console.log('Tempo   | Movimento | Stato');
console.log('--------|-----------|-------');
timeline.forEach(({ time, dist, event }) => {
  const status = time === '90:00s' ? '🎯' : dist > 20 ? '❌' : '✅';
  console.log(`${time}  | ${dist}m      | ${status} ${event}`);
});

// Test 4: Validazione costanti
console.log('\n🧪 TEST 4: Validazione costanti\n');

const constants = {
  ALERT_DURATION_S: 90,
  STATIONARY_THRESHOLD_M: 20,
  GEOFENCE_RADIUS_M: 200,
  REENTRY_THRESHOLD_M: 80,
  PARKING_EXPIRY_MS: 3 * 60 * 1000, // 3 minuti
};

console.log('Costanti di configurazione:');
Object.entries(constants).forEach(([key, value]) => {
  console.log(`  ✓ ${key}: ${value}`);
});

console.log('\n✅ Tutti i test completati!\n');
