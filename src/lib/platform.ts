import { Capacitor } from '@capacitor/core';

/**
 * @fileOverview Rilevamento piattaforma: web (PWA/browser) oppure app nativa (Capacitor iOS/Android).
 */

export const isNative = () => Capacitor.isNativePlatform();

export const getPlatform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/** URL pubblico del sito: nelle app native window.location punta a capacitor://localhost. */
export const PUBLIC_SITE_URL = 'https://www.siigep.tech';
