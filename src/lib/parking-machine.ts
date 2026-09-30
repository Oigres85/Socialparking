import { getHaversineDistance } from './utils';

/**
 * @fileOverview Macchina a stati (pura, testabile) per il rilevamento automatico del parcheggio.
 *
 *   idle ──(velocità da auto)──▶ driving ──(fermo 90s entro 25m)──▶ parked
 *   parked ──(>200m, a piedi)──▶ away ──(torna <60m dall'auto)──▶ returning  ⇒ "Libera il posto?"
 *   qualsiasi fase ──(velocità da auto)──▶ driving
 *
 * Differenza chiave rispetto alla versione precedente: il popup non compare più dopo 90s
 * fermi ovunque (casa, ufficio, semaforo), ma solo quando l'utente TORNA all'auto dopo averla
 * parcheggiata: il momento esatto in cui sta per liberare il posto.
 */

export type ParkingPhase = 'idle' | 'driving' | 'parked' | 'away' | 'returning';

export interface GeoSample {
  latitude: number;
  longitude: number;
  speed?: number | null;
  accuracy?: number | null;
}

export interface CarLocation {
  latitude: number;
  longitude: number;
  parkedAt: number;
}

export interface ParkingMachineState {
  phase: ParkingPhase;
  /** Punto candidato in cui l'utente si è fermato dopo aver guidato */
  anchor: { latitude: number; longitude: number; since: number } | null;
  car: CarLocation | null;
  prev: { latitude: number; longitude: number; t: number } | null;
}

export type ParkingEvent = 'parked' | 'returning' | 'drove-away' | null;

export const PARKING_CONFIG = {
  DRIVING_SPEED_MS: 4.2, // ~15 km/h: più veloce di chi corre a piedi
  STOP_RADIUS_M: 25,
  STOP_DURATION_MS: 90_000,
  AWAY_RADIUS_M: 200,
  RETURN_RADIUS_M: 60,
  MAX_ACCURACY_M: 60, // campioni meno precisi vengono ignorati
  CAR_MEMORY_MS: 24 * 60 * 60 * 1000,
};

export const initialParkingState: ParkingMachineState = { phase: 'idle', anchor: null, car: null, prev: null };

function estimateSpeed(state: ParkingMachineState, s: GeoSample, now: number): number | null {
  if (typeof s.speed === 'number' && s.speed >= 0) return s.speed;
  if (!state.prev) return null;
  const dt = (now - state.prev.t) / 1000;
  if (dt < 2 || dt > 60) return null;
  return getHaversineDistance(state.prev, s) / dt;
}

/** Transizione su nuovo campione GPS. */
export function onLocation(state: ParkingMachineState, s: GeoSample, now: number): [ParkingMachineState, ParkingEvent] {
  if (s.accuracy != null && s.accuracy > PARKING_CONFIG.MAX_ACCURACY_M) return [state, null];

  const speed = estimateSpeed(state, s, now);
  const prev = { latitude: s.latitude, longitude: s.longitude, t: now };
  const isDriving = speed != null && speed >= PARKING_CONFIG.DRIVING_SPEED_MS;

  // Auto scaduta: dimentichiamola
  if (state.car && now - state.car.parkedAt > PARKING_CONFIG.CAR_MEMORY_MS) {
    state = { ...state, phase: 'idle', car: null };
  }

  if (isDriving) {
    const event: ParkingEvent = state.phase === 'returning' || state.phase === 'parked' ? 'drove-away' : null;
    return [{ phase: 'driving', anchor: null, car: null, prev }, event];
  }

  switch (state.phase) {
    case 'driving': {
      const anchor =
        state.anchor && getHaversineDistance(state.anchor, s) <= PARKING_CONFIG.STOP_RADIUS_M
          ? state.anchor
          : { latitude: s.latitude, longitude: s.longitude, since: now };
      return checkStop({ ...state, anchor, prev }, now);
    }
    case 'parked': {
      if (state.car && getHaversineDistance(state.car, s) > PARKING_CONFIG.AWAY_RADIUS_M) {
        return [{ ...state, phase: 'away', prev }, null];
      }
      return [{ ...state, prev }, null];
    }
    case 'away': {
      if (state.car && getHaversineDistance(state.car, s) <= PARKING_CONFIG.RETURN_RADIUS_M) {
        return [{ ...state, phase: 'returning', prev }, 'returning'];
      }
      return [{ ...state, prev }, null];
    }
    case 'returning': {
      if (state.car && getHaversineDistance(state.car, s) > PARKING_CONFIG.AWAY_RADIUS_M) {
        return [{ ...state, phase: 'away', prev }, null];
      }
      return [{ ...state, prev }, null];
    }
    default:
      return [{ ...state, prev }, null];
  }
}

/** Transizione a tempo: il GPS spesso non emette campioni quando si è fermi. */
export function onTick(state: ParkingMachineState, now: number): [ParkingMachineState, ParkingEvent] {
  if (state.phase !== 'driving') return [state, null];
  return checkStop(state, now);
}

function checkStop(state: ParkingMachineState, now: number): [ParkingMachineState, ParkingEvent] {
  if (state.anchor && now - state.anchor.since >= PARKING_CONFIG.STOP_DURATION_MS) {
    const car = { latitude: state.anchor.latitude, longitude: state.anchor.longitude, parkedAt: state.anchor.since };
    return [{ ...state, phase: 'parked', anchor: null, car }, 'parked'];
  }
  return [state, null];
}

/** Secondi mancanti alla conferma del parcheggio (per UI), null se non in attesa. */
export function secondsToParked(state: ParkingMachineState, now: number): number | null {
  if (state.phase !== 'driving' || !state.anchor) return null;
  return Math.max(0, Math.ceil((PARKING_CONFIG.STOP_DURATION_MS - (now - state.anchor.since)) / 1000));
}
