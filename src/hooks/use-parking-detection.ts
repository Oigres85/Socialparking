import { useState, useEffect, useRef, useCallback } from 'react';
import { UserLocation } from './use-gps';
import { getHaversineDistance } from '@/lib/utils';

interface ParkingDetectionState {
  isParkingDetected: boolean;
  parkingLocation: UserLocation | null;
  timeRemainingForAlert: number; // in secondi, 0-90
}

/**
 * Hook per il rilevamento automatico del parcheggio.
 * Rileva quando l'utente è fermo per 90 secondi (con tolleranza per semafori/traffico).
 * Considera fermo se la distanza dal punto di partenza è < 20 metri per almeno 90 secondi consecutivi.
 */
export function useParkingDetection(userLocation: UserLocation | null) {
  const [state, setState] = useState<ParkingDetectionState>({
    isParkingDetected: false,
    parkingLocation: null,
    timeRemainingForAlert: 90
  });

  const stationaryStartTime = useRef<number | null>(null);
  const stationaryLocation = useRef<UserLocation | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  const STATIONARY_THRESHOLD_M = 20; // 20 metri = fermo
  const ALERT_DURATION_S = 90; // 90 secondi

  const resetParking = useCallback(() => {
    setState({
      isParkingDetected: false,
      parkingLocation: null,
      timeRemainingForAlert: 90
    });
    stationaryStartTime.current = null;
    stationaryLocation.current = null;
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (checkInterval.current) clearInterval(checkInterval.current);
  }, []);

  useEffect(() => {
    if (!userLocation) {
      resetParking();
      return;
    }

    // Controlla ogni 2 secondi se l'utente è fermo
    checkInterval.current = setInterval(() => {
      if (!stationaryLocation.current) {
        // Inizio conteggio
        stationaryLocation.current = userLocation;
        stationaryStartTime.current = Date.now();
        return;
      }

      const distance = getHaversineDistance(userLocation, stationaryLocation.current);

      if (distance > STATIONARY_THRESHOLD_M) {
        // Utente si è mosso, reset
        resetParking();
        return;
      }

      // Utente è fermo, controlla tempo
      const elapsedS = (Date.now() - (stationaryStartTime.current || Date.now())) / 1000;

      if (elapsedS >= ALERT_DURATION_S && !state.isParkingDetected) {
        // Parcheggio rilevato!
        setState({
          isParkingDetected: true,
          parkingLocation: userLocation,
          timeRemainingForAlert: 0
        });

        if (countdownInterval.current) clearInterval(countdownInterval.current);
        if (checkInterval.current) clearInterval(checkInterval.current);
      }
    }, 2000); // Controlla ogni 2 secondi

    // Countdown per il timer (90s -> 0)
    if (!state.isParkingDetected && stationaryStartTime.current) {
      countdownInterval.current = setInterval(() => {
        const elapsedS = (Date.now() - (stationaryStartTime.current || Date.now())) / 1000;
        const remaining = Math.max(0, ALERT_DURATION_S - elapsedS);
        setState(prev => ({
          ...prev,
          timeRemainingForAlert: remaining
        }));
      }, 1000);
    }

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [userLocation, state.isParkingDetected, resetParking]);

  return { ...state, resetParking };
}
