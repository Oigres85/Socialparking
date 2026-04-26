import { useState, useEffect, useRef, useCallback } from 'react';
import { GPS_UPDATE_THRESHOLD_M } from '@/lib/constants';
import { getHaversineDistance } from '@/lib/utils';

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
}

/**
 * Hook per la gestione della geolocalizzazione GPS.
 * Gestisce l'aggiornamento della posizione e il throttling basato sulla distanza.
 */
export function useGps(onLocationUpdate?: (loc: UserLocation) => void) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const watchId = useRef<number | null>(null);
  const hasInitialCentered = useRef(false);
  const lastSavedLocation = useRef<UserLocation | null>(null);

  const startGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, heading } = pos.coords;
      const loc: UserLocation = { latitude, longitude, heading };
      setUserLocation(loc);

      const dist = lastSavedLocation.current
        ? getHaversineDistance(loc, lastSavedLocation.current)
        : Infinity;

      // Aggiorna solo se ci si è spostati di almeno X metri o se è la prima acquisizione
      if (dist >= GPS_UPDATE_THRESHOLD_M || !lastSavedLocation.current) {
        lastSavedLocation.current = loc;
        onLocationUpdate?.(loc);
      }
    };

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    
    // Acquisizione iniziale veloce
    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      navigator.geolocation.getCurrentPosition(onSuccess, null, { enableHighAccuracy: false });
    }, options);

    // Monitoraggio continuo
    watchId.current = window.navigator.geolocation.watchPosition(onSuccess, null, options);
  }, [onLocationUpdate]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return { userLocation, startGps, hasInitialCentered };
}
