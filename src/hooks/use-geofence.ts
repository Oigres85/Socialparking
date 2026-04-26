import { useState, useEffect, useRef, useCallback } from 'react';
import { UserLocation } from './use-gps';
import { getHaversineDistance } from '@/lib/utils';

interface GeofenceState {
  isInsideGeofence: boolean;
  hasExited: boolean;
  hasReentered: boolean;
}

/**
 * Hook per il monitoraggio della geofence del parcheggio.
 * Rileva quando l'utente esce da 200m dal parcheggio e quando rientra a piedi (<80m).
 */
export function useGeofence(userLocation: UserLocation | null, parkingLocation: UserLocation | null) {
  const [state, setState] = useState<GeofenceState>({
    isInsideGeofence: true,
    hasExited: false,
    hasReentered: false
  });

  const wasInsideRef = useRef(true);
  const exitTimeRef = useRef<number | null>(null);
  const monitorInterval = useRef<NodeJS.Timeout | null>(null);

  const GEOFENCE_RADIUS_M = 200;
  const REENTRY_THRESHOLD_M = 80; // Rientro a piedi

  const resetGeofence = useCallback(() => {
    setState({
      isInsideGeofence: true,
      hasExited: false,
      hasReentered: false
    });
    wasInsideRef.current = true;
    exitTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!userLocation || !parkingLocation) {
      if (monitorInterval.current) clearInterval(monitorInterval.current);
      return;
    }

    monitorInterval.current = setInterval(() => {
      const distance = getHaversineDistance(userLocation, parkingLocation);
      const isInside = distance <= GEOFENCE_RADIUS_M;

      if (isInside && !wasInsideRef.current && !state.hasReentered && exitTimeRef.current) {
        // Rientrato dopo essere uscito
        if (distance <= REENTRY_THRESHOLD_M) {
          setState(prev => ({
            ...prev,
            isInsideGeofence: true,
            hasReentered: true
          }));
        }
      } else if (!isInside && wasInsideRef.current && !state.hasExited) {
        // Uscito dal parcheggio
        setState(prev => ({
          ...prev,
          isInsideGeofence: false,
          hasExited: true
        }));
        exitTimeRef.current = Date.now();
      } else if (isInside && !state.isInsideGeofence) {
        // Tornato dentro (non rilevato come rientrata a piedi)
        setState(prev => ({
          ...prev,
          isInsideGeofence: true
        }));
      }

      wasInsideRef.current = isInside;
    }, 2000); // Controlla ogni 2 secondi

    return () => {
      if (monitorInterval.current) clearInterval(monitorInterval.current);
    };
  }, [userLocation, parkingLocation, state.hasReentered, state.hasExited, state.isInsideGeofence]);

  return { ...state, resetGeofence };
}
