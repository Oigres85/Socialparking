import { useState, useEffect, useRef, useCallback } from 'react';
import { UserLocation } from './use-gps';
import {
  ParkingMachineState,
  ParkingEvent,
  initialParkingState,
  onLocation,
  onTick,
} from '@/lib/parking-machine';

const STORAGE_KEY = 'sp-parking-state';

function load(): ParkingMachineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialParkingState, ...JSON.parse(raw), prev: null };
  } catch { /* storage non disponibile */ }
  return initialParkingState;
}

/**
 * Hook che collega la macchina a stati del parcheggio al GPS.
 * Lo stato (posizione dell'auto) sopravvive alla chiusura dell'app.
 */
export function useParkingDetection(userLocation: UserLocation | null, onEvent?: (e: Exclude<ParkingEvent, null>) => void) {
  const [state, setState] = useState<ParkingMachineState>(initialParkingState);
  const stateRef = useRef(state);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const apply = useCallback((next: ParkingMachineState, event: ParkingEvent) => {
    stateRef.current = next;
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase: next.phase, car: next.car, anchor: next.anchor })); } catch { /* ignore */ }
    if (event) onEventRef.current?.(event);
  }, []);

  useEffect(() => {
    const loaded = load();
    stateRef.current = loaded;
    setState(loaded);
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const [next, event] = onLocation(stateRef.current, userLocation, Date.now());
    apply(next, event);
  }, [userLocation, apply]);

  useEffect(() => {
    const id = setInterval(() => {
      const [next, event] = onTick(stateRef.current, Date.now());
      if (next !== stateRef.current) apply(next, event);
    }, 5000);
    return () => clearInterval(id);
  }, [apply]);

  /** L'utente dichiara di aver parcheggiato qui (utile se il rilevamento automatico non è scattato). */
  const markParkedHere = useCallback(() => {
    if (!userLocation) return;
    apply({ ...stateRef.current, phase: 'parked', anchor: null, car: { latitude: userLocation.latitude, longitude: userLocation.longitude, parkedAt: Date.now() } }, null);
  }, [userLocation, apply]);

  const resetParking = useCallback(() => {
    apply({ ...initialParkingState }, null);
  }, [apply]);

  return { phase: state.phase, car: state.car, markParkedHere, resetParking };
}
