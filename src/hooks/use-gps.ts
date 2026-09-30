import { useState, useEffect, useRef, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { GPS_UPDATE_THRESHOLD_M } from '@/lib/constants';
import { getHaversineDistance } from '@/lib/utils';
import { isNative } from '@/lib/platform';

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  /** Velocità in m/s (null se il dispositivo non la fornisce) */
  speed?: number | null;
  accuracy?: number | null;
  timestamp?: number;
}

export type GpsPermission = 'unknown' | 'granted' | 'denied';

/**
 * Hook per la geolocalizzazione.
 * Su app nativa usa il plugin Capacitor (permessi di sistema corretti su iOS/Android),
 * sul web la Geolocation API del browser. Il callback onLocationUpdate è throttlato per distanza.
 */
export function useGps(onLocationUpdate?: (loc: UserLocation) => void) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<GpsPermission>('unknown');
  const webWatchId = useRef<number | null>(null);
  const nativeWatchId = useRef<string | null>(null);
  const hasInitialCentered = useRef(false);
  const lastSavedLocation = useRef<UserLocation | null>(null);
  const callbackRef = useRef(onLocationUpdate);
  callbackRef.current = onLocationUpdate;

  const handlePosition = useCallback((coords: GeolocationCoordinates | { latitude: number; longitude: number; heading: number | null; speed: number | null; accuracy: number }, ts: number) => {
    const loc: UserLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
      accuracy: coords.accuracy ?? null,
      timestamp: ts,
    };
    setPermission('granted');
    setUserLocation(loc);

    const dist = lastSavedLocation.current ? getHaversineDistance(loc, lastSavedLocation.current) : Infinity;
    if (dist >= GPS_UPDATE_THRESHOLD_M) {
      lastSavedLocation.current = loc;
      callbackRef.current?.(loc);
    }
  }, []);

  const startGps = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (isNative()) {
      if (nativeWatchId.current) return;
      try {
        const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (perm.location === 'denied') { setPermission('denied'); return; }
        nativeWatchId.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          (pos, err) => {
            if (err || !pos) return;
            handlePosition(pos.coords as any, pos.timestamp);
          }
        );
      } catch {
        setPermission('denied');
      }
      return;
    }

    if (!navigator.geolocation || webWatchId.current !== null) return;
    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) setPermission('denied');
    };
    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(p => handlePosition(p.coords, p.timestamp), () => {
      navigator.geolocation.getCurrentPosition(p => handlePosition(p.coords, p.timestamp), onError, { enableHighAccuracy: false });
    }, options);
    webWatchId.current = navigator.geolocation.watchPosition(p => handlePosition(p.coords, p.timestamp), onError, options);
  }, [handlePosition]);

  useEffect(() => {
    return () => {
      if (webWatchId.current !== null) navigator.geolocation.clearWatch(webWatchId.current);
      if (nativeWatchId.current) Geolocation.clearWatch({ id: nativeWatchId.current }).catch(() => {});
    };
  }, []);

  return { userLocation, startGps, hasInitialCentered, permission };
}
