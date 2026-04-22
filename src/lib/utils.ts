import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcola la distanza tra due coordinate usando la formula di Haversine.
 * @returns Distanza in metri.
 */
export function getHaversineDistance(
  coords1: { latitude: number; longitude: number } | null,
  coords2: { latitude: number; longitude: number } | null
): number {
  if (!coords1 || !coords2) return Infinity;

  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Genera un codice alfanumerico di N caratteri non ambigui.
 * Esclude 0, O, I, 1 per evitare errori di lettura umana.
 * Usa crypto.getRandomValues() — crittograficamente sicuro.
 */
export function generateBookingCode(length = 4): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (val) => chars[val % chars.length]).join('');
}
